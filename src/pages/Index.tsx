import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';
import CookieBanner from '../components/CookieBanner';
import NewsletterForm from '../components/NewsletterForm';
import PostPagination from '../components/PostPagination';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const Index = () => {
  const { data: posts, isLoading } = usePosts();
  const { data: categories } = useCategories();

  const featuredPost = posts?.find(post => post.featured);
  const regularPosts = posts?.filter(post => !post.featured) || [];
  const latestPosts = posts?.slice(0, 4) || [];
  const { paginatedItems: paginatedRegularPosts, currentPage, totalPages, goToPage } = usePagination(regularPosts, { pageSize: 6 });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero */}
      <section className="bg-gradient-to-br from-portugal-green via-green-700 to-green-800 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold mb-4 leading-tight">
              Bem-vindos ao Porto Notícias
            </h1>
            <p className="text-base sm:text-lg md:text-xl opacity-90 mb-8 max-w-2xl">
              O seu portal de informação confiável em Portugal. 
              Mantenha-se atualizado com as últimas notícias de tecnologia, 
              desporto, música, saúde e mundo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="#noticias" className="bg-white text-portugal-green px-5 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-colors text-sm sm:text-base">
                Explorar Notícias
              </Link>
              <Link to="#newsletter" className="border-2 border-white/80 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-white hover:text-portugal-green transition-colors text-sm sm:text-base">
                Newsletter
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Top Leaderboard Ad */}
        <AdSpace size="leaderboard" position="Topo da Página" className="mb-8" />

        {/* Featured Post */}
        {isLoading ? (
          <section className="mb-10">
            <h2 className="section-title">Destaque</h2>
            <Skeleton className="h-72 sm:h-80 w-full rounded-xl" />
          </section>
        ) : featuredPost && (
          <section className="mb-10">
            <h2 className="section-title">Destaque</h2>
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="noticias">
          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Latest News */}
            <section className="mb-10">
              <h2 className="section-title">Últimas Notícias</h2>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

            {/* Mid-content rectangle ad */}
            <AdSpace size="rectangle" position="Meio do Conteúdo" className="mb-10" />

            {/* More News */}
            <section>
              <h2 className="section-title">Mais Notícias</h2>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedRegularPosts.map((post) => (
                    <Link to={`/post/${post.slug}`} key={post.id}>
                      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 hover:shadow-md transition-all group">
                        <div className="flex gap-4">
                          <img
                            src={post.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=200&q=80'}
                            alt={post.title}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`category-badge ${post.categories?.color || 'bg-muted'} mb-1.5 text-[10px]`}>
                              {post.categories?.name || 'Geral'}
                            </span>
                            <h3 className="font-headline font-bold text-base sm:text-lg text-card-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 hidden sm:block">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                              <span>{post.author_name}</span>
                              <span>{new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span className="text-primary font-medium">{post.read_time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Sidebar Ad */}
            <AdSpace size="square" position="Barra Lateral" />

            {/* Popular Posts */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-lg font-headline font-bold text-card-foreground mb-4">
                Mais Populares
              </h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {posts?.slice(0, 5).map((post, index) => (
                    <Link to={`/post/${post.slug}`} key={post.id} className="flex gap-3 group">
                      <span className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {post.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-lg font-headline font-bold text-card-foreground mb-3">
                Categorias
              </h3>
              <div className="space-y-1">
                {categories?.map((category) => (
                  <Link
                    key={category.id}
                    to={`/${category.slug}`}
                    className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Second sidebar ad */}
            <AdSpace size="square" position="Lateral 2" className="hidden lg:flex" />

            {/* Newsletter */}
            <div id="newsletter" className="bg-gradient-to-br from-primary to-green-700 text-primary-foreground rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">Newsletter</h3>
              <p className="text-sm opacity-90 mb-4">
                Receba as principais notícias diretamente no seu email
              </p>
              <NewsletterForm variant="sidebar" />
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
