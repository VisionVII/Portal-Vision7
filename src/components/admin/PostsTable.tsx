import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Eye, Search, FileText, ChevronLeft, ChevronRight, Clock, BarChart3, Calendar } from 'lucide-react';
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
}

const PostsTable: React.FC<PostsTableProps> = ({ posts, isLoading, onEdit }) => {
  const deletePost = useDeletePost();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.categories?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedPosts = filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE);

  const totalPosts = posts?.length ?? 0;
  const publishedCount = posts?.filter((post) => post.status === 'published').length ?? 0;
  const draftCount = totalPosts - publishedCount;

  // Reset page when filters change
  const handleSearchChange = (v: string) => { setSearchQuery(v); setPage(1); };
  const handleStatusChange = (s: 'all' | 'published' | 'draft') => { setStatusFilter(s); setPage(1); };

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
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/30">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header — counts + search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{totalPosts} total</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">{publishedCount} pub.</span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{draftCount} rasc.</span>
          </div>
          {totalPages > 1 && (
            <span className="text-[11px] text-muted-foreground">
              Pág. {safePage}/{totalPages}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título ou categoria..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'published', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary-600 text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : 'Rascunhos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 py-16 dark:border-border/20">
          <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/20">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/70">
            {searchQuery || statusFilter !== 'all' ? 'Nenhum post encontrado' : 'Sem publicações ainda'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Comece criando o seu primeiro artigo'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedPosts.map((post) => {
            const imgSrc = post.image_url || post.banner_url;
            const catColor = post.categories?.color || '#3b82f6';
            return (
              <div
                key={post.id}
                className="group overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-border/20"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
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
                  {/* Status + category overlays */}
                  <div className="absolute left-3 top-3">
                    {post.categories && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                        style={{ backgroundColor: `${catColor}dd` }}
                      >
                        {post.categories.name}
                      </span>
                    )}
                  </div>
                  <div className="absolute right-3 top-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md ${
                      post.status === 'published'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {post.title}
                  </h4>

                  {/* Meta row */}
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

                  {/* Actions */}
                  <div className="mt-3.5 flex items-center gap-2 border-t border-border/20 pt-3.5">
                    {post.status === 'published' && (
                      <Link to={`/post/${post.slug}`} target="_blank" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onEdit(post)} className="flex-1 gap-1.5 rounded-lg text-xs">
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id, post.title)}
                      disabled={deletePost.isPending}
                      className="shrink-0 rounded-lg px-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e${idx}`} className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                      item === safePage
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
