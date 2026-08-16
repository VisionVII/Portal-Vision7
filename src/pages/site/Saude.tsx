import React from 'react';
import CategoryPage from '@/components/content/CategoryPage';

const Saude = () => (
  <CategoryPage
    slug="saude"
    title="Saúde"
    description="Bem-estar, medicina e investigação em saúde"
    heroColor="bg-emerald-600"
    defaultCategoryColor="bg-emerald-600"
    otherCategories={[
      { name: 'Tecnologia', slug: 'tecnologia' },
      { name: 'Desporto', slug: 'desporto' },
      { name: 'Música', slug: 'musica' },
      { name: 'Mundo', slug: 'mundo' },
    ]}
  />
);

export default Saude;
