import React, { useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PostCard from './PostCard';
import AdSpace from './AdSpace';
import PostPagination from './PostPagination';
import { usePostsByCategory } from '@/hooks/usePosts';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { getSectionPageBanner, parseSectionPageBanners, SECTION_PAGE_BANNERS_KEY } from '@/lib/sectionPageConfig';
import SectionPageHero from './SectionPageHero';
import { cn } from '@/lib/utils';

interface CategoryPageProps {
  slug: string;
  title: string;
  description: string;
  heroColor: string;
  defaultCategoryColor: string;
  otherCategories: { name: string; slug: string }[];
}

const CategoryPage: React.FC<CategoryPageProps> = ({
  slug,
  title,
  description,
  heroColor,
  defaultCategoryColor,
  otherCategories,
}) => {
  const { data: posts, isLoading, isError, refetch } = usePostsByCategory(slug);
  const { data: siteSettings } = useSiteSettings();
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(posts, { pageSize: 6 });
  const totalPosts = posts?.length ?? 0;
  const sectionPageBanners = useMemo(
    () => parseSectionPageBanners(siteSettings?.[SECTION_PAGE_BANNERS_KEY]),
    [siteSettings],
  );
  const heroBanner = getSectionPageBanner(sectionPageBanners, slug);
  const heroBannerUrl = heroBanner?.bannerUrl || '';
  const heroMobileBannerUrl = heroBanner?.mobileBannerUrl || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <SectionPageHero
        title={title}
        description={description}
        align="left"
        fallbackClassName="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800"
        media={heroBannerUrl || heroMobileBannerUrl ? {
          desktopUrl: heroBannerUrl,
          mobileUrl: heroMobileBannerUrl,
          alt: `Banner da secção ${title}`,
        } : null}
        metaSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 backdrop-blur-sm">
              Curadoria Vision7
            </span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm', heroColor)}>
              {totalPosts} artigo{totalPosts === 1 ? '' : 's'}
            </span>
          </div>
        )}
        actionsSlot={(
          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
            <a
              href="#artigos"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/90"
            >
              Explorar artigos
            </a>
          </div>
        )}
      />

      <div id="artigos" className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          {/* Top Ad */}
          <AdSpace size="leaderboard" position={`Topo ${title}`} className="mb-8" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
            {/* Main */}
            <div className="min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-72 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-800 dark:bg-red-950">
                <p className="font-medium text-red-700 dark:text-red-300">Erro ao carregar artigos de {title}</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">Verifique a conexão e tente novamente.</p>
                <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Tentar novamente</button>
              </div>
            ) : paginatedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {paginatedItems.map((post, idx) => (
                    <React.Fragment key={post.id}>
                      <PostCard
                        id={post.id}
                        title={post.title}
                        excerpt={post.excerpt}
                        image={post.image_url || ''}
                        category={post.categories?.name || title}
                        categoryColor={post.categories?.color || defaultCategoryColor}
                        author={post.author_name}
                        date={new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        readTime={post.read_time}
                        slug={post.slug}
                      />
                      {/* Inline ad after 4th post */}
                      {idx === 3 && paginatedItems.length > 4 && (
                        <div className="col-span-1 sm:col-span-2">
                          <AdSpace size="inline" position={`Inline ${title}`} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </>
            ) : (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <h3 className="text-xl font-bold text-card-foreground mb-2">Em breve mais conteúdo</h3>
                <p className="text-muted-foreground">Estamos a trabalhar para trazer as melhores notícias de {title.toLowerCase()}.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <AdSpace size="square" position={`Lateral ${title}`} className="mx-auto" />

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-headline font-bold text-card-foreground">Outras Categorias</h3>
              <div className="space-y-1">
                {otherCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/${cat.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <AdSpace size="square" position={`Lateral 2 ${title}`} className="mx-auto hidden lg:flex" />
          </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CategoryPage;
