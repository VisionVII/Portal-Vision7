import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2 } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { usePostCategories, useSetPostCategories } from '@/hooks/usePostCategories';
import PostCategorySelector from './PostCategorySelector';
import PostImageUploadField from './PostImageUploadField';

const RichTextEditor = React.lazy(() => import('./RichTextEditor'));
import { useCreatePost, useUpdatePost, CreatePostData, Post } from '@/hooks/usePosts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  syncEditorialContentMetadata,
  estimateReadTimeFromHtml,
} from '@/lib/editorialPostTemplates';

interface PostFormProps {
  post?: Post | null;
  onClose: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: string;
      details?: string;
      hint?: string;
      error_description?: string;
    };

    const composedMessage = [
      maybeError.message,
      maybeError.details,
      maybeError.hint,
      maybeError.error_description,
    ]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(' — ');

    if (composedMessage) {
      return composedMessage;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

const PostForm: React.FC<PostFormProps> = ({ post, onClose }) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category_id: post?.category_id || '',
    image_url: post?.image_url || '',
    banner_url: post?.banner_url || '',
    author_name: post?.author_name || 'Equipa Vision7',
    tags: post?.tags?.join(', ') || '',
    read_time: post?.read_time || '5 min',
    featured: post?.featured || false,
    status: post?.status || 'draft',
  });

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    post?.category_id ? [post.category_id] : [],
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(post?.banner_url || null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: existingPostCategories } = usePostCategories(post?.id ?? null);
  const setPostCategories = useSetPostCategories();
  const categoriesInitRef = useRef(false);

  const postUrl = post?.slug ? `https://www.vision7.pt/post/${post.slug}` : '';

  const handleCopyPostLink = async () => {
    if (!postUrl) return;
    await navigator.clipboard.writeText(postUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  // Reset all form state when switching to a different post
  useEffect(() => {
    categoriesInitRef.current = false;
    setFormData({
      title: post?.title || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      category_id: post?.category_id || '',
      image_url: post?.image_url || '',
      banner_url: post?.banner_url || '',
      author_name: post?.author_name || 'Equipa Vision7',
      tags: post?.tags?.join(', ') || '',
      read_time: post?.read_time || '5 min',
      featured: post?.featured || false,
      status: post?.status || 'draft',
    });
    setSelectedCategoryIds(post?.category_id ? [post.category_id] : []);
    setImagePreview(post?.image_url || null);
    setBannerPreview(post?.banner_url || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  // Sync from DB junction table on load (overrides the single category_id default)
  useEffect(() => {
    if (existingPostCategories && existingPostCategories.length > 0 && !categoriesInitRef.current) {
      categoriesInitRef.current = true;
      setSelectedCategoryIds(existingPostCategories);
    }
  }, [existingPostCategories]);

  const toggleCategoryId = useCallback((catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const canPublish = hasRole('super_admin') || hasRole('admin') || hasRole('editor');
  const canSaveDraft = canPublish || hasRole('redator');

  useEffect(() => {
    setFormData((current) => {
      if (!current.content.trim()) {
        return current;
      }

      const nextContent = syncEditorialContentMetadata(current.content, {
        title: current.title,
        authorName: current.author_name,
        featuredImageUrl: current.image_url || current.banner_url || null,
      });

      if (nextContent === current.content) {
        return current;
      }

      return {
        ...current,
        content: nextContent,
        read_time: estimateReadTimeFromHtml(nextContent),
      };
    });
  }, [formData.author_name, formData.banner_url, formData.image_url, formData.title]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor selecione um ficheiro de imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem não pode ter mais de 5MB.", variant: "destructive" });
      return;
    }

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
      setImagePreview(publicUrl);
      toast({ title: "Sucesso", description: "Imagem carregada com sucesso!" });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao carregar imagem.');
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione um ficheiro de imagem.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'O banner não pode ter mais de 5MB.', variant: 'destructive' });
      return;
    }

    setIsBannerUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, banner_url: publicUrl });
      setBannerPreview(publicUrl);
      toast({ title: 'Sucesso', description: 'Banner carregado!' });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao carregar banner.');
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsBannerUploading(false);
    }
  };

  const removeBanner = () => {
    setFormData({ ...formData, banner_url: '' });
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const ensureUniqueSlug = async (baseSlug: string, currentPostId?: string) => {
    const slug = baseSlug;
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      let query = supabase.from('posts').select('id').eq('slug', candidate).limit(1);
      if (currentPostId) query = query.neq('id', currentPostId);
      const { data } = await query;
      if (!data || data.length === 0) return candidate;
      suffix++;
      if (suffix > 50) return `${slug}-${Date.now()}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast({
        title: "Erro",
        description: "Por favor preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (publish && !canPublish) {
      toast({
        title: 'Permissão insuficiente',
        description: 'O seu perfil pode trabalhar em rascunhos, mas apenas editores ou administradores podem publicar posts.',
        variant: 'destructive',
      });
      return;
    }

    if (!publish && !canSaveDraft) {
      toast({
        title: 'Permissão insuficiente',
        description: 'O seu perfil não tem permissão para guardar posts neste momento.',
        variant: 'destructive',
      });
      return;
    }

    const uniqueSlug = await ensureUniqueSlug(generateSlug(formData.title), post?.id);

    const postData: CreatePostData = {
      title: formData.title,
      slug: uniqueSlug,
      excerpt: formData.excerpt,
      content: formData.content,
      category_id: selectedCategoryIds[0] || undefined,
      image_url: formData.image_url || undefined,
      banner_url: formData.banner_url || undefined,
      author_id: user?.id,
      author_name: formData.author_name,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      read_time: formData.read_time,
      featured: formData.featured,
      status: publish ? 'published' : 'draft',
    };

    try {
      if (post) {
        await updatePost.mutateAsync({ id: post.id, ...postData });
        if (selectedCategoryIds.length > 0) {
          await setPostCategories.mutateAsync({ postId: post.id, categoryIds: selectedCategoryIds });
        }
        toast({
          title: "Sucesso",
          description: "Post atualizado com sucesso!",
        });
      } else {
        const created = await createPost.mutateAsync(postData);
        if (created?.id && selectedCategoryIds.length > 0) {
          await setPostCategories.mutateAsync({ postId: created.id, categoryIds: selectedCategoryIds });
        }
        toast({
          title: "Sucesso",
          description: publish ? "Post publicado com sucesso!" : "Rascunho guardado!",
        });
      }
      onClose();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Ocorreu um erro ao guardar o post.');
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{post ? 'Editar Post' : 'Criar Novo Post'}</CardTitle>
        <CardDescription>
          Preencha os campos abaixo para {post ? 'editar o' : 'criar um novo'} artigo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {post?.slug && (
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm text-muted-foreground">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Link do post</p>
                  <p className="break-all text-sm text-foreground">https://www.vision7.pt/post/{post.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    Este URL será o mesmo após publicação. Usuários finais verão o post apenas quando estiver publicado; admins autenticados podem usá-lo desde já.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyPostLink} className="gap-2">
                    <Link2 className="h-4 w-4" />
                    {copiedLink ? 'Copiado' : 'Copiar link'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Digite o título do post"
                required
              />
            </div>
            
            <PostCategorySelector
              categories={categories}
              selectedIds={selectedCategoryIds}
              onToggle={toggleCategoryId}
              onCreated={(catId) => setSelectedCategoryIds((prev) => [...prev, catId])}
              generateSlug={generateSlug}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={formData.author_name}
                onChange={(e) => setFormData({...formData, author_name: e.target.value})}
                placeholder="Nome do autor"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="read_time">Tempo de Leitura</Label>
              <Input
                id="read_time"
                value={formData.read_time}
                onChange={(e) => setFormData({...formData, read_time: e.target.value})}
                placeholder="5 min"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="excerpt">Resumo *</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
              placeholder="Breve descrição do artigo"
              required
            />
          </div>

          <PostImageUploadField
            label="Imagem do Post"
            preview={imagePreview}
            url={formData.image_url}
            isUploading={isUploading}
            inputRef={fileInputRef}
            onFileChange={handleImageUpload}
            onUrlChange={(url) => { setFormData({ ...formData, image_url: url }); setImagePreview(url || null); }}
            onRemove={removeImage}
            uploadLabel="Imagem"
            urlPlaceholder="Cole o URL de uma imagem"
          />

          <PostImageUploadField
            label="Banner do Post (fundo do card)"
            hint="Imagem panorâmica usada como fundo do card e hero da página. Recomendado: 1200×400px."
            preview={bannerPreview}
            url={formData.banner_url}
            isUploading={isBannerUploading}
            inputRef={bannerInputRef}
            onFileChange={handleBannerUpload}
            onUrlChange={(url) => { setFormData({ ...formData, banner_url: url }); setBannerPreview(url || null); }}
            onRemove={removeBanner}
            uploadLabel="Banner"
            urlPlaceholder="Cole o URL de um banner"
            previewClass="h-32"
          />

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="Tecnologia, Porto, Inovação"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo *</Label>
            <p className="text-xs text-muted-foreground">
              O editor aplica hierarquia visual em H1, H2, H3 e H4, reforca negrito, listas, citacoes, imagens e mantem o texto encaixado no padrao editorial selecionado.
            </p>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted/50" />}>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData((current) => ({
                  ...current,
                  content: html,
                  read_time: estimateReadTimeFromHtml(html),
                }))}
                placeholder="Escreva o conteúdo completo do artigo..."
                featuredImageUrl={formData.image_url || formData.banner_url || null}
              />
            </Suspense>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({...formData, featured: e.target.checked})}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="featured" className="text-sm font-normal">
              Destacar este post
            </Label>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
              disabled={createPost.isPending || updatePost.isPending || !canPublish}
              title={canPublish ? 'Publicar post' : 'Apenas editores e administradores podem publicar'}
            >
              {createPost.isPending || updatePost.isPending ? 'A guardar...' : 'Publicar Post'}
            </Button>
            <Button 
              type="submit" 
              variant="outline"
              disabled={createPost.isPending || updatePost.isPending || !canSaveDraft}
              title={canSaveDraft ? 'Guardar rascunho' : 'O seu perfil não pode criar rascunhos'}
            >
              Guardar como Rascunho
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PostForm;
