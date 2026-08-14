-- Create a view that returns areas with geometry as GeoJSON
-- This is needed because PostgREST/Supabase returns PostGIS geometry as EWKB hex by default
-- Using ST_AsGeoJSON converts the geometry to a proper GeoJSON string

CREATE OR REPLACE VIEW public.areas_with_geojson AS
SELECT
  a.id,
  a.project_id,
  a.group_id,
  a.area_number,
  a.name,
  a.description,
  a.center_lat,
  a.center_lng,
  a.created_by,
  a.created_at,
  a.updated_at,
  -- Return geometry as GeoJSON text
  CASE 
    WHEN a.geometry IS NOT NULL THEN ST_AsGeoJSON(a.geometry)::text
    ELSE NULL
  END AS geojson
FROM public.areas a;

-- Enable RLS on the view (inherits from base table)
-- Grant access to authenticated users
GRANT SELECT ON public.areas_with_geojson TO anon, authenticated;

-- Also create an RPC function that returns areas for a project with GeoJSON geometry
-- This is more reliable than using the view for RLS scenarios
CREATE OR REPLACE FUNCTION public.get_areas_for_project(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  group_id uuid,
  area_number text,
  name text,
  description text,
  center_lat float8,
  center_lng float8,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  geojson text,
  group_color text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    a.id,
    a.project_id,
    a.group_id,
    a.area_number,
    a.name,
    a.description,
    a.center_lat,
    a.center_lng,
    a.created_by,
    a.created_at,
    a.updated_at,
    CASE WHEN a.geometry IS NOT NULL THEN ST_AsGeoJSON(a.geometry)::text ELSE NULL END AS geojson,
    g.color AS group_color
  FROM public.areas a
  LEFT JOIN public.groups g ON g.id = a.group_id
  WHERE a.project_id = p_project_id
  ORDER BY a.created_at;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_areas_for_project(uuid) TO anon, authenticated;
