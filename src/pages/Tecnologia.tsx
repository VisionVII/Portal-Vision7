
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';
import { posts } from '../data/posts';

const Tecnologia = () => {
  const techPosts = posts.filter(post => post.category === 'Tecnologia');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Category Header */}
      <section className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">
            Tecnologia
          </h1>
          <p className="text-xl opacity-90">
            As últimas novidades do mundo da tecnologia, inovação e ciência
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Ad Space */}
        <AdSpace size="banner" position="Topo da Categoria" className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {techPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {techPosts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Em breve mais conteúdo
                </h3>
                <p className="text-gray-600">
                  Estamos a trabalhar para trazer as melhores notícias de tecnologia.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AdSpace size="square" position="Lateral Tecnologia" className="mb-8" />
            
            {/* Related Categories */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">
                Outras Categorias
              </h3>
              <div className="space-y-2">
                {['Desporto', 'Música', 'Saúde', 'Mundo'].map((category) => (
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Tecnologia;
