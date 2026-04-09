# N8N Keep-Alive — Troubleshooting Guide

## ✅ Correções Aplicadas

### 1. **Keep-Alive Timing** (`src/hooks/useN8nKeepAlive.ts`)
**Antes:** 4min normal, 8min hidden
**Agora:** 10min normal, 13min hidden

**Porquê:** Render Free Tier faz spin-down após **15 minutos** de inactividade. Com interval de 10min, o n8n nunca fica inactivo tempo suficiente.

**Retry automático:** Se detectar cold-start (timeout/503/unreachable), aguarda **35 segundos** e tenta novamente automaticamente.

**Logs melhorados:** Console do browser mostra:
```
[KeepAlive] Starting — initial ping now
[KeepAlive] Interval set to 10min (tab visible)
[KeepAlive] Ping (initial) @ HH:MM:SS
[KeepAlive] ✓ n8n responded OK
```

### 2. **Dashboard Polling** (`src/components/admin/automation/AutomationDashboardV2.tsx`)
**Antes:** Polling agressivo a cada 30s — causava timeouts em cascata
**Agora:** **Polling adaptativo:**
- **2 minutos** quando n8n está conectado
- **1 minuto** quando offline (para detectar recovery)
- **30 segundos** durante warm-up (enquanto mostra "n8n a arrancar")

**Retry inteligente:** Quando detecta cold-start, aguarda **60 segundos** e tenta novamente.

### 3. **Edge Function Timeout** (`supabase/functions/n8n-proxy/index.ts`)
- Health check (`/health`): **60s** timeout ✅
- Requests gerais (workflows, activations, executions): **60s** timeout ✅

**Porquê:** Render cold start pode levar 30-90 segundos. Com 60s timeout, há margem suficiente.

---

## 🔧 Como Ativar e Validar

### Passo 1: Ativar o Keep-Alive
1. Ir para **Dashboard > Automação**
2. No header, encontrar o toggle **Keep-Alive** (ícone de coração ❤️)
3. **Ligar o toggle** → deve ficar vermelho pulsante
4. Abrir **Console do browser** (F12 → Console)
5. Verificar logs:
   ```
   [KeepAlive] Starting — initial ping now
   [KeepAlive] Ping (initial) @ 14:23:45
   [KeepAlive] ✓ n8n responded OK
   ```

### Passo 2: Verificar Status n8n
No header da dashboard, deve aparecer:
```
n8n Online [Wi-Fi icon verde]
Ping: 14:23 (0 falhas)
```

Se aparecer **"n8n Offline"** ou **"n8n a arrancar"**:
1. **Aguardar 60-90 segundos** (cold start do Render)
2. Dashboard vai automaticamente tentar novamente
3. Verificar console — deve mostrar retry automático

### Passo 3: Validar Pipeline
1. Card **"Pipeline Inteligente de Notícias"** deve carregar workflows
2. Se mostrar erro "Falha ao carregar workflows":
   - Clicar botão **↻ Recarregar**
   - **Aguardar 60s** se n8n estava offline
   - Dashboard vai tentar 3x automaticamente (com delays de 25s, 35s)

---

## 🐛 Diagnóstico de Problemas

### Keep-Alive não funciona / n8n continua offline

**Sintoma:** n8n mostra "Offline" apesar do Keep-Alive ligado

** Checklist:**
1. **Console do browser — verificar logs:**
   ```bash
   # ✅ BOM — ping funciona
   [KeepAlive] Ping (initial) @ HH:MM:SS
   [KeepAlive] ✓ n8n responded OK
   
   # ❌ MAU — auth error
   [KeepAlive] Auth error (ignoring): Sessao invalida
   → Solução: Fazer logout + login
   
   # ⚠️ COLD START — normal, depois de 35s resolve
   [KeepAlive] Cold-start detected — retry in 35s
   [KeepAlive] Ping (retry) @ HH:MM:SS
   [KeepAlive] ✓ n8n responded OK
   
   # ❌ MAU — muitas falhas consecutivas
   [KeepAlive] 8 failures — auto-disabling
   → Solução: Ver causas abaixo
   ```

2. **Render — verificar se n8n está UP:**
   - Ir para [Render Dashboard](https://dashboard.render.com)
   - Abrir o serviço n8n
   - Ver logs — deve mostrar "Server ready" ou "Webhook server started"
   - Se offline → **esperar 60-90s** após primeiro ping

3. **Supabase Edge Function — verificar logs:**
   ```bash
   # Ver logs do n8n-proxy
   npx supabase functions logs n8n-proxy --project-ref stpusdeqwbckvfsitsld
   ```
   - Deve mostrar `200 OK` para `/health` e `/api/v1/workflows`
   - Se `403 Forbidden` → API key n8n inválida
   - Se `timeout` → Render ainda a arrancar

4. **Tab hidden demora mais:**
   - Quando tab está hidden/minimizada: interval = **13 minutos**
   - Solução: deixar tab visível nas primeiras 2-3 pings até n8n estabilizar

---

### Dashboard mostra "n8n a arrancar" infinitamente

**Causa:** Render leva >60s para boot, ou n8n tem problemas

**Solução:**
1. **Aguardar 2 minutos** completos
2. Clicar botão **↻ Refresh** manualmente
3. Se persistir → verificar **Render logs** do n8n:
   ```
   Database is not ready
   → n8n PostgreSQL ainda a arrancar
   
   Error: connect ECONNREFUSED
   → n8n não consegue conectar à DB
   ```

4. **Render Free Tier:** Se database está cold, pode levar **90-120 segundos** total
5. Verificar **Supabase Edge Function logs** para mensagens de erro

---

### Lab n8n não carrega (botão "Lab n8n" não funciona)

**Sintoma:** Clicar em "Lab n8n" redireciona para dashboard ou mostra erro

**Solução:**
1. Verificar URL: deve ser `/admin/automation-lab`
2. Console do browser — ver erros
3. Se aparecer "403 Forbidden" → user não tem role `admin` ou `super_admin`
4. Verificar roles:
   ```sql
   -- No Supabase SQL Editor
   SELECT id, email, role FROM users WHERE email = 'seu-email@exemplo.com';
   ```

---

## 📊 Monitorização (Console do Browser)

Deixar Console aberta (F12) e verificar logs periodicamente:

### ✅ **Funcionamento Normal** (a cada 10 minutos)
```
[KeepAlive] Ping (initial) @ 14:00:00
[KeepAlive] ✓ n8n responded OK
[KeepAlive] Ping (initial) @ 14:10:00
[KeepAlive] ✓ n8n responded OK
[KeepAlive] Ping (initial) @ 14:20:00
[KeepAlive] ✓ n8n responded OK
```

### ⚠️ **Cold Start** (normal após inactividade)
```
[KeepAlive] Ping (initial) @ 14:30:00
[KeepAlive] Cold-start detected — retry in 35s
[KeepAlive] Ping (retry) @ 14:30:35
[KeepAlive] ✓ n8n responded OK
```

### ❌ **Problemas** (requer acção)
```
[KeepAlive] ✗ n8n unhealthy: error 503 — Database is not ready
[KeepAlive] ✗ n8n unhealthy: error 403 — Invalid API key
[KeepAlive] 8 failures — auto-disabling
```

---

## 🔐 Validar Configuração n8n (Render)

### Environment Variables no Render:
```bash
N8N_HOST=0.0.0.0
N8N_PORT=10000
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n-vision7.onrender.com/
N8N_ENCRYPTION_KEY=[SECRET]
DB_POSTGRESDB_HOST=[Render PostgreSQL host]
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=[user]
DB_POSTGRESDB_PASSWORD=[password]
```

### Testar n8n API Key:
```bash
# Testar direto no Render
curl -H "X-N8N-API-KEY: seu-api-key" \
  https://n8n-vision7.onrender.com/api/v1/workflows?limit=1
```

Se retornar workflows → API key válida ✅  
Se retornar `403 Forbidden` → API key inválida ❌

---

## 📝 Checklist Final

- [ ] Build passou (0 erros) ✅
- [ ] Lint passou (0 warnings) ✅
- [ ] Keep-Alive toggle **LIGADO** na dashboard
- [ ] Console mostra `[KeepAlive] ✓ n8n responded OK`
- [ ] Dashboard mostra **"n8n Online"** (badge verde)
- [ ] Pipeline card carrega workflows WF-01, WF-02, WF-03
- [ ] Render service n8n mostra "Running" (não "Suspended")
- [ ] Supabase Edge Function `n8n-proxy` deployed

---

## 🚀 Próximos Passos (se tudo funcional)

1. **Deixar Keep-Alive ligado 24/7** (persiste via localStorage)
2. **Monitoring:** Verificar console 1x por dia para garantir que pings funcionam
3. **Render logs:** Se n8n suspender mesmo com pings → investigar Render Free Tier limits
4. **Upgrade Render:** Se precisar de uptime garantido, considerar **Render Starter Plan** ($7/mês)

---

**Última atualização:** 9 Abril 2026  
**Autor:** GitHub Copilot  
**Versão:** 2.0 (Polling adaptativo + Cold-start retry automático)
