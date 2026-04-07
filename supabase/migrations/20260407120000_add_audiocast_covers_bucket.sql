-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add audiocast-covers storage bucket
-- Audio files continue to use the existing "podcasts" bucket.
-- This adds a dedicated public bucket for audiocast cover images.
-- ════════════════════════════════════════════════════════════════════════════

-- Create covers bucket (public for viewing, admin for upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiocast-covers', 'audiocast-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
DROP POLICY IF EXISTS "Public can view audiocast covers" ON storage.objects;
CREATE POLICY "Public can view audiocast covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'audiocast-covers');

-- Admin upload
DROP POLICY IF EXISTS "Admins can upload audiocast covers" ON storage.objects;
CREATE POLICY "Admins can upload audiocast covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audiocast-covers'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admin update
DROP POLICY IF EXISTS "Admins can update audiocast covers" ON storage.objects;
CREATE POLICY "Admins can update audiocast covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audiocast-covers'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admin delete
DROP POLICY IF EXISTS "Admins can delete audiocast covers" ON storage.objects;
CREATE POLICY "Admins can delete audiocast covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audiocast-covers'
  AND public.has_role(auth.uid(), 'admin')
);

-- Add cover_url column to podcasts table (used by audiocasts)
ALTER TABLE public.podcasts
ADD COLUMN IF NOT EXISTS cover_url TEXT;
