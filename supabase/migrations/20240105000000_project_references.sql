-- Create Project References Table
CREATE TABLE public.project_references (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  source_area_id uuid references public.areas on delete cascade not null,
  name text,
  color text default '#ff0000',
  weight int default 3,
  dash_array text default '5, 5',
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage references" ON public.project_references FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_references.project_id AND owner_id = auth.uid())
);

CREATE POLICY "Group managers and shares can view references" ON public.project_references FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_references.project_id AND (
      p.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.group_managers gm JOIN public.groups g ON gm.group_id = g.id WHERE g.project_id = p.id AND gm.user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.public_shares ps WHERE ps.project_id = p.id AND ps.is_active = true)
    )
  )
);
