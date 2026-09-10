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
import { ArticleContentRenderer } from '@/components/content/ArticleContentRenderer';

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
  const [readProgress, setReadProgress] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);

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
    setReadProgress(0);
    setShowBackTop(false);
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setReadProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
      setShowBackTop(scrollTop > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (post?.id && trackedPostIdRef.current !== post.id) {
      trackedPostIdRef.current = post.id;
      trackPostView.mutate(post.id);
    }
  }, [post?.id, trackPostView]);

  const categoryPath = post?.categories?.slug ? `/${post.categories.slug}` : '/';
  const categoryLabel = post?.categories?.name ?? 'Notícias';

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

    const structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.dataset.seo = 'article';
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description,
      url,
      image: image ? [image] : undefined,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      author: { '@type': 'Person', name: post.author_name || 'Equipa Vision7' },
      articleSection: post.categories?.name || undefined,
      keywords: post.tags?.length ? post.tags.join(', ') : undefined,
      inLanguage: 'pt-BR',
      wordCount: post.content?.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length || undefined,
      publisher: {
        '@type': 'Organization',
        name: 'Vision7',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/vision-logo-premium-default.webp` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    });
    document.head.appendChild(structuredData);

    const breadcrumbData = document.createElement('script');
    breadcrumbData.type = 'application/ld+json';
    breadcrumbData.dataset.seo = 'breadcrumb';
    breadcrumbData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${SITE_URL}${categoryPath}` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    });
    document.head.appendChild(breadcrumbData);

    return () => {
      structuredData.remove();
      breadcrumbData.remove();
      resetSeo();
    };
  }, [categoryLabel, categoryPath, post]);

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
          <h1 className="text-2xl font-bold text-foreground mb-4 sm:text-4xl">Post não encontrado</h1>
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

  const heroImage = post.banner_url || post.image_url;

  const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress bar — fixed at top below sticky header */}
      <div
        className="fixed left-0 top-0 z-[60] h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-100 ease-out"
        style={{ width: `${readProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(readProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso de leitura"
      />

      <Header />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-5">
          <ol className="flex min-h-[36px] items-center gap-1.5 text-xs text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Início</Link></li>
            <li aria-hidden="true" className="text-border">›</li>
            <li>
              <Link to={categoryPath} className="hover:text-foreground transition-colors capitalize">
                {categoryLabel}
              </Link>
            </li>
            <li aria-hidden="true" className="text-border">›</li>
            <li className="min-w-0 truncate max-w-[100px] xs:max-w-[160px] sm:max-w-xs font-medium text-foreground" aria-current="page">
              {post.title}
            </li>
          </ol>
        </div>
      </nav>

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
                decoding="async"
              />
            </div>
          )}

          <AdSpace size="banner" position="Antes do Conteúdo" className="mx-auto mb-8 max-w-4xl" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 lg:p-8">
                <ArticleContentRenderer
                  contentRef={contentRef}
                  onClick={handleContentClick}
                  html={post.content || ''}
                  variant="article"
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

      {/* Back to top button */}
      {showBackTop && (
        <button
          type="button"
          aria-label="Voltar ao topo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/40 sm:bottom-8 sm:right-8"
        >
          <ArrowLeft className="h-4 w-4 rotate-90 text-foreground" />
        </button>
      )}
    </div>
  );
};

export default Post;
