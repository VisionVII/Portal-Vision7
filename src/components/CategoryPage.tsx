import React from 'react';
import Header from './Header';
import Footer from './Footer';
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className={`${heroColor} text-white py-10 md:py-14`}>
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold mb-2">{title}</h1>
          <p className="text-base sm:text-lg opacity-90 max-w-2xl">{description}</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Top Ad */}
        <AdSpace size="leaderboard" position={`Topo ${title}`} className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main */}
          <div className="lg:col-span-8 xl:col-span-9">
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
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            <AdSpace size="square" position={`Lateral ${title}`} />

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-lg font-headline font-bold text-card-foreground mb-3">Outras Categorias</h3>
              <div className="space-y-1">
                {otherCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/${cat.slug}`}
                    className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <AdSpace size="square" position={`Lateral 2 ${title}`} className="hidden lg:flex" />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CategoryPage;
