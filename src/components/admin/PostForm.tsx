import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { useCreatePost, useUpdatePost, CreatePostData, Post } from '@/hooks/usePosts';
import { useToast } from '@/hooks/use-toast';

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

  const { data: categories } = useCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { toast } = useToast();

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
            <Label htmlFor="image">URL da Imagem</Label>
            <Input
              id="image"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://images.unsplash.com/..."
            />
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
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Escreva o conteúdo completo do artigo..."
              className="min-h-[200px]"
              required
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
