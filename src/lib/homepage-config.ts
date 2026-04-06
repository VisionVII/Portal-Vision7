export type HeroAlignment = 'left' | 'center' | 'right';

export type SectionId = 'latest' | 'featured' | 'courses' | 'more' | 'newsletter';

export interface HomeSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

export interface HomePageBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  enabled: boolean;
}

export interface HomePageConfig {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroAlignment: HeroAlignment;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  tertiaryCtaLabel: string;
  bannerUrl: string;
  rotatingBanners: HomePageBanner[];
  sections: HomeSection[];
}

export const HOME_PAGE_CONFIG_KEY = 'home_page_config';
export const HOME_BANNER_STORAGE_BUCKET = 'post-images';
export const HOME_BANNER_STORAGE_PREFIX = 'site/banners';
export const ALLOWED_HOME_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_HOME_BANNER_SIZE_BYTES = 5 * 1024 * 1024;

const defaultBannerImage = '/Verde Neon Exploração Blog Banner.png';
const defaultBannerDescription = 'Acesse insights estratégicos sobre tecnologia, inteligência artificial, inovação e negócios digitais. Informação clara e relevante para decisões rápidas em um mundo em constante evolução.';

export const defaultHomePageBanners: HomePageBanner[] = [
  {
    id: 'banner-vision7-1',
    title: 'Exploração inteligente para quem decide rápido',
    description: defaultBannerDescription,
    imageUrl: defaultBannerImage,
    ctaLabel: 'Explorar Notícias',
    ctaHref: '#noticias',
    enabled: true,
  },
];

export const defaultHomePageConfig: HomePageConfig = {
  heroBadge: '',
  heroTitle: 'Vision7',
  heroDescription:
    'Portal tecnológico com notícias, cultura, negócios, saúde e tendências globais — com curadoria inteligente, leitura clara e visão de futuro.',
  heroAlignment: 'left',
  primaryCtaLabel: 'Explorar Notícias',
  secondaryCtaLabel: '',
  tertiaryCtaLabel: '',
  bannerUrl: defaultBannerImage,
  rotatingBanners: defaultHomePageBanners,
  sections: [
    { id: 'featured', label: 'Destaque', enabled: true },
    { id: 'latest', label: 'Últimas Notícias', enabled: true },
    { id: 'courses', label: 'Cursos em Destaque', enabled: true },
    { id: 'more', label: 'Mais Notícias', enabled: true },
    { id: 'newsletter', label: 'Newsletter', enabled: true },
  ],
};

const normalizeSections = (sections?: HomeSection[]): HomeSection[] => {
  if (!Array.isArray(sections) || !sections.length) {
    return defaultHomePageConfig.sections;
  }

  return sections.map((section, index) => ({
    id: section.id || defaultHomePageConfig.sections[index]?.id || 'latest',
    label: section.label || defaultHomePageConfig.sections[index]?.label || 'Secção',
    enabled: section.enabled !== false,
  }));
};

const normalizeBanners = (parsed: Partial<HomePageConfig>): HomePageBanner[] => {
  const fallbackImageUrl =
    typeof parsed.bannerUrl === 'string' && parsed.bannerUrl.trim()
      ? parsed.bannerUrl.trim()
      : defaultHomePageConfig.bannerUrl;

  if (!Array.isArray(parsed.rotatingBanners) || !parsed.rotatingBanners.length) {
    return defaultHomePageBanners.map((banner, index) => ({
      ...banner,
      id: `${banner.id}-${index}`,
      imageUrl: fallbackImageUrl,
    }));
  }

  return parsed.rotatingBanners.map((banner, index) => ({
    id: banner.id || `banner-${index + 1}`,
    title: banner.title || `Banner ${index + 1}`,
    description:
      !banner.description || /banners editoriais em tela cheia com contexto/i.test(banner.description)
        ? defaultBannerDescription
        : banner.description,
    imageUrl: banner.imageUrl || fallbackImageUrl,
    ctaLabel: banner.ctaLabel || 'Explorar Notícias',
    ctaHref: banner.ctaHref || '#noticias',
    enabled: banner.enabled !== false,
  }));
};

export const parseHomePageConfig = (rawValue?: string | null): HomePageConfig => {
  if (!rawValue) return defaultHomePageConfig;

  try {
    const parsed = JSON.parse(rawValue) as Partial<HomePageConfig>;

    return {
      ...defaultHomePageConfig,
      ...parsed,
      heroBadge:
        !parsed.heroBadge || /bem-vindo|vision7/i.test(parsed.heroBadge)
          ? defaultHomePageConfig.heroBadge
          : parsed.heroBadge,
      heroTitle:
        !parsed.heroTitle || /^vision$/i.test(parsed.heroTitle)
          ? defaultHomePageConfig.heroTitle
          : parsed.heroTitle,
      heroDescription:
        !parsed.heroDescription || /jornal digital premium com curadoria/i.test(parsed.heroDescription)
          ? defaultHomePageConfig.heroDescription
          : parsed.heroDescription,
      secondaryCtaLabel:
        !parsed.secondaryCtaLabel || /^newsletter$/i.test(parsed.secondaryCtaLabel)
          ? defaultHomePageConfig.secondaryCtaLabel
          : parsed.secondaryCtaLabel,
      tertiaryCtaLabel:
        !parsed.tertiaryCtaLabel || /^dashboard$|^abrir workspace$/i.test(parsed.tertiaryCtaLabel)
          ? defaultHomePageConfig.tertiaryCtaLabel
          : parsed.tertiaryCtaLabel,
      bannerUrl:
        typeof parsed.bannerUrl === 'string' && parsed.bannerUrl.trim()
          ? parsed.bannerUrl.trim()
          : defaultHomePageConfig.bannerUrl,
      rotatingBanners: normalizeBanners(parsed),
      sections: normalizeSections(parsed.sections),
    };
  } catch (error) {
    console.warn('Falha ao interpretar o layout da homepage.', error);
    return defaultHomePageConfig;
  }
};

export const getEnabledHomePageBanners = (
  config: Pick<HomePageConfig, 'rotatingBanners' | 'bannerUrl'>
): HomePageBanner[] => {
  const enabledBanners = config.rotatingBanners.filter((banner) => banner.enabled !== false);

  if (enabledBanners.length) {
    return enabledBanners;
  }

  return defaultHomePageBanners.map((banner, index) => ({
    ...banner,
    id: `${banner.id}-fallback-${index}`,
    imageUrl: config.bannerUrl || banner.imageUrl,
  }));
};

export const createEmptyBanner = (seed = Date.now()): HomePageBanner => ({
  id: `banner-${seed}`,
  title: 'Novo banner Vision7',
  description: 'Descreva a mensagem central desta campanha, anúncio ou destaque editorial.',
  imageUrl: defaultBannerImage,
  ctaLabel: 'Saiba mais',
  ctaHref: '#noticias',
  enabled: true,
});

export const buildBannerUploadPath = (bannerId: string, originalName: string) => {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
  const normalizedName = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'banner';

  return `${HOME_BANNER_STORAGE_PREFIX}/${bannerId}-${Date.now()}-${normalizedName}.${extension}`;
};
