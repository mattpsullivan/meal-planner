# ADR-001: SQLite for Client-Side Database

**Status:** Superseded by [ADR-008](./008-static-data-architecture.md)
**Date:** 2025-12-28
**Superseded:** 2025-12-30

> **Note:** This decision was superseded when we moved to static data generation for GitHub Pages deployment. See ADR-008 for the current architecture.

## Context

The Vegan Meal Prep app needs a client-side database to store recipes, meal plans, grocery lists, and user preferences. The data model is inherently relational:
- Recipes have many ingredients and instructions
- Weeks have many days, days have many meals
- Meals reference recipes
- Grocery lists aggregate ingredients across recipes

We need to choose between IndexedDB (the native browser database) and SQLite (via WebAssembly).

## Decision

Use **SQLite via wa-sqlite** with Origin Private File System (OPFS) for persistent storage.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **IndexedDB (Dexie.js)** | Native, zero bundle size, simple key-value | No JOINs, limited queries, custom API |
| **SQLite (wa-sqlite)** | Full SQL, relational, portable exports | ~400-800KB WASM bundle |
| **SQLite (sql.js)** | Mature, widely used | In-memory by default, manual persistence |
| **SQLite (official WASM)** | From SQLite team | Newer, less ecosystem support |

## Consequences

### Positive
- **Powerful queries**: JOINs, GROUP BY, aggregations work naturally for grocery list generation
- **Familiar SQL**: Easy to debug, AI can write queries directly
- **Portable exports**: Users can export raw `.sqlite` files, open in any SQLite tool
- **Relational integrity**: Foreign keys, constraints enforce data consistency
- **Future-proof**: Easy migration path to server-side SQLite or Postgres

### Negative
- **Bundle size**: Adds ~400-800KB to initial load (WASM module)
- **Complexity**: More setup than simple key-value storage
- **Browser support**: OPFS requires modern browsers (Chrome 102+, Firefox 111+, Safari 15.2+)

### Neutral
- Need to handle async initialization before app renders
- Schema migrations required for updates (standard practice)

## References

- [wa-sqlite GitHub](https://github.com/nicktaylor-uk/wa-sqlite)
- [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [DATA-ARCHITECTURE.md](../DATA-ARCHITECTURE.md)
