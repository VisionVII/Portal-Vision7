import React, { useEffect, useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { ImagePlus, LayoutTemplate, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { heroPuckConfig, migrateHeroToPuckData, type HeroPuckData } from '@/lib/heroPuckConfig';
import {
  ALLOWED_HOME_BANNER_TYPES,
  buildBannerUploadPath,
  defaultHomePageConfig,
  HERO_PUCK_DATA_KEY,
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
import HomeBannerUploader from './HomeBannerUploader';
import SectionBannerCard from './SectionBannerCard';
import SectionSorter from './SectionSorter';
import HomepagePreview from './HomepagePreview';
import { type SectionId, type HomeSection } from '@/lib/homepage-config';

type BuilderTab = 'hero' | 'sections' | 'categories';

const AdminCmsCustomizer = () => {
  const { data: siteSettings } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [config, setConfig] = useState<HomePageConfig>(defaultHomePageConfig);
  const [sectionPageBanners, setSectionPageBanners] = useState(parseSectionPageBanners(null));
  const [heroPuckData, setHeroPuckData] = useState<HeroPuckData | null>(null);
  const [activeTab, setActiveTab] = useState<BuilderTab>('hero');
  const [draggedSectionId, setDraggedSectionId] = useState<SectionId | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<SectionId | null>(null);
  const [uploadingBannerKey, setUploadingBannerKey] = useState<string | null>(null);

  useEffect(() => {
    const nextConfig = parseHomePageConfig(siteSettings?.[HOME_PAGE_CONFIG_KEY]);
    setConfig(nextConfig);
    setSectionPageBanners(parseSectionPageBanners(siteSettings?.[SECTION_PAGE_BANNERS_KEY]));

    const rawHeroPuck = siteSettings?.[HERO_PUCK_DATA_KEY];
    if (rawHeroPuck) {
      try {
        setHeroPuckData(JSON.parse(rawHeroPuck) as HeroPuckData);
      } catch {
        setHeroPuckData(migrateHeroToPuckData(nextConfig));
      }
    } else {
      setHeroPuckData(migrateHeroToPuckData(nextConfig));
    }
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

      return { ...prev, sections: nextSections };
    });
  };

  const moveSectionByDrag = (draggedId: SectionId, targetId: SectionId) => {
    setConfig((prev) => {
      const currentIndex = prev.sections.findIndex((section) => section.id === draggedId);
      const targetIndex = prev.sections.findIndex((section) => section.id === targetId);

      if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return prev;

      const nextSections = [...prev.sections];
      const [draggedSection] = nextSections.splice(currentIndex, 1);
      nextSections.splice(targetIndex, 0, draggedSection);

      return { ...prev, sections: nextSections };
    });
  };

  const handleSaveHeroPuck = async (data: HeroPuckData) => {
    setHeroPuckData(data);
    try {
      await updateSetting.mutateAsync({
        key: HERO_PUCK_DATA_KEY,
        value: JSON.stringify(data),
      });
      toast({ title: 'Hero publicado', description: 'O canvas já reflete no portal público.' });
    } catch (error) {
      toast({
        title: 'Erro ao publicar',
        description: error instanceof Error ? error.message : 'Não foi possível guardar o hero.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: HOME_PAGE_CONFIG_KEY,
        value: JSON.stringify(config),
      });

      toast({
        title: 'Homepage atualizada',
        description: 'O layout, banners e ordem das secções já podem ser refletidos no portal.',
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

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(HOME_BANNER_STORAGE_BUCKET)
        .getPublicUrl(uploadPath);

      setConfig((prev) => ({
        ...prev,
        ...(variant === 'desktop' ? { bannerUrl: publicUrl } : { mobileBannerUrl: publicUrl }),
      }));

      toast({
        title: 'Banner de reserva carregado',
        description: `A versão ${variant === 'desktop' ? 'desktop' : 'mobile'} já está pronta.`,
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
      [sectionId]: { ...prev[sectionId], ...patch },
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

      if (uploadError) throw uploadError;

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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-24 self-start">
        <Card data-tour="builder-homepage" className="border-primary-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4 text-primary-600" />
              Builder da Homepage
            </CardTitle>
            <CardDescription>
              Hero, banners rotativos, ordem das secções e banners de categoria — tudo o que a homepage pública mostra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BuilderTab)}>
              <TabsList className="h-auto w-full gap-1 overflow-x-auto border-0 bg-transparent p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger data-tour="builder-tab-hero" value="hero" className="flex-1 gap-1.5 rounded-lg px-2 py-1.5 text-xs">Hero & banners</TabsTrigger>
                <TabsTrigger data-tour="builder-tab-sections" value="sections" className="flex-1 gap-1.5 rounded-lg px-2 py-1.5 text-xs">Secções</TabsTrigger>
                <TabsTrigger data-tour="builder-tab-categories" value="categories" className="flex-1 gap-1.5 rounded-lg px-2 py-1.5 text-xs">Categorias</TabsTrigger>
              </TabsList>

              {/* ── Hero & banners rotativos ── */}
              <TabsContent value="hero" className="mt-4 space-y-5">
                <div data-tour="builder-rotating-banners" className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Canvas do hero</p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona um elemento para editar o texto ou os banners. As alterações ficam no ar quando clicas em <strong>Publish</strong>, dentro do próprio editor abaixo.
                  </p>
                  {heroPuckData && (
                    <div className="overflow-hidden rounded-2xl border border-border/60">
                      <Puck
                        config={heroPuckConfig}
                        data={heroPuckData}
                        onPublish={(data) => void handleSaveHeroPuck(data)}
                        height="640px"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 border-t border-border/40 pt-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cta-primary">CTA primária (reserva)</Label>
                    <Input
                      id="cta-primary"
                      value={config.primaryCtaLabel}
                      onChange={(event) => setConfig((prev) => ({ ...prev, primaryCtaLabel: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cta-secondary">CTA secundária</Label>
                    <Input
                      id="cta-secondary"
                      value={config.secondaryCtaLabel}
                      onChange={(event) => setConfig((prev) => ({ ...prev, secondaryCtaLabel: event.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cta-tertiary">CTA terciária</Label>
                    <Input
                      id="cta-tertiary"
                      value={config.tertiaryCtaLabel}
                      onChange={(event) => setConfig((prev) => ({ ...prev, tertiaryCtaLabel: event.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/40 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Banner de reserva</p>
                    <p className="text-xs text-muted-foreground">
                      Só aparece se nenhum banner rotativo acima estiver activo.
                    </p>
                  </div>
                  <HomeBannerUploader
                    bannerUrl={config.bannerUrl}
                    mobileBannerUrl={config.mobileBannerUrl}
                    uploadingBannerKey={uploadingBannerKey}
                    onBannerUrlChange={(url) => setConfig((prev) => ({ ...prev, bannerUrl: url }))}
                    onMobileBannerUrlChange={(url) => setConfig((prev) => ({ ...prev, mobileBannerUrl: url }))}
                    onUpload={(variant, file) => void handleHomeBannerUpload(variant, file)}
                  />
                </div>

                <div className="flex gap-2 border-t border-border/40 pt-4">
                  <Button onClick={handleSave} className="flex-1 gap-2">
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setConfig(defaultHomePageConfig)} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </TabsContent>

              {/* ── Secções ── */}
              <TabsContent value="sections" className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary-500" />
                  <p className="text-sm text-muted-foreground">
                    Controle o que aparece, em que ordem, dentro do portal.
                  </p>
                </div>
                <div data-tour="builder-section-sorter">
                <SectionSorter
                  sections={config.sections}
                  draggedSectionId={draggedSectionId}
                  dragOverSectionId={dragOverSectionId}
                  onDragStart={(id) => setDraggedSectionId(id)}
                  onDragOver={(id) => setDragOverSectionId(id)}
                  onDrop={(targetId) => {
                    if (draggedSectionId) moveSectionByDrag(draggedSectionId, targetId);
                    setDraggedSectionId(null);
                    setDragOverSectionId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedSectionId(null);
                    setDragOverSectionId(null);
                  }}
                  onMove={moveSection}
                  onUpdateSection={updateSection}
                />
                </div>
                <Button onClick={handleSave} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              </TabsContent>

              {/* ── Banners de categoria ── */}
              <TabsContent data-tour="builder-section-banners" value="categories" className="mt-4 space-y-6">
                <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <span>Desktop: composições horizontais, entre 1600×900 e 1920×1080. Mobile: corte vertical, entre 1080×1350 e 1080×1920.</span>
                </div>

                {SECTION_PAGE_BANNER_CATALOG.map((section) => (
                  <SectionBannerCard
                    key={section.id}
                    sectionId={section.id}
                    entry={sectionPageBanners[section.id]}
                    uploadingBannerKey={uploadingBannerKey}
                    onClear={(id) => updateSectionPageBanner(id, { bannerUrl: '', mobileBannerUrl: '' })}
                    onUrlChange={updateSectionPageBanner}
                    onUpload={(id, variant, file) => void handleSectionBannerUpload(id, variant, file)}
                  />
                ))}

                <Button onClick={handleSaveSectionBanners} className="w-full gap-2" variant="secondary">
                  <Save className="h-4 w-4" />
                  Guardar banners de categoria
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Live preview */}
      <div className="space-y-6">
        <HomepagePreview enabledSections={enabledSections} />
      </div>
    </div>
  );
};

export default AdminCmsCustomizer;
