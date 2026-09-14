import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, DollarSign, LayoutGrid, Crown, Plus, X, CheckCircle2 } from 'lucide-react';
import { useMonetizationSettings, useUpdateMonetizationSetting } from '@/hooks/useMonetization';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

const AD_SLOT_OPTIONS = ['header', 'sidebar', 'content', 'footer', 'after-player', 'inline'] as const;

export default function MonetizationManager() {
  const { data: settings, isLoading } = useMonetizationSettings();
  const updateSetting = useUpdateMonetizationSetting();
  const { toast } = useToast();

  const [newFeature, setNewFeature] = useState('');

  const getSetting = (key: string): Json | null => {
    const found = settings?.find((s) => s.setting_key === key);
    return found?.setting_value ?? null;
  };

  const adsEnabled = (() => {
    const v = getSetting('ads_enabled') as Record<string, unknown> | null;
    return v?.ads_enabled !== false;
  })();

  const subscriptionEnabled = (() => {
    const v = getSetting('subscription_enabled') as Record<string, unknown> | null;
    return (v?.subscription_enabled as boolean) === true;
  })();

  const adSlots = (() => {
    const v = getSetting('ad_slots') as Record<string, unknown> | null;
    return (v?.ad_slots as string[] | undefined) ?? ['header', 'sidebar', 'content', 'footer'];
  })();

  const premiumFeatures = (() => {
    const v = getSetting('premium_features') as Record<string, unknown> | null;
    return (v?.premium_features as string[] | undefined) ?? [];
  })();

  const handleToggle = (key: string, field: string, value: boolean) => {
    updateSetting.mutate(
      { key, value: { [field]: value } as unknown as Json },
      {
        onSuccess: () => toast({ title: value ? `${field === 'ads_enabled' ? 'Publicidade' : 'Subscrições'} ativas` : `${field === 'ads_enabled' ? 'Publicidade' : 'Subscrições'} desativadas` }),
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  const handleSlotToggle = (slot: string) => {
    const newSlots = adSlots.includes(slot)
      ? adSlots.filter((s) => s !== slot)
      : [...adSlots, slot];
    updateSetting.mutate(
      { key: 'ad_slots', value: { ad_slots: newSlots } as unknown as Json },
      {
        onSuccess: () => toast({ title: 'Posições de anúncio atualizadas' }),
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed || premiumFeatures.includes(trimmed)) return;
    const updated = [...premiumFeatures, trimmed];
    updateSetting.mutate(
      { key: 'premium_features', value: { premium_features: updated } as unknown as Json },
      {
        onSuccess: () => { setNewFeature(''); toast({ title: 'Funcionalidade adicionada', description: trimmed }); },
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  const handleRemoveFeature = (feature: string) => {
    const updated = premiumFeatures.filter((f) => f !== feature);
    updateSetting.mutate(
      { key: 'premium_features', value: { premium_features: updated } as unknown as Json },
      {
        onSuccess: () => toast({ title: 'Funcionalidade removida' }),
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        A carregar definições de monetização...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ads */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Publicidade
              </CardTitle>
              <CardDescription className="mt-1">
                Controlar a exibição de espaços publicitários no portal.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 ${adsEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-border bg-muted text-muted-foreground'}`}
            >
              {adsEnabled ? <><CheckCircle2 className="mr-1 h-3 w-3" />Ativa</> : 'Inativa'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ads-toggle" className="font-normal">Publicidade ativa no portal</Label>
            <Switch
              id="ads-toggle"
              checked={adsEnabled}
              onCheckedChange={(v) => handleToggle('ads_enabled', 'ads_enabled', v)}
              disabled={updateSetting.isPending}
            />
          </div>

          {adsEnabled && (
            <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/20 p-3.5">
              <Label className="text-xs font-medium text-muted-foreground">Posições ativas (clique para alternar)</Label>
              <div className="flex flex-wrap gap-2">
                {AD_SLOT_OPTIONS.map((slot) => (
                  <Badge
                    key={slot}
                    variant={adSlots.includes(slot) ? 'default' : 'outline'}
                    className={`cursor-pointer select-none transition-all ${
                      adSlots.includes(slot)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleSlotToggle(slot)}
                  >
                    {slot}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-4 w-4 text-amber-500" />
                Subscrições Premium
              </CardTitle>
              <CardDescription className="mt-1">
                Ativar o sistema de conteúdo premium e acesso por subscrição.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 ${subscriptionEnabled ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-border bg-muted text-muted-foreground'}`}
            >
              {subscriptionEnabled ? <><CheckCircle2 className="mr-1 h-3 w-3" />Ativo</> : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="sub-toggle" className="font-normal">Sistema de subscrições ativo</Label>
            <Switch
              id="sub-toggle"
              checked={subscriptionEnabled}
              onCheckedChange={(v) => handleToggle('subscription_enabled', 'subscription_enabled', v)}
              disabled={updateSetting.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Premium Features */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Funcionalidades Premium
          </CardTitle>
          <CardDescription>
            Define quais funcionalidades ficam reservadas a subscritores. Clica no &times; para remover.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {premiumFeatures.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-border/50 bg-muted/20 p-3.5">
              {premiumFeatures.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1.5 pr-1.5 text-xs">
                  {f}
                  <button
                    onClick={() => handleRemoveFeature(f)}
                    className="flex items-center justify-center rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    aria-label={`Remover funcionalidade "${f}"`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma funcionalidade premium definida.</p>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Nome da funcionalidade (ex: artigos-exclusivos)"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
              className="flex-1"
            />
            <Button
              size="default"
              onClick={handleAddFeature}
              disabled={!newFeature.trim() || updateSetting.isPending}
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
