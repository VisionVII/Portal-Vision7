import { useState, useCallback } from 'react';
import { Sparkles, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Post } from '@/hooks/usePosts';
import { supabase } from '@/integrations/supabase/client';
import { CuratedPostCard } from './CuratedPostCard';
import { CuratedPostPreviewDialog } from './CuratedPostPreviewDialog';
import { PromoteCategoriesDialog } from './PromoteCategoriesDialog';

const FILTER_OPTIONS = [
  { value: 'ready', label: 'Prontos para revisão' },
  { value: 'auto-draft', label: 'Auto-Draft' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'pending-review', label: 'Aguardando Revisão' },
  { value: 'published', label: 'Promovidos' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: '', label: 'Todos' },
];

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

  const handleOpenPreview = useCallback((post: CuratedPost) => {
    setPreviewPost(post);
    setEditMode(false);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewPost(null);
    setEditMode(false);
  }, []);

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

  const activeFilter = FILTER_OPTIONS.find((f) => f.value === statusFilter);

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
          {(statusFilter === 'rejected' || statusFilter === '') && posts?.some((p) => p.status === 'rejected') && (
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
              {FILTER_OPTIONS.map((opt) => (
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
          {posts.map((post) => (
            <CuratedPostCard
              key={post.id}
              post={post}
              isPromotePending={promoteMutation.isPending}
              isRejectPending={rejectMutation.isPending}
              isDeletePending={deleteMutation.isPending}
              onPreview={handleOpenPreview}
              onOpenPromoteDialog={openPromoteDialog}
              onReject={handleReject}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Preview / Edit dialog */}
      {detailPost && (
        <CuratedPostPreviewDialog
          open={!!previewPost}
          detailPost={detailPost}
          editMode={editMode}
          editTitle={editTitle}
          editExcerpt={editExcerpt}
          editBody={editBody}
          isUpdatePending={updateMutation.isPending}
          isPromotePending={promoteMutation.isPending}
          isRejectPending={rejectMutation.isPending}
          onClose={handleClosePreview}
          onEditTitleChange={setEditTitle}
          onEditExcerptChange={setEditExcerpt}
          onEditBodyChange={setEditBody}
          onStartEditing={() => startEditing(detailPost)}
          onCancelEditing={cancelEditing}
          onSaveEditing={saveEditing}
          onStatusChange={handleStatusChange}
          onReject={handleReject}
          onOpenPromoteDialog={openPromoteDialog}
        />
      )}

      {/* Promote with categories dialog */}
      <PromoteCategoriesDialog
        open={showPromoteDialog}
        postToPromote={postToPromote}
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        isPromotePending={promoteMutation.isPending}
        onToggleCategory={toggleCategory}
        onConfirm={confirmPromote}
        onCancel={() => { setShowPromoteDialog(false); setPostToPromote(null); }}
      />
    </div>
  );
}
