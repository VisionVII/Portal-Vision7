-- ============================================================
-- Fix: post-images storage RLS — incluir super_admin junto de admin
--
-- Problema: as políticas originais de storage.objects para o bucket
-- post-images (20260217224603_...sql) só verificavam
-- has_role(uid, 'admin') — has_role() faz correspondência exacta de
-- papel, sem hierarquia, por isso um utilizador que seja *só*
-- super_admin (sem linha 'admin' própria) fica sem conseguir subir,
-- actualizar ou apagar imagens neste bucket (posts, galeria, banners
-- da homepage, banners de categoria — é o bucket partilhado por tudo).
--
-- Mesma classe de bug já corrigida antes para outras tabelas:
-- 20260409120000_fix_posts_rls_super_admin.sql
-- 20260415120000_fix_site_settings_rls_super_admin.sql
-- Esta migration fecha a mesma lacuna para o storage de post-images,
-- que tinha ficado de fora dessas duas.
--
-- Rollback: recriar as 3 políticas substituídas por baixo com
-- WITH CHECK/USING apenas has_role(auth.uid(), 'admin') (ver
-- 20260217224603_09688a98-dec5-4c1f-843b-bec95ed6869d.sql).
-- ============================================================

DROP POLICY IF EXISTS "Admins can upload post images" ON storage.objects;
CREATE POLICY "Admins can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can update post images" ON storage.objects;
CREATE POLICY "Admins can update post images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can delete post images" ON storage.objects;
CREATE POLICY "Admins can delete post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- "Public can view post images" (SELECT, sem restrição de role) mantém-se inalterada.
