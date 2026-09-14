import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Image, Trash2, Loader2, Mail, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

const SiteSettingsManager = () => {
  const { data: settings, isLoading } = useSiteSettings({ includePrivate: true });
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Por favor selecione uma imagem (PNG, JPG, SVG ou WebP).', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ficheiro demasiado grande', description: 'A imagem não pode ultrapassar 5 MB.', variant: 'destructive' });
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
      toast({ title: 'Logo atualizado', description: 'A nova imagem já está ativa no portal.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao enviar', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const [siteName, setSiteName] = useState('');
  const [siteNameSaved, setSiteNameSaved] = useState(false);

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
    setSiteNameSaved(true);
    setTimeout(() => setSiteNameSaved(false), 2500);
    toast({
      title: 'Nome guardado',
      description: siteName
        ? `O portal passará a chamar-se "${siteName}".`
        : 'Nome removido — apenas o logótipo será exibido.',
    });
  };

  const handleRemoveLogo = async () => {
    await updateSetting.mutateAsync({ key: 'logo_url', value: null });
    toast({ title: 'Logótipo removido', description: 'O logótipo padrão do portal será utilizado.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        A carregar configurações...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo & Branding */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4 text-primary" />
            Logótipo e Identidade
          </CardTitle>
          <CardDescription>
            O logótipo aparece no cabeçalho, rodapé e ícone do separador do navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo preview + upload */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Preview */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logótipo do portal" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="scale-90">
                  <BrandLogo siteName={siteName || 'Vision'} compact showTagline={false} />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="default" size="sm" className="gap-2 pointer-events-none" asChild={false} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'A enviar...' : 'Enviar logótipo'}
                  </Button>
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
                  <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos aceites: PNG, JPG, SVG, WebP &mdash; Tamanho recomendado: 200&times;200px, máx. 5 MB.
              </p>

              {/* Preview in context */}
              {settings?.logo_url && (
                <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização em contexto:</p>
                  <BrandLogo siteName={siteName || 'Vision'} logoUrl={settings.logo_url} compact />
                </div>
              )}
            </div>
          </div>

          {/* Site name */}
          <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/20 p-4">
            <Label htmlFor="site-name" className="text-sm font-medium">
              Nome do portal
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Deixe em branco para exibir apenas o logótipo, sem texto.
            </p>
            <div className="flex gap-2">
              <Input
                id="site-name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Ex: Vision"
                className="flex-1"
              />
              <Button
                onClick={handleSaveSiteName}
                disabled={updateSetting.isPending}
                size="default"
                className="gap-2 shrink-0"
              >
                {siteNameSaved ? (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Guardado</>
                ) : updateSetting.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> A guardar...</>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <SmtpConfigCard settings={settings} updateSetting={updateSetting} toast={toast} />
    </div>
  );
};

/* ─── SMTP Configuration Card ─── */
function SmtpConfigCard({
  settings,
  updateSetting,
  toast,
}: {
  settings: Record<string, string | null> | undefined;
  updateSetting: ReturnType<typeof useUpdateSiteSetting>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Vision7');
  const [smtpSecure, setSmtpSecure] = useState('tls');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (!settings) return;
    setSmtpHost(settings.smtp_host ?? '');
    setSmtpPort(settings.smtp_port ?? '587');
    setSmtpUser(settings.smtp_user ?? '');
    setSmtpFrom(settings.smtp_from ?? '');
    setSmtpFromName(settings.smtp_from_name ?? 'Vision7');
    setSmtpSecure(settings.smtp_secure ?? 'tls');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'smtp_host', value: smtpHost || null }),
        updateSetting.mutateAsync({ key: 'smtp_port', value: smtpPort || null }),
        updateSetting.mutateAsync({ key: 'smtp_user', value: smtpUser || null }),
        updateSetting.mutateAsync({ key: 'smtp_from', value: smtpFrom || null }),
        updateSetting.mutateAsync({ key: 'smtp_from_name', value: smtpFromName || null }),
        updateSetting.mutateAsync({ key: 'smtp_secure', value: smtpSecure }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: 'SMTP guardado', description: 'Configuração de email atualizada com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro ao guardar SMTP', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!(smtpHost && smtpPort && smtpUser && smtpFrom);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-blue-500" />
              Configuração SMTP
            </CardTitle>
            <CardDescription className="mt-1">
              Servidor de email para notificações, newsletters e automações de email.
            </CardDescription>
          </div>
          {isConfigured ? (
            <Badge variant="outline" className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Pendente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credential vault notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3.5 py-3 text-xs text-blue-700 dark:text-blue-300">
          <Globe className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            A password SMTP deve ser guardada no{' '}
            <strong className="font-semibold">Credential Vault</strong> (Developer &rarr; Credential Vault) e não aqui.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Host SMTP</Label>
            <Input
              placeholder="smtp.exemplo.com"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Porta</Label>
              <Input
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Segurança</Label>
              <Select value={smtpSecure} onValueChange={setSmtpSecure}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS (587)</SelectItem>
                  <SelectItem value="ssl">SSL (465)</SelectItem>
                  <SelectItem value="none">Nenhuma (25)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Utilizador SMTP</Label>
            <Input
              placeholder="user@exemplo.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email remetente (From)</Label>
            <Input
              placeholder="noreply@vision7.pt"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nome do remetente</Label>
          <Input
            placeholder="Vision7"
            value={smtpFromName}
            onChange={(e) => setSmtpFromName(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[140px]">
            {saved ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Guardado</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> A guardar...</>
            ) : (
              'Guardar SMTP'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SiteSettingsManager;
