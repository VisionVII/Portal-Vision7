import {
  CheckCircle2, XCircle, Code, FileText, Pencil, Save, RotateCcw,
  ChevronDown, Search, BarChart3, BookOpen, Fingerprint, Link2, Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CuratedPost } from '@/hooks/useCuratedPosts';
import { RichContentPreview } from '@/components/admin/RichContentPreview';
import { ScoreBadge } from './ScoreBadge';
import {
  STATUS_BADGE,
  formatDate,
  canPromote,
  canReject,
  canEdit,
  statusActions,
} from './curatedPostsUtils';

interface CuratedPostPreviewDialogProps {
  open: boolean;
  detailPost: CuratedPost;
  editMode: boolean;
  editTitle: string;
  editExcerpt: string;
  editBody: string;
  isUpdatePending: boolean;
  isPromotePending: boolean;
  isRejectPending: boolean;
  onClose: () => void;
  onEditTitleChange: (value: string) => void;
  onEditExcerptChange: (value: string) => void;
  onEditBodyChange: (value: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onStatusChange: (id: string, status: string) => void;
  onReject: (id: string) => void;
  onOpenPromoteDialog: (post: CuratedPost) => void;
}

export function CuratedPostPreviewDialog({
  open,
  detailPost,
  editMode,
  editTitle,
  editExcerpt,
  editBody,
  isUpdatePending,
  isPromotePending,
  isRejectPending,
  onClose,
  onEditTitleChange,
  onEditExcerptChange,
  onEditBodyChange,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onStatusChange,
  onReject,
  onOpenPromoteDialog,
}: CuratedPostPreviewDialogProps) {
  const actions = statusActions(detailPost.status);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="mx-4 flex max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-2xl p-0 sm:mx-6">
        <DialogHeader className="shrink-0 overflow-y-auto border-b border-border/70 bg-muted/30 px-6 py-4 max-h-[45vh]">
          {editMode ? (
            <Input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
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

        <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="h-auto w-full shrink-0 justify-start gap-2 rounded-none border-b border-border/60 bg-background px-6 py-3">
            <TabsTrigger value="preview" className="gap-2 rounded-lg px-3 py-1.5">
              <FileText className="w-4 h-4" />
              {editMode ? 'Editar' : 'Estrutura do Post'}
            </TabsTrigger>
            <TabsTrigger value="source" className="gap-2 rounded-lg px-3 py-1.5">
              <Code className="w-4 h-4" />
              Código Fonte
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-hidden px-6 pb-5 pt-4">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
              <TabsContent
                value="preview"
                className="mt-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col overflow-y-auto p-6"
              >
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Excerto</label>
                      <Textarea
                        value={editExcerpt}
                        onChange={(e) => onEditExcerptChange(e.target.value)}
                        rows={2}
                        placeholder="Excerto / resumo do artigo"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Conteúdo (Markdown)</label>
                      <Textarea
                        value={editBody}
                        onChange={(e) => onEditBodyChange(e.target.value)}
                        rows={16}
                        className="font-mono text-sm"
                        placeholder="Corpo do artigo em markdown..."
                      />
                    </div>
                  </div>
                ) : (detailPost.body_html || detailPost.body_markdown) ? (
                  <RichContentPreview
                    html={(detailPost.body_html || detailPost.body_markdown!.replace(/\\n/g, '\n'))}
                    variant="full"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem conteúdo disponível para pré-visualização.</p>
                )}
              </TabsContent>

              <TabsContent
                value="source"
                className="mt-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col overflow-y-auto p-6"
              >
                {detailPost.body_markdown ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/85">
                    {detailPost.body_markdown.replace(/\\n/g, '\n')}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">Sem código fonte markdown disponível</p>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <DialogFooter className="shrink-0 border-t border-border/70 bg-background px-6 py-4">
          <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
            {canEdit(detailPost.status) && !editMode && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onStartEditing}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            )}
            {editMode && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onCancelEditing}>
                  <RotateCcw className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button size="sm" className="gap-1.5" disabled={isUpdatePending} onClick={onSaveEditing}>
                  <Save className="w-3.5 h-3.5" /> Salvar
                </Button>
              </>
            )}
            {!editMode && canEdit(detailPost.status) && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Alterar Status <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {actions.map((action) => (
                    <DropdownMenuItem
                      key={action.status}
                      onClick={() => {
                        onStatusChange(detailPost.id, action.status);
                        onClose();
                      }}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex-1" />
            {!editMode && canReject(detailPost.status) && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={isRejectPending}
                onClick={() => {
                  onReject(detailPost.id);
                  onClose();
                }}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejeitar
              </Button>
            )}
            {!editMode && canPromote(detailPost.status) && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={isPromotePending}
                onClick={() => onOpenPromoteDialog(detailPost)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Promover para Rascunho
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
