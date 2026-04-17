-- Admin in-app notifications for automation events
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  source TEXT, -- automation_id, workflow name, system
  link TEXT, -- optional deep-link path within the dashboard
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick unread counts
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_unread
  ON public.admin_notifications (user_id, read, created_at DESC)
  WHERE read = false;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.admin_notifications;
CREATE POLICY "Users read own notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
DROP POLICY IF EXISTS "Users update own notifications" ON public.admin_notifications;
CREATE POLICY "Users update own notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role / edge functions can insert notifications for any user
DROP POLICY IF EXISTS "Service role inserts notifications" ON public.admin_notifications;
CREATE POLICY "Service role inserts notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Allow service_role full access (edge functions)
DROP POLICY IF EXISTS "Service role full access" ON public.admin_notifications;
CREATE POLICY "Service role full access"
  ON public.admin_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users delete own notifications" ON public.admin_notifications;
CREATE POLICY "Users delete own notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Grant table permissions to Supabase roles (required for PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO service_role;
GRANT SELECT ON public.admin_notifications TO anon;
