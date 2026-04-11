# 📊 ANÁLISE ARQUITETURAL COMPLETA - Lusitânia Digital Pulse

**Data:** 23 de Março, 2026 | **Status:** Porto em Produção

---

## 📑 ÍNDICE
1. [Sistema de Autenticação](#1-sistema-de-autenticação)
2. [Estrutura de Base de Dados](#2-estrutura-de-base-de-dados)
3. [Componentes Admin](#3-componentes-admin)
4. [Sistema de Temas](#4-sistema-de-temas)
5. [Segurança Implementada](#5-segurança-implementada)
6. [Gaps e Vulnerabilidades](#6-gaps-e-vulnerabilidades)
7. [Recomendações Imediatas](#7-recomendações-imediatas)

---

## 1. SISTEMA DE AUTENTICAÇÃO

### Arquivo Principal
**Path:** [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

### Arquitetura Atual
```typescript
interface AuthContextType {
  user: User | null;           // Usuário Supabase autenticado
  session: Session | null;     // Sessão ativa
  isAdmin: boolean;            // Flag boolean simples
  isLoading: boolean;          // Estado de carregamento
  signIn: (email, password) => Promise<{ error }>
  signUp: (email, password) => Promise<{ error }>
  signOut: () => Promise<void>
}
```

### Fluxo de Verificação de Role
1. **AuthProvider** → Setup listener do Supabase (`onAuthStateChange`)
2. **checkAdminRole()** → Query table `user_roles`:
```sql
SELECT role FROM user_roles 
WHERE user_id = '{userId}' AND role = 'admin'
```
3. **Resultado** → `setIsAdmin(boolean)`

### Roles Existentes
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
```
- ✅ **admin**: Acesso total (gerenciar conteúdo, configurações, usuários)
- ✅ **moderator**: Moderação (não implementado no frontend)
- ✅ **user**: Utilizador padrão (não verificado)

### Problemas Identificados

| Problema | Severidade | Descrição |
|----------|-----------|-----------|
| **Role único em boolean** | 🔴 Alta | Só há `isAdmin` - não suporta múltiplos roles |
| **Delay na verificação** | 🟡 Média | `setTimeout(..., 0)` para checker role cria race condition |
| **Sem cache de roles** | 🟡 Média | Fetch de role a cada changeState do auth |
| **Sem revogação de sessão** | 🔴 Alta | Admin não pode revogar token de outro user |
| **Sem 2FA/MFA** | 🔴 Alta | Apenas email/password - sem autenticação multi-fator |

### Cliente Supabase
**Path:** [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)

```typescript
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,           // ⚠️ Não é secure (XSS exposto)
      persistSession: true,
      autoRefreshToken: true,          // ✅ Bom
    }
  }
);
```

---

## 2. ESTRUTURA DE BASE DE DADOS

### Tabelas Principais

#### 2.1 `user_roles` (Gestão de Roles)
```sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
```
✅ Suporta múltiplos roles por usuário (UNIQUE constraint permite n:n)

#### 2.2 `posts` (Conteúdo)
```sql
CREATE TABLE public.posts (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,           -- ⚠️ Armazena HTML bruto
    image_url TEXT,
    category_id UUID,
    author_id UUID,
    author_name TEXT,
    status TEXT CHECK (status IN ('draft', 'published')),
    featured BOOLEAN DEFAULT false,
    read_time TEXT,
    tags TEXT[] DEFAULT '{}',
    views INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at, updated_at TIMESTAMP
);
```

#### 2.3 `newsletter_subscribers` (Email)
```sql
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

#### 2.4 `site_settings` (Configuração)
```sql
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP
);
```

#### 2.5 `user_profiles` (Perfis de Usuário)
```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  role TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at, updated_at TIMESTAMP
);
```

#### 2.6 `podcasts` (Áudio)
```sql
CREATE TABLE public.podcasts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  audio_url TEXT,
  duration INTEGER,
  transcript TEXT,
  status TEXT CHECK (status IN ('draft', 'processing', 'published', 'archived')),
  category_id UUID,
  post_id UUID REFERENCES posts(id),
  tags TEXT[],
  views, downloads INTEGER,
  created_at, updated_at TIMESTAMP
);
```

#### 2.7 `courses` (Cursos)
```sql
CREATE TABLE public.courses (
  id UUID PRIMARY KEY,
  title, slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  level TEXT CHECK (level IN ('Iniciante', 'Intermediário', 'Avançado')),
  duration TEXT,
  category_id UUID,
  instructor TEXT,
  tags TEXT[],
  status TEXT CHECK (status IN ('draft', 'published', 'archived')),
  created_at, updated_at TIMESTAMP
);
```

### RLS (Row Level Security) Policies

#### 📋 Resumo de Policies Implementadas

| Tabela | Policy | Acesso | Segurança |
|--------|--------|--------|-----------|
| **user_roles** | Próprias roles | `user_id = auth.uid()` | ✅ |
| **user_roles** | Admin gerencia | `has_role(admin)` | ✅ |
| **posts** | Publicados públicos | `status = 'published'` | ✅ |
| **posts** | Admin vê tudo | `has_role(admin)` | ✅ |
| **categories** | Todos leem | `true` | ✅ |
| **categories** | Admin gerencia | `has_role(admin)` | ✅ |
| **newsletter** | Qualquer um subscreve | `true` | ⚠️ Spam risk |
| **newsletter** | Admin vê lista | `has_role(admin)` | ✅ |
| **site_settings** | Todos leem | `true` | ✅ |
| **site_settings** | Admin gerencia | `has_role(admin)` | ✅ |
| **podcasts** | Published ou owned | `status='published' OR admin` | ✅ |
| **courses** | Published ou owned | `status='published' OR admin` | ✅ |
| **push_subscriptions** | Qualquer um subscreve | `true` | ⚠️ No validation |
| **user_profiles** | Public profiles | `is_public=true OR auth.uid()=id` | ✅ |

#### Função de Segurança Crítica
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```
✅ **SECURITY DEFINER** - Executa com permissões da função, não do usuário

#### ⚠️ Problema Crítico
```sql
-- Automaticamente faz TODO novo usuário ADMIN!
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin_role();
```
🔴 **VULNERABILIDADE:** Qualquer pessoa registada vira admin automaticamente

### Storage Buckets
```
post-images/        ✅ RLS: Público ler, Admin upload
podcasts/           ✅ RLS: Público ler, Admin upload
transcripts/        ✅ RLS: Admin only
```

---

## 3. COMPONENTES ADMIN

### Estrutura de Arquivos
```
src/components/admin/
├── AdminStatsCards.tsx         # Cards de estatísticas
├── NewsletterManager.tsx       # Gestão newsletter
├── PostForm.tsx               # Criar/editar posts
├── PostsTable.tsx             # Listar posts
├── RichTextEditor.tsx         # Editor WYSIWYG (TipTap)
└── SiteSettingsManager.tsx    # Config do site
```

### 3.1 PostForm.tsx
**Path:** [src/components/admin/PostForm.tsx](src/components/admin/PostForm.tsx)

#### Funcionalidades
- ✅ Upload de imagem (validação: tipo + size 5MB)
- ✅ Editor rich text com TipTap
- ✅ Geração automática slug
- ✅ Draft/Publish toggle
- ✅ Tags e categorias

#### Validações Implementadas
```typescript
// Validação de imagem
if (!file.type.startsWith('image/')) { throw error; }
if (file.size > 5 * 1024 * 1024) { throw error; }

// Slug generation
generateSlug(title) → 
  lowercase → normalize NFD → remove accents → 
  replace spaces → kebab-case
```

#### ⚠️ Problemas
| Problema | Linha | Severidade |
|----------|-------|-----------|
| Sem sanitização de HTML | L246 | 🔴 XSS Risk |
| Sem rate limiting em upload | - | 🟡 DoS Risk |
| Sem validação de URL em link | - | 🟡 Malicious URL |

### 3.2 RichTextEditor.tsx
**Path:** [src/components/admin/RichTextEditor.tsx](src/components/admin/RichTextEditor.tsx)

```typescript
extensions: [
  StarterKit,              // Básico (bold, italic, etc)
  Underline,
  Link.configure({ openOnClick: false }),
  TextAlign.configure({ types: [...] }),
  ImageExtension,
  Placeholder
]

// ⚠️ Problema: addImage permite qualquer URL
addImage() {
  const url = window.prompt('URL da imagem:');  // Sem validação!
  if (url) editor.chain().focus().setImage({ src: url }).run();
}
```

### 3.3 AdminDashboard.tsx
**Path:** [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx)

- ✅ Verificação de auth (redireciona se não autenticado)
- ✅ Tabs: Overview, Posts, Newsletter, Settings
- ✅ CRUD de posts integrado
- ✅ Logout

```typescript
useEffect(() => {
  if (!authLoading && (!user || !isAdmin)) {
    navigate('/admin/login');
  }
}, [user, isAdmin, authLoading, navigate]);
```

### Hooks Utilizados
```typescript
// Posts
usePosts(adminView=true)           // Qualquer status
usePost(slug)                      // Publicado OU admin vê tudo
useCreatePost()                    // Mutation INSERT
useUpdatePost()                    // Mutation UPDATE
useDeletePost()                    // Mutation DELETE

// Admin
useAuth()                          // AuthContext
useSiteSettings()                  // Fetch site_settings
useUpdateSiteSetting()             // Update site_settings
useNewsletterStats()               // Newsletter analytics
```

---

## 4. SISTEMA DE TEMAS

### Implementação Dark/Light Mode
**Path:** [src/hooks/useTheme.ts](src/hooks/useTheme.ts)

```typescript
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  return { theme, toggleTheme };
};
```

### Sistema de Cores - Tailwind
**Path:** [tailwind.config.ts](tailwind.config.ts)

#### Paleta Primária (Laranja Sofisticado)
```css
Light Mode:
--primary-600: #EA580C (Cor Principal)
--primary-700: #C2410C (Hover)

Dark Mode:
--primary-600: 16 95% 64% (Mais claro em dark)
--primary-700: 15 90% 72%
```

#### Paleta Secundária (Índigo)
```css
Light Mode:
--secondary-600: #4F46E5 (Cor Principal)

Dark Mode:
--secondary-600: 226 91% 72%
```

#### Estrutura CSS
```css
:root { /* Light Mode */ }
.dark { /* Dark Mode */ }
```

### Fonte Typography
**Path:** [src/index.css](src/index.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
```

| Font | Uso | Peso |
|------|-----|------|
| **Playfair Display** | Títulos, Headlines | 400, 600, 700, 800 |
| **Inter** | Body, UI | 300, 400, 500, 600, 700 |

### Componentes UI
- ✅ Utilizados Radix UI + tailwindcss-animate
- ✅ 40+ componentes disponíveis (button, card, form, etc)
- ✅ Suporte completo dark mode via CSS classes

---

## 5. SEGURANÇA IMPLEMENTADA

### 5.1 Frontend Security

#### ✅ Checklist de Proteções

| Proteção | Status | Implementação |
|----------|--------|-----------------|
| **SSL/TLS** | ✅ | Supabase default HTTPS |
| **CSRF Protection** | ❌ | Não implementado |
| **Input Validation** | 🟡 | Parcial (email no newsletter) |
| **Output Encoding** | ❌ | Não (XSS risk em posts) |
| **Rate Limiting** | ❌ | Não (frontend) |
| **Authentication** | ✅ | Supabase Auth |
| **Authorization** | 🟡 | RLS + isAdmin flag |
| **Secrets Management** | ✅ | Env vars (.env) |
| **Error Handling** | ✅ | ErrorBoundary + try/catch |
| **Logging** | ⚠️ | Console.error apenas |

#### Validações Frontend Existentes

```typescript
// Email validation
if (!email || !email.includes('@')) {
  toast({ title: "Erro", description: "Email inválido" });
}

// Password validation
if (password.length < 6) {
  toast({ title: "Erro", description: "Min 6 caracteres" });
}

// File validation (PostForm)
if (!file.type.startsWith('image/')) { throw; }
if (file.size > 5 * 1024 * 1024) { throw; }
```

### 5.2 Backend Security (Supabase)

#### ✅ RLS Policies
- Todas as tabelas principais com RLS ENABLED
- Policies revisadas por tabela (ver seção 2)
- Function `has_role()` com SECURITY DEFINER

#### ✅ Rate Limiting
- Supabase realtime rate limits ativados
- Auth endpoints rate limited automaticamente

#### ✅ Trigger de Timestamp
```sql
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 5.3 Configuração de Segurança

**AuthContext:**
```typescript
auth: {
  storage: localStorage,          // ⚠️ Vulnerável a XSS
  persistSession: true,           // ✅ Mantém sessão entre reloads
  autoRefreshToken: true,         // ✅ Refresh automático
}
```

---

## 6. GAPS E VULNERABILIDADES

### 🔴 CRÍTICAS

#### 6.1 **XSS Vulnerability em Posts**
- **Arquivo:** [src/pages/Post.tsx](src/pages/Post.tsx#L126)
- **Linha:** 126
- **Código:**
```typescript
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```
- **Risco:** Admin pode injetar `<script>alert('xss')</script>` que roda para TODO leitor
- **Impacto:** Roubo de cookies, redirecionamento, malware
- **Solução:** Usar biblioteca sanitization (DOMPurify, xss-lib)

#### 6.2 **Auto-Admin para Novo Registado**
- **Arquivo:** [supabase/migrations/20260316094654_...sql](supabase/migrations/20260316094654_3224bdbe-379b-4734-b305-0d8b553d2e43.sql)
- **Linha:** ~7
- **Código:**
```sql
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin_role();
```
- **Risco:** Qualquer pessoa que se regista vira ADMIN
- **Impacto:** Acesso total ao dashboard, criação/exclusão de posts
- **Solução:** Remover trigger, criar sistema de convite/aprovação

#### 6.3 **Token Storage em localStorage (XSS Vulnerable)**
- **Arquivo:** [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)
- **Código:**
```typescript
storage: localStorage,  // ⚠️ Acessível via console
```
- **Risco:** Se XSS, attacker lê token via `localStorage.getItem('sb-token')`
- **Impacto:** Hijacking de sessão, compromisso de conta
- **Solução:** Considerar sessionStorage OU cookie HTTP-only via service worker

#### 6.4 **Sem Sanitização de Entrada HTML**
- **Locais:** PostForm, RichTextEditor
- **Risco:** Injeção de HTML/JavaScript via URL em `addImage()`
- **Solução:** Validar URLs com `new URL()`, sanitizar com DOMPurify

#### 6.5 **Sem Revogação de Token para Admin**
- **AuthContext não tem método de:** Logout forçado de outro user, revogação de sessão
- **Impacto:** Admin comprometido pode ser logado indefinidamente
- **Solução:** Implementar `force_sign_out` no Supabase

### 🟡 MÉDIAS

#### 6.6 **Race Condition em checkAdminRole()**
- **Arquivo:** [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L40-L50)
- **Problema:**
```typescript
setTimeout(() => {
  checkAdminRole(session.user.id).then(setIsAdmin);
}, 0);  // ⚠️ setTimeout pode não garantir ordem
```
- **Risco:** Dashboard carrega antes de role ser verificado
- **Solução:** Usar `Promise.all()` ou fazer sync antes de setLoading(false)

#### 6.7 **Sem Validação de Newsletter**
- **RLS Policy:**
```sql
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (true);  -- Sem validação
```
- **Risco:** Spam, inserção de emails falsos
- **Solução:** Email verification + double opt-in

#### 6.8 **Sem Validação de Push Notifications**
- **Mesmo problema:** Qualquer um pode subscrever sem validação
- **Solução:** Token validation, CORS headers

#### 6.9 **Auditoria Inexistente**
- **Problema:** Nenhuma tabela de logs para ações admin
- **Solução:** Criar `audit_logs` table com trigger em posts/users

#### 6.10 **Rate Limiting Insuficiente**
- **Problema:** Sem rate limiting em forms
- **Risco:** Brute force em login, newsletter spam
- **Solução:** Implementar rate limiting em edge functions

### 🟢 MODERADAS

#### 6.11 **Sem 2FA/MFA**
- **Apenas email/password**
- **Solução:** Integrar TOTP com `@supabase/auth-js`

#### 6.12 **Sem CORS Headers**
- **Problema:** Se API pública, sem proteção CORS
- **Solução:** Configurar Supabase CORS settings

#### 6.13 **Sem Criptografia End-to-End**
- **Senhas armazenadas no Supabase (bcrypt, ✅ seguro)**
- **Mas:** Posts em plain text no DB

#### 6.14 **Session Timeout Indefinido**
- **Tokens persistem em localStorage indefinidamente**
- **Solução:** Implementar refresh token rotation + expiry

#### 6.15 **Sem Validação de User Profiles**
- **URLs e twitter handles sem validação**
- **Risco:** XSS menor via bio
- **Solução:** Sanitizar user_profiles.bio com DOMPurify

---

## 7. RECOMENDAÇÕES IMEDIATAS

### 🚨 PRIORIDADE 1 (Fazer agora)

#### 1.1 Remover Auto-Admin Trigger
```sql
-- ❌ REMOVER ISTO:
DROP TRIGGER on_auth_user_created_assign_admin ON auth.users;

-- ✅ ADICIONAR sistema de aprovação:
CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT now()
);
```

#### 1.2 Implementar HTML Sanitization
```bash
# Instalar DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
// Em Post.tsx
import DOMPurify from 'dompurify';

// Antes de renderizar:
const cleanHTML = DOMPurify.sanitize(post.content, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'blockquote', 'a', 'img', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'src', 'title', 'alt', 'target']
});

<div dangerouslySetInnerHTML={{ __html: cleanHTML }} />
```

#### 1.3 Adicionar Validação de URLs
```typescript
// Em RichTextEditor.tsx
const addImage = () => {
  const url = window.prompt('URL da imagem:');
  if (url) {
    try {
      new URL(url); // Throws se URL inválida
      editor.chain().focus().setImage({ src: url }).run();
    } catch (e) {
      toast({ title: "Erro", description: "URL inválida" });
    }
  }
};
```

#### 1.4 Criar Sistema de Admin Approval
```typescript
// Em AdminRegister.tsx - criar flag para "pending"
const handleSubmit = async () => {
  await signUp(email, password);
  
  // Inserir em registration_requests
  await supabase
    .from('registration_requests')
    .insert({ email, status: 'pending' });
    
  toast({ title: "Pedido enviado para aprovação" });
};

// Em AdminDashboard - aba de aprovações
// Admin aprova/rejeita registos
```

---

### ⚡ PRIORIDADE 2 (Próximas 1-2 semanas)

#### 2.1 Implementar Audit Logging
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a posts, user_roles, etc
CREATE TRIGGER audit_posts AFTER INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION log_audit();
```

#### 2.2 Implementar Rate Limiting com Edge Function
```typescript
// supabase/functions/check-rate-limit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60; // segundos

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit:${ip}`;
  
  // Implementar com Redis/Upstash
  // ...
  
  return new Response(JSON.stringify({ allowed: true }), { headers: corsHeaders });
})
```

#### 2.3 Adicionar Newsletter Double Opt-In
```typescript
// Supabase: criar tabela de tokens de confirmação
CREATE TABLE public.newsletter_confirmations (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

// Frontend: enviar email com link de confirmação
// Link: /newsletter/confirm?token=xyz
// Usuário clica, confirma, insere em newsletter_subscribers
```

#### 2.4 Implementar Session Timeout
```typescript
// Em AuthContext.tsx
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const [inactivityTimer, setInactivityTimer] = useState<any>(null);

const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  
  const timer = setTimeout(() => {
    signOut();
    toast({ title: "Sessão expirada", description: "Por inatividade" });
  }, SESSION_TIMEOUT);
  
  setInactivityTimer(timer);
};

// Resetar ao cada interação do usuário
useEffect(() => {
  window.addEventListener('mousedown', resetInactivityTimer);
  window.addEventListener('keydown', resetInactivityTimer);
  
  return () => {
    window.removeEventListener('mousedown', resetInactivityTimer);
    window.removeEventListener('keydown', resetInactivityTimer);
  };
}, [inactivityTimer]);
```

---

### 📊 PRIORIDADE 3 (Roadmap)

#### 3.1 Multi-Role Support
```typescript
// Expandir AuthContext
interface AuthContextType {
  user: User | null;
  roles: ('admin' | 'editor' | 'moderator' | 'analyst')[];  // Array de roles
  canAccess: (role: string) => boolean;
  canPerform: (action: string) => boolean;
}

// Exemplo: Editor + Analyst
const roles = ['editor', 'analyst'];
canAccess('dashboard') ✅ true  (editor tem acesso)
canAccess('admin') ❌ false     (analyst não é admin)
```

#### 3.2 Implementar 2FA com TOTP
```typescript
// npm install @supabase/gotrue-js speakeasy qrcode.react

const setupTwoFactor = async () => {
  const { data } = await supabase.auth.mfa.enrollFactors({
    factorType: 'totp',
  });
  
  // Gerar QR code
  // Usuário scanneia com Google Authenticator
  // Verifica código antes de ativar
};
```

#### 3.3 Implementar Permissões Granulares
```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  UNIQUE(role, action, resource)
);

-- Exemplo:
INSERT INTO permissions VALUES 
  ('admin', 'create', 'post'),
  ('editor', 'create', 'post'),
  ('redator', 'create', 'post'),
  ('admin', 'delete', 'user'),
  ('moderator', 'update', 'post_status');
```

#### 3.4 API Public com Docs
```typescript
// export-api/posts - GET /api/posts?category=tech&limit=10
// OpenAPI/Swagger documentation
// Rate limiting via keys API
```

---

## 📈 MATRIZ DE RISCO

```
┌─────────────────────────────────────────────────────────────┐
│                    MATRIZ DE RISCO                          │
├─────────────────────────────────────────────────────────────┤
│ Criticidade vs Complexidade de Fix                           │
├─────────────────────────────────────────────────────────────┤
│
│  ALTO     │ Auto-Admin    │ XSS           │
│    ↑      │ (1 dia)       │ (2-3 dias)    │
│    │      │               │               │
│ C │      ├───────────────┼───────────────┤
│ r │      │ 2FA           │ Audit Logs    │
│ i │      │ (4 dias)      │ (2 dias)      │
│ t │      │               │               │
│ i │      ├───────────────┼───────────────┤
│ c │      │ Newsletter    │ Multi-role    │
│ a │      │ Validation    │ (5-7 dias)    │
│ l │      │ (1 dia)       │               │
│    │      │               │               │
│  BAIXO  ├───────────────┼───────────────┤
│         │  Fácil Fix    │ Complexo Fix  │
│         └───────────────┴───────────────┘
```

---

## 🎯 SUMÁRIO EXECUTIVO

### O que Está Bom
- ✅ RLS policies bem implementadas
- ✅ Autenticação via Supabase (segura por padrão)
- ✅ Dark/Light theme funcional
- ✅ Admin dashboard com CRUD básico
- ✅ Validações de file upload

### O que Precisa Melhorar
- 🔴 **Urgente:** Remover auto-admin, sanitizar HTML, validar URLs
- 🟡 **Importante:** Audit logs, rate limiting, session timeout
- 🟢 **Futuro:** Multi-role, 2FA, permissões granulares

### Esforço Estimado
- **Críticas:** 5-7 dias
- **Médias:** 10-15 dias
- **Roadmap:** 15-20 dias

---

## 📚 Referências Úteis

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Docs](https://supabase.com/docs/guides/auth)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [TypeScript Security Best Practices](https://www.typescriptlang.org/docs/)

---

**Análise completada em:** 23 de Março, 2026
**Próxima revisão:** Após implementação de PRIORIDADE 1
