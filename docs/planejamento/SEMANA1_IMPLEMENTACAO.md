# ⚡ GUIA RÁPIDO - COMEÇAR SEMANA 1 (Críticas)

**Objetivo:** Corrigir vulnerabilidades críticas em 4-5 dias  
**Duração:** 40 horas  
**Prioridade:** 🔴 CRÍTICA

---

## 🚨 O QUE FAZER HOJE (2-4 horas)

### 1. REMOVER AUTO-ADMIN TRIGGER (30min)

**Problema:** Todo novo usuário nasce como admin (BUG CRÍTICO!)

**Solução:**

```bash
# 1. Criar nova migration
touch supabase/migrations/20260323084000_remove_auto_admin.sql
```

**Arquivo:** `supabase/migrations/20260323084000_remove_auto_admin.sql`
```sql
-- Remove auto-admin trigger (CRÍTICA)
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_admin_role();

-- Create registration_invites table (approval flow)
CREATE TABLE public.registration_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'redator',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + INTERVAL '7 days',
  status TEXT DEFAULT 'pending' -- pending, used, expired
);

ALTER TABLE public.registration_invites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invites
CREATE POLICY "Only super-admin can create invites"
  ON public.registration_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view invites"
  ON public.registration_invites FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- New function to assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_from_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.registration_invites;
BEGIN
  -- Look for valid invite
  SELECT * INTO invite_record
  FROM public.registration_invites
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
  
  IF invite_record IS NOT NULL THEN
    -- Assign role from invite
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.role);
    
    -- Mark invite as used
    UPDATE public.registration_invites
    SET used_at = now(), status = 'used'
    WHERE id = invite_record.id;
  ELSE
    -- No valid invite = cannot register (revert transaction)
    RAISE EXCEPTION 'Invalid or expired registration invite';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invite validation
CREATE TRIGGER on_auth_user_created_from_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_from_invite();
```

**Executar:**
```bash
cd /workspaces/lusitania-digital-pulse
supabase migration up
```

### 2. INSTALAR DOMPURIFY (10min)

```bash
npm install dompurify @types/dompurify
```

### 3. FIX XSS EM POST.TSX (30min)

**Arquivo:** `src/pages/Post.tsx`

**Antes:**
```tsx
{/* VULNERABLE */}
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

**Depois:**
```tsx
import DOMPurify from 'dompurify';

// Na renderização
<div className="prose dark:prose-invert">
  {/* SAFE */}
  <div dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(post.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]*(?:[^a-z+.\-:]|$))/i,
    }) 
  }} />
</div>
```

### 4. MOVER TOKEN PARA SESSIONSTORAGE (15min)

**Arquivo:** `src/integrations/supabase/client.ts`

**Antes:**
```tsx
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,  // ❌ VULNERABLE
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
```

**Depois:**
```tsx
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: sessionStorage,  // ✅ SEGURO
      autoRefreshToken: true,
      persistSession: false,     // ✅ Don't persist to storage
      detectSessionInUrl: true,
      flowType: 'pkce',         // ✅ Use PKCE flow
    }
  }
);
```

### 5. FIX RACE CONDITION (1-2 horas)

**Arquivo:** `src/contexts/AuthContext.tsx`

**Problema:** `checkAdminRole()` é async mas pode não terminar antes de render

**Antes:**
```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // ❌ Race condition - não aguarda
      if (session?.user) {
        setTimeout(() => {
          checkAdminRole(session.user.id).then(setIsAdmin);
        }, 0);  // Too quick!
      }
      
      setIsLoading(false);  // ❌ Antes de admin check terminar
    }
  );
  
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      checkAdminRole(session.user.id).then(setIsAdmin);  // ❌ Não aguarda
    }
    
    setIsLoading(false);  // ❌ Antes de terminar
  });
  
  return () => subscription.unsubscribe();
}, []);
```

**Depois:**
```tsx
useEffect(() => {
  let isMounted = true;
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {  // 👈 async
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const isAdmin = await checkAdminRole(session.user.id);
          if (isMounted) setIsAdmin(isAdmin);
        } catch (error) {
          console.error('Error checking admin role:', error);
          if (isMounted) setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      if (isMounted) setIsLoading(false);  // ✅ Só quando tudo pronto
    }
  );
  
  // Also check for existing session
  const initSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const isAdmin = await checkAdminRole(session.user.id);
        if (isMounted) setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false);
      }
      
      if (isMounted) setIsLoading(false);
    } catch (error) {
      console.error('Error initializing session:', error);
      if (isMounted) setIsLoading(false);
    }
  };
  
  initSession();
  
  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### 6. CRIAR AUDIT LOGS TABLE (1 hora)

**Arquivo:** `supabase/migrations/20260323082000_audit_logs.sql`

```sql
-- Audit logs for tracking user actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only super-admin can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to log actions
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    status,
    error_message
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent',
    p_status,
    p_error_message
  );
END;
$$;

-- Trigger para log automático em posts
CREATE TRIGGER audit_post_changes
AFTER INSERT OR UPDATE OR DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION log_action(
  CASE 
    WHEN TG_OP = 'INSERT' THEN 'post_created'
    WHEN TG_OP = 'UPDATE' THEN 'post_updated'
    WHEN TG_OP = 'DELETE' THEN 'post_deleted'
  END,
  'posts',
  COALESCE(NEW.id, OLD.id),
  to_jsonb(OLD),
  to_jsonb(NEW)
);
```

**Executar:**
```bash
supabase migration up
```

---

## ✅ SEGUNDA FASE - SETUP DE ROLES (Rest of Semana 1)

### 7. EXPANDIR TIPOS DE ROLES

**Arquivo:** `supabase/migrations/20260323083000_expand_roles.sql`

```sql
-- Alterar enum de roles
ALTER TYPE public.app_role ADD VALUE 'super_admin' BEFORE 'admin';
-- ALTER TYPE public.app_role ADD VALUE 'editor';
-- ALTER TYPE public.app_role ADD VALUE 'redator';
-- ALTER TYPE public.app_role ADD VALUE 'moderador';
-- ALTER TYPE public.app_role ADD VALUE 'analyst';

-- Se precisar adicionar roles que JÁ existem, criar tipo NOVO:
-- CREATE TYPE public.app_role_new AS ENUM ('super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst');
-- Depois migrar dados e dropar antigo
```

### 8. CRIAR PERMISSIONS MATRIX TABLE

```sql
-- New permissions table
CREATE TABLE public.permissions_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.permissions_matrix (role, permissions) VALUES
  ('super_admin', '{
    "posts": ["create", "read", "update", "delete"],
    "users": ["create", "read", "update", "delete", "revoke"],
    "analytics": ["read"],
    "audit": ["read"],
    "settings": ["read", "write"],
    "roles": ["read", "write"],
    "2fa": ["read", "write"]
  }'::jsonb),
  ('admin', '{
    "posts": ["create", "read", "update", "delete"],
    "users": ["create", "read", "update"],
    "analytics": ["read"],
    "audit": ["read"],
    "settings": ["read", "write"],
    "roles": ["read"]
  }'::jsonb),
  ('editor', '{
    "posts": ["read", "update", "publish"],
    "comments": ["read", "delete"],
    "analytics": ["read"],
    "newsletter": ["read"]
  }'::jsonb),
  ('redator', '{
    "posts": ["create", "read", "update"],
    "analytics": ["read_own"]
  }'::jsonb),
  ('moderador', '{
    "comments": ["read", "delete"],
    "users_comments": ["ban"]
  }'::jsonb),
  ('analyst', '{
    "analytics": ["read"],
    "reports": ["export"]
  }'::jsonb);

ALTER TABLE public.permissions_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read permissions matrix"
  ON public.permissions_matrix FOR SELECT
  USING (true);
```

### 9. CRIAR NEW AUTH CONTEXT (com roles múltiplos)

**Arquivo:** `src/contexts/PermissionContext.tsx` (novo)

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'editor' | 'redator' | 'moderador' | 'analyst';

interface PermissionContextType {
  user: User | null;
  roles: AppRole[];
  hasRole: (role: AppRole | AppRole[]) => boolean;
  hasPermission: (feature: string, action: string) => boolean;
  isLoading: boolean;
  canAccess: {
    managePosts: boolean;
    manageUsers: boolean;
    viewAnalytics: boolean;
    viewAudit: boolean;
    manageSettings: boolean;
    manageRoles: boolean;
    revokeAccess: boolean;
  };
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    
    return (data || []).map(r => r.role as AppRole);
  };

  const hasRole = (roleToCheck: AppRole | AppRole[]): boolean => {
    const rolesToCheck = Array.isArray(roleToCheck) ? roleToCheck : [roleToCheck];
    return rolesToCheck.some(r => roles.includes(r));
  };

  const hasPermission = (feature: string, action: string): boolean => {
    // Check permissions_matrix table
    // This is simplified - you'd want to cache this
    return true; // TODO: Implement permission checking
  };

  const canAccess = {
    managePosts: hasRole(['super_admin', 'admin', 'editor']),
    manageUsers: hasRole(['super_admin', 'admin']),
    viewAnalytics: hasRole(['super_admin', 'admin', 'editor', 'analyst']),
    viewAudit: hasRole(['super_admin', 'admin']),
    manageSettings: hasRole(['super_admin', 'admin']),
    manageRoles: hasRole(['super_admin']),
    revokeAccess: hasRole(['super_admin']),
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userRoles = await fetchUserRoles(session.user.id);
          setRoles(userRoles);
        } else {
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userRoles = await fetchUserRoles(session.user.id);
        setRoles(userRoles);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PermissionContext.Provider value={{ user, roles, hasRole, hasPermission, isLoading, canAccess }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};
```

---

## 🎯 CHECKLIST SEMANA 1

- [ ] **Dia 1**: Remover auto-admin trigger + setup registration_invites
- [ ] **Dia 1**: XSS fix com DOMPurify
- [ ] **Dia 2**: Token -> sessionStorage
- [ ] **Dia 2**: Race condition fix em AuthContext
- [ ] **Dia 3**: Criar audit_logs table + trigger
- [ ] **Dia 3-4**: Expandir roles enum + permissions_matrix
- [ ] **Dia 4-5**: Criar PermissionContext
- [ ] **Dia 5**: Testes + validação

---

## 🧪 COMO TESTAR CADA FIX

### Testar Auto-Admin Fix
```bash
# 1. Criar novo usuário
# 2. Verification: new user NÃO deve ser admin
# 3. Super-admin deve enviar invite
# 4. Novo usuário para registrar com invite válido
```

### Testar DOMPurify
```bash
# 1. Criar post com HTML malicioso
# <img src=x onerror="alert('XSS')" />
# 2. Post deve renderizar SEM executar script
# 3. Check browser console - sem errors
```

### Testar sessionStorage
```javascript
// Console browser
console.log(sessionStorage.getItem('sb-token'));  // ✅ Should exist during session
console.log(localStorage.getItem('sb-token'));     // ✅ Should NOT exist
// Refresh page
console.log(sessionStorage.getItem('sb-token'));  // ✅ Session continues
// Close browser/tab
// Reopen
console.log(sessionStorage.getItem('sb-token'));  // ❌ Token gone (good!)
```

### Testar Race Condition Fix
```tsx
// Add console logs em AuthContext.tsx
console.log('1. Auth state changed');
console.log('2. User:', user?.email);
console.log('3. isAdmin:', isAdmin);
console.log('4. isLoading:', isLoading);

// Deve seguir ordem e nunca ter race condition
```

---

## 📊 PROGRESSO ESPERADO

| Tarefa | Estimativa | Status | Notas |
|--------|-----------|--------|-------|
| Auto-admin trigger | 30min | ⏳ | Crítica |
| DOMPurify XSS | 30-45min | ⏳ | Crítica |
| sessionStorage | 15-30min | ⏳ | Crítica |
| Race condition | 1-2h | ⏳ | Alta |
| Audit logs | 1h | ⏳ | Alta |
| Expand roles | 2-3h | ⏳ | Alta |
| Permissions matrix | 1.5-2h | ⏳ | Alta |
| PermissionContext | 3-4h | ⏳ | Média |
| **TOTAL SEMANA 1** | **~12-16h** | | |

---

## 🆘 PROBLEMAS COMUNS

### "Erro na migration"
```bash
# Solução 1: Reset local
supabase db reset

# Solução 2: Check syntax
psql "postgresql://..." < migration.sql
```

### "Tabela já existe"
```sql
-- No migration, use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.registration_invites (...)
```

### "Token não encontrado"
```bash
# Verificar supabase/migrations/ para saber se rodou
supabase migration list

# Forçar reset
supabase db reset --force
```

---

## 📞 NEXT STEPS

✅ **Quando terminar Semana 1:**
1. Testar cada correção
2. Códigos devem estar em produção
3. Começar Semana 2: Dashboards personalizadas

---

**Duração Estimada:** 12-16 horas  
**Ideal para:** 2 devs em paralelo  
**Deadline:** Sexta-feira (28 Março 2026)
