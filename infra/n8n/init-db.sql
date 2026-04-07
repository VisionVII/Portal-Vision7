-- ─────────────────────────────────────────────────────────────────────────────
-- Init script para o PostgreSQL dedicado do n8n
-- Cria o schema isolado e configura permissões
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS n8n;

-- Garantir que o user default tem acesso total ao schema n8n
GRANT ALL PRIVILEGES ON SCHEMA n8n TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON SEQUENCES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON FUNCTIONS TO CURRENT_USER;
