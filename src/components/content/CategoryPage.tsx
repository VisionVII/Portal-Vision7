import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PostCard from './PostCard';
import AdSpace from './AdSpace';
import PostPagination from './PostPagination';
import { usePostsByCategory } from '@/hooks/usePosts';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

interface CategoryPageProps {
  slug: string;
  title: string;
  description: string;
  heroColor: string; // tailwind bg class e.g. "bg-blue-600"
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
  const { data: posts, isLoading } = usePostsByCategory(slug);
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(posts, { pageSize: 6 });
  const totalPosts = posts?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className={`${heroColor} relative overflow-hidden py-8 text-white md:py-12`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_28%)] opacity-30" />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[28px] border border-white/15 bg-slate-950/20 p-5 shadow-xl backdrop-blur md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                  Curadoria Vision7
                </span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90">
                  {totalPosts} artigo{totalPosts === 1 ? '' : 's'}
                </span>
              </div>
              <h1 className="mb-2 text-3xl font-headline font-bold sm:text-4xl md:text-5xl">{title}</h1>
              <p className="max-w-2xl text-base opacity-90 sm:text-lg">{description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          {/* Top Ad */}
          <AdSpace size="leaderboard" position={`Topo ${title}`} className="mb-8" />

          <div className="mb-6 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Explorar {title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Conteúdo editorial organizado com navegação rápida, cards mais leves e leitura otimizada para mobile e desktop.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
            {/* Main */}
            <div className="min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-72 w-full rounded-xl" />
                ))}
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
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
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
