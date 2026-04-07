-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix RLS policies to include super_admin role
-- The has_role() function does exact matching, so super_admin users
-- were blocked by policies that only checked for 'admin'.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Podcasts table ──────────────────────────────────────────────────────

-- SELECT: public sees published, admin OR super_admin sees all
DROP POLICY IF EXISTS "Podcasts are viewable by everyone" ON public.podcasts;
CREATE POLICY "Podcasts are viewable by everyone"
ON public.podcasts FOR SELECT
USING (
  status = 'published'
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- ALL (INSERT/UPDATE/DELETE): admin OR super_admin
DROP POLICY IF EXISTS "Admins can manage podcasts" ON public.podcasts;
CREATE POLICY "Admins can manage podcasts"
ON public.podcasts FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- ─── 2. Storage bucket "podcasts" (audio files) ────────────────────────────

DROP POLICY IF EXISTS "Admins can upload podcast audio" ON storage.objects;
CREATE POLICY "Admins can upload podcast audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'podcasts'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can update podcast audio" ON storage.objects;
CREATE POLICY "Admins can update podcast audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'podcasts'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can delete podcast audio" ON storage.objects;
CREATE POLICY "Admins can delete podcast audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcasts'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- ─── 3. Storage bucket "audiocast-covers" (cover images) ───────────────────

DROP POLICY IF EXISTS "Admins can upload audiocast covers" ON storage.objects;
CREATE POLICY "Admins can upload audiocast covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audiocast-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can update audiocast covers" ON storage.objects;
CREATE POLICY "Admins can update audiocast covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audiocast-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can delete audiocast covers" ON storage.objects;
CREATE POLICY "Admins can delete audiocast covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audiocast-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- ─── 4. Storage bucket "transcripts" ───────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage transcripts" ON storage.objects;
CREATE POLICY "Admins can manage transcripts"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'transcripts'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
)
WITH CHECK (
  bucket_id = 'transcripts'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);
