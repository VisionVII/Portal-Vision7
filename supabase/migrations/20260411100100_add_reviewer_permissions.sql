-- Add reviewer role permissions (separate transaction from enum ADD VALUE)
INSERT INTO public.permissions_matrix (role, permissions, description)
VALUES
  ('reviewer', '{"posts": ["read", "update"], "comments": ["read", "moderate"], "dashboard": ["view_reviewer"]}', 'Reviewer: can read/update posts, moderate comments')
ON CONFLICT (role) DO NOTHING;
