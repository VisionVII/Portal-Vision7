import { supabase } from '@/integrations/supabase/client';

export interface CleanupResult {
  stagingDeleted: number;
  clustersDeleted: number;
  curatedCleaned: number;
  total: number;
  summary: string;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function cutoffDate(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/** Remove staging processado + curados publicados/rejeitados + clusters órfãos antigos. */
export async function cleanupProcessedData(cleanupHours: number): Promise<CleanupResult> {
  const cutoff = cutoffDate(cleanupHours);

  const { data: stg, error: stgErr } = await supabase
    .from('news_staging')
    .delete()
    .eq('processed', true)
    .lt('collected_at', cutoff)
    .select('id');
  if (stgErr) throw new Error(stgErr.message);
  const stagingDeleted = stg?.length ?? 0;

  const { data: staleCurated, error: scErr } = await supabase
    .from('curated_posts')
    .select('id, cluster_id')
    .in('status', ['published', 'rejected'])
    .lt('created_at', cutoff);
  if (scErr) throw new Error(scErr.message);

  let curatedCleaned = 0;
  const curIds = staleCurated?.map((r) => r.id) ?? [];
  const clsCandidates = uniqueIds(staleCurated?.map((r) => r.cluster_id) ?? []);

  if (curIds.length > 0) {
    const { data: c, error: cErr } = await supabase
      .from('curated_posts')
      .delete()
      .in('id', curIds)
      .select('id');
    if (cErr) throw new Error(cErr.message);
    curatedCleaned = c?.length ?? 0;
  }

  let clustersDeleted = 0;
  if (clsCandidates.length > 0) {
    const { data: prot } = await supabase
      .from('curated_posts')
      .select('cluster_id')
      .in('cluster_id', clsCandidates)
      .in('status', ['draft', 'ready']);
    const protIds = new Set(uniqueIds(prot?.map((r) => r.cluster_id) ?? []));
    const toDelete = clsCandidates.filter((id) => !protIds.has(id));
    if (toDelete.length > 0) {
      const { data: cls, error: clsErr } = await supabase
        .from('news_clusters')
        .delete()
        .in('id', toDelete)
        .lt('created_at', cutoff)
        .select('id');
      if (clsErr) throw new Error(clsErr.message);
      clustersDeleted = cls?.length ?? 0;
    }
  }

  const total = stagingDeleted + clustersDeleted + curatedCleaned;
  return {
    stagingDeleted,
    clustersDeleted,
    curatedCleaned,
    total,
    summary: total > 0
      ? `${stagingDeleted} staging · ${clustersDeleted} clusters · ${curatedCleaned} curados`
      : 'Nada para limpar neste corte',
  };
}

/** Remove staging não processado + clusters órfãos sem referências a curados. */
export async function purgeBacklog(cleanupHours: number): Promise<CleanupResult> {
  const cutoff = cutoffDate(cleanupHours);

  const { data: su, error: suErr } = await supabase
    .from('news_staging')
    .delete()
    .eq('processed', false)
    .lt('collected_at', cutoff)
    .select('id');
  if (suErr) throw new Error(suErr.message);
  const staleUnprocessed = su?.length ?? 0;

  const { data: old, error: oldErr } = await supabase
    .from('news_clusters')
    .select('id')
    .lt('created_at', cutoff);
  if (oldErr) throw new Error(oldErr.message);

  let orphanClusters = 0;
  const candidates = old?.map((r) => r.id) ?? [];
  if (candidates.length > 0) {
    const { data: refs } = await supabase
      .from('curated_posts')
      .select('cluster_id')
      .in('cluster_id', candidates);
    const referenced = new Set(uniqueIds(refs?.map((r) => r.cluster_id) ?? []));
    const orphans = candidates.filter((id) => !referenced.has(id));
    if (orphans.length > 0) {
      const { data: del, error: delErr } = await supabase
        .from('news_clusters')
        .delete()
        .in('id', orphans)
        .select('id');
      if (delErr) throw new Error(delErr.message);
      orphanClusters = del?.length ?? 0;
    }
  }

  const total = staleUnprocessed + orphanClusters;
  return {
    stagingDeleted: staleUnprocessed,
    clustersDeleted: orphanClusters,
    curatedCleaned: 0,
    total,
    summary: total > 0
      ? `${staleUnprocessed} staging bruto · ${orphanClusters} clusters órfãos`
      : 'Nenhum backlog bruto encontrado',
  };
}

/** Apaga TODOS os dados do pipeline (staging, clusters, curados não publicados). */
export async function fullPipelineReset(): Promise<CleanupResult> {
  const SENTINEL = '00000000-0000-0000-0000-000000000000';

  const { data: stg, error: s1 } = await supabase
    .from('news_staging')
    .delete()
    .neq('id', SENTINEL)
    .select('id');
  if (s1) throw new Error('Staging: ' + s1.message);

  const { data: cls, error: s2 } = await supabase
    .from('news_clusters')
    .delete()
    .neq('id', SENTINEL)
    .select('id');
  if (s2) throw new Error('Clusters: ' + s2.message);

  const { data: cur, error: s3 } = await supabase
    .from('curated_posts')
    .delete()
    .in('status', ['draft', 'ready', 'auto-draft', 'pending-review', 'rejected'])
    .select('id');
  if (s3) throw new Error('Curados: ' + s3.message);

  const stagingDeleted = stg?.length ?? 0;
  const clustersDeleted = cls?.length ?? 0;
  const curatedCleaned = cur?.length ?? 0;
  const total = stagingDeleted + clustersDeleted + curatedCleaned;
  return {
    stagingDeleted,
    clustersDeleted,
    curatedCleaned,
    total,
    summary: total > 0
      ? `Reset: ${stagingDeleted} staging · ${clustersDeleted} clusters · ${curatedCleaned} curados`
      : 'Nenhum registo encontrado',
  };
}
