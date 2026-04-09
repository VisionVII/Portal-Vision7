-- Extend pipeline_search_config with editorial theme rules and final post tags.
-- This keeps backward compatibility with the existing flat `tags` array used by WF-01,
-- while enabling the dashboard and post promotion flow to resolve topics and final tags.

ALTER TABLE public.pipeline_search_config
  ADD COLUMN IF NOT EXISTS theme_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_post_tags text[] NOT NULL DEFAULT ARRAY['vision7', 'tecnologia'];

UPDATE public.pipeline_search_config
SET theme_rules = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', regexp_replace(lower(tag), '[^a-z0-9]+', '_', 'g'),
        'slug', regexp_replace(lower(tag), '[^a-z0-9]+', '_', 'g'),
        'label', initcap(tag),
        'searchTerms', to_jsonb(ARRAY[tag]::text[]),
        'postTags', to_jsonb(ARRAY[tag]::text[])
      )
    )
    FROM unnest(tags) AS tag
  ),
  '[]'::jsonb
)
WHERE COALESCE(jsonb_array_length(theme_rules), 0) = 0;

UPDATE public.pipeline_search_config
SET default_post_tags = ARRAY['vision7', 'tecnologia']
WHERE default_post_tags IS NULL OR array_length(default_post_tags, 1) IS NULL;