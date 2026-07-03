import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Post } from '@/hooks/usePosts';

interface RelatedPostsProps {
  posts: Post[];
}

const RelatedPosts: React.FC<RelatedPostsProps> = ({ posts }) => {
  if (posts.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-headline font-bold text-foreground mb-6">
        Artigos Relacionados
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-border"
          >
            {post.image_url && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  width={640}
                  height={360}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white mb-2 ${post.categories?.color || 'bg-muted'}`}>
                {post.categories?.name || 'Geral'}
              </span>
              <h3 className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{post.read_time}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default React.memo(RelatedPosts);
