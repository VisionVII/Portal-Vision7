
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const Header = () => {
  const currentDate = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const categories = [
    { name: 'Tecnologia', path: '/tecnologia', color: 'bg-blue-600' },
    { name: 'Desporto', path: '/desporto', color: 'bg-green-600' },
    { name: 'Música', path: '/musica', color: 'bg-purple-600' },
    { name: 'Saúde', path: '/saude', color: 'bg-red-600' },
    { name: 'Mundo', path: '/mundo', color: 'bg-orange-600' }
  ];

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-portugal-green text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <Calendar size={16} />
            <span className="capitalize">{currentDate}</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>Porto, Portugal</span>
            <span>|</span>
            <span>Última atualização: {new Date().toLocaleTimeString('pt-PT')}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-portugal-red rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">PN</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-portugal-green">Porto Notícias</h1>
              <p className="text-sm text-gray-600">Seu portal de informação</p>
            </div>
          </Link>

          {/* Search only */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <input
                type="text"
                placeholder="Pesquisar notícias..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-portugal-green"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-50 border-t">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto py-3">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-portugal-green font-medium whitespace-nowrap transition-colors"
            >
              Início
            </Link>
            {categories.map((category) => (
              <Link
                key={category.name}
                to={category.path}
                className="text-gray-700 hover:text-portugal-green font-medium whitespace-nowrap transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
