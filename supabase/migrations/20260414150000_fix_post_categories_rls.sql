-- Fix post_categories RLS: replace FOR ALL policy with explicit per-operation policies
-- to avoid ambiguity with INSERT/UPDATE WITH CHECK

DROP POLICY IF EXISTS "post_categories_admin_write" ON public.post_categories;

-- Separate INSERT policy with explicit WITH CHECK
CREATE POLICY "post_categories_admin_insert"
  ON public.post_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor', 'redator')
    )
  );

-- UPDATE policy
CREATE POLICY "post_categories_admin_update"
  ON public.post_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
    )
  );

-- DELETE policy
CREATE POLICY "post_categories_admin_delete"
  ON public.post_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
    )
  );
