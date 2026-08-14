-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Projects Table
CREATE TABLE public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  slug text not null unique,
  description text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Groups Table
CREATE TABLE public.groups (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  description text,
  color text default '#ef4444',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Areas Table
CREATE TABLE public.areas (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  group_id uuid references public.groups on delete cascade not null,
  area_number text,
  name text,
  description text,
  geometry geometry(Geometry, 4326),
  center_lat float8,
  center_lng float8,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX areas_geom_idx ON public.areas USING GIST (geometry);

-- 5. Group Managers Table
CREATE TABLE public.group_managers (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  UNIQUE(group_id, user_id)
);

-- 6. Group Permissions Table
CREATE TABLE public.group_permissions (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  can_view boolean default true,
  can_create boolean default true,
  can_edit boolean default true,
  can_delete boolean default true,
  can_manage_group boolean default false,
  can_share boolean default false,
  created_at timestamptz default now(),
  UNIQUE(group_id, user_id)
);

-- 7. Public Shares Table
CREATE TABLE public.public_shares (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  group_id uuid references public.groups on delete cascade,
  token text not null unique,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;


-- RLS POLICIES

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Project owners can manage projects." ON public.projects FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Public projects are viewable by everyone." ON public.projects FOR SELECT USING (is_public = true);
CREATE POLICY "Public shares can view projects." ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.public_shares WHERE project_id = projects.id AND is_active = true)
);

-- Groups
CREATE POLICY "Project owners can manage groups." ON public.groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = groups.project_id AND owner_id = auth.uid())
);
CREATE POLICY "Group managers can view their groups." ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_managers WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "Public shares can view groups." ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.public_shares WHERE project_id = groups.project_id AND is_active = true AND (group_id IS NULL OR group_id = groups.id))
);

-- Areas
CREATE POLICY "Project owners can manage areas." ON public.areas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = areas.project_id AND owner_id = auth.uid())
);
CREATE POLICY "Group managers can select areas." ON public.areas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_managers WHERE group_id = areas.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group managers can create areas." ON public.areas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_permissions WHERE group_id = areas.group_id AND user_id = auth.uid() AND can_create = true)
);
CREATE POLICY "Group managers can update areas." ON public.areas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.group_permissions WHERE group_id = areas.group_id AND user_id = auth.uid() AND can_edit = true)
);
CREATE POLICY "Group managers can delete areas." ON public.areas FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.group_permissions WHERE group_id = areas.group_id AND user_id = auth.uid() AND can_delete = true)
);
CREATE POLICY "Public shares can view areas." ON public.areas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.public_shares WHERE project_id = areas.project_id AND is_active = true AND (group_id IS NULL OR group_id = areas.group_id))
);

-- Group Managers
CREATE POLICY "Project owners can manage group managers." ON public.group_managers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.groups g ON p.id = g.project_id WHERE g.id = group_managers.group_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Group managers can view other managers in same group." ON public.group_managers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_managers m2 WHERE m2.group_id = group_managers.group_id AND m2.user_id = auth.uid())
);

-- Group Permissions
CREATE POLICY "Project owners can manage group permissions." ON public.group_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.groups g ON p.id = g.project_id WHERE g.id = group_permissions.group_id AND p.owner_id = auth.uid())
);
CREATE POLICY "Group managers can view permissions in same group." ON public.group_permissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_managers m2 WHERE m2.group_id = group_permissions.group_id AND m2.user_id = auth.uid())
);

-- Public Shares
CREATE POLICY "Project owners can manage shares." ON public.public_shares FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = public_shares.project_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can select active shares." ON public.public_shares FOR SELECT USING (is_active = true);
