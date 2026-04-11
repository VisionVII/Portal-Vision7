import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PIPELINE_POST_TAGS, normalizeThemeRules } from '@/lib/pipelineThemes';

type PipelineConfigSchemaMode = 'extended' | 'legacy';

export interface PipelineDiagnostics {
  staging: { total: number; unprocessed: number; processed: number };
  clusters: { total: number; highConfidence: number; lowConfidence: number };
  curated: { total: number; ready: number; draft: number; published: number };
  configTags: string[];
  configLabel: string | null;
  configLanguage: string | null;
  configRegion: string | null;
  defaultPostTags: string[];
  themeRuleCount: number;
  configSchemaMode: PipelineConfigSchemaMode;
  lastStagingAt: string | null;
  lastClusterAt: string | null;
  lastCuratedAt: string | null;
}

function isMissingEditorialColumnsError(message: string): boolean {
  return /(default_post_tags|theme_rules)/i.test(message)
    && /(does not exist|schema cache|Could not find)/i.test(message);
}

async function loadActivePipelineConfig() {
  const extended = await supabase
    .from('pipeline_search_config')
    .select('label, tags, is_active, language, region, default_post_tags, theme_rules')
    .eq('is_active', true)
    .limit(1);

  if (!extended.error) {
    return {
      rows: extended.data ?? [],
      schemaMode: 'extended' as const,
    };
  }

  if (!isMissingEditorialColumnsError(extended.error.message)) {
    throw new Error(extended.error.message);
  }

  const legacy = await supabase
    .from('pipeline_search_config')
    .select('label, tags, is_active, language, region')
    .eq('is_active', true)
    .limit(1);

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return {
    rows: legacy.data ?? [],
    schemaMode: 'legacy' as const,
  };
}

/**
 * Queries the actual pipeline tables (news_staging, news_clusters,
 * curated_posts, pipeline_search_config) to give a real-time diagnostic
 * of what data exists in the database pipeline.
 */
export function usePipelineDiagnostics() {
  return useQuery({
    queryKey: ['pipeline_diagnostics'],
    queryFn: async (): Promise<PipelineDiagnostics> => {
      const [
        stagingTotalRes,
        stagingUnprocessedRes,
        stagingProcessedRes,
        lastStagingRes,
        clustersTotalRes,
        clustersHighConfidenceRes,
        clustersLowConfidenceRes,
        lastClusterRes,
        curatedTotalRes,
        curatedReadyRes,
        curatedDraftRes,
        curatedPublishedRes,
        lastCuratedRes,
      ] = await Promise.all([
        supabase
          .from('news_staging')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('news_staging')
          .select('id', { count: 'exact', head: true })
          .eq('processed', false),
        supabase
          .from('news_staging')
          .select('id', { count: 'exact', head: true })
          .eq('processed', true),
        supabase
          .from('news_staging')
          .select('collected_at')
          .order('collected_at', { ascending: false })
          .limit(1),
        supabase
          .from('news_clusters')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('news_clusters')
          .select('id', { count: 'exact', head: true })
          .gte('confidence_score', 60),
        supabase
          .from('news_clusters')
          .select('id', { count: 'exact', head: true })
          .lt('confidence_score', 60),
        supabase
          .from('news_clusters')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('curated_posts')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('curated_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ready'),
        supabase
          .from('curated_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('curated_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase
          .from('curated_posts')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const configResult = await loadActivePipelineConfig();

      const failures = [
        ['news_staging total', stagingTotalRes.error],
        ['news_staging unprocessed', stagingUnprocessedRes.error],
        ['news_staging processed', stagingProcessedRes.error],
        ['news_staging last collected', lastStagingRes.error],
        ['news_clusters total', clustersTotalRes.error],
        ['news_clusters high confidence', clustersHighConfidenceRes.error],
        ['news_clusters low confidence', clustersLowConfidenceRes.error],
        ['news_clusters last created', lastClusterRes.error],
        ['curated_posts total', curatedTotalRes.error],
        ['curated_posts ready', curatedReadyRes.error],
        ['curated_posts draft', curatedDraftRes.error],
        ['curated_posts published', curatedPublishedRes.error],
        ['curated_posts last created', lastCuratedRes.error],
      ].filter((entry): entry is [string, { message: string }] => Boolean(entry[1]));

      if (failures.length > 0) {
        throw new Error(
          failures.map(([label, error]) => `${label}: ${error.message}`).join(' | ')
        );
      }

      const configRows = configResult.rows;

      const activeConfig = configRows[0] as {
        label: string;
        tags: string[];
        is_active: boolean;
        language?: string | null;
        region?: string | null;
        default_post_tags?: string[] | null;
        theme_rules?: unknown[] | null;
      } | undefined;
      const normalizedThemeRules = activeConfig
        ? normalizeThemeRules(activeConfig.theme_rules, activeConfig.tags ?? [])
        : [];

      return {
        staging: {
          total: stagingTotalRes.count ?? 0,
          unprocessed: stagingUnprocessedRes.count ?? 0,
          processed: stagingProcessedRes.count ?? 0,
        },
        clusters: {
          total: clustersTotalRes.count ?? 0,
          highConfidence: clustersHighConfidenceRes.count ?? 0,
          lowConfidence: clustersLowConfidenceRes.count ?? 0,
        },
        curated: {
          total: curatedTotalRes.count ?? 0,
          ready: curatedReadyRes.count ?? 0,
          draft: curatedDraftRes.count ?? 0,
          published: curatedPublishedRes.count ?? 0,
        },
        configTags: activeConfig?.tags ?? [],
        configLabel: activeConfig?.label ?? null,
        configLanguage: activeConfig?.language ?? null,
        configRegion: activeConfig?.region ?? null,
        defaultPostTags: activeConfig
          ? activeConfig.default_post_tags ?? DEFAULT_PIPELINE_POST_TAGS
          : [],
        themeRuleCount: normalizedThemeRules.length,
        configSchemaMode: configResult.schemaMode,
        lastStagingAt: (lastStagingRes.data?.[0] as { collected_at?: string } | undefined)?.collected_at ?? null,
        lastClusterAt: (lastClusterRes.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null,
        lastCuratedAt: (lastCuratedRes.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null,
      };
    },
    staleTime: 120_000,
    refetchInterval: 300_000,
  });
}
