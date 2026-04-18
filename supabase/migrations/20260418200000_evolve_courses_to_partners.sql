-- ============================================================
-- Evolve courses table: add partner_type and image_url columns
-- partner_type allows classifying entries as curso, produto, servico, or link
-- image_url stores a visual for the partner card
-- ============================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS partner_type TEXT NOT NULL DEFAULT 'curso'
    CHECK (partner_type IN ('curso', 'produto', 'servico', 'link')),
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.courses.partner_type IS 'Tipo de parceiro: curso, produto, servico ou link';
COMMENT ON COLUMN public.courses.image_url IS 'URL da imagem/logo do parceiro';
