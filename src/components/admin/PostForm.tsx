import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { usePostCategories, useSetPostCategories } from '@/hooks/usePostCategories';
import RichTextEditor from './RichTextEditor';
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

  const { data: existingPostCategories } = usePostCategories(post?.id ?? null);
  const setPostCategories = useSetPostCategories();
  const categoriesInitRef = useRef(false);

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

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const createCategory = useCreateCategory();
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
            
            <div className="space-y-2">
              <Label>Categorias</Label>
              <div className="rounded-md border border-input bg-background p-3 space-y-2 max-h-40 overflow-y-auto">
                {categories?.length ? (
                  categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategoryId(cat.id)}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma categoria disponível</p>
                )}
              </div>
              {selectedCategoryIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCategoryIds.length} categoria{selectedCategoryIds.length > 1 ? 's' : ''} selecionada{selectedCategoryIds.length > 1 ? 's' : ''}
                </p>
              )}
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowNewCategory(!showNewCategory)} title="Nova categoria">
                  <Plus className="h-3.5 w-3.5" /> Nova
                </Button>
              </div>
              {showNewCategory && (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome da nova categoria"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newCategoryName.trim() || createCategory.isPending}
                    onClick={async () => {
                      const name = newCategoryName.trim();
                      if (!name) return;
                      try {
                        const slug = generateSlug(name);
                        const result = await createCategory.mutateAsync({ name, slug, color: 'bg-blue-600' });
                        setSelectedCategoryIds((prev) => [...prev, result.id]);
                        setNewCategoryName('');
                        setShowNewCategory(false);
                        toast({ title: 'Categoria criada', description: `"${name}" adicionada.` });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erro ao criar categoria.';
                        toast({ title: 'Erro', description: message, variant: 'destructive' });
                      }
                    }}
                  >
                    {createCategory.isPending ? 'A criar...' : 'Criar'}
                  </Button>
                </div>
              )}
            </div>
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

          <div className="space-y-2">
            <Label>Imagem do Post</Label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-full max-w-md h-48 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary-600 dark:hover:border-primary-400 transition-colors"
                >
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-foreground">
                    {isUploading ? 'A carregar...' : 'Clique para carregar uma imagem'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'A carregar...' : 'Carregar Imagem'}
                </Button>
                <span className="text-xs text-muted-foreground">ou</span>
                <Input
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({...formData, image_url: e.target.value});
                    setImagePreview(e.target.value || null);
                  }}
                  placeholder="Cole o URL de uma imagem"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banner do Post (fundo do card)</Label>
            <p className="text-xs text-muted-foreground">Imagem panorâmica usada como fundo do card e hero da página. Recomendado: 1200×400px.</p>
            <div className="space-y-3">
              {bannerPreview ? (
                <div className="relative inline-block w-full">
                  <img src={bannerPreview} alt="Banner preview" className="w-full max-w-lg h-32 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary-600 dark:hover:border-primary-400 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-foreground">
                    {isBannerUploading ? 'A carregar...' : 'Clique para carregar um banner'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB — formato panorâmico</p>
                </div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isBannerUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isBannerUploading ? 'A carregar...' : 'Carregar Banner'}
                </Button>
                <span className="text-xs text-muted-foreground">ou</span>
                <Input
                  value={formData.banner_url}
                  onChange={(e) => {
                    setFormData({...formData, banner_url: e.target.value});
                    setBannerPreview(e.target.value || null);
                  }}
                  placeholder="Cole o URL de um banner"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

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
          
          <div className="flex space-x-4">
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
