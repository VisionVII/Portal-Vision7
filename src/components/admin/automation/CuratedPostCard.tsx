import { Eye, ArrowUpRight, XCircle, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface CuratedPostCardProps {
  post: CuratedPost;
  isPromotePending: boolean;
  isRejectPending: boolean;
  isDeletePending: boolean;
  onPreview: (post: CuratedPost) => void;
  onOpenPromoteDialog: (post: CuratedPost) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function CuratedPostCard({
  post,
  isPromotePending,
  isRejectPending,
  isDeletePending,
  onPreview,
  onOpenPromoteDialog,
  onReject,
  onDelete,
  onStatusChange,
}: CuratedPostCardProps) {
  const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
  const actions = statusActions(post.status);

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4 transition-colors hover:border-border/60">
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
            onClick={() => onPreview(post)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canPromote(post.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs text-primary hover:text-primary/80 gap-1.5"
              disabled={isPromotePending}
              onClick={() => onOpenPromoteDialog(post)}
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
              disabled={isRejectPending}
              onClick={() => onReject(post.id)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
          {post.status === 'rejected' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
              disabled={isDeletePending}
              onClick={() => {
                if (confirm('Apagar este post permanentemente?')) {
                  onDelete(post.id);
                }
              }}
              title="Apagar permanentemente"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {canEdit(post.status) && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.status}
                    onClick={() => onStatusChange(post.id, action.status)}
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
}
