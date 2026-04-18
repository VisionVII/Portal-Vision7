import React, { useMemo, useState } from 'react';
import { Plus, Sparkles, FolderOpen, Trash2, LayoutList, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCuratedPostsStats } from '@/hooks/useCuratedPosts';
import { CuratedPostsReview } from '@/components/admin/automation/CuratedPostsReview';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

interface ContentViewProps {
  editingPost: Post | null;
  showPostForm: boolean;
  onNewPost: () => void;
  onEdit: (post: Post) => void;
  onCloseForm: () => void;
}

const ContentView: React.FC<ContentViewProps> = ({
  editingPost,
  showPostForm,
  onNewPost,
  onEdit,
  onCloseForm,
}) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: curatedStats } = useCuratedPostsStats();
  const { data: categories = [] } = useCategories();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'posts' | 'curated' | 'categories'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);
  const postsPerCategory = useMemo(() => {
    const countMap = new Map<string, number>();
    (posts ?? []).forEach((post) => {
      if (!post.category_id) return;
      countMap.set(post.category_id, (countMap.get(post.category_id) ?? 0) + 1);
    });
    return countMap;
  }, [posts]);

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Deseja eliminar a categoria "${categoryName}"? Os conteúdos associados ficarão sem categoria.`)) return;
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast({ title: 'Categoria removida', description: `"${categoryName}" foi eliminada.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível eliminar a categoria.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
            <LayoutList className="h-3 w-3" />
            Gestão editorial
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Conteúdo
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Posts editoriais, curadoria de IA e categorias do portal.
          </p>
        </div>
        <Button onClick={onNewPost} className="gap-2 rounded-xl shadow-sm sm:shrink-0">
          <Plus className="h-4 w-4" />
          Novo Post
        </Button>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar posts por título ou categoria..."
              className="h-11 rounded-2xl pl-9"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-1">
            {(['all', 'published', 'draft'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${statusFilter === status ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'}`}
              >
                {status === 'all' ? 'Todos' : status === 'published' ? 'Publicados' : 'Rascunhos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{publishedPosts.length} publicados</span>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-600 dark:text-amber-400">{draftPosts.length} rascunhos</span>
        {curatedStats && curatedStats.ready > 0 && (
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-600 dark:text-cyan-400">{curatedStats.ready} curados prontos</span>
        )}
      </div>

      {/* ── PostForm inline when open ── */}
      {showPostForm && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <PostForm key={editingPost?.id ?? 'new'} post={editingPost} onClose={onCloseForm} />
        </div>
      )}

      {/* ── Tabs: Posts | Curados IA | Categorias ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-10 gap-1 rounded-2xl p-1">
          <TabsTrigger value="posts" className="gap-2 rounded-xl px-4 text-xs font-semibold">
            <LayoutList className="w-3.5 h-3.5" />
            Posts editoriais
          </TabsTrigger>
          <TabsTrigger value="curated" className="gap-2 rounded-xl px-4 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Curados pela IA
            {curatedStats && curatedStats.ready > 0 && (
              <Badge className="bg-emerald-500 text-[10px] px-1.5 py-0 ml-0.5">{curatedStats.ready}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-xl px-4 text-xs font-semibold">
            <FolderOpen className="w-3.5 h-3.5" />
            Categorias
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">{categories.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Posts tab */}
        <TabsContent value="posts" className="mt-4">
          <PostsTable
            posts={posts}
            isLoading={postsLoading}
            onEdit={onEdit}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
          />
        </TabsContent>

        {/* Curated IA tab */}
        <TabsContent value="curated" className="mt-4">
          <CuratedPostsReview
            onEditPost={(post) => { onEdit(post); setActiveTab('posts'); }}
            onSwitchToEditorial={() => setActiveTab('posts')}
          />
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories" className="mt-4">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    Categorias do portal
                  </CardTitle>
                  <CardDescription>
                    Remova categorias que já não fazem parte da operação editorial. Posts existentes ficam sem categoria.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">{categories.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria disponível.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {categories.map((category) => {
                    const linkedPosts = postsPerCategory.get(category.id) ?? 0;
                    return (
                      <div
                        key={category.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {linkedPosts} {linkedPosts === 1 ? 'post associado' : 'posts associados'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteCategory(category.id, category.name)}
                          disabled={deleteCategory.isPending}
                          title={`Eliminar categoria ${category.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentView;
