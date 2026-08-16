-- Fixes public_bucket_allows_listing: audiocast-covers, avatars, podcasts and
-- post-images each have a `storage.objects` SELECT policy with role=public
-- and no path filter, which allows LISTing every file in the bucket via the
-- storage API — not just fetching a known object URL.
--
-- These 4 buckets are already marked `public = true` at the bucket level, and
-- Supabase serves object bytes for public buckets via the
-- /storage/v1/object/public/<bucket>/<path> URL WITHOUT consulting
-- storage.objects RLS at all (confirmed against Supabase docs referenced in
-- the linter remediation link). Dropping these SELECT policies removes the
-- ability to LIST/query objects through the storage API/SDK while public
-- image/audio URLs used throughout the portal keep working unchanged.
--
-- Rollback:
--   CREATE POLICY "Public can view audiocast covers" ON storage.objects
--     FOR SELECT TO public USING (bucket_id = 'audiocast-covers');
--   (same pattern for avatars / podcasts / post-images)

DROP POLICY IF EXISTS "Public can view audiocast covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
