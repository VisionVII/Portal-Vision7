-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Reset news_staging para reiniciar o pipeline de coleta
-- - Apaga todos os 7201 itens de staging (clusters e curated_posts mantidos)
-- - news_clusters.primary_staging_id vai a NULL via ON DELETE SET NULL
-- - WF-01 re-coleta RSS → WF-02 re-clusteriza → WF-03 gera artigos novos
-- ════════════════════════════════════════════════════════════════════════════

DELETE FROM public.news_staging;
