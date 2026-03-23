import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Search, X, Moon, Sun } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { usePosts } from '@/hooks/usePosts';
import { useTheme } from '@/hooks/useTheme';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: dbCategories } = useCategories();
  const { data: posts } = usePosts();
  const { theme, toggleTheme } = useTheme();

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

  // Filter posts based on query and category
  const filteredPosts = posts?.filter(post => {
    const matchesQuery = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || post.category_id === selectedCategory;
    return matchesQuery && matchesCategory;
  }).slice(0, 6) || [];

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const showResults = searchOpen && (searchQuery.length > 0 || selectedCategory);

  return (
    <header className="bg-card shadow-lg sticky top-0 z-50">
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
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-portugal-red rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">PN</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-portugal-green">Porto Notícias</h1>
              <p className="text-sm text-muted-foreground">Seu portal de informação</p>
            </div>
          </Link>

          {/* Search + Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Search */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center gap-2">
              <div className={`flex items-center transition-all duration-300 ${searchOpen ? 'w-72 md:w-96' : 'w-0 md:w-64'} overflow-hidden`}>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Pesquisar notícias..."
                    className="w-full pl-9 pr-8 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-portugal-green"
                  />
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>

            {/* Search Dropdown */}
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-[340px] md:w-[480px] bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Category Filters */}
                <div className="p-3 border-b flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      !selectedCategory ? 'bg-portugal-green text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Todas
                  </button>
                  {dbCategories?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategory === cat.id ? 'bg-portugal-green text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {showResults && filteredPosts.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Nenhum resultado encontrado.
                    </div>
                  )}
                  {!showResults && (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Digite para pesquisar ou selecione uma categoria.
                    </div>
                  )}
                  {showResults && filteredPosts.map(post => (
                    <Link
                      key={post.id}
                      to={`/post/${post.slug}`}
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); setSelectedCategory(''); }}
                      className="flex items-start gap-3 p-3 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white mb-1 ${post.categories?.color || 'bg-muted'}`}>
                          {post.categories?.name || 'Geral'}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground truncate">{post.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{post.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {showResults && filteredPosts.length > 0 && (
                  <div className="p-2 border-t text-center">
                    <span className="text-xs text-muted-foreground">
                      {filteredPosts.length} resultado{filteredPosts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-muted border-t">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto py-3">
            <Link 
              to="/" 
              className="text-foreground hover:text-portugal-green font-medium whitespace-nowrap transition-colors"
            >
              Início
            </Link>
            {categories.map((category) => (
              <Link
                key={category.name}
                to={category.path}
                className="text-foreground hover:text-portugal-green font-medium whitespace-nowrap transition-colors"
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
