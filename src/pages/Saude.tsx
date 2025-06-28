
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';

const Saude = () => {
  const healthNews = [
    {
      id: 17,
      title: "SNS investe em telemedicina para zonas rurais",
      excerpt: "Nova plataforma permitirá consultas médicas à distância em regiões com poucos recursos.",
      image: "photo-1559757148-5c350d0d3c56",
      category: "Sistema de Saúde",
      categoryColor: "bg-red-600",
      author: "Dr. Manuel Pereira",
      date: "27 Jun 2025",
      readTime: "5 min"
    },
    {
      id: 18,
      title: "Estudo revela benefícios da dieta mediterrânica",
      excerpt: "Investigação portuguesa confirma vantagens do regime alimentar tradicional.",
      image: "photo-1498837167922-ddd27525d352",
      category: "Nutrição",
      categoryColor: "bg-green-600",
      author: "Dra. Sofia Almeida",
      date: "26 Jun 2025",
      readTime: "4 min"
    },
    {
      id: 19,
      title: "Campanha de vacinação atinge meta nacional",
      excerpt: "Portugal supera objetivos de cobertura vacinal em todas as faixas etárias.",
      image: "photo-1584515933487-779824d29309",
      category: "Prevenção",
      categoryColor: "bg-blue-600",
      author: "Ricardo Santos",
      date: "25 Jun 2025",
      readTime: "3 min"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Saúde</h1>
          <p className="text-lg text-gray-600">Informação confiável sobre saúde e bem-estar</p>
        </div>

        <AdSpace size="banner" position="topo-saude" className="mb-8" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {healthNews.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>

        <AdSpace size="rectangle" position="meio-saude" className="mb-8" />
      </main>

      <Footer />
    </div>
  );
};

export default Saude;
