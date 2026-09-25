-- ============================================================
-- 009: One cloud row per client entity (idempotent sync creates)
--
-- The offline sync queue retries a create when it does not get a
-- response, e.g. after a timeout. If the first insert had actually
-- succeeded, the retry inserted a second copy of the same person,
-- story, etc. The client now reuses an existing row with the same
-- local_id; these indexes make the database enforce it too.
--
-- If a table already contains duplicates, its index is skipped with a
-- NOTICE listing how many local_ids are affected. Clean those rows up
-- (keep one per local_id), then re-run this migration.
-- ============================================================

DO $$
DECLARE
  t TEXT;
  dup_count INTEGER;
BEGIN
  FOREACH t IN ARRAY ARRAY['family_members', 'relationships', 'stories', 'life_events', 'media', 'documents']
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM (
         SELECT 1 FROM public.%I
         WHERE local_id IS NOT NULL
         GROUP BY family_id, local_id
         HAVING count(*) > 1
       ) d',
      t
    ) INTO dup_count;

    IF dup_count > 0 THEN
      RAISE NOTICE 'Skipping unique local_id index on %: % duplicated local_id value(s) found.', t, dup_count;
    ELSE
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (family_id, local_id) WHERE local_id IS NOT NULL',
        'uq_' || t || '_family_local_id',
        t
      );
    END IF;
  END LOOP;
END $$;
