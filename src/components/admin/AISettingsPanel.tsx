import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { portalAssistantConfig, portalAssistantSkills } from '@/modules/portal-ai/config';

interface AISettings {
  enabled: boolean;
  provider: string;
  model: string;
  skills: string[];
}

const PROVIDERS = [
  {
    value: 'claude-haiku',
    label: 'Claude Haiku',
    description: 'Rápido e económico — ideal para suporte e FAQs',
    icon: Zap,
    iconClass: 'text-blue-500',
  },
  {
    value: 'claude-sonnet',
    label: 'Claude Sonnet',
    description: 'Qualidade editorial — respostas mais elaboradas',
    icon: Sparkles,
    iconClass: 'text-violet-500',
  },
  {
    value: 'local-preview',
    label: 'Local Preview',
    description: 'Offline — apenas para desenvolvimento e testes',
    icon: Bot,
    iconClass: 'text-muted-foreground',
  },
] as const;

const MODEL_BY_PROVIDER: Record<string, string> = {
  'claude-haiku': 'claude-haiku-4-5-20251001',
  'claude-sonnet': 'claude-sonnet-4-6',
  'local-preview': '',
};

export default function AISettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    enabled: portalAssistantConfig.enabled,
    provider: portalAssistantConfig.provider,
    model: portalAssistantConfig.model,
    skills: portalAssistantSkills.map((s) => s.id),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'portal_ai_config')
          .maybeSingle();
        if (data?.value) {
          const v = typeof data.value === 'string' ? JSON.parse(data.value) as Record<string, unknown> : data.value as Record<string, unknown>;
          setSettings((prev) => ({
            enabled: typeof v.enabled === 'boolean' ? v.enabled : prev.enabled,
            provider: typeof v.provider === 'string' ? v.provider : prev.provider,
            model: typeof v.model === 'string' ? v.model : prev.model,
            skills: Array.isArray(v.skills) ? (v.skills as string[]) : prev.skills,
          }));
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const save = async (updated: AISettings) => {
    setSaving(true);
    try {
      await supabase
        .from('site_settings')
        .upsert(
          { key: 'portal_ai_config', value: JSON.stringify(updated), updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
      toast({ title: 'Definições IA atualizadas' });
    } catch {
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<AISettings>) => {
    const merged = { ...settings, ...patch };
    if (patch.provider && patch.provider in MODEL_BY_PROVIDER && !patch.model) {
      merged.model = MODEL_BY_PROVIDER[patch.provider];
    }
    setSettings(merged);
    void save(merged);
  };

  const toggleSkill = (skillId: string) => {
    const skills = settings.skills.includes(skillId)
      ? settings.skills.filter((s) => s !== skillId)
      : [...settings.skills, skillId];
    update({ skills });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        A carregar definições IA...
      </div>
    );
  }

  const activeProvider = PROVIDERS.find((p) => p.value === settings.provider);
  const ActiveIcon = activeProvider?.icon ?? Bot;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-violet-500" />
              Assistente IA do Portal
            </CardTitle>
            <CardDescription className="mt-1">
              Configura o assistente inteligente visível para leitores do portal.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 ${settings.enabled ? 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400' : 'border-border bg-muted text-muted-foreground'}`}
          >
            {settings.enabled ? <><CheckCircle2 className="mr-1 h-3 w-3" />Ativo</> : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div>
            <Label htmlFor="ai-enabled" className="font-medium">Assistente ativo para leitores</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Quando desligado, o botão do assistente fica oculto no portal público.</p>
          </div>
          <Switch
            id="ai-enabled"
            checked={settings.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            disabled={saving}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Provider select */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Modelo de IA</Label>
              <Select
                value={settings.provider}
                onValueChange={(v) => update({ provider: v })}
                disabled={saving}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <ActiveIcon className={`h-4 w-4 ${activeProvider?.iconClass ?? 'text-muted-foreground'}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => {
                    const ProviderIcon = p.icon;
                    return (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <ProviderIcon className={`h-4 w-4 ${p.iconClass}`} />
                          <div>
                            <span className="font-medium">{p.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{p.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Skills */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Competências ativas (clique para ativar/desativar)
              </Label>
              <div className="flex flex-wrap gap-2">
                {portalAssistantSkills.map((skill) => {
                  const isActive = settings.skills.includes(skill.id);
                  return (
                    <Badge
                      key={skill.id}
                      variant={isActive ? 'default' : 'outline'}
                      className={`cursor-pointer select-none transition-all ${
                        isActive
                          ? 'bg-violet-600 text-white hover:bg-violet-700'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => toggleSkill(skill.id)}
                      title={skill.description}
                    >
                      {skill.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {saving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                A guardar definições...
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
