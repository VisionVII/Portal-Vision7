import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';
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
  { value: 'claude-haiku', label: 'Claude Haiku (Rápido, económico)' },
  { value: 'claude-sonnet', label: 'Claude Sonnet (Qualidade editorial)' },
  { value: 'local-preview', label: 'Local Preview (Offline)' },
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
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar definições IA...
      </div>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-500" />
          <CardTitle className="text-base">Assistente IA do Portal</CardTitle>
        </div>
        <CardDescription>Configurar o assistente inteligente visível para leitores do portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-enabled">Assistente ativo</Label>
          <Switch
            id="ai-enabled"
            checked={settings.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            disabled={saving}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Provider */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Provedor de IA</Label>
              <Select
                value={settings.provider}
                onValueChange={(v) => update({ provider: v })}
                disabled={saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Skills ativas</Label>
              <div className="flex flex-wrap gap-2">
                {portalAssistantSkills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant={settings.skills.includes(skill.id) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleSkill(skill.id)}
                    title={skill.description}
                  >
                    {skill.label}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
