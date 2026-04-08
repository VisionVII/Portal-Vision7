-- ============================================================
-- Fix: Posts RLS — include super_admin alongside admin
-- The original policies only checked has_role(uid, 'admin')
-- but super_admin users also need full access to posts
-- (including drafts created by the automation pipeline).
-- ============================================================

-- ─── SELECT ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.posts;

CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  );

-- ─── INSERT ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can create posts" ON public.posts;

CREATE POLICY "Admins can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ─── UPDATE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;

CREATE POLICY "Admins can update posts"
  ON public.posts FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ─── DELETE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
