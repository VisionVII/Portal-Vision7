import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, LayoutTemplate, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import HomeBannerUploader from './HomeBannerUploader';
import SectionBannerCard from './SectionBannerCard';
import SectionSorter from './SectionSorter';
import HomepagePreview from './HomepagePreview';
import { type SectionId, type HomeSection } from '@/lib/homepage-config';

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

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(HOME_BANNER_STORAGE_BUCKET)
        .getPublicUrl(uploadPath);

      setConfig((prev) => ({
        ...prev,
        ...(variant === 'desktop' ? { bannerUrl: publicUrl } : { mobileBannerUrl: publicUrl }),
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-6 xl:sticky xl:top-24 self-start">
        {/* Homepage builder */}
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

            <HomeBannerUploader
              bannerUrl={config.bannerUrl}
              mobileBannerUrl={config.mobileBannerUrl}
              uploadingBannerKey={uploadingBannerKey}
              onBannerUrlChange={(url) => setConfig((prev) => ({ ...prev, bannerUrl: url }))}
              onMobileBannerUrlChange={(url) => setConfig((prev) => ({ ...prev, mobileBannerUrl: url }))}
              onUpload={(variant, file) => void handleHomeBannerUpload(variant, file)}
            />

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

        {/* Section banners */}
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
              Guardar banners de secção
            </Button>
          </CardContent>
        </Card>

        {/* Section sorter */}
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
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Live preview */}
      <div className="space-y-6">
        <HomepagePreview
          bannerUrl={config.bannerUrl}
          mobileBannerUrl={config.mobileBannerUrl}
          primaryCtaLabel={config.primaryCtaLabel}
          enabledSections={enabledSections}
        />
      </div>
    </div>
  );
};

export default AdminCmsCustomizer;
