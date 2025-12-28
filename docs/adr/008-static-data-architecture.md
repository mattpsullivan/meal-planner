# ADR-008: Static Data Architecture

**Status:** Accepted
**Date:** 2025-12-30
**Supersedes:** [ADR-001](./001-sqlite-for-client-database.md)

## Context

The original architecture (ADR-001) used wa-sqlite with OPFS for client-side data storage. While this provided powerful SQL queries and relational integrity, it created deployment challenges:

1. **GitHub Pages compatibility**: OPFS requires specific headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`) that GitHub Pages doesn't support
2. **Bundle size**: wa-sqlite added ~400-800KB to the initial bundle
3. **Complexity**: Required async database initialization, migrations, and seeding
4. **Read-only content**: The meal plan data is static content that doesn't need client-side writes

## Decision

Replace the SQLite database with **static JSON data** generated at build time from Cooklang recipes, combined with **Zustand** for client-side user state.

### Architecture

```
Build Time:
  Cooklang (.cook) + Mealplan (.mealplan)
       ↓
  generate-seed-from-cooklang.ts
       ↓
  src/data/seed.json (static, read-only)

Runtime:
  seed.json → src/data/index.ts (accessor functions)
       ↓
  TanStack Query (caching layer)
       ↓
  React hooks (useRecipes, useWeeks, etc.)

  Zustand store → localStorage
       ↓
  User state (checked items, preferences, etc.)
```

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Keep wa-sqlite** | Powerful queries, familiar SQL | No GitHub Pages, large bundle |
| **Static JSON + Zustand** | Simple, deployable anywhere, fast | No complex queries |
| **IndexedDB (Dexie)** | Native, zero bundle | Still needs OPFS for persistence |
| **Backend API** | Full flexibility | Requires server, not static hosting |

## Consequences

### Positive
- **GitHub Pages compatible**: Deploys to any static hosting without special headers
- **Smaller bundle**: No WASM runtime (~400-800KB saved)
- **Simpler architecture**: No migrations, no async DB init
- **Faster startup**: JSON import is synchronous
- **HashRouter**: Works without server-side routing config

### Negative
- **No complex queries**: Filtering/aggregation done in JavaScript
- **Memory usage**: All data loaded upfront (acceptable for ~100 recipes)
- **No offline-first**: User state in localStorage, not IndexedDB

### Neutral
- User preferences persist via Zustand + localStorage
- TanStack Query still provides caching and async patterns
- Same React hooks API for components

## Implementation

1. **Data layer** (`src/data/`):
   - `seed.json`: Static recipe and meal plan data
   - `index.ts`: Accessor functions (`getRecipes()`, `getWeeks()`, etc.)

2. **State management** (`src/store/`):
   - Zustand store with localStorage persistence
   - Tracks: checked items, current week, serving multipliers, theme

3. **Routing** (`src/router.tsx`):
   - HashRouter for GitHub Pages compatibility
   - No server configuration needed

4. **Deployment** (`.github/workflows/deploy.yml`):
   - GitHub Actions builds and deploys to Pages
   - Configurable base path via `VITE_BASE_PATH`

## References

- [Zustand](https://github.com/pmndrs/zustand)
- [GitHub Pages](https://pages.github.com/)
- [ADR-001](./001-sqlite-for-client-database.md) (superseded)
