-- ============================================================
-- Align posts RLS with the editorial roles exposed in the CMS.
-- Editors can publish and manage posts.
-- Redatores can create and update only their own drafts.
-- Moderadores can review content, but not modify it.
-- ============================================================

DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.posts;
CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR public.has_role(auth.uid(), 'moderador')
    OR (
      public.has_role(auth.uid(), 'redator')
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create posts" ON public.posts;
CREATE POLICY "Admins can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR (
      public.has_role(auth.uid(), 'redator')
      AND COALESCE(status, 'draft') = 'draft'
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts"
  ON public.posts FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR (
      public.has_role(auth.uid(), 'redator')
      AND author_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR (
      public.has_role(auth.uid(), 'redator')
      AND author_id = auth.uid()
      AND COALESCE(status, 'draft') = 'draft'
    )
  );

DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  );
