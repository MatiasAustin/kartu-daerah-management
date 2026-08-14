-- Fix RLS policies that use FOR ALL USING without WITH CHECK.
-- PostgreSQL requires WITH CHECK for INSERT/UPDATE operations.
-- Without it, inserts are silently blocked even for the owner.

-- Fix GROUPS policies
DROP POLICY IF EXISTS "Project owners can manage groups." ON public.groups;
CREATE POLICY "Project owners can manage groups." ON public.groups
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = groups.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = groups.project_id AND owner_id = auth.uid()));

-- Fix GROUP_MANAGERS policies
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

-- Fix GROUP_PERMISSIONS policies
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

-- Fix PUBLIC_SHARES policies
DROP POLICY IF EXISTS "Project owners can manage shares." ON public.public_shares;
CREATE POLICY "Project owners can manage shares." ON public.public_shares
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = public_shares.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = public_shares.project_id AND owner_id = auth.uid()));

-- Fix AREAS owner policy (also missing WITH CHECK)
DROP POLICY IF EXISTS "Project owners can manage areas." ON public.areas;
CREATE POLICY "Project owners can manage areas." ON public.areas
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = areas.project_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = areas.project_id AND owner_id = auth.uid()));
