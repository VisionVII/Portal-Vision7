import { useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, Eye, ArrowUpRight, Sparkles, Filter,
  ChevronDown, Star, Code, FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCuratedPosts,
  usePromoteCuratedPost,
  useRejectCuratedPost,
} from '@/hooks/useCuratedPosts';
import type { CuratedPost } from '@/hooks/useCuratedPosts';
import { RichContentPreview } from '@/components/admin/RichContentPreview';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Pronto', className: 'bg-primary/15 text-primary border-primary/30' },
  draft: { label: 'Rascunho', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
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

export function CuratedPostsReview() {
  const [statusFilter, setStatusFilter] = useState<string>('ready');
  const { data: posts, isLoading, error } = useCuratedPosts(statusFilter || undefined);
  const promoteMutation = usePromoteCuratedPost();
  const rejectMutation = useRejectCuratedPost();

  const [previewPost, setPreviewPost] = useState<CuratedPost | null>(null);

  const handlePromote = (post: CuratedPost) => {
    promoteMutation.mutate(post);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const filterOptions = [
    { value: 'ready', label: 'Prontos para revisão' },
    { value: 'draft', label: 'Rascunhos' },
    { value: 'published', label: 'Promovidos' },
    { value: 'rejected', label: 'Rejeitados' },
    { value: '', label: 'Todos' },
  ];

  const activeFilter = filterOptions.find((f) => f.value === statusFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-semibold text-foreground">Artigos Curados pela IA</h3>
          <Badge variant="outline" className="text-xs px-2 py-0.5 border-border text-muted-foreground">
            {posts?.length ?? 0}
          </Badge>
        </div>
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
          {posts.map((post) => {
            const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
            return (
              <div key={post.id} className="rounded-lg border border-border/40 bg-muted/20 p-4 transition-colors hover:border-border/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
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
                    {post.status === 'ready' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-primary hover:text-primary/80 gap-1.5"
                          disabled={promoteMutation.isPending}
                          onClick={() => handlePromote(post)}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Promover
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                          disabled={rejectMutation.isPending}
                          onClick={() => handleReject(post.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          {previewPost && (
            <>
              <DialogHeader className="border-b border-border pb-4">
                <DialogTitle className="text-xl font-bold text-foreground pr-8">{previewPost.title}</DialogTitle>
                {previewPost.subtitle && (
                  <DialogDescription className="text-base text-muted-foreground mt-1">{previewPost.subtitle}</DialogDescription>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_BADGE[previewPost.status]?.className ?? ''}`}
                  >
                    {STATUS_BADGE[previewPost.status]?.label ?? previewPost.status}
                  </Badge>
                  <ScoreBadge score={Number(previewPost.editorial_score)} />
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                    Confiança: {Number(previewPost.confidence_score).toFixed(0)}%
                  </Badge>
                  {previewPost.theme && (
                    <Badge variant="outline" className="text-xs border-primary-500/40 text-primary-600 dark:text-primary-400">
                      {previewPost.theme}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="w-full justify-start rounded-none h-auto p-1">
                  <TabsTrigger value="preview" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Preview Formatado
                  </TabsTrigger>
                  <TabsTrigger value="source" className="gap-2">
                    <Code className="w-4 h-4" />
                    Código Fonte
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <TabsContent value="preview" className="mt-0">
                    {previewPost.body_html ? (
                      <RichContentPreview 
                        html={previewPost.body_html} 
                        variant="full"
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm">Sem conteúdo HTML formatado</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="source" className="mt-0">
                    {previewPost.body_markdown ? (
                      <pre className="whitespace-pre-wrap text-sm text-foreground/80 bg-muted/50 rounded-lg p-4 border border-border/50 font-mono">
                        {previewPost.body_markdown}
                      </pre>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm">Sem código fonte markdown disponível</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="border-t border-border pt-4">
                {previewPost.status === 'ready' && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        handleReject(previewPost.id);
                        setPreviewPost(null);
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                      disabled={promoteMutation.isPending}
                      onClick={() => {
                        handlePromote(previewPost);
                        setPreviewPost(null);
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Promover para Rascunho
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
