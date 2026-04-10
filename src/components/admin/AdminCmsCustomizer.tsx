import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, GripVertical, ImagePlus, LayoutTemplate, RotateCcw, Save, Sparkles, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ALLOWED_HOME_BANNER_TYPES,
  buildBannerUploadPath,
  defaultHomePageConfig,
  HOME_BANNER_STORAGE_BUCKET,
  HOME_PAGE_CONFIG_KEY,
  MAX_HOME_BANNER_SIZE_BYTES,
  parseHomePageConfig,
  type HomePageConfig,
} from '@/lib/homepage-config';
import {
  ALLOWED_SECTION_PAGE_BANNER_TYPES,
  buildSectionPageBannerUploadPath,
  MAX_SECTION_PAGE_BANNER_SIZE_BYTES,
  parseSectionPageBanners,
  SECTION_PAGE_BANNERS_KEY,
  SECTION_PAGE_BANNER_CATALOG,
  SECTION_PAGE_BANNER_STORAGE_BUCKET,
  type SectionPageBannerEntry,
  type SectionPageId,
  type SectionPageBannerVariant,
} from '@/lib/sectionPageConfig';

type SectionId = 'latest' | 'featured' | 'courses' | 'more' | 'newsletter';

interface HomeSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

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
  const [config, setConfig] = useState<HomePageConfig>(defaultHomePageConfig);
  const [sectionPageBanners, setSectionPageBanners] = useState(parseSectionPageBanners(null));
  const [draggedSectionId, setDraggedSectionId] = useState<SectionId | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<SectionId | null>(null);
  const [uploadingBannerKey, setUploadingBannerKey] = useState<string | null>(null);

  useEffect(() => {
    setConfig(parseHomePageConfig(siteSettings?.[HOME_PAGE_CONFIG_KEY]));
    setSectionPageBanners(parseSectionPageBanners(siteSettings?.[SECTION_PAGE_BANNERS_KEY]));
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

  const handleHomeBannerUpload = async (variant: 'desktop' | 'mobile', file?: File | null) => {
    if (!file) return;

    if (!ALLOWED_HOME_BANNER_TYPES.includes(file.type as (typeof ALLOWED_HOME_BANNER_TYPES)[number])) {
      toast({
        title: 'Formato inválido',
        description: 'Use PNG, JPG ou WEBP para o banner principal.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_HOME_BANNER_SIZE_BYTES) {
      toast({
        title: 'Imagem demasiado grande',
        description: 'O banner principal não pode exceder 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const uploadKey = `home:${variant}`;
    setUploadingBannerKey(uploadKey);

    try {
      const uploadPath = buildBannerUploadPath('homepage', variant, file.name);
      const { error: uploadError } = await supabase.storage
        .from(HOME_BANNER_STORAGE_BUCKET)
        .upload(uploadPath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(HOME_BANNER_STORAGE_BUCKET)
        .getPublicUrl(uploadPath);

      setConfig((prev) => ({
        ...prev,
        ...(variant === 'desktop'
          ? { bannerUrl: publicUrl }
          : { mobileBannerUrl: publicUrl }),
      }));

      toast({
        title: 'Banner principal carregado',
        description: `A versão ${variant === 'desktop' ? 'desktop' : 'mobile'} já está pronta para a primeira dobra.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao carregar banner',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a imagem principal.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBannerKey(null);
    }
  };

  const updateSectionPageBanner = (sectionId: SectionPageId, patch: Partial<SectionPageBannerEntry>) => {
    setSectionPageBanners((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        ...patch,
      },
    }));
  };

  const handleSectionBannerUpload = async (sectionId: SectionPageId, variant: SectionPageBannerVariant, file?: File | null) => {
    if (!file) return;

    if (!ALLOWED_SECTION_PAGE_BANNER_TYPES.includes(file.type as (typeof ALLOWED_SECTION_PAGE_BANNER_TYPES)[number])) {
      toast({
        title: 'Formato inválido',
        description: 'Use PNG, JPG ou WEBP para o banner da secção.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_SECTION_PAGE_BANNER_SIZE_BYTES) {
      toast({
        title: 'Imagem demasiado grande',
        description: 'O banner da secção não pode exceder 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const uploadKey = `${sectionId}:${variant}`;
    setUploadingBannerKey(uploadKey);

    try {
      const uploadPath = buildSectionPageBannerUploadPath(sectionId, variant, file.name);
      const { error: uploadError } = await supabase.storage
        .from(SECTION_PAGE_BANNER_STORAGE_BUCKET)
        .upload(uploadPath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(SECTION_PAGE_BANNER_STORAGE_BUCKET)
        .getPublicUrl(uploadPath);

      updateSectionPageBanner(sectionId, variant === 'desktop' ? { bannerUrl: publicUrl } : { mobileBannerUrl: publicUrl });
      toast({
        title: 'Banner carregado',
        description: `A versão ${variant === 'desktop' ? 'desktop' : 'mobile'} foi preparada para ${sectionPageBanners[sectionId].label}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao carregar banner',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a imagem da secção.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBannerKey(null);
    }
  };

  const handleSaveSectionBanners = async () => {
    try {
      await updateSetting.mutateAsync({
        key: SECTION_PAGE_BANNERS_KEY,
        value: JSON.stringify(sectionPageBanners),
      });

      toast({
        title: 'Banners de secção guardados',
        description: 'As categorias e páginas fixas do portal já podem refletir os novos banners responsivos.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao guardar banners',
        description: error instanceof Error ? error.message : 'Não foi possível guardar os banners de secção.',
        variant: 'destructive',
      });
    }
  };

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
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              O hero principal da homepage agora ocupa sempre a primeira dobra e mostra apenas o CTA principal.
              Use uma versão horizontal para desktop e uma versão vertical para mobile.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="cta-primary">CTA primária</Label>
                <Input
                  id="cta-primary"
                  value={config.primaryCtaLabel}
                  onChange={(event) => setConfig((prev) => ({ ...prev, primaryCtaLabel: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Banner desktop</p>
                  <p className="text-xs text-muted-foreground">Imagem horizontal para desktop e notebook.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home-banner-url" className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4 text-primary-500" />
                    URL pública desktop
                  </Label>
                  <Input
                    id="home-banner-url"
                    value={config.bannerUrl}
                    onChange={(event) => setConfig((prev) => ({ ...prev, bannerUrl: event.target.value }))}
                    placeholder="https://... ou URL pública do Storage"
                  />
                </div>
                <input
                  id="home-banner-desktop-upload"
                  type="file"
                  accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    void handleHomeBannerUpload('desktop', nextFile);
                    event.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={uploadingBannerKey === 'home:desktop'}
                    onClick={() => document.getElementById('home-banner-desktop-upload')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingBannerKey === 'home:desktop' ? 'A carregar…' : 'Subir desktop'}
                  </Button>
                  <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Banner mobile</p>
                  <p className="text-xs text-muted-foreground">Imagem vertical para smartphones e primeira dobra.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home-banner-mobile-url" className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4 text-primary-500" />
                    URL pública mobile
                  </Label>
                  <Input
                    id="home-banner-mobile-url"
                    value={config.mobileBannerUrl}
                    onChange={(event) => setConfig((prev) => ({ ...prev, mobileBannerUrl: event.target.value }))}
                    placeholder="https://... ou URL pública do Storage"
                  />
                </div>
                <input
                  id="home-banner-mobile-upload"
                  type="file"
                  accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    void handleHomeBannerUpload('mobile', nextFile);
                    event.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={uploadingBannerKey === 'home:mobile'}
                    onClick={() => document.getElementById('home-banner-mobile-upload')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingBannerKey === 'home:mobile' ? 'A carregar…' : 'Subir mobile'}
                  </Button>
                  <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Guardar layout
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfig(defaultHomePageConfig)}
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
              <ImagePlus className="h-4 w-4 text-primary-600" />
              Banners de secção
            </CardTitle>
            <CardDescription>
              Use uma imagem deitada para desktop e uma imagem vertical para mobile. O hero ocupa sempre a primeira dobra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              Desktop: priorize composições horizontais, entre 1600x900 e 1920x1080.
              Mobile: use corte vertical, entre 1080x1350 e 1080x1920, para preencher melhor a tela.
            </div>

            {SECTION_PAGE_BANNER_CATALOG.map((section) => {
              const entry = sectionPageBanners[section.id];
              const desktopInputId = `section-banner-${section.id}-desktop`;
              const mobileInputId = `section-banner-${section.id}-mobile`;
              const hasAnyBanner = Boolean(entry.bannerUrl || entry.mobileBannerUrl);

              return (
                <div key={section.id} className="space-y-4 border-b border-border/50 pb-6 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{entry.label}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    {hasAnyBanner ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-destructive"
                        onClick={() => updateSectionPageBanner(section.id, { bannerUrl: '', mobileBannerUrl: '' })}
                      >
                        <X className="h-4 w-4" />
                        Limpar versões
                      </Button>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-border/60 bg-slate-950/95">
                    {hasAnyBanner ? (
                      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.7fr)]">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Desktop</p>
                          {entry.bannerUrl ? (
                            <img
                              src={entry.bannerUrl}
                              alt={`Preview desktop do banner ${entry.label}`}
                              className="h-48 w-full rounded-2xl object-cover object-center lg:h-56"
                            />
                          ) : (
                            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55 lg:h-56">
                              Sem imagem desktop
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Mobile</p>
                          {entry.mobileBannerUrl ? (
                            <img
                              src={entry.mobileBannerUrl}
                              alt={`Preview mobile do banner ${entry.label}`}
                              className="h-48 w-full rounded-2xl object-cover object-center lg:h-56"
                            />
                          ) : (
                            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55 lg:h-56">
                              Sem imagem mobile
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-white/55">
                        Nenhuma imagem configurada para esta secção.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Versão desktop</p>
                        <p className="text-xs text-muted-foreground">Paisagem ampla para notebook e desktop.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${desktopInputId}-url`}>URL pública</Label>
                        <Input
                          id={`${desktopInputId}-url`}
                          value={entry.bannerUrl}
                          onChange={(event) => updateSectionPageBanner(section.id, { bannerUrl: event.target.value })}
                          placeholder="https://... ou URL pública do Storage"
                        />
                      </div>
                      <input
                        id={desktopInputId}
                        type="file"
                        accept={ALLOWED_SECTION_PAGE_BANNER_TYPES.join(',')}
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          void handleSectionBannerUpload(section.id, 'desktop', nextFile);
                          event.currentTarget.value = '';
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          disabled={uploadingBannerKey === `${section.id}:desktop`}
                          onClick={() => document.getElementById(desktopInputId)?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingBannerKey === `${section.id}:desktop` ? 'A carregar…' : 'Subir desktop'}
                        </Button>
                        <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Versão mobile</p>
                        <p className="text-xs text-muted-foreground">Imagem vertical para smartphones e primeira dobra.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${mobileInputId}-url`}>URL pública</Label>
                        <Input
                          id={`${mobileInputId}-url`}
                          value={entry.mobileBannerUrl}
                          onChange={(event) => updateSectionPageBanner(section.id, { mobileBannerUrl: event.target.value })}
                          placeholder="https://... ou URL pública do Storage"
                        />
                      </div>
                      <input
                        id={mobileInputId}
                        type="file"
                        accept={ALLOWED_SECTION_PAGE_BANNER_TYPES.join(',')}
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          void handleSectionBannerUpload(section.id, 'mobile', nextFile);
                          event.currentTarget.value = '';
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          disabled={uploadingBannerKey === `${section.id}:mobile`}
                          onClick={() => document.getElementById(mobileInputId)?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingBannerKey === `${section.id}:mobile` ? 'A carregar…' : 'Subir mobile'}
                        </Button>
                        <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button onClick={handleSaveSectionBanners} className="w-full gap-2" variant="secondary">
              <Save className="h-4 w-4" />
              Guardar banners de secção
            </Button>
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
              <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1.35fr)_240px]">
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_30px_90px_rgba(8,18,44,0.35)]">
                  <picture className="absolute inset-0 block h-full w-full">
                    <source media="(max-width: 767px)" srcSet={config.mobileBannerUrl || config.bannerUrl || defaultHomePageConfig.mobileBannerUrl} />
                    <img
                      src={config.bannerUrl || defaultHomePageConfig.bannerUrl}
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
                      {config.primaryCtaLabel || 'Explorar Notícias'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Desktop
                    </div>
                    <img
                      src={config.bannerUrl || defaultHomePageConfig.bannerUrl}
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
                      src={config.mobileBannerUrl || config.bannerUrl || defaultHomePageConfig.mobileBannerUrl}
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
      </div>
    </div>
  );
};

export default AdminCmsCustomizer;
