import React, { useMemo, useState } from 'react';
import { Plus, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCuratedPosts, useCuratedPostsStats } from '@/hooks/useCuratedPosts';
import { CuratedPostsReview } from '@/components/admin/automation/CuratedPostsReview';

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

  const [activeTab, setActiveTab] = useState<'editorial' | 'curated'>('editorial');

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={onNewPost} className="gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" />
            Novo post
          </Button>
          {/* ── Tab toggle ── */}
          <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5 ml-2">
            <Button
              size="sm"
              variant={activeTab === 'editorial' ? 'default' : 'ghost'}
              className={`h-7 text-xs gap-1.5 ${activeTab === 'editorial' ? '' : 'text-gray-400'}`}
              onClick={() => setActiveTab('editorial')}
            >
              <FileText className="w-3 h-3" />
              Editorial
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'curated' ? 'default' : 'ghost'}
              className={`h-7 text-xs gap-1.5 ${activeTab === 'curated' ? 'bg-cyan-600 hover:bg-cyan-700' : 'text-gray-400'}`}
              onClick={() => setActiveTab('curated')}
            >
              <Sparkles className="w-3 h-3" />
              Curados IA
              {curatedStats && curatedStats.ready > 0 && (
                <Badge className="bg-emerald-500 text-[10px] px-1.5 py-0 ml-1">
                  {curatedStats.ready}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {publishedPosts.length} publicados
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {draftPosts.length} rascunhos
          </span>
          {curatedStats && curatedStats.ready > 0 && (
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
              {curatedStats.ready} curados prontos
            </span>
          )}
        </div>
      </div>
      {showPostForm && <PostForm post={editingPost} onClose={onCloseForm} />}

      {activeTab === 'editorial' ? (
        <PostsTable posts={posts} isLoading={postsLoading} onEdit={onEdit} />
      ) : (
        <CuratedPostsReview />
      )}
    </div>
  );
};

export default ContentView;
