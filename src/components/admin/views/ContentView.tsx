import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts } from '@/hooks/usePosts';

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

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onNewPost} className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" />
          Novo post
        </Button>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {publishedPosts.length} publicados
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {draftPosts.length} rascunhos
          </span>
        </div>
      </div>
      {showPostForm && <PostForm post={editingPost} onClose={onCloseForm} />}
      <PostsTable posts={posts} isLoading={postsLoading} onEdit={onEdit} />
    </div>
  );
};

export default ContentView;
