# 🔐 CÓDIGO ESSENCIAL - REFERÊNCIA RÁPIDA

## Autenticação & Autorização

### AuthContext.tsx - Sistema de Roles
```typescript
// ✅ Como funciona:
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 🔴 Problema: Only boolean isAdmin, no multi-role support
// Usar: isAdmin para gating de admin dashboard

// ⚠️ Race condition aqui:
const checkAdminRole = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  
  return !!data;
};

// ⚠️ setTimeout race condition - MELHORAR:
if (session?.user) {
  setTimeout(() => {
    checkAdminRole(session.user.id).then(setIsAdmin);
  }, 0);  // ❌ Não garante ordem
}

// ✅ Melhor: usar Promise.all
```

### Protected Route Pattern
```typescript
// Em App.tsx - falta implementar!
interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, requiredRole = 'admin' }) => {
  const { user, isAdmin, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" />;
  
  return element;
};

// Uso:
// <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
```

---

## Database Segurança

### RLS Function - has_role()
```sql
-- Arquivo: supabase/migrations/20260202183547_...sql
-- SECURITY DEFINER = executa com permissão da função, não do user

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE                    -- ✅ Cacheável
SECURITY DEFINER          -- ✅ Executa como POSTGRES (não como user)
SET search_path = public  -- ✅ Evita search_path injection
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ✅ Como é usado em policies:
CREATE POLICY "Only admins can manage posts"
    ON public.posts FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));
```

### RLS Policy Pattern
```sql
-- ✅ BOA: Pública read, admin write
CREATE POLICY "Public can view published posts"
    ON public.posts FOR SELECT
    USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can create posts"
    ON public.posts FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ❌ MÁ: Qualquer um pode fazer o quê
CREATE POLICY "Anyone can subscribe to newsletter"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);  -- Sem validação!
```

### Trigger de Timestamp
```sql
-- ✅ Automático updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Frontend Validações

### Input Validation Pattern
```typescript
// ✅ Newsletter email validation
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Validar presença
  if (!email || !email.includes('@')) {
    toast({
      title: "Erro",
      description: "Por favor insira um email válido.",
      variant: "destructive",
    });
    return;
  }
  
  // 2. Chamar hook mutação
  try {
    await subscribe.mutateAsync(email);
    setSubscribed(true);
  } catch (error) {
    toast({ title: "Erro", description: error.message });
  }
};
```

### File Upload Validation
```typescript
// ✅ Em PostForm.tsx
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 1. Validar tipo MIME
  if (!file.type.startsWith('image/')) {
    toast({ 
      title: "Erro", 
      description: "Por favor selecione um ficheiro de imagem.",
      variant: "destructive" 
    });
    return;
  }

  // 2. Validar tamanho (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    toast({ 
      title: "Erro", 
      description: "A imagem não pode ter mais de 5MB.",
      variant: "destructive" 
    });
    return;
  }

  // 3. Upload seguro
  setIsUploading(true);
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    setFormData({ ...formData, image_url: publicUrl });
  } catch (error) {
    toast({ title: "Erro", description: error.message });
  } finally {
    setIsUploading(false);
  }
};
```

### Slug Generation
```typescript
// ✅ Padrão seguro de slug
const generateSlug = (title: string) => {
  return title
    .toLowerCase()                           // lowercase
    .normalize('NFD')                        // decompose accents
    .replace(/[\u0300-\u036f]/g, '')        // remove accents
    .replace(/[^a-z0-9\s-]/g, '')           // remove special chars
    .replace(/\s+/g, '-')                   // spaces to hyphens
    .replace(/-+/g, '-')                    // collapse hyphens
    .trim();                                // trim edges
};

// Exemplo:
// "Meu Artigo Sobre Node.js!"
// → "meu-artigo-sobre-nodejs"
```

---

## Segurança (Atualmente Fraca)

### 🔴 XSS Vulnerability - Post.tsx
```typescript
// ❌ PERIGOSO - Sanitização necessária:
<div 
  className="prose prose-lg max-w-none text-foreground dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>

// ✅ SOLUÇÃO: Usar DOMPurify
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(post.content, {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 
    'h1', 'h2', 'h3', 
    'blockquote', 'a', 'img', 
    'ul', 'ol', 'li'
  ],
  ALLOWED_ATTR: ['href', 'src', 'title', 'alt', 'target']
});

<div dangerouslySetInnerHTML={{ __html: cleanHTML }} />
```

### 🔴 Token em localStorage
```typescript
// ❌ RISCO XSS:
auth: {
  storage: localStorage,    // Acessível via console!
  persistSession: true,
  autoRefreshToken: true,
}

// ✅ MELHOR: sessionStorage (mas ainda XSS vulnerable)
// ✅ IDEAL: HTTP-only cookie via Service Worker
```

### 🔴 Auto-Admin Trigger
```sql
-- ❌ REMOVER ISTO - Qualquer registado vira admin!
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin_role();

-- ✅ Sistema de Aprovação:
CREATE TABLE registration_invites (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('sent', 'accepted', 'used')),
  created_at TIMESTAMP DEFAULT now()
);

-- Ou criar aba no admin para aprovar registos
```

---

## Hooks Essenciais

### usePosts - CRUD Pattern
```typescript
// ✅ READ - Publicados (público)
export const usePosts = (adminView = false) => {
  return useQuery({
    queryKey: ['posts', adminView],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          categories (id, name, slug, color)
        `)
        .order('created_at', { ascending: false });
      
      if (!adminView) {
        query = query.eq('status', 'published');  // ✅ RLS garante
      }
      
      const { data, error } = await query;
      if (error) throw new Error(`Failed: ${error.message}`);
      return (data as Post[]) ?? [];
    },
    retry: 1,
  });
};

// ✅ CREATE
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          ...postData,
          published_at: postData.status === 'published' 
            ? new Date().toISOString() 
            : null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ✅ UPDATE
export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...postData }: UpdatePostData) => {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...postData,
          published_at: postData.status === 'published' 
            ? new Date().toISOString() 
            : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ✅ DELETE
export const useDeletePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
```

### useTheme - Dark Mode
```typescript
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      
      // Respeitar preferência do sistema
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

// Uso em componente:
// const { theme, toggleTheme } = useTheme();
// <button onClick={toggleTheme}>Toggle {theme} mode</button>
```

---

## Componentes Admin

### PostForm - Upload seguro
```typescript
// Arquivo: src/components/admin/PostForm.tsx

const PostForm: React.FC<PostFormProps> = ({ post, onClose }) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category_id: post?.category_id || '',
    image_url: post?.image_url || '',
    author_name: post?.author_name || 'Redação',
    tags: post?.tags?.join(', ') || '',
    read_time: post?.read_time || '5 min',
    featured: post?.featured || false,
    status: post?.status || 'draft',
  });

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();

    try {
      const slug = generateSlug(formData.title);
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const postData: CreatePostData = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt,
        content: formData.content,
        image_url: formData.image_url,
        category_id: formData.category_id || null,
        author_name: formData.author_name,
        tags: tagsArray,
        read_time: formData.read_time,
        featured: formData.featured,
        status: publish ? 'published' : 'draft',
      };

      if (post?.id) {
        await updatePost.mutateAsync({ id: post.id, ...postData });
        toast({ title: "Sucesso", description: "Post atualizado!" });
      } else {
        await createPost.mutateAsync(postData);
        toast({ title: "Sucesso", description: "Post criado!" });
      }

      onClose();
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };
};
```

---

## Theme Configuration

### Tailwind - Cores Principal/Secundária
```typescript
// tailwind.config.ts

const config = {
  darkMode: ["class"],  // ✅ Dark mode via .dark class
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          // ... até 900
          600: 'hsl(var(--primary-600))',    // ✅ Cor principal
        },
        secondary: {
          600: 'hsl(var(--secondary-600))',  // ✅ Cor complementar
        },
      }
    }
  }
};

// Em src/index.css:
:root {
  --primary-600: 16 95% 56%;    /* #EA580C - Laranja */
  --secondary-600: 226 91% 46%; /* #4F46E5 - Índigo */
}

.dark {
  --primary-600: 16 95% 64%;    /* Mais claro em dark */
  --secondary-600: 226 91% 72%;
}
```

### Google Fonts
```css
/* src/index.css */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

/* Uso:
   - Playfair Display: Títulos, Headlines
   - Inter: Body, UI components
*/
```

---

## Verificação de Segurança Rápida

```bash
# 1. Verificar XSS risks
grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx"

# 2. Verificar localStorage usage
grep -r "localStorage" src/ --include="*.tsx"

# 3. Verificar passwords hardcoded
grep -r "password.*=" src/ pages/ --include="*.tsx" | grep -v "onChange"

# 4. Verificar TODO/FIXME
grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts*"

# 5. Verificar console.log (production)
grep -r "console\.(log\|warn\|error)" src/ --include="*.ts*"
```

---

## Checklist de Deploy

### Antes de Produção
- [ ] Remover console.log/console.error
- [ ] Habilitar modo production do React
- [ ] Testar all roles (admin, editor, user)
- [ ] Testar RLS policies
- [ ] Configurar CORS headers
- [ ] Verificar .env variables
- [ ] Backup do BD
- [ ] SSL/TLS certificado
- [ ] WAF rules
- [ ] Monitoring/alertas

### Pós Deploy
- [ ] Verificar logs de erro
- [ ] Teste de carga
- [ ] Teste de segurança (OWASP)
- [ ] Feedback dos users
- [ ] Métricas de performance

