# ─────────────────────────────────────────────────────────────────────────────
# n8n para Render — usa imagem oficial pré-compilada (sem npm install)
# ─────────────────────────────────────────────────────────────────────────────
FROM n8nio/n8n:latest

# Render exige que o serviço escute na porta definida por $PORT
# n8n usa N8N_PORT internamente; o EXPOSE é documentação
EXPOSE 5678

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:${N8N_PORT:-5678}/healthz || exit 1
