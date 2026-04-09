export type SectionPageId = 'audiocasts' | 'tecnologia' | 'mundo' | 'musica' | 'saude' | 'desporto' | 'courses' | 'privacy';
export type SectionPageBannerVariant = 'desktop' | 'mobile';

export interface SectionPageBannerEntry {
  id: SectionPageId;
  label: string;
  description: string;
  bannerUrl: string;
  mobileBannerUrl: string;
}

export const SECTION_PAGE_BANNERS_KEY = 'section_page_banners';
export const SECTION_PAGE_BANNER_STORAGE_BUCKET = 'post-images';
export const SECTION_PAGE_BANNER_STORAGE_PREFIX = 'site/section-banners';
export const ALLOWED_SECTION_PAGE_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_SECTION_PAGE_BANNER_SIZE_BYTES = 5 * 1024 * 1024;

const SECTION_PAGE_BANNER_CATALOG: Array<Omit<SectionPageBannerEntry, 'bannerUrl' | 'mobileBannerUrl'>> = [
  {
    id: 'audiocasts',
    label: 'Audiocasts',
    description: 'Biblioteca pública de episódios e conteúdo em áudio.',
  },
  {
    id: 'tecnologia',
    label: 'Tecnologia',
    description: 'Hero visual da página pública da categoria Tecnologia.',
  },
  {
    id: 'mundo',
    label: 'Mundo',
    description: 'Hero visual da página pública da categoria Mundo.',
  },
  {
    id: 'musica',
    label: 'Música',
    description: 'Hero visual da página pública da categoria Música.',
  },
  {
    id: 'saude',
    label: 'Saúde',
    description: 'Hero visual da página pública da categoria Saúde.',
  },
  {
    id: 'desporto',
    label: 'Desporto',
    description: 'Hero visual da página pública da categoria Desporto.',
  },
  {
    id: 'courses',
    label: 'Cursos',
    description: 'Hero padrão das páginas de curso, parceiro ou oferta educativa.',
  },
  {
    id: 'privacy',
    label: 'Privacidade',
    description: 'Hero da página fixa de política de privacidade.',
  },
];

function createDefaultSectionPageBanners() {
  return Object.fromEntries(
    SECTION_PAGE_BANNER_CATALOG.map((entry) => [
      entry.id,
      {
        ...entry,
        bannerUrl: '',
        mobileBannerUrl: '',
      },
    ]),
  ) as Record<SectionPageId, SectionPageBannerEntry>;
}

export function parseSectionPageBanners(rawValue?: string | null) {
  const defaults = createDefaultSectionPageBanners();

  if (!rawValue) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Record<SectionPageId, Partial<SectionPageBannerEntry>>>;

    return SECTION_PAGE_BANNER_CATALOG.reduce((accumulator, entry) => {
      const current = parsed?.[entry.id];
      accumulator[entry.id] = {
        ...entry,
        bannerUrl:
          typeof current?.bannerUrl === 'string'
            ? current.bannerUrl.trim()
            : typeof (current as { desktopBannerUrl?: string } | undefined)?.desktopBannerUrl === 'string'
              ? ((current as { desktopBannerUrl?: string }).desktopBannerUrl || '').trim()
              : '',
        mobileBannerUrl:
          typeof (current as { mobileBannerUrl?: string } | undefined)?.mobileBannerUrl === 'string'
            ? ((current as { mobileBannerUrl?: string }).mobileBannerUrl || '').trim()
            : typeof (current as { mobileUrl?: string } | undefined)?.mobileUrl === 'string'
              ? ((current as { mobileUrl?: string }).mobileUrl || '').trim()
              : '',
        id: entry.id,
      };
      return accumulator;
    }, { ...defaults });
  } catch {
    return defaults;
  }
}

export function getSectionPageBanner(sectionBanners: Record<SectionPageId, SectionPageBannerEntry>, sectionId: string) {
  return sectionBanners[sectionId as SectionPageId] ?? null;
}

export function buildSectionPageBannerUploadPath(sectionId: SectionPageId, variant: SectionPageBannerVariant, originalName: string) {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
  const normalizedName = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'banner';

  return `${SECTION_PAGE_BANNER_STORAGE_PREFIX}/${sectionId}-${variant}-${Date.now()}-${normalizedName}.${extension}`;
}

export { SECTION_PAGE_BANNER_CATALOG };