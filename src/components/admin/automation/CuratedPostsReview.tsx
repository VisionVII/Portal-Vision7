import { useState, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Eye, ArrowUpRight, Sparkles, Filter,
  ChevronDown, Star, Code, FileText, Pencil, Save, RotateCcw, Tag,
  Search, BarChart3, BookOpen, Fingerprint, Link2, Target, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCuratedPosts,
  useCuratedPostDetail,
  usePromoteCuratedPost,
  useRejectCuratedPost,
  useUpdateCuratedStatus,
  useUpdateCuratedPost,
  useDeleteRejectedPosts,
  useDeleteCuratedPost,
} from '@/hooks/useCuratedPosts';
import type { CuratedPost } from '@/hooks/useCuratedPosts';
import { useCategories } from '@/hooks/useCategories';
import { RichContentPreview } from '@/components/admin/RichContentPreview';
import type { Post } from '@/hooks/usePosts';
import { supabase } from '@/integrations/supabase/client';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Pronto', className: 'bg-primary/15 text-primary border-primary/30' },
  draft: { label: 'Rascunho', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  'auto-draft': { label: 'Auto-Draft', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  'pending-review': { label: 'Aguardando Revisão', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  published: { label: 'Promovido', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-primary' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive';
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Star className="w-3 h-3" />
      {score.toFixed(0)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CuratedPostsReview({
  onEditPost,
  onSwitchToEditorial,
}: {
  onEditPost?: (post: Post) => void;
  onSwitchToEditorial?: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: posts, isLoading, error } = useCuratedPosts(statusFilter || undefined);
  const promoteMutation = usePromoteCuratedPost();
  const rejectMutation = useRejectCuratedPost();
  const statusMutation = useUpdateCuratedStatus();
  const updateMutation = useUpdateCuratedPost();
  const deleteRejectedMutation = useDeleteRejectedPosts();
  const deleteMutation = useDeleteCuratedPost();
  const { data: categories } = useCategories();

  const [previewPost, setPreviewPost] = useState<CuratedPost | null>(null);
  const { data: postDetail } = useCuratedPostDetail(previewPost?.id ?? null);
  const detailPost = postDetail ?? previewPost;

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editBody, setEditBody] = useState('');

  // Category selection state for promote dialog
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [postToPromote, setPostToPromote] = useState<CuratedPost | null>(null);

  const startEditing = useCallback((post: CuratedPost) => {
    setEditTitle(post.title ?? '');
    setEditExcerpt(post.excerpt ?? '');
    setEditBody(post.body_markdown ?? '');
    setEditMode(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditMode(false);
  }, []);

  const saveEditing = useCallback(() => {
    if (!detailPost) return;
    updateMutation.mutate(
      { id: detailPost.id, fields: { title: editTitle, excerpt: editExcerpt, body_markdown: editBody } },
      { onSuccess: () => setEditMode(false) },
    );
  }, [detailPost, editTitle, editExcerpt, editBody, updateMutation]);

  const openPromoteDialog = useCallback((post: CuratedPost) => {
    setPostToPromote(post);
    setSelectedCategoryIds([]);
    setShowPromoteDialog(true);
  }, []);

  const confirmPromote = useCallback(() => {
    if (!postToPromote) return;
    promoteMutation.mutate(
      { curated: postToPromote, categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined },
      {
        onSuccess: async (result) => {
          setShowPromoteDialog(false);
          setPostToPromote(null);
          setPreviewPost(null);
          // If we have the new postId and a handler, fetch the full post and open in editor
          if (result?.postId && onEditPost) {
            const { data } = await supabase
              .from('posts')
              .select('id, title, slug, excerpt, content, image_url, banner_url, category_id, author_id, author_name, status, featured, read_time, tags, views, published_at, created_at, updated_at')
              .eq('id', result.postId)
              .maybeSingle();
            if (data) {
              onSwitchToEditorial?.();
              onEditPost(data as Post);
            }
          }
        },
      },
    );
  }, [postToPromote, selectedCategoryIds, promoteMutation, onEditPost, onSwitchToEditorial]);

  const toggleCategory = useCallback((catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  }, []);

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: string) => {
    statusMutation.mutate({ id, status });
  };

  const canPromote = (status: string) => ['ready', 'pending-review', 'draft', 'auto-draft'].includes(status);
  const canReject = (status: string) => status !== 'rejected' && status !== 'published';
  const canEdit = (status: string) => status !== 'published';

  const filterOptions = [
    { value: 'ready', label: 'Prontos para revisão' },
    { value: 'auto-draft', label: 'Auto-Draft' },
    { value: 'draft', label: 'Rascunhos' },
    { value: 'pending-review', label: 'Aguardando Revisão' },
    { value: 'published', label: 'Promovidos' },
    { value: 'rejected', label: 'Rejeitados' },
    { value: '', label: 'Todos' },
  ];

  const visiblePosts = posts;
  const activeFilter = filterOptions.find((f) => f.value === statusFilter);

  const statusActions = (post: CuratedPost) => {
    const actions: { label: string; status: string }[] = [];
    if (post.status !== 'ready') actions.push({ label: 'Marcar como Pronto', status: 'ready' });
    if (post.status !== 'pending-review') actions.push({ label: 'Enviar para Revisão', status: 'pending-review' });
    if (post.status !== 'draft' && post.status !== 'auto-draft') actions.push({ label: 'Voltar a Rascunho', status: 'draft' });
    return actions;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-semibold text-foreground">Artigos Curados pela IA</h3>
          <Badge variant="outline" className="text-xs px-2 py-0.5 border-border text-muted-foreground">
            {posts?.length ?? 0}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {(statusFilter === 'rejected' || statusFilter === '') && (posts?.some((p) => p.status === 'rejected')) && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5 px-3"
              disabled={deleteRejectedMutation.isPending}
              onClick={() => {
                if (confirm('Apagar permanentemente TODOS os posts rejeitados?')) {
                  deleteRejectedMutation.mutate();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Apagar rejeitados
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 px-3">
                <Filter className="w-3.5 h-3.5" />
                {activeFilter?.label}
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {filterOptions.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => setStatusFilter(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando artigos curados...</div>
      ) : error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-4 text-sm text-destructive">
          Falha ao carregar artigos curados reais: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </div>
      ) : !posts?.length ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Nenhum artigo curado com este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts?.map((post) => {
            const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
            return (
              <div key={post.id} className="rounded-lg border border-border/40 bg-muted/20 p-4 transition-colors hover:border-border/60">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      <ScoreBadge score={Number(post.editorial_score)} />
                      <span className="text-[10px] text-muted-foreground/60">{formatDate(post.created_at)}</span>
                    </div>
                    <h4 className="text-sm font-medium text-foreground leading-snug mb-2">{post.title}</h4>
                    {post.body_html ? (
                      <RichContentPreview 
                        html={post.body_html} 
                        variant="card"
                        className="text-xs"
                      />
                    ) : post.excerpt ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.excerpt}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setPreviewPost(post)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canPromote(post.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs text-primary hover:text-primary/80 gap-1.5"
                        disabled={promoteMutation.isPending}
                        onClick={() => openPromoteDialog(post)}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Promover
                      </Button>
                    )}
                    {canReject(post.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                        disabled={rejectMutation.isPending}
                        onClick={() => handleReject(post.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {post.status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm('Apagar este post permanentemente?')) {
                            deleteMutation.mutate(post.id);
                          }
                        }}
                        title="Apagar permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Status change dropdown */}
                    {canEdit(post.status) && statusActions(post).length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {statusActions(post).map((action) => (
                            <DropdownMenuItem
                              key={action.status}
                              onClick={() => handleStatusChange(post.id, action.status)}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview / Edit dialog */}
      <Dialog open={!!previewPost} onOpenChange={(open) => { if (!open) { setPreviewPost(null); setEditMode(false); } }}>
        <DialogContent className="mx-4 max-w-6xl max-h-[88vh] overflow-hidden rounded-2xl p-0 sm:mx-6">
          {previewPost && (
            <>
              <DialogHeader className="border-b border-border/70 bg-muted/30 px-6 py-5">
                {editMode ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold"
                    placeholder="Título do artigo"
                  />
                ) : (
                  <DialogTitle className="pr-8 text-xl font-bold text-foreground">{detailPost.title}</DialogTitle>
                )}
                {!editMode && detailPost.subtitle && (
                  <DialogDescription className="mt-1 text-base text-muted-foreground">{detailPost.subtitle}</DialogDescription>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                  <Badge
                    variant="outline"
                    className={`justify-center text-xs ${STATUS_BADGE[detailPost.status]?.className ?? ''}`}
                  >
                    {STATUS_BADGE[detailPost.status]?.label ?? detailPost.status}
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Score <ScoreBadge score={Number(detailPost.editorial_score)} />
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Confiança: {Number(detailPost.confidence_score).toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Criado: {formatDate(detailPost.created_at)}
                  </Badge>
                </div>

                {/* SEO & Quality Metrics */}
                <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {detailPost.seo_score != null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <Search className="w-3 h-3 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">SEO</p>
                        <p className="text-xs font-semibold text-foreground">{Number(detailPost.seo_score).toFixed(0)}/100</p>
                      </div>
                    </div>
                  )}
                  {detailPost.readability_score != null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <BookOpen className="w-3 h-3 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">Leitura</p>
                        <p className="text-xs font-semibold text-foreground">{Number(detailPost.readability_score).toFixed(0)}/100</p>
                      </div>
                    </div>
                  )}
                  {detailPost.originality_score != null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <Fingerprint className="w-3 h-3 text-violet-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">Original.</p>
                        <p className="text-xs font-semibold text-foreground">{Number(detailPost.originality_score).toFixed(0)}/100</p>
                      </div>
                    </div>
                  )}
                  {detailPost.primary_keyword && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <Target className="w-3 h-3 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">Keyword</p>
                        <p className="text-xs font-semibold text-foreground truncate">{detailPost.primary_keyword}</p>
                      </div>
                    </div>
                  )}
                  {detailPost.search_intent && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <BarChart3 className="w-3 h-3 text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">Intenção</p>
                        <p className="text-xs font-semibold text-foreground capitalize">{detailPost.search_intent}</p>
                      </div>
                    </div>
                  )}
                  {detailPost.internal_links && (detailPost.internal_links as string[]).length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5">
                      <Link2 className="w-3 h-3 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground leading-none">Links int.</p>
                        <p className="text-xs font-semibold text-foreground">{(detailPost.internal_links as string[]).length}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {detailPost.meta_description && (
                    <div className="col-span-2 rounded-2xl border border-border/50 bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground">
                      <p className="font-semibold text-foreground text-xs uppercase tracking-[0.12em] mb-2">Meta description</p>
                      <p>{detailPost.meta_description}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {detailPost.secondary_keywords && (detailPost.secondary_keywords as string[]).length > 0 && (
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Keywords secundárias</p>
                        <div className="flex flex-wrap gap-2">
                          {(detailPost.secondary_keywords as string[]).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {detailPost.internal_links && (detailPost.internal_links as string[]).length > 0 && (
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Links internos</p>
                        <p className="text-sm font-medium text-foreground">{(detailPost.internal_links as string[]).length} sugeridos</p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="preview" className="flex flex-1 overflow-hidden">
                <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b border-border/60 bg-background px-6 py-3">
                  <TabsTrigger value="preview" className="gap-2 rounded-lg px-3 py-1.5">
                    <FileText className="w-4 h-4" />
                    {editMode ? 'Editar' : 'Estrutura do Post'}
                  </TabsTrigger>
                  <TabsTrigger value="source" className="gap-2 rounded-lg px-3 py-1.5">
                    <Code className="w-4 h-4" />
                    Código Fonte
                  </TabsTrigger>
                </TabsList>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] overflow-hidden px-6 py-5">
                  <div className="flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-6 shadow-sm" style={{ maxHeight: 'calc(88vh - 280px)' }}>
                    <TabsContent value="preview" className="mt-0 flex-1 overflow-y-auto">
                      {editMode ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Excerto</label>
                            <Textarea
                              value={editExcerpt}
                              onChange={(e) => setEditExcerpt(e.target.value)}
                              rows={2}
                              placeholder="Excerto / resumo do artigo"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Conteúdo (Markdown)</label>
                            <Textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={16}
                              className="font-mono text-sm"
                              placeholder="Corpo do artigo em markdown..."
                            />
                          </div>
                        </div>
                      ) : detailPost.body_html ? (
                        <div className="overflow-y-auto rounded-xl border border-border/60 bg-background p-6">
                          <RichContentPreview
                            html={detailPost.body_html}
                            variant="full"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border/60 bg-background p-6">
                          <p className="text-sm font-medium text-foreground">Sem conteúdo HTML formatado</p>
                          <p className="mt-1 text-sm text-muted-foreground">A estrutura renderizada ainda não foi gerada. Use o conteúdo markdown abaixo como referência editorial.</p>
                          {detailPost.body_markdown && (
                            <pre className="mt-4 max-h-[44vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/40 p-4 font-mono text-sm text-foreground/85">
                              {detailPost.body_markdown}
                            </pre>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="source" className="mt-0">
                      {detailPost.body_markdown ? (
                        <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background p-4 font-mono text-sm leading-relaxed text-foreground/85">
                          {detailPost.body_markdown}
                        </pre>
                      ) : (
                        <div className="rounded-xl border border-border/60 bg-background p-6 text-center">
                          <p className="text-sm text-muted-foreground">Sem código fonte markdown disponível</p>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </div>
              </Tabs>

              <DialogFooter className="border-t border-border/70 bg-background px-6 py-4">
                <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
                  {/* Edit toggle */}
                  {canEdit(detailPost.status) && !editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => startEditing(detailPost)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  )}
                  {editMode && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={cancelEditing}>
                        <RotateCcw className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                      <Button size="sm" className="gap-1.5" disabled={updateMutation.isPending} onClick={saveEditing}>
                        <Save className="w-3.5 h-3.5" /> Salvar
                      </Button>
                    </>
                  )}
                  {/* Status dropdown */}
                  {!editMode && canEdit(detailPost.status) && statusActions(detailPost).length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          Alterar Status <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {statusActions(detailPost).map((action) => (
                          <DropdownMenuItem
                            key={action.status}
                            onClick={() => {
                              handleStatusChange(detailPost.id, action.status);
                              setPreviewPost(null);
                            }}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {/* Spacer */}
                  <div className="flex-1" />
                  {/* Reject */}
                  {!editMode && canReject(detailPost.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        handleReject(detailPost.id);
                        setPreviewPost(null);
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejeitar
                    </Button>
                  )}
                  {/* Promote */}
                  {!editMode && canPromote(detailPost.status) && (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      disabled={promoteMutation.isPending}
                      onClick={() => {
                        openPromoteDialog(detailPost);
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Promover para Rascunho
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote with categories dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={(open) => { if (!open) { setShowPromoteDialog(false); setPostToPromote(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Promover Artigo
            </DialogTitle>
            <DialogDescription>
              Selecione as categorias para o artigo antes de promovê-lo para rascunho editorial.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-foreground mb-3">Categorias</p>
            {categories?.length ? (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma categoria disponível.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPromoteDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              disabled={promoteMutation.isPending}
              onClick={confirmPromote}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
              {selectedCategoryIds.length > 0
                ? `Promover (${selectedCategoryIds.length} cat.)`
                : 'Promover sem categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
