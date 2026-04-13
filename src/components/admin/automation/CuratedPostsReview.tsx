import { useState } from 'react';
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
        <DialogContent className="max-w-6xl max-h-[88vh] overflow-hidden rounded-2xl p-0">
          {previewPost && (
            <>
              <DialogHeader className="border-b border-border/70 bg-muted/30 px-6 py-5">
                <DialogTitle className="pr-8 text-xl font-bold text-foreground">{previewPost.title}</DialogTitle>
                {previewPost.subtitle && (
                  <DialogDescription className="mt-1 text-base text-muted-foreground">{previewPost.subtitle}</DialogDescription>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Badge
                    variant="outline"
                    className={`justify-center text-xs ${STATUS_BADGE[previewPost.status]?.className ?? ''}`}
                  >
                    {STATUS_BADGE[previewPost.status]?.label ?? previewPost.status}
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Score <ScoreBadge score={Number(previewPost.editorial_score)} />
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Confiança: {Number(previewPost.confidence_score).toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className="justify-center border-border text-xs text-muted-foreground">
                    Criado: {formatDate(previewPost.created_at)}
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden">
                <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b border-border/60 bg-background px-6 py-3">
                  <TabsTrigger value="preview" className="gap-2 rounded-lg px-3 py-1.5">
                    <FileText className="w-4 h-4" />
                    Estrutura do Post
                  </TabsTrigger>
                  <TabsTrigger value="source" className="gap-2 rounded-lg px-3 py-1.5">
                    <Code className="w-4 h-4" />
                    Código Fonte
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto bg-muted/10 px-6 py-5">
                  <TabsContent value="preview" className="mt-0">
                    {previewPost.body_html ? (
                      <RichContentPreview
                        html={previewPost.body_html} 
                        variant="full"
                      />
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background p-6">
                        <p className="text-sm font-medium text-foreground">Sem conteúdo HTML formatado</p>
                        <p className="mt-1 text-sm text-muted-foreground">A estrutura renderizada ainda não foi gerada. Use o conteúdo markdown abaixo como referência editorial.</p>
                        {previewPost.body_markdown && (
                          <pre className="mt-4 max-h-[44vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/40 p-4 font-mono text-sm text-foreground/85">
                            {previewPost.body_markdown}
                          </pre>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="source" className="mt-0">
                    {previewPost.body_markdown ? (
                      <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background p-4 font-mono text-sm leading-relaxed text-foreground/85">
                        {previewPost.body_markdown}
                      </pre>
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background p-6 text-center">
                        <p className="text-sm text-muted-foreground">Sem código fonte markdown disponível</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="border-t border-border/70 bg-background px-6 py-4">
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
