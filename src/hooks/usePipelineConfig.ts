import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildThemeRulesFromTags,
  DEFAULT_PIPELINE_POST_TAGS,
  flattenThemeSearchTerms,
  normalizeThemeRules,
  sanitizeStringList,
  type PipelineThemeRule,
} from '@/lib/pipelineThemes';

export interface PipelineSearchConfig {
  id: string;
  label: string;
  tags: string[];
  language: string;
  region: string;
  defaultPostTags: string[];
  themeRules: PipelineThemeRule[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PipelineConfigSchemaMode = 'extended' | 'legacy';

interface PipelineSearchConfigRow {
  id: string;
  label: string;
  tags: string[] | null;
  language: string | null;
  region: string | null;
  default_post_tags?: string[] | null;
  theme_rules?: Json | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type SavePipelineConfigInput = {
  id?: string;
  label: string;
  language?: string;
  region?: string;
  tags?: string[];
  defaultPostTags?: string[];
  themeRules?: PipelineThemeRule[];
};

function rowToPipelineConfig(row: PipelineSearchConfigRow): PipelineSearchConfig {
  const themeRules = normalizeThemeRules(row.theme_rules, row.tags ?? []);
  return {
    id: row.id,
    label: row.label,
    tags: flattenThemeSearchTerms(themeRules),
    language: row.language ?? 'pt-PT',
    region: row.region ?? 'PT',
    defaultPostTags: sanitizeStringList(row.default_post_tags, DEFAULT_PIPELINE_POST_TAGS),
    themeRules,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingEditorialColumnsError(message: string): boolean {
  return /(default_post_tags|theme_rules)/i.test(message)
    && /(does not exist|schema cache|Could not find)/i.test(message);
}

function inferSchemaMode(rows: PipelineSearchConfigRow[]): PipelineConfigSchemaMode {
  if (rows.length === 0) return 'extended';

  return rows.some((row) => (
    Object.prototype.hasOwnProperty.call(row, 'default_post_tags')
    || Object.prototype.hasOwnProperty.call(row, 'theme_rules')
  ))
    ? 'extended'
    : 'legacy';
}

function buildExtendedPayload(input: SavePipelineConfigInput) {
  const normalizedThemeRules = normalizeThemeRules(
    input.themeRules,
    Array.isArray(input.tags) && input.tags.length > 0 ? input.tags : undefined,
  );
  const normalizedTags = sanitizeStringList(input.tags, flattenThemeSearchTerms(normalizedThemeRules));

  return {
    label: input.label.trim() || 'Padrão',
    language: (input.language || 'pt-PT').trim() || 'pt-PT',
    region: (input.region || 'PT').trim() || 'PT',
    tags: normalizedTags,
    theme_rules: normalizedThemeRules as unknown as Json,
    default_post_tags: sanitizeStringList(input.defaultPostTags, DEFAULT_PIPELINE_POST_TAGS),
    updated_at: new Date().toISOString(),
  };
}

function buildLegacyPayload(input: SavePipelineConfigInput) {
  const normalizedThemeRules = normalizeThemeRules(
    input.themeRules,
    Array.isArray(input.tags) && input.tags.length > 0 ? input.tags : undefined,
  );

  return {
    label: input.label.trim() || 'Padrão',
    language: (input.language || 'pt-PT').trim() || 'pt-PT',
    region: (input.region || 'PT').trim() || 'PT',
    tags: sanitizeStringList(input.tags, flattenThemeSearchTerms(normalizedThemeRules)),
    updated_at: new Date().toISOString(),
  };
}

async function persistConfigWithSchemaFallback(input: SavePipelineConfigInput): Promise<PipelineConfigSchemaMode> {
  const extendedPayload = buildExtendedPayload(input);

  const extendedOperation = input.id
    ? supabase.from('pipeline_search_config').update(extendedPayload).eq('id', input.id)
    : supabase.from('pipeline_search_config').insert({
      ...extendedPayload,
      is_active: true,
    });

  const { error: extendedError } = await extendedOperation;
  if (!extendedError) return 'extended';

  if (!isMissingEditorialColumnsError(extendedError.message)) {
    throw new Error(extendedError.message);
  }

  const legacyPayload = buildLegacyPayload(input);
  const legacyOperation = input.id
    ? supabase.from('pipeline_search_config').update(legacyPayload).eq('id', input.id)
    : supabase.from('pipeline_search_config').insert({
      ...legacyPayload,
      is_active: true,
    });

  const { error: legacyError } = await legacyOperation;
  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return 'legacy';
}

const QUERY_KEY = ['pipeline_search_config'] as const;

export function usePipelineConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_search_config')
        .select('id, label, tags, language, region, default_post_tags, theme_rules, is_active, created_by, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (/does not exist|PGRST/i.test(error.message)) {
          return {
            configs: [],
            schemaMode: 'legacy' as const,
          };
        }
        throw new Error(error.message);
      }

      const rows = (data ?? []) as PipelineSearchConfigRow[];
      return {
        configs: rows.map(rowToPipelineConfig),
        schemaMode: inferSchemaMode(rows),
      };
    },
    staleTime: 30_000,
  });

  const activeConfig = query.data?.configs.find((c) => c.is_active) ?? null;
  const schemaMode = query.data?.schemaMode ?? 'extended';

  const saveConfigMutation = useMutation({
    mutationFn: persistConfigWithSchemaFallback,
    onSuccess: (mode) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (mode === 'legacy') {
        toast({
          title: 'Configuração guardada em modo compatibilidade',
          description: 'O banco live ainda não tem theme_rules/default_post_tags. Só tags e locale foram persistidos.',
        });
        return;
      }

      toast({ title: 'Configuração editorial guardada', description: 'Temas, tags finais e idioma foram atualizados.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const updateTags = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const currentConfig = query.data?.configs.find((config) => config.id === id);
      return persistConfigWithSchemaFallback({
        id,
        label: currentConfig?.label ?? 'Padrão',
        language: currentConfig?.language ?? 'pt-PT',
        region: currentConfig?.region ?? 'PT',
        tags,
        themeRules: buildThemeRulesFromTags(tags),
        defaultPostTags: currentConfig?.defaultPostTags ?? DEFAULT_PIPELINE_POST_TAGS,
      });
    },
    onSuccess: (mode) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: mode === 'legacy' ? 'Tags atualizadas em modo compatibilidade' : 'Tags atualizadas',
        description: mode === 'legacy'
          ? 'O schema live ainda não suporta temas completos; apenas tags de pesquisa foram guardadas.'
          : 'As preferências de pesquisa foram guardadas.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const createConfig = useMutation({
    mutationFn: async ({ label, tags }: { label: string; tags: string[] }) => {
      return persistConfigWithSchemaFallback({
        label,
        tags,
        themeRules: buildThemeRulesFromTags(tags),
        defaultPostTags: DEFAULT_PIPELINE_POST_TAGS,
      });
    },
    onSuccess: (mode) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: mode === 'legacy' ? 'Configuração criada em modo compatibilidade' : 'Configuração criada',
        description: mode === 'legacy'
          ? 'O banco live ainda não suporta temas completos; a configuração foi reduzida para tags.'
          : undefined,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('pipeline_search_config')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return {
    configs: query.data?.configs ?? [],
    activeConfig,
    schemaMode,
    isLoading: query.isLoading,
    saveConfig: saveConfigMutation.mutateAsync,
    updateTags: updateTags.mutateAsync,
    createConfig: createConfig.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    isSaving: saveConfigMutation.isPending || updateTags.isPending || createConfig.isPending,
  };
}
