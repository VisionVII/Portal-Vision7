-- Add thumbnail_url column to courses table (referenced by frontend but missing from original migration)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
