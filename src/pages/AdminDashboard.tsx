
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Eye, PenTool } from 'lucide-react';

const AdminDashboard = () => {
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'tecnologia',
    image: ''
  });

  // Posts mockados para demonstração
  const mockPosts = [
    { id: 1, title: 'IA Revoluciona Indústria Portuguesa', category: 'Tecnologia', status: 'Publicado', date: '27 Jun 2025' },
    { id: 2, title: '5G Chega ao Porto', category: 'Tecnologia', status: 'Rascunho', date: '26 Jun 2025' },
    { id: 3, title: 'FC Porto Vence Champions', category: 'Desporto', status: 'Publicado', date: '25 Jun 2025' }
  ];

  const categories = [
    { value: 'tecnologia', label: 'Tecnologia' },
    { value: 'desporto', label: 'Desporto' },
    { value: 'musica', label: 'Música' },
    { value: 'saude', label: 'Saúde' },
    { value: 'mundo', label: 'Mundo' }
  ];

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Novo post:', newPost);
    alert('Funcionalidade será implementada após conectar ao Supabase');
    setShowNewPost(false);
    setNewPost({ title: '', excerpt: '', content: '', category: 'tecnologia', image: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-portugal-green hover:text-portugal-green/80 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowNewPost(!showNewPost)}
                className="bg-portugal-green hover:bg-portugal-green/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Post
              </Button>
              <Button variant="outline">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <PenTool className="h-8 w-8 text-portugal-green" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Posts</p>
                  <p className="text-2xl font-bold text-gray-900">127</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Visualizações</p>
                  <p className="text-2xl font-bold text-gray-900">45.2K</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Edit className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rascunhos</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Plus className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Este Mês</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário Novo Post */}
        {showNewPost && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Criar Novo Post</CardTitle>
              <CardDescription>
                Preencha os campos abaixo para criar um novo artigo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPost} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={newPost.title}
                      onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                      placeholder="Digite o título do post"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <select
                      id="category"
                      value={newPost.category}
                      onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Resumo</Label>
                  <Textarea
                    id="excerpt"
                    value={newPost.excerpt}
                    onChange={(e) => setNewPost({...newPost, excerpt: e.target.value})}
                    placeholder="Breve descrição do artigo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">URL da Imagem</Label>
                  <Input
                    id="image"
                    value={newPost.image}
                    onChange={(e) => setNewPost({...newPost, image: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder="Escreva o conteúdo completo do artigo..."
                    className="min-h-[200px]"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <Button type="submit" className="bg-portugal-green hover:bg-portugal-green/90">
                    Publicar Post
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowNewPost(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Posts Recentes</CardTitle>
            <CardDescription>
              Gerencie todos os artigos do seu blog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>{post.category}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        post.status === 'Publicado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {post.status}
                      </span>
                    </TableCell>
                    <TableCell>{post.date}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Aviso:</strong> Para que as funcionalidades de criação, edição e exclusão de posts funcionem completamente, é necessário conectar o projeto ao Supabase para configurar o banco de dados e autenticação.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
