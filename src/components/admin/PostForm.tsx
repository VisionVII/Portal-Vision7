import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import RichTextEditor from './RichTextEditor';
import { useCreatePost, useUpdatePost, CreatePostData, Post } from '@/hooks/usePosts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PostFormProps {
  post?: Post | null;
  onClose: () => void;
}

const PostForm: React.FC<PostFormProps> = ({ post, onClose }) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category_id: post?.category_id || '',
    image_url: post?.image_url || '',
    banner_url: post?.banner_url || '',
    author_name: post?.author_name || 'Redação',
    tags: post?.tags?.join(', ') || '',
    read_time: post?.read_time || '5 min',
    featured: post?.featured || false,
    status: post?.status || 'draft',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(post?.banner_url || null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const createCategory = useCreateCategory();
  const { toast } = useToast();
  const { user } = useAuth();

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
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: "Erro", description: message || "Erro ao carregar imagem.", variant: "destructive" });
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
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro', description: message || 'Erro ao carregar banner.', variant: 'destructive' });
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

    const uniqueSlug = await ensureUniqueSlug(generateSlug(formData.title), post?.id);

    const postData: CreatePostData = {
      title: formData.title,
      slug: uniqueSlug,
      excerpt: formData.excerpt,
      content: formData.content,
      category_id: formData.category_id || undefined,
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
        toast({
          title: "Sucesso",
          description: "Post atualizado com sucesso!",
        });
      } else {
        await createPost.mutateAsync(postData);
        toast({
          title: "Sucesso",
          description: publish ? "Post publicado com sucesso!" : "Rascunho guardado!",
        });
      }
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: message || "Ocorreu um erro ao guardar o post.",
        variant: "destructive",
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
              <Label htmlFor="category">Categoria</Label>
              <div className="flex gap-2">
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowNewCategory(!showNewCategory)} title="Nova categoria">
                  <Plus className="h-4 w-4" />
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
                        setFormData({ ...formData, category_id: result.id });
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
            <RichTextEditor
              content={formData.content}
              onChange={(html) => setFormData({...formData, content: html})}
              placeholder="Escreva o conteúdo completo do artigo..."
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
              disabled={createPost.isPending || updatePost.isPending}
            >
              {createPost.isPending || updatePost.isPending ? 'A guardar...' : 'Publicar Post'}
            </Button>
            <Button 
              type="submit" 
              variant="outline"
              disabled={createPost.isPending || updatePost.isPending}
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
