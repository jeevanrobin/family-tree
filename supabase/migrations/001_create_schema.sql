-- ============================================================
-- Medida's Family — Database Schema (M3A)
-- Normalized PostgreSQL schema for multi-family support.
-- Run via Supabase SQL Editor or supabase CLI.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Families ─────────────────────────────────────────────────

CREATE TABLE families (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Family Members ───────────────────────────────────────────

CREATE TABLE family_members (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id          TEXT,
  first_name        TEXT NOT NULL DEFAULT '',
  middle_name       TEXT DEFAULT '',
  last_name         TEXT DEFAULT '',
  display_name      TEXT NOT NULL DEFAULT 'Unnamed',
  gender            TEXT NOT NULL DEFAULT 'unspecified'
                      CHECK (gender IN ('male', 'female', 'other', 'unspecified', 'unknown')),
  living_status     TEXT NOT NULL DEFAULT 'alive'
                      CHECK (living_status IN ('alive', 'deceased', 'unknown')),
  date_of_birth     DATE,
  date_of_death     DATE,
  place_of_birth    TEXT DEFAULT '',
  hometown          TEXT DEFAULT '',
  current_location  TEXT DEFAULT '',
  occupation        TEXT DEFAULT '',
  photo_url         TEXT DEFAULT '',
  biography         TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  privacy           TEXT NOT NULL DEFAULT 'family'
                      CHECK (privacy IN ('public', 'family', 'private')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_birth_before_death
    CHECK (date_of_birth IS NULL OR date_of_death IS NULL OR date_of_birth <= date_of_death)
);

CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_local_id ON family_members(family_id, local_id);
CREATE INDEX idx_family_members_name ON family_members(family_id, last_name, first_name);

-- ── Relationships ────────────────────────────────────────────

CREATE TABLE relationships (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id      TEXT,
  type          TEXT NOT NULL CHECK (type IN ('parent-child', 'spouse')),
  person_id_1   UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  person_id_2   UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  start_date    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_no_self_relationship
    CHECK (person_id_1 <> person_id_2),

  CONSTRAINT uq_relationship_pair
    UNIQUE (family_id, type, person_id_1, person_id_2)
);

CREATE INDEX idx_relationships_family_id ON relationships(family_id);
CREATE INDEX idx_relationships_person_1 ON relationships(person_id_1);
CREATE INDEX idx_relationships_person_2 ON relationships(person_id_2);
CREATE INDEX idx_relationships_type ON relationships(family_id, type);

-- ── Stories ──────────────────────────────────────────────────

CREATE TABLE stories (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id      TEXT,
  person_id     UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Untitled Memory',
  content       TEXT DEFAULT '',
  date          TEXT,
  location      TEXT DEFAULT '',
  narrator      TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stories_family_id ON stories(family_id);
CREATE INDEX idx_stories_person_id ON stories(person_id);

-- ── Story ↔ Person junction ─────────────────────────────────

CREATE TABLE story_persons (
  story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, person_id)
);

CREATE INDEX idx_story_persons_person ON story_persons(person_id);

-- ── Life Events ──────────────────────────────────────────────

CREATE TABLE life_events (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id      TEXT,
  person_id     UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'Other',
  title         TEXT NOT NULL DEFAULT 'Life Event',
  date          TEXT,
  location      TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_events_family_id ON life_events(family_id);
CREATE INDEX idx_life_events_person_id ON life_events(person_id);

-- ── Life Event ↔ Person junction ─────────────────────────────

CREATE TABLE life_event_persons (
  life_event_id   UUID NOT NULL REFERENCES life_events(id) ON DELETE CASCADE,
  person_id       UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  PRIMARY KEY (life_event_id, person_id)
);

CREATE INDEX idx_life_event_persons_person ON life_event_persons(person_id);

-- ── Media (Photos) ───────────────────────────────────────────

CREATE TABLE media (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id      TEXT,
  person_id     UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  src           TEXT DEFAULT '',
  storage_path  TEXT DEFAULT '',
  title         TEXT DEFAULT 'Family Photograph',
  caption       TEXT DEFAULT '',
  date          TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_family_id ON media(family_id);
CREATE INDEX idx_media_person_id ON media(person_id);
CREATE INDEX idx_media_primary ON media(person_id, is_primary) WHERE is_primary = true;

-- ── Media ↔ Person junction ──────────────────────────────────

CREATE TABLE media_persons (
  media_id    UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, person_id)
);

CREATE INDEX idx_media_persons_person ON media_persons(person_id);

-- ── Documents ────────────────────────────────────────────────

CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  local_id          TEXT,
  person_id         UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Archival Document',
  type              TEXT DEFAULT 'Official Record',
  doc_type          TEXT DEFAULT 'Document',
  src               TEXT DEFAULT '',
  storage_path      TEXT DEFAULT '',
  reference_number  TEXT DEFAULT '',
  issuing_authority TEXT DEFAULT '',
  date              TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_family_id ON documents(family_id);
CREATE INDEX idx_documents_person_id ON documents(person_id);

-- ── Auto-update timestamps ───────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON life_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Row-Level Security (prepared, permissive for M3A) ────────

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_event_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Permissive policies — replaced with auth-based policies in M3B+
CREATE POLICY "m3a_allow_all" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON relationships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON story_persons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON life_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON life_event_persons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON media_persons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "m3a_allow_all" ON documents FOR ALL USING (true) WITH CHECK (true);
