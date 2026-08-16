-- Root-causes a recurring n8n WF-02 (Deduplicacao Cluster Curadoria) failure:
-- every run of the "Fetch Unprocessed Staging" node was failing with
-- "canceling statement due to statement timeout". Its query is
--   SELECT ... FROM news_staging WHERE processed = false
--   ORDER BY trend_score DESC NULLS LAST, collected_at DESC LIMIT 200
-- None of the 4 existing indexes match this exact filter + sort, so Postgres
-- fell back to a full Seq Scan + sort of every unprocessed row (measured:
-- ~5s at only 10,544 unprocessed rows via EXPLAIN ANALYZE).
--
-- This was a self-reinforcing loop: the slow query times out -> nothing
-- gets marked processed -> the unprocessed backlog keeps growing every
-- collection cycle -> the next run is even slower. It is the actual reason
-- news_staging.processed was stuck at ~0% regardless of any one-off cleanup.
--
-- Fix: a partial index scoped to processed = false (the only value this
-- query ever filters on) with the sort columns in the exact order/null
-- ordering the query needs, so Postgres can satisfy filter + ORDER BY +
-- LIMIT with a plain index scan instead of scanning and sorting the whole
-- backlog.
--
-- CONCURRENTLY: avoids locking news_staging against the n8n pipeline's own
-- inserts while the index builds. Cannot run inside a transaction block.
--
-- Rollback: DROP INDEX CONCURRENTLY idx_news_staging_unprocessed_priority;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_staging_unprocessed_priority
  ON public.news_staging (trend_score DESC NULLS LAST, collected_at DESC)
  WHERE processed = false;
