# ─────────────────────────────────────────────────────────────────────────────
# n8n para Render — usa imagem oficial pré-compilada (sem npm install)
# ─────────────────────────────────────────────────────────────────────────────
FROM n8nio/n8n:latest

# Forçar IPv4 — Render free tier não suporta IPv6 outbound
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Render usa PORT=10000; n8n usa N8N_PORT — ambos precisam coincidir
ENV PORT=10000
ENV N8N_PORT=10000
ENV N8N_HOST=0.0.0.0
EXPOSE 10000

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:10000/healthz || exit 1

# Entrypoint da imagem oficial executa: exec n8n (sem argumentos)
# NÃO definir CMD — CMD null é o correto para esta imagem
