-- Fix post_categories RLS permissions for authenticated admin/editor users
-- Ensures INSERT/UPDATE/DELETE are allowed when the user has a valid editorial role.

DROP POLICY IF EXISTS "post_categories_admin_insert" ON public.post_categories;
DROP POLICY IF EXISTS "post_categories_admin_update" ON public.post_categories;
DROP POLICY IF EXISTS "post_categories_admin_delete" ON public.post_categories;

CREATE POLICY "post_categories_admin_insert"
  ON public.post_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor', 'redator')
    )
  );

CREATE POLICY "post_categories_admin_update"
  ON public.post_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor', 'redator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor', 'redator')
    )
  );

CREATE POLICY "post_categories_admin_delete"
  ON public.post_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor', 'redator')
    )
  );
