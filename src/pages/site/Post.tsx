import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSpace from '@/components/content/AdSpace';
import RelatedPosts from '@/components/content/RelatedPosts';
import NewsletterModal from '@/components/content/NewsletterModal';
import { usePost, useRelatedPosts, useTrackPostView } from '@/hooks/usePosts';
import { Calendar, User, ArrowLeft, Share2, Check, Clock, Tag, MessageCircle, Send, Link2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { sanitizeRichContent, processArticleToc } from '@/lib/richContent';

const SITE_URL = 'https://portal.vision7.pt';
const DEFAULT_SEO = {
  title: 'Vision7 - Mídia Tech',
  description: 'Vision7 reúne notícias, análises e conteúdos premium sobre tecnologia, negócios, cultura, saúde e tendências globais.',
  image: '',
  url: `${SITE_URL}/`,
};

const upsertMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
};

const upsertCanonicalLink = (href: string) => {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
};

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) return DEFAULT_SEO.image;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.startsWith('/') ? value : `/${value}`, DEFAULT_SEO.url).toString();
};

const resetSeo = () => {
  document.title = DEFAULT_SEO.title;
  upsertCanonicalLink(DEFAULT_SEO.url);
  upsertMetaTag('name', 'description', DEFAULT_SEO.description);
  upsertMetaTag('property', 'og:title', DEFAULT_SEO.title);
  upsertMetaTag('property', 'og:description', DEFAULT_SEO.description);
  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:url', DEFAULT_SEO.url);
  upsertMetaTag('property', 'og:image', DEFAULT_SEO.image);
  upsertMetaTag('property', 'og:image:secure_url', DEFAULT_SEO.image);
  upsertMetaTag('property', 'og:image:alt', DEFAULT_SEO.title);
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', DEFAULT_SEO.title);
  upsertMetaTag('name', 'twitter:description', DEFAULT_SEO.description);
  upsertMetaTag('name', 'twitter:url', DEFAULT_SEO.url);
  upsertMetaTag('name', 'twitter:image', DEFAULT_SEO.image);
  upsertMetaTag('name', 'twitter:image:alt', DEFAULT_SEO.title);
};

const Post = () => {
  const { slug } = useParams();
  const { data: post, isLoading } = usePost(slug || '');
  const { data: relatedPosts = [] } = useRelatedPosts(post?.category_id, post?.id);
  const trackPostView = useTrackPostView();
  const trackedPostIdRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const postUrl = `${SITE_URL}/post/${slug ?? ''}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setShareOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Intercept newsletter-trigger links inside article content
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a.newsletter-trigger');
    if (anchor) {
      e.preventDefault();
      setNewsletterOpen(true);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
    if (post?.id && trackedPostIdRef.current !== post.id) {
      trackedPostIdRef.current = post.id;
      trackPostView.mutate(post.id);
    }
  }, [post?.id, trackPostView]);

  const sanitizedContent = useMemo(
    () => processArticleToc(sanitizeRichContent(post?.content || '')),
    [post?.content],
  );

  useEffect(() => {
    if (!post) {
      resetSeo();
      return;
    }

    const title = `${post.title} | Vision7`;
    const description = post.excerpt?.trim() || DEFAULT_SEO.description;
    const url = `${SITE_URL}/post/${post.slug}`;
    const image = toAbsoluteUrl(post.banner_url || post.image_url || DEFAULT_SEO.image);

    document.title = title;
    upsertCanonicalLink(url);
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:type', 'article');
    upsertMetaTag('property', 'og:url', url);
    upsertMetaTag('property', 'og:image', image);
    upsertMetaTag('property', 'og:image:secure_url', image);
    upsertMetaTag('property', 'og:image:alt', post.title);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:url', url);
    upsertMetaTag('name', 'twitter:image', image);
    upsertMetaTag('name', 'twitter:image:alt', post.title);

    return () => {
      resetSeo();
    };
  }, [post]);

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

  const categoryPath = post.categories?.slug ? `/${post.categories.slug}` : '/';
  const categoryLabel = post.categories?.name ?? 'Notícias';
  const heroImage = post.banner_url || post.image_url;

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
              width={1280}
              height={720}
              className="absolute inset-0 h-full w-full object-cover object-center"
              fetchPriority="high"
              decoding="async"
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
          <div className="mx-auto mb-6 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{post.excerpt}</p>
            {/* Share dropdown — uses direct platform links so WhatsApp/Telegram
                render the full OG card (image + description) without extra text */}
            <div ref={shareRef} className="relative shrink-0 sm:ml-4">
              <button
                onClick={() => setShareOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                title="Partilhar artigo"
                aria-haspopup="true"
                aria-expanded={shareOpen}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? 'Copiado!' : 'Partilhar'}
              </button>

              {shareOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right rounded-xl border border-border bg-card shadow-xl">
                  <div className="p-1">
                    {/* WhatsApp — wa.me sends ONLY the URL, WhatsApp generates the card preview */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(postUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <MessageCircle className="h-4 w-4 text-[#25D366]" />
                      WhatsApp
                    </a>
                    {/* Telegram */}
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(postUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <Send className="h-4 w-4 text-[#2AABEE]" />
                      Telegram
                    </a>
                    <div className="my-1 h-px bg-border" />
                    {/* Copy link */}
                    <button
                      onClick={() => void handleCopyLink()}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      Copiar link
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Article image (if no banner but has image) */}
          {!post.banner_url && post.image_url && (
            <div className="mx-auto mb-8 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src={post.image_url}
                alt={post.title}
                width={1280}
                height={720}
                className="h-64 w-full object-cover sm:h-80 lg:h-[420px]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )}

          <AdSpace size="banner" position="Antes do Conteúdo" className="mx-auto mb-8 max-w-4xl" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 lg:p-8">
                <div
                  ref={contentRef}
                  onClick={handleContentClick}
                  className="prose prose-base max-w-none break-words text-foreground dark:prose-invert dark:text-gray-300 sm:prose-lg [&_h1:first-child]:mt-0 [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold sm:[&_h1]:text-4xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold sm:[&_h2]:text-3xl [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold sm:[&_h3]:text-2xl [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_p]:my-4 [&_p]:leading-8 [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-6 [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-border [&_img]:shadow-lg [&_figure]:my-8 [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_hr]:my-8 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80 [&_code]:rounded-md [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-neutral-800 dark:[&_code]:bg-neutral-800 dark:[&_code]:text-neutral-200 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-neutral-950 dark:[&_pre]:bg-white [&_pre]:p-4 [&_pre]:text-neutral-100 dark:[&_pre]:text-neutral-900 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-neutral-100 dark:[&_pre_code]:text-neutral-900 [&_.internal-link-pending]:cursor-default [&_.internal-link-pending]:border-b [&_.internal-link-pending]:border-dashed [&_.internal-link-pending]:border-muted-foreground/50 [&_.internal-link-pending]:text-muted-foreground [&_.internal-link-pending]:no-underline [&_nav]:not-prose [&_.toc-block_a]:no-underline [&_.toc-block_a]:font-normal [&_.toc-block_li]:my-0 [&_.toc-block_ul]:my-0 [&_.table-scroll]:overflow-x-auto [&_.table-scroll]:-mx-4 [&_.table-scroll]:px-4 [&_.table-scroll]:sm:mx-0 [&_.table-scroll]:sm:px-0 [&_.table-scroll]:pb-1 [&_table]:min-w-[480px] [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:whitespace-nowrap [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:align-top [&_.newsletter-trigger]:cursor-pointer"
                  dangerouslySetInnerHTML={{
                    __html: sanitizedContent,
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

      <NewsletterModal open={newsletterOpen} onClose={() => setNewsletterOpen(false)} />
    </div>
  );
};

export default Post;
