import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import RichTextEditor from './RichTextEditor';
import { useCreatePost, useUpdatePost, CreatePostData, Post } from '@/hooks/usePosts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    author_name: post?.author_name || 'Redação',
    tags: post?.tags?.join(', ') || '',
    read_time: post?.read_time || '5 min',
    featured: post?.featured || false,
    status: post?.status || 'draft',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { toast } = useToast();

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
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao carregar imagem.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    const postData: CreatePostData = {
      title: formData.title,
      slug: generateSlug(formData.title),
      excerpt: formData.excerpt,
      content: formData.content,
      category_id: formData.category_id || undefined,
      image_url: formData.image_url || undefined,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao guardar o post.",
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
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-portugal-green transition-colors"
                >
                  <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {isUploading ? 'A carregar...' : 'Clique para carregar uma imagem'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</p>
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
                <span className="text-xs text-gray-500">ou</span>
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
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="featured" className="text-sm font-normal">
              Destacar este post
            </Label>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="bg-portugal-green hover:bg-portugal-green/90"
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
