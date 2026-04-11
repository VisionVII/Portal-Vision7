-- Fix missing GRANTs for all public schema tables.
-- Supabase migrations run as supabase_admin, which creates tables owned by postgres
-- but does NOT automatically GRANT access to authenticated/anon/service_role.
-- RLS policies control actual row-level access; GRANTs just enable the connection.

-- ═══════════════════════════════════════════════════════════════
-- 1. service_role: full access on ALL public tables (admin API)
-- ═══════════════════════════════════════════════════════════════
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 2. authenticated: CRUD on tables (RLS controls actual access)
-- ═══════════════════════════════════════════════════════════════

-- Core content tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curated_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetization_settings TO authenticated;

-- User & auth tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_invites TO authenticated;

-- Analytics & audit (mostly read + insert)
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Newsletter & subscriptions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Pipeline tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_search_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_distributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitemap_entries TO authenticated;

-- Roles & permissions system
GRANT SELECT ON public.permissions_matrix TO authenticated;
GRANT SELECT ON public.permission_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_overrides TO authenticated;
GRANT SELECT ON public.role_hierarchy TO authenticated;
GRANT SELECT ON public.role_assignment_templates TO authenticated;
GRANT SELECT, INSERT ON public.role_assignment_history TO authenticated;
GRANT SELECT, INSERT ON public.role_assignments_audit TO authenticated;
GRANT SELECT, INSERT ON public.role_bulk_assignments TO authenticated;

-- Partner & n8n
GRANT SELECT, INSERT, UPDATE ON public.partner_access_requests TO authenticated;
GRANT SELECT ON public.n8n_credentials TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 3. anon: read-only on public-facing tables
-- ═══════════════════════════════════════════════════════════════
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.podcasts TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.sitemap_entries TO anon;
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT INSERT ON public.push_subscriptions TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 4. Function GRANTs
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

-- Sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Schema usage (defensive — should already exist)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
