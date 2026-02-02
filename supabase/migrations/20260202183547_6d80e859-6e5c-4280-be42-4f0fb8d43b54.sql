-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function for RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'bg-blue-600',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Redação',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    featured BOOLEAN NOT NULL DEFAULT false,
    read_time TEXT NOT NULL DEFAULT '5 min',
    tags TEXT[] DEFAULT '{}',
    views INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage categories"
    ON public.categories FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for posts
CREATE POLICY "Published posts are viewable by everyone"
    ON public.posts FOR SELECT
    USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts"
    ON public.posts FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts"
    ON public.posts FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.categories (name, slug, color) VALUES
    ('Tecnologia', 'tecnologia', 'bg-blue-600'),
    ('Desporto', 'desporto', 'bg-green-600'),
    ('Música', 'musica', 'bg-purple-600'),
    ('Saúde', 'saude', 'bg-red-600'),
    ('Mundo', 'mundo', 'bg-orange-600');

-- Insert sample posts
INSERT INTO public.posts (title, slug, excerpt, content, image_url, category_id, author_name, status, featured, read_time, tags, published_at) VALUES
    (
        'Inteligência Artificial Revoluciona Setor da Saúde em Portugal',
        'ia-revoluciona-saude-portugal',
        'Hospitais portugueses começam a implementar sistemas de IA para diagnósticos mais precisos e tratamentos personalizados, marcando uma nova era na medicina nacional.',
        'A implementação de sistemas de inteligência artificial nos hospitais portugueses está a revolucionar a forma como os profissionais de saúde diagnosticam e tratam os pacientes. Centros hospitalares em Lisboa, Porto e Coimbra já utilizam algoritmos avançados para análise de exames médicos, permitindo detetar doenças em estágios iniciais com uma precisão nunca antes alcançada.

Os sistemas de IA estão a ser particularmente eficazes na análise de imagens médicas, como radiografias e tomografias, identificando padrões que podem escapar ao olho humano. Médicos relatam que estas ferramentas funcionam como assistentes digitais, complementando a sua experiência clínica.

O Ministério da Saúde português anunciou um investimento de 50 milhões de euros para expandir estas tecnologias a todos os hospitais públicos até 2027, posicionando Portugal como líder europeu na digitalização dos serviços de saúde.',
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
        (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
        'Ana Silva',
        'published',
        true,
        '5 min',
        ARRAY['IA', 'Saúde', 'Tecnologia', 'Portugal'],
        now()
    ),
    (
        'FC Porto Conquista Vitória Histórica na Liga dos Campeões',
        'fc-porto-vitoria-champions',
        'Os dragões garantem lugar nas meias-finais com uma exibição memorável que ficará na história do clube e do futebol português.',
        'O FC Porto conseguiu uma das vitórias mais importantes da sua história na Liga dos Campeões, garantindo a passagem às meias-finais da competição europeia. A equipa portista exibiu um futebol de alto nível, demonstrando qualidade técnica e tática que surpreendeu os adversários.

O Estádio do Dragão vibrou com os cânticos dos adeptos, que criaram uma atmosfera eletrizante durante os 90 minutos de jogo. Os jogadores corresponderam à expectativa da nação, protagonizando momentos de brilhantismo individual e coletivo.

Esta conquista representa um marco histórico para o futebol português, reafirmando a capacidade dos clubes nacionais competirem ao mais alto nível europeu.',
        'https://images.unsplash.com/photo-1517022812141-23620dba5c23',
        (SELECT id FROM public.categories WHERE slug = 'desporto'),
        'João Santos',
        'published',
        false,
        '4 min',
        ARRAY['FC Porto', 'Liga dos Campeões', 'Futebol'],
        now()
    ),
    (
        'Festival de Música do Porto Recebe Artistas Internacionais',
        'festival-musica-porto-artistas',
        'O maior festival de música da cidade anuncia lineup impressionante com artistas de renome mundial, prometendo atrair milhares de visitantes.',
        'O Festival de Música do Porto anuncia o seu lineup mais ambicioso de sempre, reunindo artistas de renome internacional que prometem transformar a cidade invicta no epicentro da música europeia.

Com palcos espalhados por locais emblemáticos da cidade, desde a Ribeira até ao Parque da Cidade, o evento promete uma experiência única que combina música de qualidade com a beleza arquitetónica do Porto.

Espera-se a presença de mais de 100 mil visitantes durante os quatro dias de festival, com impacto significativo na economia local e na promoção turística da região.',
        'https://images.unsplash.com/photo-1466442929976-97f336a657be',
        (SELECT id FROM public.categories WHERE slug = 'musica'),
        'Maria Costa',
        'published',
        false,
        '3 min',
        ARRAY['Música', 'Festival', 'Porto', 'Cultura'],
        now()
    ),
    (
        'Nova Descoberta Médica no Hospital de São João',
        'descoberta-medica-hospital-sao-joao',
        'Investigadores portugueses desenvolvem tratamento inovador que pode revolucionar o tratamento de doenças cardiovasculares.',
        'Uma equipa de investigadores do Hospital de São João, no Porto, fez uma descoberta revolucionária que pode alterar fundamentalmente o tratamento de doenças cardiovasculares em todo o mundo.

O novo tratamento, desenvolvido ao longo de cinco anos de investigação intensiva, demonstrou resultados promissores em ensaios clínicos, reduzindo significativamente o risco de eventos cardíacos em pacientes de alto risco.

A comunidade científica internacional já reconheceu a importância desta descoberta, com várias revistas médicas de prestígio a publicarem artigos sobre o trabalho da equipa portuguesa.',
        'https://images.unsplash.com/photo-1582562124811-c09040d0a901',
        (SELECT id FROM public.categories WHERE slug = 'saude'),
        'Dr. Pedro Oliveira',
        'published',
        false,
        '6 min',
        ARRAY['Medicina', 'Investigação', 'Saúde', 'Porto'],
        now()
    ),
    (
        'União Europeia Anuncia Novos Fundos para Energias Renováveis',
        'ue-fundos-energias-renovaveis',
        'Portugal entre os principais beneficiários do novo programa europeu que visa acelerar a transição energética no continente.',
        'A União Europeia anunciou um novo pacote de investimentos em energias renováveis que posiciona Portugal como um dos principais beneficiários desta iniciativa histórica.

O programa prevê investimentos de milhares de milhões de euros para acelerar a transição energética europeia, com foco especial em países com elevado potencial de produção de energia solar e eólica.

Portugal, com a sua posição geográfica privilegiada e clima favorável, está em posição ideal para se tornar um hub energético europeu, exportando energia limpa para o resto do continente.',
        'https://images.unsplash.com/photo-1501854140801-50d01698950b',
        (SELECT id FROM public.categories WHERE slug = 'mundo'),
        'Luís Ferreira',
        'published',
        false,
        '4 min',
        ARRAY['União Europeia', 'Energia', 'Ambiente', 'Portugal'],
        now()
    ),
    (
        'Startup Portuense Desenvolve App Inovadora para Turismo',
        'startup-porto-app-turismo',
        'Jovem empresa do Porto cria aplicação que usa realidade aumentada para melhorar a experiência turística na cidade invicta.',
        'Uma startup sediada no Porto desenvolveu uma aplicação móvel revolucionária que utiliza tecnologia de realidade aumentada para transformar a experiência turística na cidade.

A aplicação permite aos visitantes apontar os seus smartphones para monumentos e edifícios históricos, recebendo informações contextuais, histórias e reconstruções virtuais que trazem o passado à vida.

O projeto já atraiu a atenção de investidores internacionais e está em negociações para expandir para outras cidades europeias com rico património histórico.',
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
        'Carla Mendes',
        'published',
        false,
        '5 min',
        ARRAY['Startup', 'Tecnologia', 'Turismo', 'Porto'],
        now()
    );