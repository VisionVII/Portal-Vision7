import React from 'react';
import type { Config, Data } from '@puckeditor/core';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  ALLOWED_HOME_BANNER_TYPES,
  buildBannerUploadPath,
  HOME_BANNER_STORAGE_BUCKET,
  MAX_HOME_BANNER_SIZE_BYTES,
  type HomePageConfig,
} from '@/lib/homepage-config';

// ── Componentes editáveis no canvas (Fase 1: só a região do hero) ──────────

interface HeroTextProps {
  badge: string;
  title: string;
  description: string;
  alignment: 'left' | 'center';
}

interface BannerItem {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  mobileImageUrl: string;
  enabled: boolean;
}

interface BannerCarouselProps {
  banners: BannerItem[];
}

// Campo de upload reaproveitando a mesma lógica/bucket já usada por
// HomeBannerUploader.tsx — só a UI muda de sítio (vive agora dentro do
// painel de campos do Puck).
async function uploadHeroImage(file: File): Promise<string> {
  const uploadPath = buildBannerUploadPath('hero-puck', 'desktop', file.name);
  const { error } = await supabase.storage
    .from(HOME_BANNER_STORAGE_BUCKET)
    .upload(uploadPath, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(HOME_BANNER_STORAGE_BUCKET).getPublicUrl(uploadPath);
  return publicUrl;
}

function ImageUploadField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [uploading, setUploading] = React.useState(false);
  const inputId = React.useId();

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_HOME_BANNER_TYPES.includes(file.type as (typeof ALLOWED_HOME_BANNER_TYPES)[number])) return;
    if (file.size > MAX_HOME_BANNER_SIZE_BYTES) return;
    setUploading(true);
    try {
      const url = await uploadHeroImage(file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && <img src={value} alt={label} className="h-20 w-full rounded-lg object-cover" />}
      <input
        id={inputId}
        type="file"
        accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        disabled={uploading}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? 'A carregar…' : `Subir ${label.toLowerCase()}`}
      </Button>
    </div>
  );
}

export const heroPuckConfig: Config<{
  HeroText: HeroTextProps;
  BannerCarousel: BannerCarouselProps;
}> = {
  components: {
    HeroText: {
      label: 'Texto do hero',
      fields: {
        badge: { type: 'text', label: 'Etiqueta (opcional)' },
        title: { type: 'text', label: 'Título' },
        description: { type: 'textarea', label: 'Descrição' },
        alignment: {
          type: 'radio',
          label: 'Alinhamento',
          options: [
            { label: 'Esquerda', value: 'left' },
            { label: 'Centro', value: 'center' },
          ],
        },
      },
      defaultProps: {
        badge: '',
        title: 'Vision7',
        description: '',
        alignment: 'left',
      },
      render: ({ badge, title, description, alignment }) => (
        <div className={`flex flex-col gap-3 px-6 py-8 text-white ${alignment === 'center' ? 'items-center text-center' : 'items-start text-left'}`}>
          {badge && (
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold drop-shadow-2xl sm:text-4xl lg:text-5xl">{title}</h1>
          {description && <p className="max-w-xl text-sm text-white/80 sm:text-base">{description}</p>}
        </div>
      ),
    },
    BannerCarousel: {
      label: 'Banners rotativos',
      fields: {
        banners: {
          type: 'array',
          label: 'Banners',
          getItemSummary: (item) => item.title || 'Banner sem título',
          defaultItemProps: {
            title: 'Novo banner',
            description: '',
            ctaLabel: 'Explorar Notícias',
            ctaHref: '#noticias',
            imageUrl: '',
            mobileImageUrl: '',
            enabled: true,
          },
          arrayFields: {
            title: { type: 'text', label: 'Título' },
            description: { type: 'textarea', label: 'Descrição' },
            ctaLabel: { type: 'text', label: 'Texto do CTA' },
            ctaHref: { type: 'text', label: 'Destino do CTA' },
            imageUrl: {
              type: 'custom',
              label: 'Imagem desktop',
              render: ({ value, onChange }) => (
                <ImageUploadField value={value ?? ''} onChange={onChange} label="Desktop" />
              ),
            },
            mobileImageUrl: {
              type: 'custom',
              label: 'Imagem mobile',
              render: ({ value, onChange }) => (
                <ImageUploadField value={value ?? ''} onChange={onChange} label="Mobile" />
              ),
            },
            enabled: {
              type: 'radio',
              label: 'Estado',
              options: [
                { label: 'Activo', value: true },
                { label: 'Inactivo', value: false },
              ],
            },
          },
        },
      },
      defaultProps: {
        banners: [],
      },
      render: ({ banners }) => {
        const active = banners.find((b) => b.enabled) ?? banners[0];
        if (!active) return null;
        return (
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950">
            <picture className="absolute inset-0 block h-full w-full">
              {active.mobileImageUrl && <source media="(max-width: 767px)" srcSet={active.mobileImageUrl} />}
              {active.imageUrl && (
                <img src={active.imageUrl} alt={active.title} className="absolute inset-0 h-full w-full object-cover object-center" />
              )}
            </picture>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.54)_48%,rgba(2,6,23,0.9)_100%)]" />
            <div className="relative z-10 flex min-h-[420px] flex-col items-center justify-end gap-3 px-6 py-8 text-center sm:min-h-[460px]">
              <span className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-950 shadow-lg">
                {active.ctaLabel}
              </span>
            </div>
          </div>
        );
      },
    },
  },
};

export type HeroPuckData = Data<{
  HeroText: HeroTextProps;
  BannerCarousel: BannerCarouselProps;
}>;

export interface ExtractedHero {
  badge: string;
  title: string;
  description: string;
  alignment: 'left' | 'center';
  banners: BannerItem[];
}

/** Caminho inverso da migração — usado no site público (Index.tsx) para
 * alimentar o hero existente (com navegação por pontos, CTA dupla, etc.)
 * com os dados editados no canvas, em vez de substituir o motor de render
 * inteiro pelo <Render> simplificado do Puck. */
export function extractHeroFromPuckData(data: HeroPuckData): ExtractedHero | null {
  const heroText = data.content.find((item) => item.type === 'HeroText')?.props as (HeroTextProps & { id: string }) | undefined;
  const carousel = data.content.find((item) => item.type === 'BannerCarousel')?.props as (BannerCarouselProps & { id: string }) | undefined;

  if (!heroText && !carousel) return null;

  return {
    badge: heroText?.badge ?? '',
    title: heroText?.title ?? '',
    description: heroText?.description ?? '',
    alignment: heroText?.alignment ?? 'left',
    banners: carousel?.banners ?? [],
  };
}

/** Converte o schema antigo (heroTitle/rotatingBanners soltos) para o
 * formato Data do Puck — corre só quando ainda não existe home_page_hero_puck
 * guardado, para não perder conteúdo já configurado. */
export function migrateHeroToPuckData(config: HomePageConfig): HeroPuckData {
  return {
    root: { props: {} },
    content: [
      {
        type: 'HeroText',
        props: {
          id: 'hero-text-1',
          badge: config.heroBadge,
          title: config.heroTitle,
          description: config.heroDescription,
          alignment: config.heroAlignment,
        },
      },
      {
        type: 'BannerCarousel',
        props: {
          id: 'banner-carousel-1',
          banners: config.rotatingBanners.map((banner) => ({
            title: banner.title,
            description: banner.description,
            ctaLabel: banner.ctaLabel,
            ctaHref: banner.ctaHref,
            imageUrl: banner.imageUrl,
            mobileImageUrl: banner.mobileImageUrl,
            enabled: banner.enabled,
          })),
        },
      },
    ],
  };
}
