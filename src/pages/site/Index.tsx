import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PostCard from '@/components/content/PostCard';
import AdSpace from '@/components/content/AdSpace';
import CookieBanner from '@/components/system/CookieBanner';
import NewsletterForm from '@/components/content/NewsletterForm';
import PostPagination from '@/components/content/PostPagination';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePagination } from '@/hooks/usePagination';
import { useSticky } from '@/hooks/useSticky';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  HOME_PAGE_CONFIG_KEY,
  defaultHomePageConfig,
  getEnabledHomePageBanners,
  parseHomePageConfig,
  type HomePageConfig,
} from '@/lib/homepage-config';

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
  } catch (error) {
    console.warn('Falha ao interpretar as parcerias de cursos.', error);
    return {};
  }
};

const Index = () => {
  const { data: posts = [], isLoading, isError, refetch } = usePosts();
  const { data: categories } = useCategories();
  const { data: courses = [] } = useCourses();
  const { data: siteSettings } = useSiteSettings();
  const { ref: stickyRef, style: stickyStyle } = useSticky({ offset: 100, topBuffer: 120 });

  const homeConfig = useMemo(
    () => parseHomePageConfig(siteSettings?.[HOME_PAGE_CONFIG_KEY]),
    [siteSettings]
  );
  const courseMeta = useMemo(
    () => parseCourseMeta(siteSettings?.course_partner_meta),
    [siteSettings]
  );

  const featuredPost = posts.find((post) => post.featured);
  const regularPosts = posts.filter((post) => !post.featured && post.status === 'published');
  const latestPosts = posts.filter((post) => post.status === 'published').slice(0, 4);
  const popularPosts = [...posts]
    .filter((post) => post.status === 'published')
    .sort((a, b) => {
      const byViews = (b.views || 0) - (a.views || 0);
      if (byViews !== 0) return byViews;
      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
    })
    .slice(0, 5);

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
  const bannerDescription = activeBanner?.description?.trim() || 'Acesse insights estratégicos sobre tecnologia, inteligência artificial, inovação e negócios digitais. Informação clara e relevante para decisões rápidas em um mundo em constante evolução.';
  const isExternalBannerHref = /^https?:\/\//i.test(bannerHref);
  const isHashBannerHref = bannerHref.startsWith('#');

  useEffect(() => {
    setActiveBannerIndex((prev) => (prev >= activeBanners.length ? 0 : prev));
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [activeBanners.length]);

  const renderSection = (section: HomePageConfig['sections'][number]) => {
    const sectionId = section.id;
    const sectionLabel = section.label || defaultHomePageConfig.sections.find((item) => item.id === sectionId)?.label || 'Secção';

    switch (sectionId) {
      case 'featured':
        if (isLoading) {
          return (
            <section key="featured">
              <h2 className="section-title">{sectionLabel}</h2>
              <Skeleton className="h-72 w-full rounded-xl sm:h-80" />
            </section>
          );
        }

        if (isError) {
          return (
            <section key="featured">
              <h2 className="section-title">{sectionLabel}</h2>
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-800 dark:bg-red-950">
                <p className="font-medium text-red-700 dark:text-red-300">Não foi possível carregar o destaque</p>
                <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Tentar novamente</button>
              </div>
            </section>
          );
        }

        if (!featuredPost) return null;

        return (
          <section key="featured">
            <h2 className="section-title">{sectionLabel}</h2>
            <PostCard
              id={featuredPost.id}
              title={featuredPost.title}
              excerpt={featuredPost.excerpt}
              image={featuredPost.image_url || ''}
              category={featuredPost.categories?.name || 'Geral'}
              categoryColor={featuredPost.categories?.color || 'bg-muted'}
              author={featuredPost.author_name}
              date={new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
              readTime={featuredPost.read_time}
              slug={featuredPost.slug}
              featured
            />
          </section>
        );

      case 'latest':
        return (
          <section key="latest">
            <h2 className="section-title">{sectionLabel}</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-56 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-800 dark:bg-red-950">
                <p className="font-medium text-red-700 dark:text-red-300">Erro ao carregar últimas notícias</p>
                <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Tentar novamente</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {latestPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt}
                    image={post.image_url || ''}
                    category={post.categories?.name || 'Geral'}
                    categoryColor={post.categories?.color || 'bg-muted'}
                    author={post.author_name}
                    date={new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    readTime={post.read_time}
                    slug={post.slug}
                  />
                ))}
              </div>
            )}
          </section>
        );

      case 'courses':
        return (
          <section key="courses" className="rounded-2xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-primary-50 p-4 sm:p-8 dark:border-neutral-700 dark:from-neutral-800 dark:to-neutral-900">
            <h2 className="section-title">{sectionLabel}</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-44 w-full rounded-lg" />
                ))}
              </div>
            ) : courses.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                  const meta = courseMeta[course.slug] ?? {};
                  const cardContent = (
                    <div className="group rounded-lg border border-primary-200 bg-background p-5 shadow-sm transition-all hover:border-primary-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-500">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-secondary-100 px-2 py-1 text-[11px] font-semibold text-secondary-700 dark:bg-neutral-700 dark:text-secondary-300">
                          {meta.badge || 'Afiliado'}
                        </span>
                        {meta.partnerName && (
                          <span className="text-[11px] text-muted-foreground">{meta.partnerName}</span>
                        )}
                      </div>
                      <h3 className="mb-2 text-base font-semibold text-primary-700 transition-colors group-hover:text-primary-600 dark:text-primary-400">
                        {course.title}
                      </h3>
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-secondary-100 px-2 py-1 text-xs font-semibold text-secondary-700 dark:bg-neutral-700 dark:text-secondary-400">
                          Nível: {course.level}
                        </span>
                        <span className="text-xs text-muted-foreground">{course.duration}</span>
                      </div>
                    </div>
                  );

                  if (meta.affiliateUrl) {
                    return (
                      <a key={course.id} href={meta.affiliateUrl} target="_blank" rel="noreferrer">
                        {cardContent}
                      </a>
                    );
                  }

                  return (
                    <Link key={course.id} to={`/curso/${course.slug}`}>
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Ainda não existem cursos disponíveis. Verifique novamente em breve.</p>
              </div>
            )}
          </section>
        );

      case 'more':
        return (
          <section key="more">
            <AdSpace size="rectangle" position="Meio do Conteúdo" className="mb-8" />
            <h2 className="section-title">{sectionLabel}</h2>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-800 dark:bg-red-950">
                <p className="font-medium text-red-700 dark:text-red-300">Erro ao carregar notícias</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">Verifique a conexão e tente novamente.</p>
                <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Tentar novamente</button>
              </div>
            ) : paginatedRegularPosts.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-12 text-center">
                <p className="font-medium text-muted-foreground">Nenhuma notícia disponível no momento</p>
                <p className="mt-2 text-sm text-muted-foreground">Verifique novamente mais tarde para novo conteúdo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedRegularPosts.map((post) => (
                  <Link to={`/post/${post.slug}`} key={post.id}>
                    <div className="group overflow-hidden rounded-2xl border border-border bg-card p-3 transition-all duration-200 hover:border-primary/20 hover:shadow-md sm:p-5">
                      <div className="flex gap-3 sm:gap-4">
                        <img
                          src={post.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=200&q=80'}
                          alt={post.title}
                          className="h-16 w-16 flex-shrink-0 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24 sm:rounded-xl"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <span className={`category-badge ${post.categories?.color || 'bg-muted'} mb-1.5 text-[10px]`}>
                            {post.categories?.name || 'Geral'}
                          </span>
                          <h3 className="mb-1 line-clamp-2 text-[clamp(0.9rem,2.5vw,1.125rem)] font-headline font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
                            {post.title}
                          </h3>
                          <p className="hidden line-clamp-2 text-[clamp(0.75rem,1.8vw,0.875rem)] text-muted-foreground sm:block">
                            {post.excerpt}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{post.author_name}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span>{new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="font-medium text-primary">{post.read_time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {totalPages > 1 && <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />}
              </div>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden bg-[#020817] py-0 text-white md:py-3 lg:py-6">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="container relative mx-auto px-0 sm:px-4">
          <div className="overflow-hidden border-y border-white/10 bg-slate-950/72 shadow-[0_30px_90px_rgba(8,18,44,0.45)] backdrop-blur-xl sm:rounded-2xl sm:border md:rounded-3xl">
            <div className="relative min-h-[44svh] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
              <img
                src={activeBanner.imageUrl}
                alt={activeBanner.title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = homeConfig.bannerUrl || defaultHomePageConfig.bannerUrl;
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.25)_0%,rgba(2,6,23,0.65)_50%,rgba(2,6,23,0.92)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.85)_0%,rgba(2,6,23,0.3)_40%,rgba(2,6,23,0.8)_100%)]" />
              <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:26px_26px]" />

              <div className="relative z-10 mx-auto flex min-h-[44svh] max-w-4xl flex-col items-center justify-center px-4 py-6 text-center sm:min-h-[320px] sm:px-8 md:min-h-[360px] lg:min-h-[420px] lg:px-12">
                <h2 className="max-w-3xl text-[clamp(1.25rem,3.2vw,2.25rem)] font-headline font-bold leading-tight text-white [text-wrap:balance]">
                  {activeBanner.title}
                </h2>
                <p className="mt-2 max-w-2xl text-[clamp(0.8rem,1.8vw,1rem)] leading-relaxed text-slate-200/85 sm:mt-3 lg:max-w-3xl [text-wrap:balance]">
                  {bannerDescription}
                </p>

                <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6 sm:flex-row">
                  {isExternalBannerHref ? (
                    <a
                      href={bannerHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                    >
                      {bannerCtaLabel}
                    </a>
                  ) : isHashBannerHref ? (
                    <a
                      href={bannerHref}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                    >
                      {bannerCtaLabel}
                    </a>
                  ) : (
                    <Link
                      to={bannerHref}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                    >
                      {bannerCtaLabel}
                    </Link>
                  )}

                  {activeBanners.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length)}
                      className="hidden items-center justify-center rounded-xl border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/14 sm:inline-flex"
                    >
                      Próximo destaque
                    </button>
                  ) : null}
                </div>
              </div>


            </div>
          </div>

          {activeBanners.length > 1 ? (
            <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-3">
              {activeBanners.map((banner, index) => (
                <button
                  key={`panel-${banner.id}`}
                  type="button"
                  onClick={() => setActiveBannerIndex(index)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    activeBannerIndex === index
                      ? 'border-primary-300 bg-primary-500/14 shadow-[0_12px_36px_rgba(59,130,246,0.16)]'
                      : 'border-white/10 bg-white/6 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{banner.title}</p>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{banner.description}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12 lg:gap-8" id="noticias">
          <div className="space-y-6 sm:space-y-8 lg:col-span-8 xl:col-span-9">
            {homeConfig.sections
              .filter((section) => section.enabled && section.id !== 'newsletter')
              .map((section) => renderSection(section))}
          </div>

          <aside className="space-y-6 lg:col-span-4 xl:col-span-3">
            <AdSpace size="square" position="Barra Lateral" className="hidden lg:flex" />

            <div ref={stickyRef} style={stickyStyle} className="space-y-6 lg:sticky lg:top-28">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <h3 className="mb-4 text-lg font-headline font-bold text-card-foreground">Mais Populares</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Skeleton key={item} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {popularPosts.map((post, index) => (
                    <Link to={`/post/${post.slug}`} key={post.id} className="group flex gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-card-foreground transition-colors group-hover:text-primary">
                          {post.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })} • {post.views || 0} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-lg font-headline font-bold text-card-foreground">Categorias</h3>
              <div className="space-y-1">
                {categories?.map((category) => (
                  <Link
                    key={category.id}
                    to={`/${category.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <AdSpace size="square" position="Lateral 2" className="hidden lg:flex" />

            {homeConfig.sections.some((section) => section.id === 'newsletter' && section.enabled) && (
              <div id="newsletter" className="rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white shadow-lg dark:from-primary-700 dark:to-secondary-700">
                <h3 className="mb-2 text-xl font-bold">{newsletterLabel}</h3>
                <p className="mb-5 text-sm text-white/90">Receba as principais notícias diretamente no seu email</p>
                <NewsletterForm variant="sidebar" />
              </div>
            )}
            </div>
          </aside>
        </div>
      </div>

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
