-- Allow authenticated editorial users to list the private metadata of the
-- post-images bucket without reopening anonymous bucket listing.
--
-- Public object URLs remain available because the bucket is public. This
-- policy only permits the Storage list/read-metadata operation to users who
-- already have an active portal role that can work with media.

DROP POLICY IF EXISTS "Editorial users can list post images" ON storage.objects;

CREATE POLICY "Editorial users can list post images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
    OR public.has_role(auth.uid(), 'redator')
  )
);