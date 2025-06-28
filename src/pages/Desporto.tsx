
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';

const Desporto = () => {
  const sportsNews = [
    {
      id: 11,
      title: "FC Porto conquista vitória importante na Champions",
      excerpt: "O clube portista garantiu mais três pontos na competição europeia com uma exibição convincente.",
      image: "photo-1574629810360-7efbbe195018",
      category: "Futebol",
      categoryColor: "bg-green-600",
      author: "João Silva",
      date: "27 Jun 2025",
      readTime: "4 min"
    },
    {
      id: 12,
      title: "Benfica prepara reforços para a próxima época",
      excerpt: "A direção encarnada já tem identificados os alvos para fortalecer o plantel.",
      image: "photo-1551698618-1dfe5d97d256",
      category: "Futebol",
      categoryColor: "bg-red-600",
      author: "Maria Santos",
      date: "26 Jun 2025",
      readTime: "3 min"
    },
    {
      id: 13,
      title: "Sporting vence derby lisboeta",
      excerpt: "Os leões superiorizaram-se no clássico da capital e mantêm-se na luta pelo título.",
      image: "photo-1431324155629-1a6deb1dec8d",
      category: "Futebol",
      categoryColor: "bg-green-500",
      author: "Pedro Costa",
      date: "25 Jun 2025",
      readTime: "5 min"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Desporto</h1>
          <p className="text-lg text-gray-600">As últimas notícias do desporto português e internacional</p>
        </div>

        <AdSpace size="banner" position="topo-desporto" className="mb-8" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {sportsNews.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>

        <AdSpace size="rectangle" position="meio-desporto" className="mb-8" />
      </main>

      <Footer />
    </div>
  );
};

export default Desporto;
