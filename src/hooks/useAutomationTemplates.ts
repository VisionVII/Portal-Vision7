import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationTemplate, AutomationCategory } from '@/types/automation';

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  config_preset: Record<string, unknown>;
  workflow_json: Record<string, unknown> | null;
  is_system: boolean;
  popularity: number;
  created_at: string;
}

function rowToTemplate(r: TemplateRow): AutomationTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    category: r.category as AutomationCategory,
    icon: r.icon,
    configPreset: r.config_preset ?? {},
    workflowJson: r.workflow_json,
    isSystem: r.is_system,
    popularity: r.popularity ?? 0,
    createdAt: r.created_at,
  };
}

export function useAutomationTemplates(category?: AutomationCategory) {
  const queryKey = ['automation_templates', category ?? 'all'];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<AutomationTemplate[]> => {
      let query = supabase
        .from('automation_templates')
        .select('id, name, description, category, icon, config_preset, workflow_json, is_system, popularity, created_at')
        .order('popularity', { ascending: false })
        .limit(100);

      if (category) query = query.eq('category', category);

      const { data: rows, error: err } = await query;
      if (err) {
        if (/does not exist|PGRST/i.test(err.message)) return [];
        throw new Error(err.message);
      }
      return (rows as unknown as TemplateRow[]).map(rowToTemplate);
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h — templates change rarely
    retry: 1,
  });

  return {
    templates: data ?? [],
    isLoading,
    error,
  };
}
