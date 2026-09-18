# Family Tree Application

A React-based family tree application with Supabase backend, collaborative features, and offline-first architecture.

[![CI](https://github.com/jeevanrobin/family-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/jeevanrobin/family-tree/actions/workflows/ci.yml)

## Features

- Multi-generational family tree visualization
- Real-time collaboration with role-based access control
- Cloud-authoritative sibling ordering
- Offline-first with automatic sync
- Media and document archival
- Timeline and memories
- Search and insights

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm ci

# Run development server
npm run dev
```

### Testing

```bash
# Vitest tests
npm run test:vitest

# Legacy tests
npm test

# Coverage
npm run test:vitest -- --coverage

# All tests
npm run test:all
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run SQL migrations in order from `supabase/migrations/`
3. Configure environment variables in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing Documentation

See [TESTING.md](TESTING.md) for comprehensive test architecture documentation.

## License

Private project.
