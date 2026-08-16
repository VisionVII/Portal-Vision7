-- Fixes extension_in_public: pg_trgm was installed in the public schema
-- instead of the dedicated `extensions` schema Supabase uses for the rest
-- of the extensions (pg_stat_statements, pgcrypto, uuid-ossp already live
-- there). Extensions in `public` are writable by anyone with CREATE on that
-- schema and pollute the public namespace.
--
-- Verified safe before applying:
--   - pg_trgm is marked relocatable (pg_extension.extrelocatable = true).
--   - The database's default search_path is already "public, extensions"
--     for postgres/anon/authenticated, so trigram operators/functions
--     (similarity(), %, <->, etc.) keep resolving without schema-qualifying
--     call sites.
--   - Only one dependent object: index idx_posts_meta_description on
--     public.posts. ALTER EXTENSION ... SET SCHEMA moves the extension's
--     objects atomically and updates internal catalog references; it does
--     not require dropping/recreating dependent indexes.
--
-- Rollback: ALTER EXTENSION pg_trgm SET SCHEMA public;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
