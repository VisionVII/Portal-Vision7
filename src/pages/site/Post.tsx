import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSpace from '@/components/content/AdSpace';
import RelatedPosts from '@/components/content/RelatedPosts';
import { usePost, usePosts, useTrackPostView } from '@/hooks/usePosts';
import { Calendar, User, ArrowLeft, Share2, Check, Clock, Tag } from 'lucide-react';
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
        <Skeleton className="h-[350px] w-full" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
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
  const heroImage = post.banner_url || post.image_url;

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

      {/* Hero Section */}
      <div className="relative">
        {heroImage ? (
          <div className="relative min-h-[70svh] sm:min-h-[380px] lg:min-h-[440px]">
            <img
              src={heroImage}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end">
              <div className="container mx-auto px-4 pb-8 sm:pb-12">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Link
                      to={categoryPath}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {categoryLabel}
                    </Link>
                    <span className={`category-badge ${post.categories?.color || 'bg-primary'}`}>
                      {post.categories?.name || 'Geral'}
                    </span>
                  </div>
                  <h1 className="text-2xl font-headline font-bold leading-tight text-white sm:text-3xl lg:text-5xl">
                    {post.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1.5">
                      <User size={15} /><span>{post.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={15} /><span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={15} /><span>{post.read_time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 py-12 sm:py-16 lg:py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Link
                    to={categoryPath}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {categoryLabel}
                  </Link>
                  <span className={`category-badge ${post.categories?.color || 'bg-primary'}`}>
                    {post.categories?.name || 'Geral'}
                  </span>
                </div>
                <h1 className="text-2xl font-headline font-bold leading-tight text-white sm:text-3xl lg:text-5xl">
                  {post.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1.5">
                    <User size={15} /><span>{post.author_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={15} /><span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={15} /><span>{post.read_time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <article id="post-top" className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          {/* Share bar */}
          <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{post.excerpt}</p>
            <button
              onClick={() => void handleShare()}
              className="ml-4 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              title="Partilhar artigo"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Copiado!' : 'Partilhar'}
            </button>
          </div>

          {/* Article image (if no banner but has image) */}
          {!post.banner_url && post.image_url && (
            <div className="mx-auto mb-8 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src={post.image_url}
                alt={post.title}
                className="h-64 w-full object-cover sm:h-80 lg:h-[420px]"
              />
            </div>
          )}

          <AdSpace size="banner" position="Antes do Conteúdo" className="mx-auto mb-8 max-w-4xl" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 lg:p-8">
                <div
                  className="prose prose-base max-w-none break-words leading-relaxed text-foreground dark:prose-invert dark:text-gray-300 sm:prose-lg"
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
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                      <Tag size={16} /> Tags
                    </h4>
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
