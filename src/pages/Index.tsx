
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';
import CookieBanner from '../components/CookieBanner';
import { posts } from '../data/posts';

const Index = () => {
  const featuredPost = posts.find(post => post.featured);
  const regularPosts = posts.filter(post => !post.featured);
  const latestPosts = posts.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-portugal-green to-green-700 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">
              Bem-vindos ao Porto Notícias
            </h1>
            <p className="text-xl opacity-90 mb-6">
              O seu portal de informação confiável em Portugal. 
              Mantenha-se atualizado com as últimas notícias de tecnologia, 
              desporto, música, saúde e mundo.
            </p>
            <div className="flex gap-4">
              <button className="bg-white text-portugal-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Explorar Notícias
              </button>
              <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-portugal-green transition-colors">
                Newsletter
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Ad Space - Top Banner */}
        <AdSpace size="banner" position="Topo da Página" className="mb-8" />

        {/* Featured Post */}
        {featuredPost && (
          <section className="mb-12">
            <h2 className="text-3xl font-headline font-bold text-gray-900 mb-6">
              Destaque
            </h2>
            <PostCard {...featuredPost} />
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Latest News */}
            <section className="mb-12">
              <h2 className="text-3xl font-headline font-bold text-gray-900 mb-6">
                Últimas Notícias
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {latestPosts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            </section>

            {/* Ad Space - Middle */}
            <AdSpace size="rectangle" position="Meio do Conteúdo" className="mb-8" />

            {/* More News */}
            <section>
              <h2 className="text-3xl font-headline font-bold text-gray-900 mb-6">
                Mais Notícias
              </h2>
              <div className="space-y-6">
                {regularPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      <img
                        src={`https://images.unsplash.com/${post.image}?auto=format&fit=crop&w=200&q=80`}
                        alt={post.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <span className={`category-badge ${post.categoryColor} mb-2`}>
                          {post.category}
                        </span>
                        <h3 className="font-headline font-bold text-lg text-gray-900 mb-2 hover:text-portugal-green transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{post.author}</span>
                          <span>{post.date}</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Ad Space - Sidebar */}
            <AdSpace size="square" position="Barra Lateral" className="mb-8" />

            {/* Popular Posts */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">
                Mais Populares
              </h3>
              <div className="space-y-4">
                {posts.slice(0, 5).map((post, index) => (
                  <div key={post.id} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-portugal-green text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 hover:text-portugal-green transition-colors cursor-pointer">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{post.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">
                Categorias
              </h3>
              <div className="space-y-2">
                {['Tecnologia', 'Desporto', 'Música', 'Saúde', 'Mundo'].map((category) => (
                  <a
                    key={category}
                    href={`/${category.toLowerCase()}`}
                    className="block py-2 px-3 text-gray-700 hover:bg-gray-50 hover:text-portugal-green transition-colors rounded"
                  >
                    {category}
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="bg-gradient-to-br from-portugal-green to-green-700 text-white rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Newsletter</h3>
              <p className="text-sm opacity-90 mb-4">
                Receba as principais notícias diretamente no seu email
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Seu email"
                  className="w-full px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button className="w-full bg-white text-portugal-green py-2 rounded font-semibold hover:bg-gray-100 transition-colors">
                  Subscrever
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
