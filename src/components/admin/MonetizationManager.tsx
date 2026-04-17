import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, DollarSign, LayoutGrid, Crown, Plus, X } from 'lucide-react';
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
        onSuccess: () => toast({ title: `${field} ${value ? 'ativado' : 'desativado'}` }),
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
        onSuccess: () => toast({ title: 'Slots atualizados' }),
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
        onSuccess: () => { setNewFeature(''); toast({ title: 'Feature adicionada' }); },
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  const handleRemoveFeature = (feature: string) => {
    const updated = premiumFeatures.filter((f) => f !== feature);
    updateSetting.mutate(
      { key: 'premium_features', value: { premium_features: updated } as unknown as Json },
      {
        onSuccess: () => toast({ title: 'Feature removida' }),
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar definições de monetização...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ads Toggle */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Publicidade</CardTitle>
          </div>
          <CardDescription>Controlar exibição de espaços publicitários no portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ads-toggle">Publicidade ativa</Label>
            <Switch
              id="ads-toggle"
              checked={adsEnabled}
              onCheckedChange={(v) => handleToggle('ads_enabled', 'ads_enabled', v)}
              disabled={updateSetting.isPending}
            />
          </div>

          {adsEnabled && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Posições ativas</Label>
              <div className="flex flex-wrap gap-2">
                {AD_SLOT_OPTIONS.map((slot) => (
                  <Badge
                    key={slot}
                    variant={adSlots.includes(slot) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
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
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Subscrições Premium</CardTitle>
          </div>
          <CardDescription>Ativar sistema de conteúdo premium e subscrições.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sub-toggle">Subscrições ativas</Label>
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
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Funcionalidades Premium</CardTitle>
          </div>
          <CardDescription>Definir quais funcionalidades são reservadas a subscritores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {premiumFeatures.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {premiumFeatures.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1 pr-1">
                  {f}
                  <button
                    onClick={() => handleRemoveFeature(f)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da funcionalidade..."
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddFeature} disabled={!newFeature.trim() || updateSetting.isPending}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
