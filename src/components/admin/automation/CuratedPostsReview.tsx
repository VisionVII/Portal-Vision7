import { useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, Eye, ArrowUpRight, Sparkles, Filter,
  ChevronDown, Star,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  useCuratedPosts,
  usePromoteCuratedPost,
  useRejectCuratedPost,
} from '@/hooks/useCuratedPosts';
import type { CuratedPost } from '@/hooks/useCuratedPosts';
import { sanitizeRichContent } from '@/lib/richContent';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Pronto', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  draft: { label: 'Rascunho', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  published: { label: 'Promovido', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  rejected: { label: 'Rejeitado', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
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
  const sanitizedPreviewHtml = useMemo(
    () => (previewPost?.body_html ? sanitizeRichContent(previewPost.body_html) : ''),
    [previewPost?.body_html],
  );

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
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Artigos Curados pela IA</h3>
          <Badge variant="outline" className="text-xs px-2 py-0.5 border-slate-600 text-slate-400">
            {posts?.length ?? 0}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 border-slate-600 text-xs gap-1.5 px-3">
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

      {/* ── Posts list ── */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 text-sm">Carregando artigos curados...</div>
      ) : error ? (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-4 text-sm text-red-300">
          Falha ao carregar artigos curados reais: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </div>
      ) : !posts?.length ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Nenhum artigo curado com este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
            return (
              <Card key={post.id} className="bg-slate-800/60 border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                        <ScoreBadge score={Number(post.editorial_score)} />
                        <span className="text-[10px] text-gray-600">{formatDate(post.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-medium text-white leading-snug">{post.title}</h4>
                      {post.excerpt && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        onClick={() => setPreviewPost(post)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {post.status === 'ready' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 gap-1.5"
                            disabled={promoteMutation.isPending}
                            onClick={() => handlePromote(post)}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Promover
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            disabled={rejectMutation.isPending}
                            onClick={() => handleReject(post.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Preview dialog ── */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
          {previewPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">{previewPost.title}</DialogTitle>
                {previewPost.subtitle && (
                  <DialogDescription>{previewPost.subtitle}</DialogDescription>
                )}
              </DialogHeader>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_BADGE[previewPost.status]?.className ?? ''}`}
                >
                  {STATUS_BADGE[previewPost.status]?.label ?? previewPost.status}
                </Badge>
                <ScoreBadge score={Number(previewPost.editorial_score)} />
                <span className="text-xs text-gray-500">
                  Confiança: {Number(previewPost.confidence_score).toFixed(0)}%
                </span>
              </div>
              {previewPost.body_html ? (
                <div
                  className="prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-300">
                  {previewPost.body_markdown}
                </div>
              )}
              <DialogFooter className="pt-4">
                {previewPost.status === 'ready' && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        handleReject(previewPost.id);
                        setPreviewPost(null);
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={promoteMutation.isPending}
                      onClick={() => {
                        handlePromote(previewPost);
                        setPreviewPost(null);
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Promover para Rascunho
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
