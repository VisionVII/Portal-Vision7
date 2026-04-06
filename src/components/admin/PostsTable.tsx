import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Eye, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.categories?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const totalPosts = posts?.length ?? 0;
  const publishedCount = posts?.filter((post) => post.status === 'published').length ?? 0;
  const draftCount = totalPosts - publishedCount;

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: message || "Ocorreu um erro ao eliminar o post.",
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
          Gerencie todos os artigos do seu blog com uma visualização otimizada para desktop e mobile.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Total: {totalPosts}</span>
          <span className="rounded-full bg-secondary-100 px-2.5 py-1 text-xs text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">Publicados: {publishedCount}</span>
          <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs text-primary-800 dark:bg-primary-900 dark:text-primary-200">Rascunhos: {draftCount}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'published', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : 'Rascunhos'}
              </button>
            ))}
          </div>
        </div>

        {!filteredPosts || filteredPosts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum post encontrado. Crie o seu primeiro post!
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredPosts.map((post) => (
                <div key={post.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-foreground">{post.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {post.categories?.name || 'Sem categoria'} • {format(new Date(post.created_at), 'dd MMM yyyy', { locale: pt })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${
                      post.status === 'published'
                        ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200'
                        : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    }`}>
                      {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.read_time}</span>
                    <span>{post.views || 0} views</span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 min-[360px]:grid min-[360px]:grid-cols-2">
                    {post.status === 'published' && (
                      <Link to={`/post/${post.slug}`} target="_blank" className="min-[360px]:col-span-2">
                        <Button variant="outline" size="sm" className="w-full gap-1.5">
                          <Eye className="h-4 w-4" />
                          Ver publicação
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onEdit(post)} className="gap-1.5">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id, post.title)}
                      disabled={deletePost.isPending}
                      className="gap-1.5 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-[300px] font-medium truncate">
                        {post.title}
                      </TableCell>
                      <TableCell>{post.categories?.name || '-'}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          post.status === 'published'
                            ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200'
                            : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                        }`}>
                          {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </TableCell>
                      <TableCell>{post.views || 0}</TableCell>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PostsTable;
