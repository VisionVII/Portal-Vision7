# ─────────────────────────────────────────────────────────────────────────────
# n8n para Render — usa imagem oficial pré-compilada (sem npm install)
# ─────────────────────────────────────────────────────────────────────────────
FROM n8nio/n8n:latest

# Forçar IPv4 — Render free tier não suporta IPv6 outbound
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Porta do Render (default 10000)
ENV N8N_PORT=10000
EXPOSE 10000

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:${N8N_PORT}/healthz || exit 1

# Arrancar n8n na porta e host corretos para Render
CMD ["n8n", "start"]
