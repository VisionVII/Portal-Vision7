import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Post, useDeletePost } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface PostsTableProps {
  posts: Post[] | undefined;
  isLoading: boolean;
  onEdit: (post: Post) => void;
}

const PostsTable: React.FC<PostsTableProps> = ({ posts, isLoading, onEdit }) => {
  const deletePost = useDeletePost();
  const { toast } = useToast();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o post "${title}"?`)) {
      return;
    }

    try {
      await deletePost.mutateAsync(id);
      toast({
        title: "Sucesso",
        description: "Post eliminado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao eliminar o post.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts Recentes</CardTitle>
        <CardDescription>
          Gerencie todos os artigos do seu blog
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!posts || posts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhum post encontrado. Crie o seu primeiro post!
          </p>
        ) : (
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
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {post.title}
                  </TableCell>
                  <TableCell>{post.categories?.name || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {post.status === 'published' && (
                        <Link to={`/post/${post.slug}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onEdit(post)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={deletePost.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PostsTable;
