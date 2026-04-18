import { useState, useEffect, useCallback, useMemo } from 'react';
import { Key, Trash2, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Clock, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

/* ── Cleanup thresholds ── */
const CLEANUP_OPTIONS = [
  { label: '24 horas', hours: 24 },
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
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
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

function validateCredentialDraft(keyName: 'GROQ_API_KEY' | 'HF_API_TOKEN' | 'SUPABASE_SERVICE_ROLE_KEY', value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return 'Insira a chave API.';
  if (/\{\{|\$env|=\{|^=/.test(normalized)) return 'Use o valor bruto da chave, sem =, {{ }} ou $env.';

  if (keyName === 'SUPABASE_SERVICE_ROLE_KEY') {
    if (normalized.startsWith('eyJ') || normalized.split('.').length === 3) {
      return 'Use a secret key sb_secret..., não a JWT legada service_role.';
    }
    if (!normalized.startsWith('sb_secret')) {
      return 'A chave Supabase do pipeline deve começar com sb_secret.';
    }
  }

  if (keyName === 'GROQ_API_KEY' && !normalized.startsWith('gsk_')) {
    return 'GROQ_API_KEY deve começar com gsk_.';
  }

  if (keyName === 'HF_API_TOKEN' && !normalized.startsWith('hf_')) {
    return 'HF_API_TOKEN deve começar com hf_.';
  }

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

  /* ── Credentials state ── */
  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  /* ── New key form ── */
  const [newKeyName, setNewKeyName] = useState<'GROQ_API_KEY' | 'HF_API_TOKEN' | 'SUPABASE_SERVICE_ROLE_KEY'>('GROQ_API_KEY');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  /* ── Cleanup state ── */
  const [cleanupHours, setCleanupHours] = useState(72);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const executionSummaries = useMemo(() => {
    const contentAutomationIds = new Set(contentAutomations.map((automation) => automation.id));
    const successfulExecutions = recentExecutions.filter((execution) => (
      contentAutomationIds.has(execution.automationId)
      && execution.status === 'success'
      && typeof execution.durationMs === 'number'
      && execution.durationMs > 0
    ));

    return contentAutomations
      .map((automation) => {
        const samples = successfulExecutions.filter((execution) => execution.automationId === automation.id).slice(0, 20);
        if (samples.length === 0) return null;

        const avgDurationMs = Math.round(samples.reduce((sum, execution) => sum + (execution.durationMs ?? 0), 0) / samples.length);
        const avgItemsProcessed = samples.reduce((sum, execution) => sum + execution.itemsProcessed, 0) / samples.length;
        const avgItemsCreated = samples.reduce((sum, execution) => sum + execution.itemsCreated, 0) / samples.length;

        return {
          id: automation.id,
          name: automation.name,
          avgDurationMs,
          avgItemsProcessed,
          avgItemsCreated,
          sampleCount: samples.length,
        };
      })
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  }, [contentAutomations, recentExecutions]);

  const avgCronWaitMinutes = (WF01_INTERVAL_MINUTES / 2) + (WF02_INTERVAL_MINUTES / 2) + (WF03_INTERVAL_MINUTES / 2);
  const worstCaseCronWaitMinutes = WF01_INTERVAL_MINUTES + WF02_INTERVAL_MINUTES + WF03_INTERVAL_MINUTES;
  const cadencePerCuratedMinutes = Math.round(WF03_INTERVAL_MINUTES / WF03_BATCH_SIZE);
  const backlogDrainHours = diagnostics ? diagnostics.clusters.highConfidence / WF03_CAPACITY_PER_HOUR : null;
  const estimatedNewReadyHours = backlogDrainHours === null ? null : backlogDrainHours + (avgCronWaitMinutes / 60);
  const estimatedBacklogAverageWaitHours = backlogDrainHours === null ? null : backlogDrainHours / 2;

  /* ── Load credentials ── */
  const loadCredentials = useCallback(async () => {
    setLoadingCreds(true);
    setCredentialsError(null);
    try {
      const list = await listN8nCredentials();
      setCredentials(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar chaves';
      setCredentialsError(message);
      console.warn('[Settings] Failed to load credentials:', message);
      toast({
        title: 'Falha ao carregar chaves',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoadingCreds(false);
    }
  }, [toast]);

  useEffect(() => { void loadCredentials(); }, [loadCredentials]);

  /* ── Save new API key ── */
  const handleSaveKey = async () => {
    if (credentialDraftError) {
      toast({ title: 'Chave inválida', description: credentialDraftError, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Expiry: 1 year from now
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const cred = await createN8nCredential({
        keyName: newKeyName,
        value: newKeyValue.trim(),
        expiresAt,
        notes: `Adicionada via dashboard em ${new Date().toLocaleDateString('pt-BR')}`,
        remindDaysBefore: 30,
      });

      // Auto-activate with force (skip n8n API test for non-n8n keys)
      await activateN8nCredential(cred.id, true);

      toast({ title: `${newKeyName} salva e ativada`, description: 'A chave está disponível para os workflows.' });
      setNewKeyValue('');
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro ao salvar chave', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete credential ── */
  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta chave permanentemente?')) return;
    try {
      await deleteN8nCredential(id);
      toast({ title: 'Chave removida' });
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    }
  };

  /* ── Cleanup old pipeline data ── */
  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    const cutoff = new Date(Date.now() - cleanupHours * 60 * 60 * 1000).toISOString();
    let stagingDeleted = 0;
    let clustersDeleted = 0;
    let curatedCleaned = 0;

    try {
      const { data: stg, error: stgError } = await supabase
        .from('news_staging')
        .delete()
        .eq('processed', true)
        .lt('collected_at', cutoff)
        .select('id');
      if (stgError) throw new Error(stgError.message);
      stagingDeleted = stg?.length ?? 0;

      const { data: staleCuratedRows, error: staleCuratedError } = await supabase
        .from('curated_posts')
        .select('id, cluster_id')
        .in('status', ['published', 'rejected'])
        .lt('created_at', cutoff);
      if (staleCuratedError) throw new Error(staleCuratedError.message);

      const curatedIds = staleCuratedRows?.map((row) => row.id) ?? [];
      const candidateClusterIds = uniqueIds(staleCuratedRows?.map((row) => row.cluster_id) ?? []);

      if (curatedIds.length > 0) {
        const { data: cur, error: curError } = await supabase
          .from('curated_posts')
          .delete()
          .in('id', curatedIds)
          .select('id');
        if (curError) throw new Error(curError.message);
        curatedCleaned = cur?.length ?? 0;
      }

      if (candidateClusterIds.length > 0) {
        const { data: protectedRefs, error: protectedRefsError } = await supabase
          .from('curated_posts')
          .select('cluster_id')
          .in('cluster_id', candidateClusterIds)
          .in('status', ['draft', 'ready']);
        if (protectedRefsError) throw new Error(protectedRefsError.message);

        const protectedClusterIds = new Set(uniqueIds(protectedRefs?.map((row) => row.cluster_id) ?? []));
        const clusterIdsToDelete = candidateClusterIds.filter((clusterId) => !protectedClusterIds.has(clusterId));

        if (clusterIdsToDelete.length > 0) {
          const { data: cls, error: clsError } = await supabase
            .from('news_clusters')
            .delete()
            .in('id', clusterIdsToDelete)
            .lt('created_at', cutoff)
            .select('id');
          if (clsError) throw new Error(clsError.message);
          clustersDeleted = cls?.length ?? 0;
        }
      }

      const total = stagingDeleted + clustersDeleted + curatedCleaned;
      setCleanupResult(
        total > 0
          ? `Limpeza segura: ${stagingDeleted} staging processado, ${clustersDeleted} clusters publicados, ${curatedCleaned} curados encerrados`
          : 'Nenhum dado seguro para limpar foi encontrado neste corte'
      );
      toast({
        title: total > 0 ? `${total} registos removidos` : 'Nada para limpar',
        description: `Limpeza segura · Staging: ${stagingDeleted}, Clusters: ${clustersDeleted}, Curados: ${curatedCleaned}`,
      });
    } catch (err) {
      toast({ title: 'Erro na limpeza', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  const handleBacklogPurge = async () => {
    if (!confirm('Isto remove backlog bruto antigo: staging não processado e clusters órfãos mais antigos que o corte. Não afeta curados em draft/ready. Continuar?')) return;

    setCleaning(true);
    setCleanupResult(null);
    const cutoff = new Date(Date.now() - cleanupHours * 60 * 60 * 1000).toISOString();
    let staleUnprocessedDeleted = 0;
    let orphanClustersDeleted = 0;

    try {
      const { data: staleUnprocessed, error: staleUnprocessedError } = await supabase
        .from('news_staging')
        .delete()
        .eq('processed', false)
        .lt('collected_at', cutoff)
        .select('id');
      if (staleUnprocessedError) throw new Error(staleUnprocessedError.message);
      staleUnprocessedDeleted = staleUnprocessed?.length ?? 0;

      const { data: oldClusters, error: oldClustersError } = await supabase
        .from('news_clusters')
        .select('id')
        .lt('created_at', cutoff);
      if (oldClustersError) throw new Error(oldClustersError.message);

      const candidateClusterIds = oldClusters?.map((cluster) => cluster.id) ?? [];
      if (candidateClusterIds.length > 0) {
        const { data: clusterRefs, error: clusterRefsError } = await supabase
          .from('curated_posts')
          .select('cluster_id')
          .in('cluster_id', candidateClusterIds);
        if (clusterRefsError) throw new Error(clusterRefsError.message);

        const referencedClusterIds = new Set(uniqueIds(clusterRefs?.map((row) => row.cluster_id) ?? []));
        const orphanIds = candidateClusterIds.filter((clusterId) => !referencedClusterIds.has(clusterId));

        if (orphanIds.length > 0) {
          const { data: deletedOrphans, error: deletedOrphansError } = await supabase
            .from('news_clusters')
            .delete()
            .in('id', orphanIds)
            .select('id');
          if (deletedOrphansError) throw new Error(deletedOrphansError.message);
          orphanClustersDeleted = deletedOrphans?.length ?? 0;
        }
      }

      const total = staleUnprocessedDeleted + orphanClustersDeleted;
      setCleanupResult(
        total > 0
          ? `Purge de backlog: ${staleUnprocessedDeleted} staging bruto, ${orphanClustersDeleted} clusters órfãos`
          : 'Nenhum backlog bruto antigo foi encontrado neste corte'
      );
      toast({
        title: total > 0 ? `${total} registos removidos` : 'Nada para limpar',
        description: `Backlog bruto · Staging não processado: ${staleUnprocessedDeleted}, Clusters órfãos: ${orphanClustersDeleted}`,
      });
    } catch (err) {
      toast({ title: 'Erro no purge de backlog', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  /* ── Full reset — delete ALL pipeline data ── */
  const handleFullReset = async () => {
    if (!confirm('ATENÇÃO: Isto apaga TODOS os dados do pipeline (staging, clusters, curados não publicados). Continuar?')) return;
    setCleaning(true);
    try {
      await supabase.from('news_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('news_clusters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('curated_posts').delete().in('status', ['draft', 'ready', 'rejected']);

      toast({ title: 'Pipeline limpo', description: 'Todos os dados intermediários foram removidos. O pipeline pode recomeçar limpo.' });
      setCleanupResult('Reset completo — pipeline limpo para recomeçar');
    } catch (err) {
      toast({ title: 'Erro no reset', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  const groqKey = credentials.find((c) => c.key_name === 'GROQ_API_KEY' && c.status === 'active');
  const n8nKey = credentials.find((c) => c.key_name === 'N8N_API_KEY' && c.status === 'active');
  const supabaseServiceKey = credentials.find((c) => c.key_name === 'SUPABASE_SERVICE_ROLE_KEY' && c.status === 'active');
  const credentialDraftError = validateCredentialDraft(newKeyName, newKeyValue);

  return (
    <Card className="border-border/60 bg-card/90 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-base text-foreground">Configurações do Pipeline</CardTitle>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── API Keys Section ── */}
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Key className="w-3 h-3 text-amber-400" />
            Chaves API (encriptadas)
          </h4>
          <p className="text-xs text-muted-foreground">
            As chaves são armazenadas com encriptação AES-GCM. Os workflows leem do Supabase em runtime.
          </p>

          {loadingCreds && (
            <div className="flex items-center gap-2 rounded border border-border/40 bg-muted/20 px-2.5 py-2 text-[11px] text-foreground/80">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span>A carregar chaves do pipeline...</span>
            </div>
          )}

          {!loadingCreds && credentialsError && (
            <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-200">
              <p>Falha ao carregar credenciais: {credentialsError}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-6 px-2 text-[10px] text-red-200 hover:bg-red-500/10 hover:text-foreground"
                onClick={() => void loadCredentials()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Current keys status */}
          {!loadingCreds && !credentialsError && (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/70 p-2 text-xs">
                  {groqKey ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <span className="text-primary">GROQ_API_KEY</span>
                      <span className="text-muted-foreground">ativa · {new Date(groqKey.activated_at ?? groqKey.created_at).toLocaleDateString('pt-BR')}</span>
                      <Button size="sm" variant="ghost" className="h-5 ml-auto px-1 text-red-400 hover:text-red-300" onClick={() => void handleDelete(groqKey.id)}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">GROQ_API_KEY — NÃO CONFIGURADA</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/70 p-2 text-xs">
                  {supabaseServiceKey ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <span className="text-primary">SUPABASE_SERVICE_ROLE_KEY</span>
                      <span className="text-muted-foreground">ativa</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">SUPABASE_SERVICE_ROLE_KEY — NÃO CONFIGURADA</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/70 p-2 text-xs">
                  {n8nKey ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <span className="text-primary">N8N_API_KEY</span>
                      <span className="text-muted-foreground">ativa</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">N8N_API_KEY — usando env var (fallback)</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200">
                Guardar SUPABASE_SERVICE_ROLE_KEY aqui ativa o vault do portal, mas não altera automaticamente a variável de ambiente do serviço n8n. WF-01 e WF-02 usam $env.SUPABASE_SERVICE_ROLE_KEY no runtime do n8n; se o Render continuar com valor antigo ou vazio, os workflows seguem a falhar.
              </div>
            </div>
          )}

          {/* Add new key form */}
          <div className="space-y-2 rounded-lg border border-border bg-background/70 p-3">
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded border border-border bg-muted px-2 text-xs text-foreground"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value as 'GROQ_API_KEY' | 'HF_API_TOKEN' | 'SUPABASE_SERVICE_ROLE_KEY')}
              >
                <option value="GROQ_API_KEY">GROQ_API_KEY (IA Groq)</option>
                <option value="HF_API_TOKEN">HF_API_TOKEN (Hugging Face)</option>
                <option value="SUPABASE_SERVICE_ROLE_KEY">SUPABASE_SERVICE_ROLE_KEY</option>
              </select>
            </div>
            <div className="flex gap-1.5">
              <Input
                type="password"
                placeholder={newKeyName === 'GROQ_API_KEY' ? 'gsk_...' : newKeyName === 'HF_API_TOKEN' ? 'hf_...' : 'sb_secret_...'}
                className="h-8 border-border bg-muted font-mono text-xs"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveKey(); }}
              />
              <Button
                size="sm"
                className="h-8 shrink-0 bg-cyan-600 text-xs hover:bg-cyan-700"
                disabled={saving || Boolean(credentialDraftError)}
                onClick={() => void handleSaveKey()}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
            {credentialDraftError && (
              <p className="text-[11px] text-red-300">{credentialDraftError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {newKeyName === 'GROQ_API_KEY'
                ? 'Obtenha em console.groq.com → API Keys. O WF-03 lê esta chave para gerar artigos com IA.'
                : newKeyName === 'HF_API_TOKEN'
                  ? 'Obtenha em huggingface.co/settings/tokens. Token Read gratuito para Inference API.'
                  : 'Supabase → Settings → API → Secret keys. Use a chave sb_secret... do projeto. Não use a JWT service_role legada iniciada em eyJ...'}
            </p>
          </div>
        </div>

        {/* ── Timing Explanation ── */}
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="w-3 h-3 text-blue-500" />
            Temporização dos Workflows (cron)
          </h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border/40 bg-background/70 p-3">
              <Badge variant="outline" className="border-cyan-500/30 text-[10px] text-blue-500">WF-01</Badge>
              <p className="mt-2 text-xs text-foreground">Coleta RSS</p>
              <p className="text-xs text-muted-foreground">A cada 30 min</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/70 p-3">
              <Badge variant="outline" className="border-cyan-500/30 text-[10px] text-blue-500">WF-02</Badge>
              <p className="mt-2 text-xs text-foreground">Cluster & Dedup</p>
              <p className="text-xs text-muted-foreground">A cada 20 min</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/70 p-3">
              <Badge variant="outline" className="border-cyan-500/30 text-[10px] text-blue-500">WF-03</Badge>
              <p className="mt-2 text-xs text-foreground">IA Reescrita</p>
              <p className="text-xs text-muted-foreground">A cada 60 min · até 10 artigos/ciclo</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/70 p-3 text-xs text-muted-foreground">
              <p>Cadência teórica do WF-03: ~1 artigo curado a cada {cadencePerCuratedMinutes} min.</p>
              <p>Lead time médio estimado: ~{Math.round(avgCronWaitMinutes)} min · pior caso: ~{Math.round(worstCaseCronWaitMinutes)} min.</p>
              <p>Capacidade máxima atual: {WF03_CAPACITY_PER_HOUR.toFixed(0)} curados/hora (~{Math.round(WF03_CAPACITY_PER_HOUR * 24)} por dia).</p>
              {backlogDrainHours !== null && (
                <>
                  <p>Backlog atual: {diagnostics?.clusters.highConfidence ?? 0} clusters elegíveis ⇒ ~{formatHours(backlogDrainHours)} para drenar tudo na capacidade atual.</p>
                  <p>Novo artigo elegível agora: tende a ficar pronto em ~{formatHours(estimatedNewReadyHours ?? 0)} se a fila atual se mantiver.</p>
                  <p>Cluster já dentro do backlog atual: espera média aproximada ~{formatHours(estimatedBacklogAverageWaitHours ?? 0)}.</p>
                </>
              )}
            </div>

          <div className="space-y-1 rounded-lg border border-border/40 bg-background/70 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground/90">Execução média real recente</p>
            {executionSummaries.length > 0 ? executionSummaries.map((summary) => (
              <div key={summary.id} className="flex items-center gap-2">
                <span className="truncate text-foreground">{summary.name}</span>
                <span className="ml-auto">{formatDurationMs(summary.avgDurationMs)}</span>
                <span className="text-muted-foreground/60">{summary.sampleCount} exec.</span>
                {(summary.avgItemsProcessed > 0 || summary.avgItemsCreated > 0) && (
                  <span className="text-muted-foreground/60">
                    proc. {summary.avgItemsProcessed.toFixed(1)} · criados {summary.avgItemsCreated.toFixed(1)}
                  </span>
                )}
              </div>
            )) : (
              <p>Sem histórico suficiente em automation_executions; a estimativa acima usa cron e capacidade do pipeline.</p>
            )}
          </div>
        </div>

        {/* ── Data Cleanup ── */}
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Trash2 className="w-3 h-3 text-amber-400" />
            Limpeza de Dados
          </h4>
          <p className="text-xs text-muted-foreground">
            O fluxo atual só limpa staging/clusters automaticamente na promoção final para published/duplicate. Não limpa quando o artigo entra em curated_posts.
          </p>
          {diagnostics && (
            <div className="space-y-1 rounded-lg border border-border/40 bg-background/70 p-3 text-xs text-muted-foreground">
              <p>Backlog observado agora: {diagnostics.staging.unprocessed} staging não processados · {diagnostics.clusters.highConfidence} clusters ≥60% · {diagnostics.curated.ready} curados prontos.</p>
              <p>Limpeza segura: remove apenas processados/publicados/rejeitados antigos.</p>
              <p>Purge de backlog: remove staging bruto antigo e clusters órfãos antigos, sem tocar em curados draft/ready.</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mais antigos que:</span>
            <select
              className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground"
              value={cleanupHours}
              onChange={(e) => setCleanupHours(Number(e.target.value))}
            >
              {CLEANUP_OPTIONS.map((opt) => (
                <option key={opt.hours} value={opt.hours}>{opt.label}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-amber-600/50 text-xs text-amber-400 hover:bg-amber-600/10"
              disabled={cleaning}
              onClick={() => void handleCleanup()}
            >
              {cleaning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Limpeza segura
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-600/40 text-xs text-red-400 hover:bg-red-600/10"
              disabled={cleaning}
              onClick={() => void handleBacklogPurge()}
            >
              {cleaning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Purgar backlog
            </Button>
          </div>
          {cleanupResult && (
            <p className="text-xs text-primary">{cleanupResult}</p>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
            disabled={cleaning}
            onClick={() => void handleFullReset()}
          >
            <Trash2 className="w-2.5 h-2.5 mr-1" />
            Reset completo do pipeline (recomeçar limpo)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
