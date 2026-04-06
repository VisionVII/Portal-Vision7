import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSpace from '@/components/content/AdSpace';
import RelatedPosts from '@/components/content/RelatedPosts';
import { usePost, usePosts, useTrackPostView } from '@/hooks/usePosts';
import { Calendar, User, ArrowLeft, Share2, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Post = () => {
  const { slug } = useParams();
  const { data: post, isLoading } = usePost(slug || '');
  const { data: allPosts } = usePosts();
  const trackPostView = useTrackPostView();
  const trackedPostIdRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
    if (post?.id && trackedPostIdRef.current !== post.id) {
      trackedPostIdRef.current = post.id;
      trackPostView.mutate(post.id);
    }
  }, [post?.id, trackPostView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-3/4 mb-6" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post não encontrado</h1>
          <p className="text-muted-foreground mb-8">O artigo que procura não existe ou foi removido.</p>
          <Link 
            to="/" 
            className="inline-flex items-center text-primary hover:text-primary-700 dark:hover:text-primary-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à página inicial
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPosts = allPosts?.filter(
    p => p.categories?.id === post.category_id && p.id !== post.id
  ).slice(0, 3) || [];

  const categoryPath = post.categories?.slug ? `/${post.categories.slug}` : '/';
  const categoryLabel = post.categories?.name ?? 'Notícias';

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.excerpt, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <article id="post-top" className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link
                to={categoryPath}
                className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {categoryLabel}
              </Link>
              <button
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                title="Partilhar artigo"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? 'Copiado!' : 'Partilhar'}
              </button>
            </div>

            <header className="scroll-mt-28 mb-8 md:mb-10">
              <span className={`category-badge ${post.categories?.color || 'bg-muted'} mb-4`}>
                {post.categories?.name || 'Geral'}
              </span>
              <h1 className="max-w-4xl text-3xl font-headline font-bold leading-tight text-foreground sm:text-4xl lg:text-6xl">
                {post.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground sm:gap-6 sm:text-base">
                <div className="flex items-center gap-2">
                  <User size={18} />
                  <span>{post.author_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  <span>{formattedDate}</span>
                </div>
                <span className="font-medium text-primary-600 dark:text-primary-400">{post.read_time}</span>
              </div>
            </header>
          </div>

          {post.image_url && (
            <div className="mx-auto mb-8 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src={post.image_url}
                alt={post.title}
                className="h-64 w-full object-cover sm:h-80 lg:h-[440px]"
              />
            </div>
          )}

          <AdSpace size="banner" position="Antes do Conteúdo" className="mx-auto mb-8 max-w-5xl" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 lg:p-8">
                <div className="prose prose-base max-w-none break-words text-foreground dark:prose-invert sm:prose-lg">
                  <p className="mb-6 text-lg font-medium text-foreground sm:text-xl">
                    {post.excerpt}
                  </p>

                  <div
                    className="prose prose-base max-w-none break-words leading-relaxed text-foreground dark:text-gray-300 sm:prose-lg"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(post.content, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figcaption', 'figure', 'code', 'pre'],
                        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'],
                        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]*(?:[^a-z+.-:]|$))/i,
                      })
                    }}
                  />

                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-8 border-t border-border pt-6">
                      <h4 className="mb-3 font-semibold text-foreground">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="cursor-pointer rounded-full bg-secondary-100 px-3 py-1 text-sm text-secondary-700 transition-colors hover:bg-secondary-200 dark:bg-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <AdSpace size="rectangle" position="Após o Conteúdo" className="mt-8" />
              <RelatedPosts posts={relatedPosts} />
            </div>

            <aside className="min-w-0 xl:sticky xl:top-28 xl:self-start">
              <AdSpace size="square" position="Lateral do Post" className="mx-auto mb-8" />
            </aside>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default Post;
