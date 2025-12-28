# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant technical decisions made during development.

## What is an ADR?

An ADR captures the context, decision, and consequences of an architecturally significant choice.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-sqlite-for-client-database.md) | SQLite for Client-Side Database | Superseded by 008 |
| [002](./002-testing-framework.md) | Testing Framework | Accepted |
| [003](./003-tanstack-query-adoption.md) | TanStack Query Adoption | Accepted |
| [004](./004-logging-and-error-handling.md) | Logging and Error Handling | Accepted |
| [005](./005-meal-vs-component-architecture.md) | Meal vs Component Architecture | Accepted |
| [006](./006-recipe-serialization-format.md) | Recipe Serialization Format (Cooklang) | Accepted |
| [007](./007-mealplan-import-export.md) | Meal Plan Import/Export System | Accepted |
| [008](./008-static-data-architecture.md) | Static Data Architecture | Accepted |

## Creating a New ADR

1. Copy `000-template.md` to `NNN-short-title.md` (next sequential number)
2. Fill in all sections
3. Add entry to index above

## ADR Statuses

- **Proposed** - Under discussion, not yet decided
- **Accepted** - Decision made and implemented
- **Deprecated** - No longer valid, superseded by another ADR
- **Superseded** - Replaced by a newer ADR (link to replacement)
