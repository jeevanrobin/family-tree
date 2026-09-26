-- ============================================================
-- 010: Voice stories
--
-- A story can carry a voice recording (an elder telling it). The audio file
-- lives in the private family-documents bucket under
-- family/{family_id}/audio/..., covered by the existing storage policies.
-- ============================================================

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audio_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_sec INTEGER CHECK (audio_duration_sec IS NULL OR audio_duration_sec >= 0),
  ADD COLUMN IF NOT EXISTS transcript_language TEXT;

-- Recordings must live inside the story's own family folder.
ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS chk_story_audio_path_family;
ALTER TABLE public.stories
  ADD CONSTRAINT chk_story_audio_path_family
  CHECK (audio_path IS NULL OR audio_path LIKE 'family/' || family_id::text || '/audio/%');
