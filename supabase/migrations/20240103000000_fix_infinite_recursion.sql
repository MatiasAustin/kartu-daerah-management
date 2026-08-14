-- ============================================================
-- Fix: "infinite recursion detected in policy for relation projects"
--
-- ROOT CAUSE:
--   "Public shares can view projects" policy queries public_shares.
--   "Anyone can select active shares" or "Project owners can manage shares"
--   policy queries public.projects — creating a circular reference.
--
--   Also: "Project owners can manage projects" uses FOR ALL without
--   WITH CHECK, so PostgreSQL applies USING for INSERT checks which
--   can recurse when other policies reference the same table.
--
-- FIX STRATEGY:
--   1. Break the circular dependency by using a SECURITY DEFINER
--      function for cross-table checks that bypasses RLS.
--   2. Add WITH CHECK to all FOR ALL policies on projects.
--   3. Rewrite "Public shares can view projects" to avoid recursive
--      RLS evaluation.
-- ============================================================

-- Step 1: Create a SECURITY DEFINER helper function that bypasses RLS
--         to check if a share token is active for a given project.
--         This breaks the circular policy dependency.
CREATE OR REPLACE FUNCTION public.is_project_publicly_shared(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.public_shares
    WHERE project_id = p_project_id
      AND is_active = true
  );
$$;

-- Step 2: Drop and recreate all projects policies
DROP POLICY IF EXISTS "Project owners can manage projects." ON public.projects;
DROP POLICY IF EXISTS "Public projects are viewable by everyone." ON public.projects;
DROP POLICY IF EXISTS "Public shares can view projects." ON public.projects;

-- Owner can do everything (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Project owners can manage projects." ON public.projects
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Public projects are viewable by everyone
CREATE POLICY "Public projects are viewable by everyone." ON public.projects
  FOR SELECT
  USING (is_public = true);

-- Projects with active shares are viewable — uses SECURITY DEFINER fn to avoid recursion
CREATE POLICY "Public shares can view projects." ON public.projects
  FOR SELECT
  USING (public.is_project_publicly_shared(id));

-- Step 3: Fix groups policy (FOR ALL without WITH CHECK causes silent insert failure)
DROP POLICY IF EXISTS "Project owners can manage groups." ON public.groups;
CREATE POLICY "Project owners can manage groups." ON public.groups
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = groups.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = groups.project_id AND owner_id = auth.uid()));

-- Step 4: Fix areas owner policy
DROP POLICY IF EXISTS "Project owners can manage areas." ON public.areas;
CREATE POLICY "Project owners can manage areas." ON public.areas
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = areas.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = areas.project_id AND owner_id = auth.uid()));

-- Step 5: Fix group_managers owner policy
DROP POLICY IF EXISTS "Project owners can manage group managers." ON public.group_managers;
CREATE POLICY "Project owners can manage group managers." ON public.group_managers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.groups g ON p.id = g.project_id
    WHERE g.id = group_managers.group_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.groups g ON p.id = g.project_id
    WHERE g.id = group_managers.group_id AND p.owner_id = auth.uid()
  ));

-- Step 6: Fix group_permissions owner policy
DROP POLICY IF EXISTS "Project owners can manage group permissions." ON public.group_permissions;
CREATE POLICY "Project owners can manage group permissions." ON public.group_permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.groups g ON p.id = g.project_id
    WHERE g.id = group_permissions.group_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.groups g ON p.id = g.project_id
    WHERE g.id = group_permissions.group_id AND p.owner_id = auth.uid()
  ));

-- Step 7: Fix public_shares owner policy
DROP POLICY IF EXISTS "Project owners can manage shares." ON public.public_shares;
CREATE POLICY "Project owners can manage shares." ON public.public_shares
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = public_shares.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = public_shares.project_id AND owner_id = auth.uid()));
