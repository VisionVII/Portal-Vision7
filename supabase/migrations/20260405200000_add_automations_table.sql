-- Automations table: persistent config for n8n workflow automation rules
-- Replaces localStorage-based storage in AdminAutomation.tsx

CREATE TABLE IF NOT EXISTS public.automations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  workflow_id TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  interval    INTEGER     NOT NULL DEFAULT 30 CHECK (interval >= 1),
  rss_feeds   TEXT[]      NOT NULL DEFAULT '{}',
  keywords    TEXT[]      NOT NULL DEFAULT '{}',
  prompt      TEXT        NOT NULL DEFAULT '',
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_automations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.set_automations_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_workflow_id ON public.automations (workflow_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON public.automations (active);

-- RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Only admin/super_admin/editor can read
CREATE POLICY "admin_read_automations"
  ON public.automations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'editor')
        AND ur.is_active = true
    )
  );

-- Only admin/super_admin can insert/update/delete
CREATE POLICY "admin_write_automations"
  ON public.automations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin')
        AND ur.is_active = true
    )
  );

CREATE POLICY "admin_update_automations"
  ON public.automations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin')
        AND ur.is_active = true
    )
  );

CREATE POLICY "admin_delete_automations"
  ON public.automations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin')
        AND ur.is_active = true
    )
  );

GRANT SELECT ON public.automations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
