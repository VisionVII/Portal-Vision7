import React from 'react';
import CategoryPage from '@/components/content/CategoryPage';

const Musica = () => (
  <CategoryPage
    slug="musica"
    title="Música"
    description="Festivais, concertos e toda a atualidade musical"
    heroColor="bg-violet-600"
    defaultCategoryColor="bg-violet-600"
    otherCategories={[
      { name: 'Tecnologia', slug: 'tecnologia' },
      { name: 'Desporto', slug: 'desporto' },
      { name: 'Saúde', slug: 'saude' },
      { name: 'Mundo', slug: 'mundo' },
    ]}
  />
);

export default Musica;
