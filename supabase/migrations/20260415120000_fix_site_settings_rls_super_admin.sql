-- ============================================================
-- Fix: site_settings RLS — include super_admin alongside admin
--
-- Problema: a política original "Only admins can manage site settings"
-- usava apenas has_role(uid, 'admin'), bloqueando utilizadores
-- super_admin de escrever em site_settings (ex: salvar logo_url).
-- O super_admin conseguia fazer upload para o Storage mas o upsert
-- da URL na tabela site_settings falhava com erro RLS silencioso.
--
-- Alinhado com 20260409120000_fix_posts_rls_super_admin.sql.
-- ============================================================

-- Remover política antiga (ALL = SELECT + INSERT + UPDATE + DELETE)
DROP POLICY IF EXISTS "Only admins can manage site settings" ON public.site_settings;

-- Recriar em políticas separadas e explícitas (inclui super_admin)
CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can delete site settings"
ON public.site_settings FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- A política SELECT "Site settings are viewable by everyone" (TO public)
-- já existe e permanece inalterada — todos podem ler.
