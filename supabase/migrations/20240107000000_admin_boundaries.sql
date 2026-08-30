-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create administrative_boundaries table
CREATE TABLE public.administrative_boundaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  level text, -- e.g., 'Provinsi', 'Kabupaten', 'Kecamatan', 'Desa'
  geom geometry(Geometry, 4326),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_admin_boundaries_name ON public.administrative_boundaries USING gin (name gin_trgm_ops);
CREATE INDEX idx_admin_boundaries_geom ON public.administrative_boundaries USING GIST (geom);

-- RPC function to search boundaries and return GeoJSON
CREATE OR REPLACE FUNCTION search_boundaries(search_query text, search_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  level text,
  geojson text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, 
    b.name, 
    b.level,
    ST_AsGeoJSON(b.geom) as geojson
  FROM public.administrative_boundaries b
  WHERE b.name ILIKE '%' || search_query || '%'
  ORDER BY 
    CASE WHEN b.name ILIKE search_query THEN 0 ELSE 1 END,
    b.name
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to insert boundary from GeoJSON
CREATE OR REPLACE FUNCTION insert_boundary_geojson(p_name text, p_level text, p_geojson jsonb)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.administrative_boundaries (name, level, geom)
  VALUES (p_name, p_level, ST_GeomFromGeoJSON(p_geojson))
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.administrative_boundaries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and search boundaries
CREATE POLICY "Anyone can select admin boundaries" 
  ON public.administrative_boundaries 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert boundaries (for the import tool)
CREATE POLICY "Authenticated users can insert admin boundaries" 
  ON public.administrative_boundaries 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
