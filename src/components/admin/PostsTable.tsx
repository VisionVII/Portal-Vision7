import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, FileText, ChevronLeft, ChevronRight, Clock, BarChart3, Calendar, Search } from 'lucide-react';
import { Post, useDeletePost } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const POSTS_PER_PAGE = 12;

interface PostsTableProps {
  posts: Post[] | undefined;
  isLoading: boolean;
  onEdit: (post: Post) => void;
  searchQuery?: string;
  statusFilter?: 'all' | 'published' | 'draft';
}

const PostsTable = ({
  posts,
  isLoading,
  onEdit,
  searchQuery = '',
  statusFilter = 'all',
}: PostsTableProps) => {
  const deletePost = useDeletePost();
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    const query = searchQuery.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesSearch =
        !query
        || post.title.toLowerCase().includes(query)
        || (post.categories?.name ?? '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedPosts = filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE);

  const totalPosts = posts?.length ?? 0;
  const publishedCount = posts?.filter((post) => post.status === 'published').length ?? 0;
  const draftCount = totalPosts - publishedCount;

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o post "${title}"?`)) return;

    try {
      await deletePost.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Post eliminado com sucesso!' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro', description: message || 'Erro ao eliminar o post.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/30">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/70 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{totalPosts} total</span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">{publishedCount} pub.</span>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-600 dark:text-amber-400">{draftCount} rasc.</span>
        </div>
        <span>
          {filteredPosts.length} resultado{filteredPosts.length === 1 ? '' : 's'}
        </span>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 py-16 dark:border-border/20">
          <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/20">
            {searchQuery || statusFilter !== 'all' ? (
              <Search className="h-8 w-8 text-muted-foreground/50" />
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/70">
            {searchQuery || statusFilter !== 'all' ? 'Nenhum post encontrado' : 'Sem publicações ainda'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Comece criando o seu primeiro artigo'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {paginatedPosts.map((post) => {
            const imgSrc = post.image_url || post.banner_url;
            const catColor = post.categories?.color || '#3b82f6';

            return (
              <article
                key={post.id}
                className="group overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-border/20"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-10 w-10 text-muted-foreground/15" />
                    </div>
                  )}

                  {post.categories && (
                    <span
                      className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                      style={{ backgroundColor: `${catColor}dd` }}
                    >
                      {post.categories.name}
                    </span>
                  )}

                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md ${post.status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                    {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>

                <div className="p-4">
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {post.title}
                  </h4>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.created_at), 'dd MMM yyyy', { locale: pt })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.read_time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {post.views || 0} views
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2 border-t border-border/20 pt-3.5">
                    {post.status === 'published' ? (
                      <Link to={`/post/${post.slug}`} target="_blank" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="flex-1 gap-1.5 rounded-lg text-xs opacity-40" title="Disponível após publicação">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(post)}
                      className="flex-1 gap-1.5 rounded-lg text-xs"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id, post.title)}
                      disabled={deletePost.isPending}
                      className="rounded-lg px-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      title="Eliminar post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="gap-1 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - safePage) <= 1)
              .reduce<(number | 'ellipsis')[]>((accumulator, pageNumber, index, array) => {
                if (index > 0 && pageNumber - array[index - 1] > 1) accumulator.push('ellipsis');
                accumulator.push(pageNumber);
                return accumulator;
              }, [])
              .map((item, index) => (
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${item === safePage ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {item}
                  </button>
                )
              ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="gap-1 rounded-lg"
          >
            <span className="hidden sm:inline">Seguinte</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PostsTable;
