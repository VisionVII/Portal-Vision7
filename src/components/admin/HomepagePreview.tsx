import React from 'react';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defaultHomePageConfig, type SectionId, type HomeSection } from '@/lib/homepage-config';

const sectionPreviewDescription: Record<SectionId, string> = {
  featured: 'Bloco editorial com a principal matéria e destaque visual.',
  latest: 'Grelha com as notícias mais recentes logo após o topo.',
  courses: 'Vitrine de cursos, parcerias e cartões de afiliados.',
  more: 'Feed expandido com conteúdo complementar e scroll contínuo.',
  newsletter: 'Call-to-action final para conversão e CRM.',
};

interface HomepagePreviewProps {
  bannerUrl: string;
  mobileBannerUrl: string;
  primaryCtaLabel: string;
  enabledSections: HomeSection[];
}

const HomepagePreview = ({
  bannerUrl,
  mobileBannerUrl,
  primaryCtaLabel,
  enabledSections,
}: HomepagePreviewProps) => {
  return (
    <Card className="overflow-hidden border-primary-200/60 shadow-lg">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary-600" />
          Preview ao vivo do portal
        </CardTitle>
        <CardDescription>
          Visualização do template principal com as camadas e posições definidas no painel à esquerda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 md:p-6">
        <div className="overflow-hidden rounded-2xl border border-primary-900/20 bg-gradient-to-br from-primary-50 via-secondary-50 to-background dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-950">
          <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1.35fr)_240px]">
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_30px_90px_rgba(8,18,44,0.35)]">
              <picture className="absolute inset-0 block h-full w-full">
                <source
                  media="(max-width: 767px)"
                  srcSet={mobileBannerUrl || bannerUrl || defaultHomePageConfig.mobileBannerUrl}
                />
                <img
                  src={bannerUrl || defaultHomePageConfig.bannerUrl}
                  alt="Preview do banner principal"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  onError={(event) => {
                    event.currentTarget.src = defaultHomePageConfig.bannerUrl;
                  }}
                />
              </picture>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.54)_48%,rgba(2,6,23,0.9)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.16)_44%,rgba(2,6,23,0.78)_100%)]" />
              <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:26px_26px]" />

              <div className="relative z-10 flex min-h-[420px] items-end justify-center px-6 py-8 text-center sm:min-h-[460px] sm:px-10 lg:min-h-[520px]">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl">
                  {primaryCtaLabel || 'Explorar Notícias'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Desktop
                </div>
                <img
                  src={bannerUrl || defaultHomePageConfig.bannerUrl}
                  alt="Preview desktop do banner principal"
                  className="h-[180px] w-full object-cover object-center"
                  onError={(event) => {
                    event.currentTarget.src = defaultHomePageConfig.bannerUrl;
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Mobile
                </div>
                <img
                  src={mobileBannerUrl || bannerUrl || defaultHomePageConfig.mobileBannerUrl}
                  alt="Preview mobile do banner principal"
                  className="h-[180px] w-full object-cover object-center"
                  onError={(event) => {
                    event.currentTarget.src = defaultHomePageConfig.mobileBannerUrl;
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {enabledSections.map((section, index) => (
            <div key={section.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-600">Camada {index + 1}</p>
                  <h3 className="text-lg font-headline font-bold text-foreground">{section.label}</h3>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {section.id}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{sectionPreviewDescription[section.id]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HomepagePreview;
