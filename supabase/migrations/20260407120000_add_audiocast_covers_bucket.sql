-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Create storage buckets + RLS for audiocasts
-- Creates both "podcasts" (audio) and "audiocast-covers" (images) buckets.
-- All policies include admin OR super_admin (has_role does exact match).
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Create buckets ──────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('podcasts', 'podcasts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audiocast-covers', 'audiocast-covers', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Podcasts table RLS ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Podcasts are viewable by everyone" ON public.podcasts;
CREATE POLICY "Podcasts are viewable by everyone"
ON public.podcasts FOR SELECT
USING (
  status = 'published'
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

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

-- ─── 3. Storage "podcasts" bucket — public read, admin write ────────────────

DROP POLICY IF EXISTS "Public can view podcast audio" ON storage.objects;
CREATE POLICY "Public can view podcast audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcasts');

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

-- ─── 4. Storage "audiocast-covers" bucket — public read, admin write ────────

DROP POLICY IF EXISTS "Public can view audiocast covers" ON storage.objects;
CREATE POLICY "Public can view audiocast covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'audiocast-covers');

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

-- ─── 5. Storage "transcripts" bucket ────────────────────────────────────────

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

-- ─── 6. Add cover_url column to podcasts ────────────────────────────────────

ALTER TABLE public.podcasts
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- ─── 7. Add banner_url column to posts ──────────────────────────────────────

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ─── 8. Storage bucket "post-images" for banners ────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
CREATE POLICY "Public can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Admins can upload post images" ON storage.objects;
CREATE POLICY "Admins can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'redator'))
);

DROP POLICY IF EXISTS "Admins can update post images" ON storage.objects;
CREATE POLICY "Admins can update post images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
);

DROP POLICY IF EXISTS "Admins can delete post images" ON storage.objects;
CREATE POLICY "Admins can delete post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);
