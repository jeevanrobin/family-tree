# Supabase Setup — Medida's Family

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Note your project URL and anon key from Settings > API

## Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Database Migration

Run the SQL migrations in order via the Supabase SQL Editor:

1. `supabase/migrations/001_create_schema.sql` — tables, indexes, constraints, RLS
2. `supabase/migrations/002_create_storage_buckets.sql` — storage buckets and policies

## Tables Created

| Table | Purpose |
|-------|---------|
| `families` | Multi-family support |
| `family_members` | Person records |
| `relationships` | Parent-child and spouse links |
| `stories` | Oral histories and memories |
| `story_persons` | Story ↔ person junction |
| `life_events` | Chronological milestones |
| `life_event_persons` | Event ↔ person junction |
| `media` | Photo metadata |
| `media_persons` | Media ↔ person junction |
| `documents` | Archival document metadata |

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `family-photos` | Photo file storage |
| `family-documents` | Document file storage |

## Local Development

Without `.env.local`, the app runs in local-only mode using localStorage.
No Supabase connection is required for local development.
