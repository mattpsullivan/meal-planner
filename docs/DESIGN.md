# Vegan Meal Prep App - Design Overview

A high-level architecture overview of the Vegan Meal Prep application.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components       │  Hooks                    │
│  - Home         │  - Layout         │  - useRecipes             │
│  - Week         │  - Recipe         │  - useWeeks               │
│  - Day          │  - Shopping       │  - useGroceryList         │
│  - Shop         │  - Prep           │  - useDatabase            │
│  - Prep         │  - Common         │                           │
│  - Recipe       │                   │                           │
├─────────────────────────────────────────────────────────────────┤
│                      TanStack Query                              │
│              (Caching, Deduplication, Mutations)                │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                                │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  SQLite (OPFS)  │    │  Cooklang       │                     │
│  │  wa-sqlite      │    │  Parser         │                     │
│  └─────────────────┘    └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Build Time**: Cooklang recipes (.cook) and mealplans (.mealplan) are parsed into seed data
2. **Runtime**: Seed data is loaded into client-side SQLite database
3. **UI**: React components fetch data via TanStack Query hooks
4. **Persistence**: User state (grocery checkoffs, preferences) stored in SQLite/OPFS

## Key Components

### Recipe System
- **Cooklang Parser**: Extracts ingredients, instructions, and metadata from .cook files
- **Component vs Meal**: Recipes are either batch-prep components or assembly meals
- **Cross-References**: Meals reference components via relative paths

### Meal Planning
- **Weekly Plans**: .mealplan YAML files define 7-day schedules
- **Prep Timeline**: Timed batch cooking sessions with coordinated tasks
- **Grocery Lists**: Auto-generated from recipe ingredients with aggregation

### Client Database
- **wa-sqlite**: WebAssembly SQLite with OPFS storage
- **Offline-First**: Full functionality without network
- **Portable Export**: Database can be exported as .sqlite file

## Detailed Documentation

| Document | Description |
|----------|-------------|
| [DATA-ARCHITECTURE.md](./DATA-ARCHITECTURE.md) | Data layer and API design |
| [MEALPLAN-SPEC.md](./MEALPLAN-SPEC.md) | .mealplan file format specification |
| [COOKLANG-GUIDE.md](./COOKLANG-GUIDE.md) | Recipe authoring with Cooklang |

## Architecture Decision Records

Key decisions documented in `docs/adr/`:

| ADR | Decision |
|-----|----------|
| [ADR-001](./adr/001-sqlite-for-client-database.md) | SQLite for client-side database |
| [ADR-002](./adr/002-testing-framework.md) | Vitest + RTL + Playwright for testing |
| [ADR-003](./adr/003-tanstack-query-adoption.md) | TanStack Query for data fetching |
| [ADR-005](./adr/005-meal-vs-component-architecture.md) | Meal vs Component recipe architecture |
| [ADR-006](./adr/006-recipe-serialization-format.md) | Cooklang + .mealplan for recipes |

## Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 19 | Component-based, wide ecosystem |
| Build | Vite 7 | Fast dev server, modern defaults |
| Language | TypeScript (strict) | Type safety, better DX |
| Styling | Tailwind CSS | Utility-first, rapid development |
| Data | Static JSON + Zustand | Simple, fast, GitHub Pages compatible |
| Data Fetching | TanStack Query | Caching, deduplication, mutations |
| Testing | Vitest + Playwright | Fast unit tests, reliable E2E |

## Future Considerations

Planned features:
- PWA support for offline access
- Recipe customization and notes
- Shopping list export integrations
