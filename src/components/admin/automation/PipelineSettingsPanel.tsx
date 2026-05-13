import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Key, Trash2, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Clock, Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import {
  listN8nCredentials,
  createN8nCredential,
  activateN8nCredential,
  deleteN8nCredential,
  type N8nCredentialRow,
} from '@/services/n8nSettings';

const CLEANUP_OPTIONS = [
  { label: '24 h', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
  { label: '30 dias', hours: 720 },
] as const;

const WF01_INTERVAL_MINUTES = 30;
const WF02_INTERVAL_MINUTES = 20;
const WF03_INTERVAL_MINUTES = 60;
const WF03_BATCH_SIZE = 10;
const WF03_CAPACITY_PER_HOUR = (60 / WF03_INTERVAL_MINUTES) * WF03_BATCH_SIZE;

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function formatDurationMs(value: number | null): string {
  if (!value) return '—';
  if (value < 1000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}min`;
}

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 min';
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 24) return `${value.toFixed(1)} h`;
  return `${(value / 24).toFixed(1)} dias`;
}

function validateCredentialDraft(keyName: 'ANTHROPIC_API_KEY' | 'SUPABASE_SERVICE_ROLE_KEY', value: string): string | null {
  const v = value.trim();
  if (!v) return 'Insira a chave API.';
  if (/\{\{|\$env|=\{|^=/.test(v)) return 'Use o valor bruto da chave, sem =, {{ }} ou $env.';
  if (keyName === 'SUPABASE_SERVICE_ROLE_KEY') {
    if (v.startsWith('eyJ') || v.split('.').length === 3)
      return 'Use a secret key sb_secret..., não a JWT service_role.';
    if (!v.startsWith('sb_secret'))
      return 'A chave Supabase deve começar com sb_secret.';
  }
  if (keyName === 'ANTHROPIC_API_KEY' && !v.startsWith('sk-ant-'))
    return 'ANTHROPIC_API_KEY deve começar com sk-ant-.';
  return null;
}

interface PipelineSettingsPanelProps {
  onClose: () => void;
  diagnostics?: PipelineDiagnostics | null;
}

export function PipelineSettingsPanel({ onClose, diagnostics }: PipelineSettingsPanelProps) {
  const { toast } = useToast();
  const { automations: contentAutomations } = useAutomationsV2({ category: 'content_pipeline', pageSize: 100 });
  const { executions: recentExecutions } = useAutomationExecutions({ pageSize: 100 });

  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  const [newKeyName, setNewKeyName] = useState<'ANTHROPIC_API_KEY' | 'SUPABASE_SERVICE_ROLE_KEY'>('ANTHROPIC_API_KEY');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [cleanupHours, setCleanupHours] = useState(72);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const executionSummaries = useMemo(() => {
    const ids = new Set(contentAutomations.map((a) => a.id));
    const successful = recentExecutions.filter(
      (e) => ids.has(e.automationId) && e.status === 'success' && typeof e.durationMs === 'number' && e.durationMs > 0,
    );
    return contentAutomations
      .map((a) => {
        const samples = successful.filter((e) => e.automationId === a.id).slice(0, 20);
        if (!samples.length) return null;
        const avgDurationMs = Math.round(samples.reduce((s, e) => s + (e.durationMs ?? 0), 0) / samples.length);
        return {
          id: a.id, name: a.name, avgDurationMs,
          avgItemsProcessed: samples.reduce((s, e) => s + e.itemsProcessed, 0) / samples.length,
          avgItemsCreated: samples.reduce((s, e) => s + e.itemsCreated, 0) / samples.length,
          sampleCount: samples.length,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [contentAutomations, recentExecutions]);

  const avgCronWait = (WF01_INTERVAL_MINUTES / 2) + (WF02_INTERVAL_MINUTES / 2) + (WF03_INTERVAL_MINUTES / 2);
  const worstCaseCronWait = WF01_INTERVAL_MINUTES + WF02_INTERVAL_MINUTES + WF03_INTERVAL_MINUTES;
  const cadencePerCurated = Math.round(WF03_INTERVAL_MINUTES / WF03_BATCH_SIZE);
  const backlogDrainH = diagnostics ? diagnostics.clusters.highConfidence / WF03_CAPACITY_PER_HOUR : null;
  const estimatedReadyH = backlogDrainH === null ? null : backlogDrainH + (avgCronWait / 60);
  const estimatedBacklogWaitH = backlogDrainH === null ? null : backlogDrainH / 2;

  const loadCredentials = useCallback(async () => {
    setLoadingCreds(true);
    setCredentialsError(null);
    try {
      setCredentials(await listN8nCredentials());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar chaves';
      setCredentialsError(msg);
      toast({ title: 'Falha ao carregar chaves', description: msg, variant: 'destructive' });
    } finally {
      setLoadingCreds(false);
    }
  }, [toast]);

  useEffect(() => { void loadCredentials(); }, [loadCredentials]);

  const handleSaveKey = async () => {
    const err = validateCredentialDraft(newKeyName, newKeyValue);
    if (err) { toast({ title: 'Chave inválida', description: err, variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const cred = await createN8nCredential({
        keyName: newKeyName, value: newKeyValue.trim(), expiresAt,
        notes: `Adicionada via dashboard em ${new Date().toLocaleDateString('pt-PT')}`,
        remindDaysBefore: 30,
      });
      await activateN8nCredential(cred.id, true);
      toast({ title: `${newKeyName} guardada`, description: 'Chave ativa e disponível para os workflows.' });
      setNewKeyValue('');
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro ao guardar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Remover esta chave permanentemente?')) return;
    try {
      await deleteN8nCredential(id);
      toast({ title: 'Chave removida' });
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    }
  };

  const handleCleanup = async () => {
    setCleaning(true); setCleanupResult(null);
    const cutoff = new Date(Date.now() - cleanupHours * 3_600_000).toISOString();
    let stagingDeleted = 0, clustersDeleted = 0, curatedCleaned = 0;
    try {
      const { data: stg, error: stgErr } = await supabase.from('news_staging').delete().eq('processed', true).lt('collected_at', cutoff).select('id');
      if (stgErr) throw new Error(stgErr.message);
      stagingDeleted = stg?.length ?? 0;

      const { data: staleCurated, error: scErr } = await supabase.from('curated_posts').select('id, cluster_id').in('status', ['published', 'rejected']).lt('created_at', cutoff);
      if (scErr) throw new Error(scErr.message);

      const curIds = staleCurated?.map((r) => r.id) ?? [];
      const clsCandidates = uniqueIds(staleCurated?.map((r) => r.cluster_id) ?? []);
      if (curIds.length > 0) {
        const { data: c, error: cErr } = await supabase.from('curated_posts').delete().in('id', curIds).select('id');
        if (cErr) throw new Error(cErr.message);
        curatedCleaned = c?.length ?? 0;
      }

      if (clsCandidates.length > 0) {
        const { data: prot } = await supabase.from('curated_posts').select('cluster_id').in('cluster_id', clsCandidates).in('status', ['draft', 'ready']);
        const protIds = new Set(uniqueIds(prot?.map((r) => r.cluster_id) ?? []));
        const toDelete = clsCandidates.filter((id) => !protIds.has(id));
        if (toDelete.length > 0) {
          const { data: cls, error: clsErr } = await supabase.from('news_clusters').delete().in('id', toDelete).lt('created_at', cutoff).select('id');
          if (clsErr) throw new Error(clsErr.message);
          clustersDeleted = cls?.length ?? 0;
        }
      }

      const total = stagingDeleted + clustersDeleted + curatedCleaned;
      setCleanupResult(total > 0 ? `${stagingDeleted} staging · ${clustersDeleted} clusters · ${curatedCleaned} curados` : 'Nada para limpar neste corte');
      toast({ title: total > 0 ? `${total} registos removidos` : 'Nada para limpar', description: `Staging: ${stagingDeleted} · Clusters: ${clustersDeleted} · Curados: ${curatedCleaned}` });
    } catch (err) {
      toast({ title: 'Erro na limpeza', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  const handleBacklogPurge = async () => {
    if (!confirm('Remove staging não processado e clusters órfãos antigos. Não afeta curados draft/ready. Continuar?')) return;
    setCleaning(true); setCleanupResult(null);
    const cutoff = new Date(Date.now() - cleanupHours * 3_600_000).toISOString();
    let staleUnprocessed = 0, orphanClusters = 0;
    try {
      const { data: su, error: suErr } = await supabase.from('news_staging').delete().eq('processed', false).lt('collected_at', cutoff).select('id');
      if (suErr) throw new Error(suErr.message);
      staleUnprocessed = su?.length ?? 0;

      const { data: old, error: oldErr } = await supabase.from('news_clusters').select('id').lt('created_at', cutoff);
      if (oldErr) throw new Error(oldErr.message);
      const candidates = old?.map((r) => r.id) ?? [];
      if (candidates.length > 0) {
        const { data: refs } = await supabase.from('curated_posts').select('cluster_id').in('cluster_id', candidates);
        const referenced = new Set(uniqueIds(refs?.map((r) => r.cluster_id) ?? []));
        const orphans = candidates.filter((id) => !referenced.has(id));
        if (orphans.length > 0) {
          const { data: del, error: delErr } = await supabase.from('news_clusters').delete().in('id', orphans).select('id');
          if (delErr) throw new Error(delErr.message);
          orphanClusters = del?.length ?? 0;
        }
      }
      const total = staleUnprocessed + orphanClusters;
      setCleanupResult(total > 0 ? `${staleUnprocessed} staging bruto · ${orphanClusters} clusters órfãos` : 'Nenhum backlog bruto encontrado');
      toast({ title: total > 0 ? `${total} registos removidos` : 'Nada para limpar' });
    } catch (err) {
      toast({ title: 'Erro no purge', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  const handleFullReset = async () => {
    if (!confirm('ATENÇÃO: Apaga TODOS os dados do pipeline (staging, clusters, curados não publicados). Continuar?')) return;
    setCleaning(true); setCleanupResult(null);
    try {
      const { data: stg, error: s1 } = await supabase.from('news_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id');
      if (s1) throw new Error('Staging: ' + s1.message);
      const { data: cls, error: s2 } = await supabase.from('news_clusters').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id');
      if (s2) throw new Error('Clusters: ' + s2.message);
      const { data: cur, error: s3 } = await supabase.from('curated_posts').delete().in('status', ['draft', 'ready', 'auto-draft', 'pending-review', 'rejected']).select('id');
      if (s3) throw new Error('Curados: ' + s3.message);
      const total = (stg?.length ?? 0) + (cls?.length ?? 0) + (cur?.length ?? 0);
      setCleanupResult(total > 0 ? `Reset: ${stg?.length} staging · ${cls?.length} clusters · ${cur?.length} curados` : 'Nenhum registo encontrado');
      toast({ title: total > 0 ? `${total} registos removidos` : 'Nada apagado' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro';
      setCleanupResult('Erro: ' + msg);
      toast({ title: 'Erro no reset', description: msg, variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  const anthropicKey = credentials.find((c) => c.key_name === 'ANTHROPIC_API_KEY' && c.status === 'active');
  const n8nKey = credentials.find((c) => c.key_name === 'N8N_API_KEY' && c.status === 'active');
  const supabaseKey = credentials.find((c) => c.key_name === 'SUPABASE_SERVICE_ROLE_KEY' && c.status === 'active');
  const credentialDraftError = validateCredentialDraft(newKeyName, newKeyValue);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Configurações do Pipeline</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <Tabs defaultValue="keys">
        <TabsList className="h-8 w-full gap-0.5 rounded-lg border border-border/40 bg-muted/40 p-0.5">
          <TabsTrigger value="keys" className="flex-1 rounded-md text-xs">
            <Key className="mr-1.5 h-3.5 w-3.5" />Chaves API
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex-1 rounded-md text-xs">
            <Clock className="mr-1.5 h-3.5 w-3.5" />Schedules
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex-1 rounded-md text-xs">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Limpeza
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: API Keys ── */}
        <TabsContent value="keys" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Chaves encriptadas com AES-GCM. Os workflows leem do Supabase em runtime.
          </p>

          {loadingCreds && (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />A carregar chaves…
            </div>
          )}

          {!loadingCreds && credentialsError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-destructive">{credentialsError}</p>
              <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={() => void loadCredentials()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!loadingCreds && !credentialsError && (
            <div className="space-y-2">
              {/* Keys status */}
              <div className="divide-y divide-border/40 rounded-xl border border-border/40 bg-muted/20">
                {[
                  { key: anthropicKey, label: 'ANTHROPIC_API_KEY', warn: false },
                  { key: supabaseKey, label: 'SUPABASE_SERVICE_ROLE_KEY', warn: false },
                  { key: n8nKey, label: 'N8N_API_KEY', warn: true },
                ].map(({ key, label, warn }) => (
                  <div key={label} className="flex min-w-0 items-center gap-2 px-3 py-2.5">
                    {key ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${warn ? 'text-amber-500' : 'text-destructive'}`} />
                    )}
                    <span className={`min-w-0 truncate text-xs font-mono font-medium ${key ? 'text-foreground' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                      {label}
                    </span>
                    {key && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        ativa · {new Date(key.activated_at ?? key.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                    {!key && warn && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">env var (fallback)</span>
                    )}
                    {key && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void handleDeleteKey(key.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Warning about Supabase env */}
              {supabaseKey && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                  Guardar a chave aqui ativa o vault do portal, mas não altera a variável de ambiente do n8n. WF-01 e WF-02 leem <code className="font-mono">$env.SUPABASE_SERVICE_ROLE_KEY</code> no runtime do n8n.
                </p>
              )}
            </div>
          )}

          {/* Add key form */}
          <form
            className="space-y-2 rounded-xl border border-border/50 bg-card p-3"
            onSubmit={(e) => { e.preventDefault(); void handleSaveKey(); }}
            autoComplete="off"
          >
            <p className="text-xs font-medium text-foreground">Adicionar / atualizar chave</p>
            <select
              className="h-8 w-full rounded-lg border border-border bg-muted px-2 text-xs text-foreground"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value as 'ANTHROPIC_API_KEY' | 'SUPABASE_SERVICE_ROLE_KEY')}
            >
              <option value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY (Claude IA)</option>
              <option value="SUPABASE_SERVICE_ROLE_KEY">SUPABASE_SERVICE_ROLE_KEY</option>
            </select>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={newKeyName === 'ANTHROPIC_API_KEY' ? 'sk-ant-...' : 'sb_secret_...'}
                className="h-8 flex-1 font-mono text-xs"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                autoComplete="new-password"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0 text-xs" disabled={saving || Boolean(credentialDraftError)}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
            {credentialDraftError && newKeyValue && (
              <p className="text-[11px] text-destructive">{credentialDraftError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {newKeyName === 'ANTHROPIC_API_KEY'
                ? 'console.anthropic.com → API Keys. Usado pelo WF-03 para gerar artigos.'
                : 'Supabase → Settings → API → Secret keys. Use sb_secret..., não eyJ...'}
            </p>
          </form>
        </TabsContent>

        {/* ── TAB: Schedules ── */}
        <TabsContent value="schedules" className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { wf: 'WF-01', label: 'Coleta RSS', schedule: 'A cada 30 min' },
              { wf: 'WF-02', label: 'Cluster & Dedup', schedule: 'A cada 20 min' },
              { wf: 'WF-03', label: 'IA Reescrita', schedule: 'A cada 60 min · até 10 artigos/ciclo' },
            ].map(({ wf, label, schedule }) => (
              <div key={wf} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <Badge variant="outline" className="mb-2 border-blue-500/30 text-[10px] text-blue-600 dark:text-blue-400">
                  {wf}
                </Badge>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{schedule}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1 text-[11px] text-muted-foreground">
            <p>Cadência WF-03: ~1 artigo a cada {cadencePerCurated} min.</p>
            <p>Lead time: ~{Math.round(avgCronWait)} min (avg) · ~{Math.round(worstCaseCronWait)} min (pior caso).</p>
            <p>Capacidade: {WF03_CAPACITY_PER_HOUR.toFixed(0)} curados/hora (~{Math.round(WF03_CAPACITY_PER_HOUR * 24)}/dia).</p>
            {backlogDrainH !== null && (
              <>
                <p>Backlog: {diagnostics?.clusters.highConfidence ?? 0} clusters elegíveis ⇒ ~{formatHours(backlogDrainH)} para drenar.</p>
                <p>Próximo artigo: pronto em ~{formatHours(estimatedReadyH ?? 0)} se a fila se mantiver.</p>
              </>
            )}
          </div>

          {executionSummaries.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-foreground">Execução real recente</p>
              <div className="space-y-1.5">
                {executionSummaries.map((s) => (
                  <div key={s.id} className="flex min-w-0 items-center gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-foreground">{s.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{formatDurationMs(s.avgDurationMs)}</span>
                    <span className="shrink-0 text-muted-foreground/60">{s.sampleCount} exec.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Cleanup ── */}
        <TabsContent value="cleanup" className="mt-4 space-y-4">
          {diagnostics && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-xs">Estado atual</p>
              <p>{diagnostics.staging.unprocessed} staging não processados · {diagnostics.clusters.highConfidence} clusters ≥60% · {diagnostics.curated.ready} curados prontos</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Corte de tempo</label>
            <div className="flex flex-wrap gap-1.5">
              {CLEANUP_OPTIONS.map((opt) => (
                <Button
                  key={opt.hours}
                  size="sm"
                  variant={cleanupHours === opt.hours ? 'default' : 'outline'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setCleanupHours(opt.hours)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-amber-500/40 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              disabled={cleaning}
              onClick={() => void handleCleanup()}
            >
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Limpeza segura
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
              disabled={cleaning}
              onClick={() => void handleBacklogPurge()}
            >
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Purgar backlog
            </Button>
          </div>

          {cleanupResult && (
            <p className="text-xs text-foreground">{cleanupResult}</p>
          )}

          <div className="border-t border-border/40 pt-3">
            <p className="mb-2 text-[11px] text-muted-foreground">
              Reset completo: apaga <strong>todos</strong> os dados do pipeline (staging, clusters, curados não publicados).
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              disabled={cleaning}
              onClick={() => void handleFullReset()}
            >
              <Trash2 className="h-3 w-3" />
              Reset completo do pipeline
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
