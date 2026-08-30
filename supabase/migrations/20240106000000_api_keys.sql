-- Create API Keys table
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  provider text NOT NULL, -- 'maptiler', 'existing'
  api_key text NOT NULL,
  description text,
  allowed_origins text[],
  status text DEFAULT 'active', -- 'active', 'revoked'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create User Settings table (if not exists)
CREATE TABLE public.user_settings (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  map_provider text DEFAULT 'existing',
  maptiler_style text DEFAULT 'streets-v2',
  maptiler_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for api_keys
CREATE POLICY "Users can manage their own API keys" 
  ON public.api_keys 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policies for user_settings
CREATE POLICY "Users can manage their own settings" 
  ON public.user_settings 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Helper function to ensure user_settings exists on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user_settings
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_settings();
