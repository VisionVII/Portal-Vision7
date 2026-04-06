import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, GripVertical, ImagePlus, LayoutTemplate, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/hooks/use-toast';

type HeroAlignment = 'left' | 'center' | 'right';

type SectionId = 'latest' | 'featured' | 'courses' | 'more' | 'newsletter';

interface HomeSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

interface HomePageConfig {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroAlignment: HeroAlignment;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  tertiaryCtaLabel: string;
  bannerUrl: string;
  sections: HomeSection[];
}

const HOME_PAGE_CONFIG_KEY = 'home_page_config';

const defaultConfig: HomePageConfig = {
  heroBadge: '',
  heroTitle: 'Vision7',
  heroDescription: 'portal tecnológico com notícias, cultura, negócios, saúde e tendências globais — com curadoria inteligente, leitura clara e visão de futuro.',
  heroAlignment: 'left',
  primaryCtaLabel: 'Explorar Notícias',
  secondaryCtaLabel: '',
  tertiaryCtaLabel: '',
  bannerUrl: '/Verde Neon Exploração Blog Banner.png',
  sections: [
    { id: 'featured', label: 'Destaque', enabled: true },
    { id: 'latest', label: 'Últimas Notícias', enabled: true },
    { id: 'courses', label: 'Cursos em Destaque', enabled: true },
    { id: 'more', label: 'Mais Notícias', enabled: true },
    { id: 'newsletter', label: 'Newsletter', enabled: true },
  ],
};

const parseConfig = (rawValue?: string | null): HomePageConfig => {
  if (!rawValue) return defaultConfig;

  try {
    const parsed = JSON.parse(rawValue) as Partial<HomePageConfig>;

    return {
      ...defaultConfig,
      ...parsed,
      heroBadge:
        !parsed.heroBadge || /bem-vindo|vision7/i.test(parsed.heroBadge)
          ? defaultConfig.heroBadge
          : parsed.heroBadge,
      heroTitle: !parsed.heroTitle || /^vision$/i.test(parsed.heroTitle) ? defaultConfig.heroTitle : parsed.heroTitle,
      heroDescription:
        !parsed.heroDescription || /jornal digital premium com curadoria/i.test(parsed.heroDescription)
          ? defaultConfig.heroDescription
          : parsed.heroDescription,
      secondaryCtaLabel:
        !parsed.secondaryCtaLabel || /^newsletter$/i.test(parsed.secondaryCtaLabel)
          ? defaultConfig.secondaryCtaLabel
          : parsed.secondaryCtaLabel,
      tertiaryCtaLabel:
        !parsed.tertiaryCtaLabel || /^dashboard$|^abrir workspace$/i.test(parsed.tertiaryCtaLabel)
          ? defaultConfig.tertiaryCtaLabel
          : parsed.tertiaryCtaLabel,
      sections: Array.isArray(parsed.sections) && parsed.sections.length
        ? parsed.sections.map((section) => ({
            enabled: true,
            ...section,
          })) as HomeSection[]
        : defaultConfig.sections,
    };
  } catch (error) {
    console.warn('Falha ao ler a configuração da homepage.', error);
    return defaultConfig;
  }
};

const sectionPreviewDescription: Record<SectionId, string> = {
  featured: 'Bloco editorial com a principal matéria e destaque visual.',
  latest: 'Grelha com as notícias mais recentes logo após o topo.',
  courses: 'Vitrine de cursos, parcerias e cartões de afiliados.',
  more: 'Feed expandido com conteúdo complementar e scroll contínuo.',
  newsletter: 'Call-to-action final para conversão e CRM.',
};

const AdminCmsCustomizer = () => {
  const { data: siteSettings } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [config, setConfig] = useState<HomePageConfig>(defaultConfig);
  const [draggedSectionId, setDraggedSectionId] = useState<SectionId | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<SectionId | null>(null);

  useEffect(() => {
    setConfig(parseConfig(siteSettings?.[HOME_PAGE_CONFIG_KEY]));
  }, [siteSettings]);

  const enabledSections = useMemo(
    () => config.sections.filter((section) => section.enabled),
    [config.sections]
  );

  const updateSection = (index: number, patch: Partial<HomeSection>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentIndex) =>
        currentIndex === index ? { ...section, ...patch } : section
      ),
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.sections.length) return prev;

      const nextSections = [...prev.sections];
      [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];

      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const moveSectionByDrag = (draggedId: SectionId, targetId: SectionId) => {
    setConfig((prev) => {
      const currentIndex = prev.sections.findIndex((section) => section.id === draggedId);
      const targetIndex = prev.sections.findIndex((section) => section.id === targetId);

      if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
        return prev;
      }

      const nextSections = [...prev.sections];
      const [draggedSection] = nextSections.splice(currentIndex, 1);
      nextSections.splice(targetIndex, 0, draggedSection);

      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: HOME_PAGE_CONFIG_KEY,
        value: JSON.stringify(config),
      });

      toast({
        title: 'Homepage atualizada',
        description: 'O layout, banner e ordem das secções já podem ser refletidos no portal.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao guardar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar a configuração da homepage.',
        variant: 'destructive',
      });
    }
  };

  const alignmentClass = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  }[config.heroAlignment];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-6 xl:sticky xl:top-24 self-start">
        <Card className="border-primary-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4 text-primary-600" />
              Builder da Homepage
            </CardTitle>
            <CardDescription>
              Edite o template principal com a mesma lógica de preview em camadas estilo Shopify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero-badge">Badge superior</Label>
              <Input
                id="hero-badge"
                value={config.heroBadge}
                onChange={(event) => setConfig((prev) => ({ ...prev, heroBadge: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-title">Título principal</Label>
              <Input
                id="hero-title"
                value={config.heroTitle}
                onChange={(event) => setConfig((prev) => ({ ...prev, heroTitle: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-description">Descrição editorial</Label>
              <Textarea
                id="hero-description"
                value={config.heroDescription}
                onChange={(event) => setConfig((prev) => ({ ...prev, heroDescription: event.target.value }))}
                className="min-h-[110px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Alinhamento do bloco principal</Label>
              <Select
                value={config.heroAlignment}
                onValueChange={(value: HeroAlignment) => setConfig((prev) => ({ ...prev, heroAlignment: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a posição do texto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cta-primary">CTA primária</Label>
                <Input
                  id="cta-primary"
                  value={config.primaryCtaLabel}
                  onChange={(event) => setConfig((prev) => ({ ...prev, primaryCtaLabel: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-secondary">CTA secundária</Label>
                <Input
                  id="cta-secondary"
                  value={config.secondaryCtaLabel}
                  onChange={(event) => setConfig((prev) => ({ ...prev, secondaryCtaLabel: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-tertiary">CTA terciária</Label>
                <Input
                  id="cta-tertiary"
                  value={config.tertiaryCtaLabel}
                  onChange={(event) => setConfig((prev) => ({ ...prev, tertiaryCtaLabel: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-url" className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary-500" />
                Banner principal
              </Label>
              <Input
                id="banner-url"
                value={config.bannerUrl}
                onChange={(event) => setConfig((prev) => ({ ...prev, bannerUrl: event.target.value }))}
                placeholder="/Verde Neon Exploração Blog Banner.png"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Guardar layout
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfig(defaultConfig)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-secondary-500" />
              Camadas e secções
            </CardTitle>
            <CardDescription>
              Controle o que aparece, em que ordem e com prioridade visual dentro do portal. Agora com drag-and-drop real para reordenar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggedSectionId(section.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggedSectionId && draggedSectionId !== section.id) {
                    setDragOverSectionId(section.id);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedSectionId && draggedSectionId !== section.id) {
                    moveSectionByDrag(draggedSectionId, section.id);
                  }
                  setDraggedSectionId(null);
                  setDragOverSectionId(null);
                }}
                onDragEnd={() => {
                  setDraggedSectionId(null);
                  setDragOverSectionId(null);
                }}
                className={`rounded-xl border bg-muted/30 p-3 transition-all ${
                  dragOverSectionId === section.id
                    ? 'border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-900/20'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex cursor-grab rounded-lg border border-border bg-background p-2 text-muted-foreground shadow-sm">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{index + 1}. {section.label}</p>
                      <p className="text-xs text-muted-foreground">{sectionPreviewDescription[section.id]}</p>
                    </div>
                  </div>
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(checked) => updateSection(index, { enabled: checked })}
                  />
                </div>

                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`section-label-${section.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                      Título público da secção
                    </Label>
                    <Input
                      id={`section-label-${section.id}`}
                      value={section.label}
                      onChange={(event) => updateSection(index, { label: event.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">Arraste o card para mudar a ordem real do layout.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === config.sections.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
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
              <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-center">
                <div className={`flex min-h-[280px] flex-col justify-center gap-4 rounded-2xl bg-background/80 px-6 py-8 shadow-sm md:px-8 ${alignmentClass}`}>
                  {config.heroBadge ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                      {config.heroBadge}
                    </span>
                  ) : null}
                  <h2 className="max-w-3xl text-4xl font-headline font-bold text-foreground md:text-5xl">
                    {config.heroTitle}
                  </h2>
                  <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                    {config.heroDescription}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                      {config.primaryCtaLabel || 'Explorar Notícias'}
                    </span>
                    {config.secondaryCtaLabel ? (
                      <span className="rounded-lg border border-primary-400 px-4 py-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
                        {config.secondaryCtaLabel}
                      </span>
                    ) : null}
                    {config.tertiaryCtaLabel ? (
                      <span className="rounded-lg border border-secondary-500 px-4 py-2 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                        {config.tertiaryCtaLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <img
                    src={config.bannerUrl || defaultConfig.bannerUrl}
                    alt="Preview do banner principal"
                    className="h-[180px] w-full object-cover md:h-[240px] lg:h-[280px]"
                    onError={(event) => {
                      event.currentTarget.src = defaultConfig.bannerUrl;
                    }}
                  />
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
      </div>
    </div>
  );
};

export default AdminCmsCustomizer;
