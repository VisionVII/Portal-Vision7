-- Notify admins (FR-008) when a curated post enters pending-review.
-- SECURITY DEFINER so the trigger inserts into admin_notifications
-- regardless of who/what wrote to curated_posts (dashboard, n8n via
-- service_role, etc.) — RLS on admin_notifications would otherwise
-- block inserts from non-admin contexts.

CREATE OR REPLACE FUNCTION public.notify_curated_post_pending_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending-review'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending-review') THEN
    INSERT INTO public.admin_notifications (user_id, title, message, type, source, link)
    SELECT
      ur.user_id,
      'Post aguarda revisão',
      NEW.title || ' está pronto para revisão editorial.',
      'info',
      NEW.id::text,
      '/admin/dashboard'
    FROM public.user_roles ur
    WHERE ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_curated_post_pending_review ON public.curated_posts;
CREATE TRIGGER trg_notify_curated_post_pending_review
  AFTER INSERT OR UPDATE OF status ON public.curated_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_curated_post_pending_review();
