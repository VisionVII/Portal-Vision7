-- Pivota o idioma/região por omissão do pipeline de PT-PT/Portugal para
-- PT-BR/Brasil. A região passa a ser configurável por tema editorial
-- (theme_rules[].region, jsonb) — isto só corrige o valor por omissão da
-- config global; nunca influenciou o comportamento real até agora (WF-01 e
-- WF-03 tinham a região/idioma hardcoded e nem sequer liam estas colunas).
alter table public.pipeline_search_config alter column language set default 'pt-BR';
alter table public.pipeline_search_config alter column region set default 'BR';

update public.pipeline_search_config
  set language = 'pt-BR', region = 'BR'
  where is_active = true and (language = 'pt-PT' or region = 'PT');
