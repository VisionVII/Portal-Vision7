import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Image, Trash2, Loader2 } from 'lucide-react';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

const SiteSettingsManager = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor selecione uma imagem.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(`site/${fileName}`, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(`site/${fileName}`);

      await updateSetting.mutateAsync({ key: 'logo_url', value: urlData.publicUrl });

      toast({ title: 'Sucesso', description: 'Logo atualizado com sucesso!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const [siteName, setSiteName] = useState('');

  React.useEffect(() => {
    if (settings?.site_name !== undefined) {
      const normalizedName = settings.site_name && !/porto\s+not[ií]cias/i.test(settings.site_name)
        ? settings.site_name
        : 'Vision';
      setSiteName(normalizedName);
    }
  }, [settings]);

  const handleSaveSiteName = async () => {
    await updateSetting.mutateAsync({ key: 'site_name', value: siteName || null });
    toast({
      title: 'Salvo',
      description: siteName
        ? 'Nome do portal atualizado com sucesso.'
        : 'Nome do portal removido, exibindo apenas o logo.',
    });
  };

  const handleRemoveLogo = async () => {
    await updateSetting.mutateAsync({ key: 'logo_url', value: null });
    toast({ title: 'Logo removido', description: 'O logo padrão será utilizado.' });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo do Portal
          </CardTitle>
          <CardDescription>
            Faça upload do logo que aparecerá no header, footer e ícone do navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Logo Preview */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="scale-90">
                  <BrandLogo siteName={siteName || 'Vision'} compact showTagline={false} />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'A enviar...' : 'Enviar Logo'}
                  </div>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </Label>
                {settings?.logo_url && (
                  <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos: PNG, JPG, SVG, WebP. Tamanho recomendado: 200×200px.
              </p>
            </div>
          </div>

          {/* Site Name */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
            <Label htmlFor="site-name" className="text-sm font-medium">Nome do Portal (deixe em branco para mostrar apenas o logo)</Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Ex: Vision"
            />
            <Button onClick={handleSaveSiteName} className="w-full">Salvar Nome</Button>
          </div>

          {/* Preview in context */}
          {settings?.logo_url && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Pré-visualização:</p>
              <div className="flex items-center gap-3">
                <BrandLogo siteName={siteName || 'Vision'} logoUrl={settings.logo_url} compact />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettingsManager;
