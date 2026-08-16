import React, { useMemo, useState } from 'react';
import { Sparkles, FolderOpen, Trash2, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCuratedPostsStats } from '@/hooks/useCuratedPosts';
import { CuratedPostsReview } from '@/components/admin/automation/CuratedPostsReview';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { useTour } from '@/components/admin/onboarding/TourProgressContext';
import { InlineTip } from '@/components/admin/InlineTip';

interface ContentViewProps {
  editingPost: Post | null;
  showPostForm: boolean;
  onEdit: (post: Post) => void;
  onCloseForm: () => void;
  /** Vem do header global — a pesquisa em si vive lá, só o filtro fica aqui. */
  searchQuery: string;
}

const ContentView: React.FC<ContentViewProps> = ({
  editingPost,
  showPostForm,
  onEdit,
  onCloseForm,
  searchQuery,
}) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: curatedStats } = useCuratedPostsStats();
  const { data: categories = [] } = useCategories();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();
  const { isAreaComplete } = useTour();

  const [activeTab, setActiveTab] = useState<'posts' | 'curated' | 'categories'>('posts');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

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
      {/* ── Status filter (pesquisa em si vive no header global) ── */}
      <div data-tour="content-filter" className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-1 w-fit">
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

      {/* ── Mini-tutorial inline: "O que fazer agora" ── */}
      {!isAreaComplete('content') && (
        <InlineTip storageKey="content">
          <li>1. Escreve ou revê um rascunho em <strong className="text-foreground">Posts editoriais</strong>.</li>
          <li>2. Usa a busca e os filtros para encontrar conteúdo rapidamente.</li>
          <li>3. Publica quando estiver pronto — ou aprova sugestões em <strong className="text-foreground">Curados pela IA</strong>.</li>
        </InlineTip>
      )}

      {/* ── PostForm inline when open ── */}
      {showPostForm && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <PostForm key={editingPost?.id ?? 'new'} post={editingPost} onClose={onCloseForm} />
        </div>
      )}

      {/* ── Tabs: Posts | Curados IA | Categorias ── */}
      <Tabs data-tour="content-tabs" value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-auto w-full gap-1 overflow-x-auto rounded-2xl border-0 bg-transparent p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="posts" className="gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold sm:px-4">
            <LayoutList className="w-3.5 h-3.5 shrink-0" />
            Posts editoriais
          </TabsTrigger>
          <TabsTrigger value="curated" className="gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold sm:px-4">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Curados pela IA
            {curatedStats && curatedStats.ready > 0 && (
              <Badge className="bg-emerald-500 text-[10px] px-1.5 py-0 ml-0.5">{curatedStats.ready}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold sm:px-4">
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
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
