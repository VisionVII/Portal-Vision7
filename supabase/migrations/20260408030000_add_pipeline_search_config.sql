-- Pipeline Search Config table
-- Stores user-defined search tags/topics for the news pipeline
-- WF-01 reads from this table at startup to build dynamic RSS feeds

CREATE TABLE IF NOT EXISTS public.pipeline_search_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  language text DEFAULT 'pt-PT',
  region text DEFAULT 'PT',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default config
INSERT INTO public.pipeline_search_config (label, tags, is_active) VALUES
  ('Padrão', ARRAY['inteligência artificial', 'cibersegurança', 'automação empresarial'], true)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.pipeline_search_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.pipeline_search_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write" ON public.pipeline_search_config
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true)
  );
