import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SectionPageHero from '@/components/content/SectionPageHero';
import PostCard from '@/components/content/PostCard';
import AdSpace from '@/components/content/AdSpace';
const NewsletterForm = React.lazy(() => import('@/components/content/NewsletterForm'));
import PostPagination from '@/components/content/PostPagination';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePagination } from '@/hooks/usePagination';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  LayoutList,
  RefreshCw,
  Star,
  Tag,
  TrendingUp,
} from 'lucide-react';
import {
  HOME_PAGE_CONFIG_KEY,
  defaultHomePageConfig,
  getEnabledHomePageBanners,
  parseHomePageConfig,
  type HomePageConfig,
} from '@/lib/homepage-config';
import { SectionBlock } from '@/components/home/SectionBlock';

interface CourseMeta {
  affiliateUrl?: string;
  partnerName?: string;
  ctaLabel?: string;
  badge?: string;
}

const parseCourseMeta = (rawValue?: string | null): Record<string, CourseMeta> => {
  if (!rawValue) return {};

  try {
    return JSON.parse(rawValue) as Record<string, CourseMeta>;
  } catch {
    return {};
  }
};

const dateFormatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const dateFormatter = new Intl.DateTimeFormat('pt-PT', dateFormatOptions);
const formatPostDate = (dateStr: string | null, fallback: string) =>
  dateFormatter.format(new Date(dateStr || fallback));

// ─── Sub-components ────────────────────────────────────────────────────────────

const ErrorRetryBlock: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
    <p className="font-medium text-destructive">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <RefreshCw size={14} />
      Tentar novamente
    </button>
  </div>
);

const SectionSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-28 w-full rounded-2xl" />
    ))}
  </div>
);

const Index = () => {
  const { data: posts = [], isLoading, isError, refetch } = usePosts();
  const { data: categories } = useCategories();
  const { data: courses = [] } = useCourses();
  const { data: siteSettings } = useSiteSettings();

  const homeConfig = useMemo(
    () => parseHomePageConfig(siteSettings?.[HOME_PAGE_CONFIG_KEY]),
    [siteSettings]
  );
  const courseMeta = useMemo(
    () => parseCourseMeta(siteSettings?.course_partner_meta),
    [siteSettings]
  );

  const featuredPost = useMemo(() => posts.find((post) => post.featured), [posts]);
  const regularPosts = useMemo(() => posts.filter((post) => !post.featured && post.status === 'published'), [posts]);
  const latestPosts = useMemo(() => posts.filter((post) => post.status === 'published').slice(0, 4), [posts]);
  const popularPosts = useMemo(
    () =>
      [...posts]
        .filter((post) => post.status === 'published')
        .sort((a, b) => {
          const byViews = (b.views || 0) - (a.views || 0);
          if (byViews !== 0) return byViews;
          return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
        })
        .slice(0, 5),
    [posts],
  );

  const { paginatedItems: paginatedRegularPosts, currentPage, totalPages, goToPage } = usePagination(regularPosts, { pageSize: 6 });

  const newsletterLabel = homeConfig.sections.find((section) => section.id === 'newsletter')?.label || 'Newsletter';
  const activeBanners = useMemo(
    () => getEnabledHomePageBanners(homeConfig),
    [homeConfig]
  );
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const activeBanner = activeBanners[activeBannerIndex] || activeBanners[0];
  const bannerHref = activeBanner?.ctaHref?.trim() || '#noticias';
  const bannerCtaLabel = activeBanner?.ctaLabel?.trim() || homeConfig.primaryCtaLabel || 'Explorar Notícias';
  const isExternalBannerHref = /^https?:\/\//i.test(bannerHref);
  const isHashBannerHref = bannerHref.startsWith('#');
  const activeBannerDesktopUrl = activeBanner?.imageUrl || homeConfig.bannerUrl || defaultHomePageConfig.bannerUrl;
  const activeBannerMobileUrl = activeBanner?.mobileImageUrl || homeConfig.mobileBannerUrl || activeBannerDesktopUrl;
  const heroTitle = activeBanner?.title?.trim() || homeConfig.heroTitle;
  const heroDescription = activeBanner?.description?.trim() || homeConfig.heroDescription;
  const heroBadge = homeConfig.heroBadge?.trim() || activeBanner?.title ? 'Destaque Vision7' : undefined;
  const heroPrimaryCta = bannerCtaLabel || homeConfig.primaryCtaLabel || 'Explorar Notícias';
  const heroSecondaryCta = homeConfig.secondaryCtaLabel || 'Categorias';
  const heroSecondaryHref = '#categorias';

  useEffect(() => {
    setActiveBannerIndex((prev) => (prev >= activeBanners.length ? 0 : prev));
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length < 2) {
      return;
    }

    let intervalId: number | undefined;

    const start = () => {
      if (intervalId == null) {
        intervalId = window.setInterval(() => {
          setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length);
        }, 5200);
      }
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeBanners.length]);

  const renderSection = (section: HomePageConfig['sections'][number]) => {
    const sectionId = section.id;
    const sectionLabel = section.label || defaultHomePageConfig.sections.find((item) => item.id === sectionId)?.label || 'Secção';

    switch (sectionId) {
      // ── Featured ──────────────────────────────────────────────────────────
      case 'featured': {
        if (isLoading)
          return (
            <SectionBlock key="featured" title={sectionLabel} icon={<Star size={16} />}>
              <Skeleton className="h-80 w-full rounded-2xl" />
            </SectionBlock>
          );
        if (isError)
          return (
            <SectionBlock key="featured" title={sectionLabel} icon={<Star size={16} />}>
              <ErrorRetryBlock message="Não foi possível carregar o destaque" onRetry={refetch} />
            </SectionBlock>
          );
        if (!featuredPost) return null;
        return (
          <SectionBlock key="featured" title={sectionLabel} icon={<Star size={16} />}>
            <PostCard
              id={featuredPost.id}
              title={featuredPost.title}
              excerpt={featuredPost.excerpt}
              image={featuredPost.image_url || ''}
              banner={featuredPost.banner_url}
              category={featuredPost.categories?.name || 'Geral'}
              categoryColor={featuredPost.categories?.color || 'bg-muted'}
              author={featuredPost.author_name}
              date={formatPostDate(featuredPost.published_at, featuredPost.created_at)}
              readTime={featuredPost.read_time}
              slug={featuredPost.slug}
              featured
            />
          </SectionBlock>
        );
      }

      // ── Latest ────────────────────────────────────────────────────────────
      case 'latest': {
        return (
          <SectionBlock
            key="latest"
            title={sectionLabel}
            icon={<Clock size={16} />}
            subtitle="Publicado recentemente"
            action={
              <Link
                to="/todas"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
              >
                Ver todas <ArrowRight size={13} />
              </Link>
            }
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-60 w-full rounded-2xl" />
                ))}
              </div>
            ) : isError ? (
              <ErrorRetryBlock message="Erro ao carregar últimas notícias" onRetry={refetch} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {latestPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt}
                    image={post.image_url || ''}
                    banner={post.banner_url}
                    category={post.categories?.name || 'Geral'}
                    categoryColor={post.categories?.color || 'bg-muted'}
                    author={post.author_name}
                    date={formatPostDate(post.published_at, post.created_at)}
                    readTime={post.read_time}
                    slug={post.slug}
                  />
                ))}
              </div>
            )}
          </SectionBlock>
        );
      }

      // ── Courses ───────────────────────────────────────────────────────────
      case 'courses': {
        return (
          <SectionBlock
            key="courses"
            id="cursos"
            title={sectionLabel}
            icon={<GraduationCap size={16} />}
            subtitle="Formação recomendada"
            className="rounded-2xl border border-primary-100/70 bg-gradient-to-br from-primary-50/60 via-background to-secondary-50/50 p-5 sm:p-7 dark:border-primary-800/30 dark:from-primary-950/20 dark:via-background dark:to-secondary-950/20"
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
              </div>
            ) : courses.length ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {courses.map((course) => {
                  const meta = courseMeta[course.slug] ?? {};
                  const cardBody = (
                    <div className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                          <BookOpen size={11} />
                          {meta.badge || 'Afiliado'}
                        </span>
                        {meta.partnerName && (
                          <span className="text-[11px] font-medium text-muted-foreground">{meta.partnerName}</span>
                        )}
                      </div>
                      <h3 className="mb-2 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg">
                        {course.title}
                      </h3>
                      <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
                          {course.level}
                        </span>
                        <span>{course.duration}</span>
                        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary">
                          Ver curso <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                  if (meta.affiliateUrl) {
                    return (
                      <a key={course.id} href={meta.affiliateUrl} target="_blank" rel="noreferrer" className="block h-full">
                        {cardBody}
                      </a>
                    );
                  }
                  return (
                    <Link key={course.id} to={`/curso/${course.slug}`} className="block h-full">
                      {cardBody}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BookOpen size={36} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Ainda não existem cursos disponíveis. Verifique novamente em breve.
                </p>
              </div>
            )}
          </SectionBlock>
        );
      }

      // ── More (paginated list) ─────────────────────────────────────────────
      case 'more': {
        return (
          <SectionBlock
            key="more"
            title={sectionLabel}
            icon={<LayoutList size={16} />}
            subtitle="Todas as publicações"
          >
            <AdSpace size="rectangle" position="Meio do Conteúdo" className="mb-6" />
            {isLoading ? (
              <SectionSkeleton rows={4} />
            ) : isError ? (
              <ErrorRetryBlock message="Erro ao carregar notícias" onRetry={refetch} />
            ) : paginatedRegularPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted/30 px-6 py-14 text-center">
                <p className="font-medium text-muted-foreground">Nenhuma notícia disponível no momento</p>
                <p className="text-sm text-muted-foreground">Verifique novamente mais tarde para novo conteúdo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedRegularPosts.map((post) => (
                  <Link to={`/post/${post.slug}`} key={post.id} className="block">
                    <article className="group flex gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                      {post.image_url && (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 py-0.5">
                        <span className={`category-badge ${post.categories?.color || 'bg-muted'} mb-2 text-[10px]`}>
                          {post.categories?.name || 'Geral'}
                        </span>
                        <h3 className="mb-1.5 line-clamp-2 text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary sm:text-base">
                          {post.title}
                        </h3>
                        <p className="hidden line-clamp-1 text-xs text-muted-foreground sm:block">{post.excerpt}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{post.author_name}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span>{formatPostDate(post.published_at, post.created_at)}</span>
                          <span className="font-semibold text-primary">{post.read_time}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
                {totalPages > 1 && (
                  <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                )}
              </div>
            )}
          </SectionBlock>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {activeBannerDesktopUrl && <SectionPageHero
        title={heroTitle}
        description={heroDescription}
        badge={heroBadge}
        align={homeConfig.heroAlignment}
        fallbackClassName="bg-[#020817]"
        media={{
          desktopUrl: activeBannerDesktopUrl,
          mobileUrl: activeBannerMobileUrl,
          alt: activeBanner?.title || 'Banner principal do Vision7',
        }}
        overlayClassName="bg-[linear-gradient(118deg,rgba(2,6,23,0.58)_0%,rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.62)_100%)]"
        contentClassName="max-w-[36rem] pb-2 text-left sm:pb-6 lg:pb-10 xl:pl-6"
        actionsSlot={(
          <div className="flex flex-col items-start gap-4 pt-6 sm:pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isExternalBannerHref ? (
                <a
                  href={bannerHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {heroPrimaryCta}
                </a>
              ) : isHashBannerHref ? (
                <a
                  href={bannerHref}
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {heroPrimaryCta}
                </a>
              ) : (
                <Link
                  to={bannerHref}
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {heroPrimaryCta}
                </Link>
              )}

              <Link
                to={heroSecondaryHref}
                className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/15"
              >
                {heroSecondaryCta}
              </Link>
            </div>

            {activeBanners.length > 1 ? (
              <div className="flex items-center gap-2">
                {activeBanners.map((banner, index) => (
                  <button
                    key={`dot-${banner.id}`}
                    type="button"
                    aria-label={`Abrir banner ${index + 1}`}
                    onClick={() => setActiveBannerIndex(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      activeBannerIndex === index ? 'w-10 bg-white shadow-[0_0_24px_rgba(255,255,255,0.45)]' : 'w-2.5 bg-white/35 hover:bg-white/55'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      />}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="bg-muted/25">
        <div className="container mx-auto px-4 py-10 lg:py-14" id="noticias">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Content column */}
            <div className="space-y-14 lg:col-span-8">
              {homeConfig.sections
                .filter((section) => section.enabled && section.id !== 'newsletter')
                .map((section) => renderSection(section))}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:col-span-4">
              <AdSpace size="square" position="Barra Lateral" className="hidden lg:flex" />

              <div className="space-y-6 lg:sticky lg:top-20">
                {/* Popular posts */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                      <TrendingUp size={16} />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-card-foreground">Em Alta</h3>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mais lidos</p>
                    </div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {isLoading ? (
                      <div className="space-y-4 p-5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-10 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      popularPosts.map((post, index) => (
                        <Link
                          to={`/post/${post.slug}`}
                          key={post.id}
                          className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                        >
                          <span className="w-8 shrink-0 text-right text-2xl font-black leading-tight tabular-nums text-primary/20 transition-colors group-hover:text-primary/50">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
                              {post.title}
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatPostDate(post.published_at, post.created_at)} · {post.views || 0} views
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Categories sidebar */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                      <Tag size={16} />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-card-foreground">Categorias</h3>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Navegue por temas</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {categories?.map((category) => (
                        <Link
                          key={category.id}
                          to={`/${category.slug}`}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <AdSpace size="square" position="Lateral 2" className="hidden lg:flex" />

                {/* Newsletter */}
                {homeConfig.sections.some((s) => s.id === 'newsletter' && s.enabled) && (
                  <div
                    id="newsletter"
                    className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white shadow-lg dark:from-primary-700 dark:to-secondary-700"
                  >
                    <h3 className="mb-1.5 text-lg font-bold">{newsletterLabel}</h3>
                    <p className="mb-5 text-sm text-white/80">
                      Receba as principais notícias diretamente no seu email
                    </p>
                    <Suspense
                      fallback={<div className="h-10 animate-pulse rounded-xl bg-white/20" />}
                    >
                      <NewsletterForm variant="sidebar" />
                    </Suspense>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
