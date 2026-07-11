# Data Architecture Design

This document describes the data architecture for the Meal Planner application, including the database schema, import/export mechanisms, and future extensibility.

---

## Overview

The application uses a client-side SQLite database to store recipes, meal plans, grocery lists, and user state. Data flows through the system as follows:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Content Files  │────▶│   Import API    │────▶│    Database     │
│  (Markdown/JSON)│     │                 │     │    (SQLite)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Export Files   │◀────│   Export API    │◀─────────────┤
│ (JSON/MD/SQLite)│     │                 │              │
└─────────────────┘     └─────────────────┘              │
                                                         │
                        ┌─────────────────┐              │
                        │    App State    │◀─────────────┤
                        │  (React Context)│              │
                        └────────┬────────┘              │
                                 │                       │
                        ┌────────▼────────┐              │
                        │   UI Components │◀─────────────┘
                        │                 │
                        └─────────────────┘
```

---

## Core Principles

1. **Database-first**: All app data lives in the client-side database, not in static imports
2. **Portable**: Full import/export capability including raw `.sqlite` files - user owns their data
3. **Configurable**: User preferences stored in app state, not hardcoded
4. **Extensible**: Schema designed for future features (AI, multi-user, cloud sync)
5. **Standard SQL**: Use familiar, powerful SQL for queries - easy to debug and extend

---

## Database Technology

### SQLite via wa-sqlite

We use [wa-sqlite](https://github.com/nicktaylor-uk/wa-sqlite) to run SQLite in the browser via WebAssembly:

- **Why SQLite**: Full SQL support, relational model, powerful queries (JOINs, aggregations), universal format
- **Why wa-sqlite**: Active development, good performance, supports OPFS for persistence
- **Storage**: Origin Private File System (OPFS) for persistent storage across sessions

**Alternatives considered:**
- [sql.js](https://sql.js.org/) - Mature but uses in-memory by default, manual save/load
- [Official SQLite WASM](https://sqlite.org/wasm) - Newer, from SQLite team, still maturing
- IndexedDB/Dexie - Limited query power, no JOINs, custom API

### wa-sqlite Concurrency Constraints

**Critical**: wa-sqlite is NOT thread-safe or reentrant. Concurrent operations corrupt internal state, causing "not a statement" errors. This is particularly problematic with:

1. **React StrictMode**: Double-invokes effects in development, causing concurrent init
2. **Parallel queries**: Multiple components fetching data simultaneously
3. **Mutations during queries**: Updating data while reads are in progress

**Solutions implemented:**

1. **Mutex serialization**: All database operations go through a mutex queue
2. **Module-level init promise**: Prevents double-initialization from StrictMode
3. **TanStack Query**: Request deduplication prevents duplicate queries

```typescript
// src/db/index.ts - Mutex pattern for wa-sqlite

let dbMutex: Promise<void> = Promise.resolve();

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = dbMutex.then(fn);
  dbMutex = result.then(() => {}, () => {}); // Chain for next operation
  return result;
}

// All exec() calls wrapped with mutex
async exec(sql: string, params?: SQLiteValue[]): Promise<Row[]> {
  return withMutex(async () => {
    // ... execute query
  });
}
```

```typescript
// src/hooks/useDatabase.tsx - Module-level promise prevents double-init

let fullInitPromise: Promise<Database> | null = null;

async function initializeFully(): Promise<Database> {
  const database = await initDatabase();
  await runMigrations(database);
  await seedDatabaseIfNeeded(database);
  return database;
}

// In DatabaseProvider:
if (!fullInitPromise) {
  fullInitPromise = initializeFully();
}
const database = await fullInitPromise;  // Both StrictMode mounts await same promise
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│     recipes      │       │      weeks       │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ slug (UNIQUE)    │       │ week_number      │
│ name             │       │ year             │
│ description      │       │ name             │
│ cuisine          │       │ theme            │
│ servings         │       │ prep_time_total  │
│ prep_time        │       │ created_at       │
│ cook_time        │       │ updated_at       │
│ source_type      │       └────────┬─────────┘
│ source_url       │                │
│ created_at       │                │ 1:N
│ updated_at       │                ▼
└────────┬─────────┘       ┌──────────────────┐
         │                 │       days       │
         │                 ├──────────────────┤
         │ 1:N             │ id (PK)          │
         ▼                 │ week_id (FK)     │
┌──────────────────┐       │ day_number       │
│   ingredients    │       │ date             │
├──────────────────┤       │ day_name         │
│ id (PK)          │       └────────┬─────────┘
│ recipe_id (FK)   │                │
│ name             │                │ 1:N
│ quantity         │                ▼
│ unit             │       ┌──────────────────┐
│ preparation      │       │    day_meals     │
│ category         │       ├──────────────────┤
│ optional         │       │ id (PK)          │
│ sort_order       │       │ day_id (FK)      │
└──────────────────┘       │ meal_type        │
         │                 │ recipe_id (FK)   │◀── nullable
         │                 │ description      │◀── for freeform
         │                 │ notes            │
         │                 └──────────────────┘
         │
         │ 1:N             ┌──────────────────┐
         ▼                 │   recipe_tags    │
┌──────────────────┐       ├──────────────────┤
│  instructions    │       │ recipe_id (FK)   │
├──────────────────┤       │ tag (indexed)    │
│ id (PK)          │       └──────────────────┘
│ recipe_id (FK)   │
│ step_number      │       ┌──────────────────┐
│ text             │       │  grocery_lists   │
│ duration         │       ├──────────────────┤
│ is_parallel      │       │ id (PK)          │
│ timer_label      │       │ week_id (FK)     │
└──────────────────┘       │ multiplier       │
                           │ created_at       │
┌──────────────────┐       └────────┬─────────┘
│    user_state    │                │
├──────────────────┤                │ 1:N
│ key (PK)         │                ▼
│ value (JSON)     │       ┌──────────────────┐
│ updated_at       │       │  grocery_items   │
└──────────────────┘       ├──────────────────┤
                           │ id (PK)          │
┌──────────────────┐       │ list_id (FK)     │
│   prep_steps     │       │ name             │
├──────────────────┤       │ quantity         │
│ id (PK)          │       │ unit             │
│ week_id (FK)     │       │ category         │
│ time_marker      │       │ checked          │
│ task             │       │ recipe_sources   │
│ duration         │       └──────────────────┘
│ recipe_id (FK)   │
│ sort_order       │
└──────────────────┘
```

### SQL Schema Definition

```sql
-- src/db/schema.sql

-- ============================================
-- RECIPES
-- ============================================

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  servings INTEGER NOT NULL DEFAULT 1,
  prep_time INTEGER,  -- minutes
  cook_time INTEGER,  -- minutes
  total_time INTEGER, -- minutes (can differ from prep + cook)
  notes TEXT,
  source_type TEXT CHECK(source_type IN ('manual', 'import', 'url', 'ai')) DEFAULT 'manual',
  source_url TEXT,
  source_imported_at TEXT,  -- ISO timestamp
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_slug ON recipes(slug);

-- Recipe ingredients (1:N)
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  preparation TEXT,  -- e.g., "diced", "drained and rinsed"
  category TEXT CHECK(category IN (
    'produce', 'pantry', 'refrigerated', 'frozen',
    'spices', 'oils-vinegars', 'nuts-seeds', 'grains', 'legumes', 'other'
  )) DEFAULT 'other',
  optional INTEGER DEFAULT 0,  -- boolean
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipe instructions (1:N)
CREATE TABLE IF NOT EXISTS instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  duration INTEGER,      -- minutes
  is_parallel INTEGER DEFAULT 0,  -- can run while doing other things
  timer_label TEXT       -- e.g., "Simmer lentils"
);

CREATE INDEX idx_instructions_recipe ON instructions(recipe_id);

-- Recipe tags (M:N via simple table)
CREATE TABLE IF NOT EXISTS recipe_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

CREATE INDEX idx_recipe_tags_recipe ON recipe_tags(recipe_id);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag);

-- Recipe meal types (what meals this recipe works for)
CREATE TABLE IF NOT EXISTS recipe_meal_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK(meal_type IN (
    'breakfast', 'lunch', 'dinner', 'snack', 'component', 'sauce', 'base'
  ))
);

CREATE INDEX idx_recipe_meal_types_recipe ON recipe_meal_types(recipe_id);
CREATE INDEX idx_recipe_meal_types_type ON recipe_meal_types(meal_type);

-- ============================================
-- MEAL PLANS
-- ============================================

CREATE TABLE IF NOT EXISTS weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_number INTEGER NOT NULL,  -- 1-52
  year INTEGER NOT NULL,
  name TEXT,           -- e.g., "Week 1: Mediterranean + Mexican"
  theme TEXT,          -- e.g., "Mediterranean + Mexican"
  prep_time_total INTEGER,  -- total prep time in minutes
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(week_number, year)
);

CREATE INDEX idx_weeks_year ON weeks(year);

-- Week components (what's being batch-prepped)
CREATE TABLE IF NOT EXISTS week_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  category TEXT NOT NULL,  -- e.g., "Proteins", "Sauces"
  item TEXT NOT NULL       -- e.g., "Spiced Chickpeas"
);

CREATE INDEX idx_week_components_week ON week_components(week_id);

-- Prep guide steps
CREATE TABLE IF NOT EXISTS prep_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  time_marker TEXT NOT NULL,  -- e.g., "0:00", "0:15"
  task TEXT NOT NULL,
  duration INTEGER,           -- minutes
  recipe_id INTEGER REFERENCES recipes(id),  -- optional link to recipe
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_prep_steps_week ON prep_steps(week_id);

-- Days within weeks
CREATE TABLE IF NOT EXISTS days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,  -- 1-7
  date TEXT,                    -- ISO date (e.g., "2026-01-01")
  day_name TEXT,                -- e.g., "Thursday"
  UNIQUE(week_id, day_number)
);

CREATE INDEX idx_days_week ON days(week_id);

-- Meals within days
CREATE TABLE IF NOT EXISTS day_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id INTEGER REFERENCES recipes(id),  -- nullable for freeform meals
  description TEXT,    -- freeform description if no recipe
  notes TEXT,          -- assembly notes, variations
  sort_order INTEGER DEFAULT 0  -- for multiple items in same meal type (snacks)
);

CREATE INDEX idx_day_meals_day ON day_meals(day_id);
CREATE INDEX idx_day_meals_recipe ON day_meals(recipe_id);

-- ============================================
-- GROCERY LISTS
-- ============================================

CREATE TABLE IF NOT EXISTS grocery_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id INTEGER REFERENCES weeks(id),  -- nullable for custom lists
  name TEXT,
  multiplier REAL DEFAULT 1.0,  -- serving scale factor
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_grocery_lists_week ON grocery_lists(week_id);

CREATE TABLE IF NOT EXISTS grocery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT,
  checked INTEGER DEFAULT 0,  -- boolean
  recipe_sources TEXT,        -- JSON array of recipe slugs
  user_quantity REAL,         -- user-adjusted quantity
  user_notes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_grocery_items_list ON grocery_items(list_id);
CREATE INDEX idx_grocery_items_category ON grocery_items(category);

-- ============================================
-- USER STATE
-- ============================================

CREATE TABLE IF NOT EXISTS user_state (
  key TEXT PRIMARY KEY,
  value TEXT,  -- JSON-encoded value
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- SCHEMA METADATA
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### TypeScript Type Definitions

```typescript
// src/types/database.ts

// ============================================
// RECIPES
// ============================================

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  description?: string;
  cuisine?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  notes?: string;
  sourceType: 'manual' | 'import' | 'url' | 'ai';
  sourceUrl?: string;
  sourceImportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  category: IngredientCategory;
  optional: boolean;
  sortOrder: number;
}

export type IngredientCategory =
  | 'produce'
  | 'pantry'
  | 'refrigerated'
  | 'frozen'
  | 'spices'
  | 'oils-vinegars'
  | 'nuts-seeds'
  | 'grains'
  | 'legumes'
  | 'other';

export interface Instruction {
  id: number;
  recipeId: number;
  stepNumber: number;
  text: string;
  duration?: number;
  isParallel: boolean;
  timerLabel?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'component' | 'sauce' | 'base';

// Full recipe with all relations
export interface RecipeWithDetails extends Recipe {
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  mealTypes: MealType[];
}

// ============================================
// MEAL PLANS
// ============================================

export interface Week {
  id: number;
  weekNumber: number;
  year: number;
  name?: string;
  theme?: string;
  prepTimeTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeekComponent {
  id: number;
  weekId: number;
  category: string;
  item: string;
}

export interface PrepStep {
  id: number;
  weekId: number;
  timeMarker: string;
  task: string;
  duration?: number;
  recipeId?: number;
  sortOrder: number;
}

export interface Day {
  id: number;
  weekId: number;
  dayNumber: number;
  date?: string;
  dayName?: string;
}

export interface DayMeal {
  id: number;
  dayId: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: number;
  description?: string;
  notes?: string;
  sortOrder: number;
}

// ============================================
// GROCERY
// ============================================

export interface GroceryList {
  id: number;
  weekId?: number;
  name?: string;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItem {
  id: number;
  listId: number;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  checked: boolean;
  recipeSources?: string[];  // parsed from JSON
  userQuantity?: number;
  userNotes?: string;
  sortOrder: number;
}

// ============================================
// USER STATE
// ============================================

export interface UserState {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface UserPreferences {
  servings: number;
  dietaryRestrictions: string[];
  theme: 'light' | 'dark' | 'system';
}
```

---

## Example Queries

SQLite's query power is a key advantage. Here are examples of queries that would be complex in IndexedDB:

### Grocery List Aggregation

Aggregate all ingredients across recipes for a week:

```sql
-- Get all ingredients for a week's meal plan, grouped by category
SELECT
  i.category,
  i.name,
  SUM(i.quantity * :multiplier) as total_quantity,
  i.unit,
  GROUP_CONCAT(DISTINCT r.slug) as recipe_sources
FROM days d
JOIN day_meals dm ON dm.day_id = d.id
JOIN recipes r ON r.id = dm.recipe_id
JOIN ingredients i ON i.recipe_id = r.id
WHERE d.week_id = :weekId
GROUP BY i.category, i.name, i.unit
ORDER BY
  CASE i.category
    WHEN 'produce' THEN 1
    WHEN 'refrigerated' THEN 2
    WHEN 'pantry' THEN 3
    WHEN 'frozen' THEN 4
    WHEN 'spices' THEN 5
    ELSE 6
  END,
  i.name;
```

### Recipe Search

Find recipes by multiple criteria:

```sql
-- Find Mediterranean recipes under 30 min that work for dinner
SELECT r.*
FROM recipes r
JOIN recipe_meal_types rmt ON rmt.recipe_id = r.id
WHERE r.cuisine = 'Mediterranean'
  AND (r.prep_time + COALESCE(r.cook_time, 0)) <= 30
  AND rmt.meal_type = 'dinner'
ORDER BY r.name;
```

### Week Overview with Meals

Get a full week's schedule with recipe names:

```sql
-- Get all days and meals for a week
SELECT
  d.day_number,
  d.day_name,
  d.date,
  dm.meal_type,
  r.name as recipe_name,
  r.slug as recipe_slug,
  dm.description,
  dm.notes
FROM days d
LEFT JOIN day_meals dm ON dm.day_id = d.id
LEFT JOIN recipes r ON r.id = dm.recipe_id
WHERE d.week_id = :weekId
ORDER BY d.day_number, dm.meal_type, dm.sort_order;
```

---

## Import/Export API

### Export Formats

#### SQLite File Export

The simplest and most portable export - just the raw database file:

```typescript
// src/api/data.ts

export async function exportDatabase(): Promise<Blob> {
  const db = getDb();
  const data = db.export();  // Returns Uint8Array
  return new Blob([data], { type: 'application/x-sqlite3' });
}

export async function importDatabase(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  // Replace current database with imported one
  await replaceDatabase(data);
}
```

#### JSON Export

Structured export for interoperability:

```typescript
export interface DatabaseExport {
  version: string;
  exportedAt: string;
  data: {
    recipes: RecipeWithDetails[];
    weeks: WeekWithDetails[];
    groceryLists: GroceryListWithItems[];
    userState: UserState[];
  };
}

export async function exportAsJson(): Promise<DatabaseExport> {
  const db = getDb();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      recipes: await getAllRecipesWithDetails(db),
      weeks: await getAllWeeksWithDetails(db),
      groceryLists: await getAllGroceryLists(db),
      userState: await getAllUserState(db),
    },
  };
}
```

#### Markdown Recipe Export

Human-readable format for sharing:

```typescript
export function recipeToMarkdown(recipe: RecipeWithDetails): string {
  const lines: string[] = [
    `# ${recipe.name}`,
    '',
  ];

  if (recipe.description) {
    lines.push(recipe.description, '');
  }

  // Metadata
  if (recipe.cuisine) lines.push(`**Cuisine:** ${recipe.cuisine}`);
  if (recipe.prepTime) lines.push(`**Prep Time:** ${recipe.prepTime} minutes`);
  if (recipe.cookTime) lines.push(`**Cook Time:** ${recipe.cookTime} minutes`);
  lines.push(`**Servings:** ${recipe.servings}`, '');

  // Ingredients
  lines.push('## Ingredients', '');
  for (const ing of recipe.ingredients) {
    const qty = ing.quantity ? `${ing.quantity} ` : '';
    const unit = ing.unit ? `${ing.unit} ` : '';
    const prep = ing.preparation ? ` (${ing.preparation})` : '';
    lines.push(`- ${qty}${unit}${ing.name}${prep}`);
  }
  lines.push('');

  // Instructions
  lines.push('## Instructions', '');
  for (const inst of recipe.instructions) {
    lines.push(`${inst.stepNumber}. ${inst.text}`);
  }
  lines.push('');

  // Notes
  if (recipe.notes) {
    lines.push('## Notes', '', recipe.notes, '');
  }

  // Metadata footer
  lines.push('---');
  lines.push(`*Source: ${recipe.sourceType}${recipe.sourceUrl ? ` - ${recipe.sourceUrl}` : ''}*`);
  if (recipe.tags.length > 0) {
    lines.push(`*Tags: ${recipe.tags.join(', ')}*`);
  }

  return lines.join('\n');
}
```

---

## App State Management

All user-configurable values are stored in the database:

```typescript
// src/hooks/useAppState.ts

import { useCallback, useSyncExternalStore } from 'react';
import { getDb } from '@/db';

export function useUserState<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const db = getDb();

  const subscribe = useCallback((callback: () => void) => {
    // Subscribe to database changes for this key
    // Implementation depends on chosen reactivity approach
    return () => {};
  }, [key]);

  const getSnapshot = useCallback(() => {
    const row = db.exec(`SELECT value FROM user_state WHERE key = ?`, [key])[0];
    if (!row) return defaultValue;
    return JSON.parse(row.values[0][0] as string) as T;
  }, [key, defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot);

  const setValue = useCallback(async (newValue: T) => {
    db.run(
      `INSERT OR REPLACE INTO user_state (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [key, JSON.stringify(newValue)]
    );
  }, [key]);

  return [value, setValue];
}

// Convenience hooks
export function useServings() {
  return useUserState('preferences.servings', 1);
}

export function useDietaryRestrictions() {
  return useUserState<string[]>('preferences.dietaryRestrictions', ['soy-free']);
}

export function useTheme() {
  return useUserState<'light' | 'dark' | 'system'>('preferences.theme', 'system');
}
```

---

## Initial Data Loading

On first launch, seed the database from bundled JSON:

```typescript
// src/db/seed.ts

export async function seedDatabaseIfNeeded(): Promise<void> {
  const db = getDb();

  // Check if already seeded
  const result = db.exec(`SELECT value FROM user_state WHERE key = 'db.seeded'`);
  if (result.length > 0 && JSON.parse(result[0].values[0][0] as string)) {
    return;
  }

  // Import bundled seed data
  const seedData = await import('@/data/seed.json');

  db.run('BEGIN TRANSACTION');
  try {
    // Insert recipes
    for (const recipe of seedData.recipes) {
      await insertRecipeWithDetails(db, recipe);
    }

    // Insert weeks
    for (const week of seedData.weeks) {
      await insertWeekWithDetails(db, week);
    }

    // Mark as seeded
    db.run(
      `INSERT INTO user_state (key, value) VALUES ('db.seeded', 'true')`
    );

    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
```

### Meal-to-Recipe Linking

Meals in the `day_meals` table can be linked to recipes via the `recipe_id` foreign key. The seed data (`src/data/seed.json`) uses recipe slugs to establish these links:

```json
// seed.json meal structure
{
  "meal_type": "breakfast",
  "recipe_id": "w1-smoothie-freezer-packs-makes-4",  // Recipe slug
  "recipe_name": "Smoothie",                          // Display name
  "display_order": 0
}
```

During seeding, the `recipe_id` slug is resolved to the actual database ID:

```typescript
// In seed.ts
const recipeIdMap = new Map<string, number>();  // slug -> database ID

// After inserting each recipe, map its slug to ID
recipeIdMap.set(recipe.id, insertedId);

// When inserting meals, resolve the slug to database ID
const recipeId = meal.recipe_id ? recipeIdMap.get(meal.recipe_id) : null;
```

**Key points:**
- 105 of 141 meals are linked to specific recipes
- 36 meals have `recipe_id: null` (leftovers, "clean-out" meals, celebrations)
- The `description` field provides a display name for all meals
- When `recipe_id` is set, clicking a meal navigates to the recipe detail page

---

## Content Parsing Pipeline

The original meal plan content lives in markdown files under `content/week-*/`. This section describes how we parse and transform that content into database records.

### Parsing Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Markdown File  │────▶│  Parse Section  │────▶│  Structured     │
│  (week-1.md)    │     │  (regex/AST)    │     │  Objects        │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │  Validate &     │◀─────────────┘
                        │  Normalize      │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐     ┌─────────────────┐
                        │  Seed JSON      │────▶│  Insert into    │
                        │  (recipes.json) │     │  SQLite         │
                        └─────────────────┘     └─────────────────┘
```

### Markdown Section Detection

Each weekly plan follows a consistent structure:

```typescript
// src/utils/markdown-parser.ts

interface MarkdownSection {
  heading: string;
  level: number;  // h1=1, h2=2, etc.
  content: string;
  subsections: MarkdownSection[];
}

const SECTION_PATTERNS = {
  weekOverview: /^#\s+Week\s+(\d+):/m,
  dailySchedule: /^#\s+Daily Meal Schedule/m,
  groceryList: /^#\s+Phase 1:\s+Grocery List/m,
  prepTimeline: /^##\s+Prep Timeline/m,
  recipes: /^###\s+(.+?)\n/gm,  // Component recipes section
  storageGuide: /^#\s+Phase 4:\s+Storage Guide/m,
};

export function parseWeeklyPlan(markdown: string): ParsedWeek {
  const sections = splitIntoSections(markdown);

  return {
    weekNumber: extractWeekNumber(sections.weekOverview),
    theme: extractTheme(sections.weekOverview),
    components: extractComponents(sections.weekOverview),
    dailySchedule: parseDailyScheduleTable(sections.dailySchedule),
    groceryList: parseGroceryList(sections.groceryList),
    prepTimeline: parsePrepTimeline(sections.prepTimeline),
    recipes: parseRecipes(sections.recipes),
    storageGuide: parseStorageTable(sections.storageGuide),
  };
}
```

### Ingredient Parsing

Ingredients in markdown follow common patterns:

```
- 2 cups long-grain white rice
- 1/2 cup fresh cilantro, finely chopped
- 1 can (15 oz each) chickpeas, drained and rinsed
- Salt and pepper to taste
- Fresh parsley for garnish
```

```typescript
// src/utils/ingredient-parser.ts

interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  optional: boolean;
  note: string | null;  // e.g., "(15 oz each)"
}

// Regex patterns for quantity parsing
const QUANTITY_PATTERNS = {
  whole: /^(\d+)/,                           // "2 cups"
  fraction: /^(\d+)\/(\d+)/,                 // "1/2 cup"
  mixed: /^(\d+)\s+(\d+)\/(\d+)/,           // "1 1/2 cups"
  range: /^(\d+)-(\d+)/,                     // "3-4 cloves"
  unicode: /^([½⅓⅔¼¾⅛⅜⅝⅞])/,               // "½ cup"
};

// Common unit abbreviations and variations
const UNIT_ALIASES: Record<string, string> = {
  'tbsp': 'tablespoon',
  'tbs': 'tablespoon',
  'tsp': 'teaspoon',
  'oz': 'ounce',
  'lb': 'pound',
  'lbs': 'pound',
  'c': 'cup',
  'pt': 'pint',
  'qt': 'quart',
  'gal': 'gallon',
  'ml': 'milliliter',
  'l': 'liter',
  'g': 'gram',
  'kg': 'kilogram',
};

// Units that are commonly plural in recipes
const UNITS = new Set([
  'cup', 'cups', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'ounce', 'ounces', 'pound', 'pounds', 'pint', 'pints',
  'clove', 'cloves', 'head', 'heads', 'bunch', 'bunches',
  'can', 'cans', 'jar', 'jars', 'bag', 'bags', 'container', 'containers',
  'medium', 'large', 'small',  // size modifiers used as units
]);

export function parseIngredient(line: string): ParsedIngredient {
  let remaining = line.trim();
  let quantity: number | null = null;
  let unit: string | null = null;
  let preparation: string | null = null;
  let optional = false;
  let note: string | null = null;

  // Check for optional marker
  if (/\(optional\)/i.test(remaining)) {
    optional = true;
    remaining = remaining.replace(/\(optional\)/i, '').trim();
  }

  // Extract parenthetical notes like "(15 oz each)"
  const noteMatch = remaining.match(/\(([^)]+)\)/);
  if (noteMatch && !noteMatch[1].toLowerCase().includes('optional')) {
    note = noteMatch[1];
    remaining = remaining.replace(noteMatch[0], '').trim();
  }

  // Parse quantity
  const qtyResult = parseQuantity(remaining);
  if (qtyResult) {
    quantity = qtyResult.value;
    remaining = remaining.slice(qtyResult.consumed).trim();
  }

  // Parse unit
  const words = remaining.split(/\s+/);
  const firstWord = words[0]?.toLowerCase();
  if (UNITS.has(firstWord) || UNIT_ALIASES[firstWord]) {
    unit = UNIT_ALIASES[firstWord] || normalizeUnit(firstWord);
    remaining = words.slice(1).join(' ');
  }

  // Check for preparation (after comma)
  const commaIndex = remaining.indexOf(',');
  if (commaIndex !== -1) {
    preparation = remaining.slice(commaIndex + 1).trim();
    remaining = remaining.slice(0, commaIndex).trim();
  }

  return {
    quantity,
    unit,
    name: remaining,
    preparation,
    optional,
    note,
  };
}

function parseQuantity(str: string): { value: number; consumed: number } | null {
  // Try mixed number first (1 1/2)
  const mixedMatch = str.match(QUANTITY_PATTERNS.mixed);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const denom = parseInt(mixedMatch[3]);
    return { value: whole + (num / denom), consumed: mixedMatch[0].length };
  }

  // Try fraction (1/2)
  const fractionMatch = str.match(QUANTITY_PATTERNS.fraction);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const denom = parseInt(fractionMatch[2]);
    return { value: num / denom, consumed: fractionMatch[0].length };
  }

  // Try unicode fraction (½)
  const unicodeMatch = str.match(QUANTITY_PATTERNS.unicode);
  if (unicodeMatch) {
    return { value: UNICODE_FRACTIONS[unicodeMatch[1]], consumed: 1 };
  }

  // Try whole number
  const wholeMatch = str.match(QUANTITY_PATTERNS.whole);
  if (wholeMatch) {
    return { value: parseInt(wholeMatch[1]), consumed: wholeMatch[0].length };
  }

  return null;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};
```

### Ingredient Categorization

Ingredients are auto-categorized based on keyword matching:

```typescript
const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  'produce': [
    'onion', 'garlic', 'pepper', 'tomato', 'cucumber', 'lettuce', 'spinach',
    'avocado', 'lime', 'lemon', 'cilantro', 'parsley', 'dill', 'basil',
    'zucchini', 'carrot', 'celery', 'banana', 'apple', 'berry', 'mango',
  ],
  'pantry': [
    'rice', 'quinoa', 'oat', 'flour', 'sugar', 'salt', 'pasta',
    'can', 'canned', 'dried', 'broth', 'stock', 'vinegar',
  ],
  'refrigerated': [
    'milk', 'yogurt', 'cream', 'tofu', 'tempeh', 'feta', 'cheese',
  ],
  'frozen': [
    'frozen',
  ],
  'spices': [
    'cumin', 'paprika', 'coriander', 'oregano', 'cinnamon', 'cayenne',
    'chili powder', 'turmeric', 'pepper', 'garlic powder', 'onion powder',
  ],
  'oils-vinegars': [
    'oil', 'olive', 'vegetable oil', 'coconut oil', 'vinegar',
  ],
  'nuts-seeds': [
    'cashew', 'walnut', 'almond', 'peanut', 'nut', 'seed', 'pepita',
    'tahini', 'chia', 'hemp',
  ],
  'grains': [
    'rice', 'quinoa', 'oat', 'barley', 'farro', 'bulgur',
  ],
  'legumes': [
    'bean', 'lentil', 'chickpea', 'pea',
  ],
};

export function categorizeIngredient(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category as IngredientCategory;
    }
  }
  return 'other';
}
```

---

## Serving Scaling Algorithm

When users adjust serving sizes, ingredient quantities must scale appropriately.

### Core Scaling Logic

```typescript
// src/utils/scaling.ts

interface ScaledIngredient extends Ingredient {
  scaledQuantity: number | null;
  displayQuantity: string;
}

export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): ScaledIngredient[] {
  const multiplier = targetServings / originalServings;

  return ingredients.map(ing => {
    if (ing.quantity === null) {
      // Ingredients without quantities (e.g., "salt to taste")
      return { ...ing, scaledQuantity: null, displayQuantity: '' };
    }

    const scaled = ing.quantity * multiplier;
    return {
      ...ing,
      scaledQuantity: scaled,
      displayQuantity: formatQuantity(scaled, ing.unit),
    };
  });
}
```

### Quantity Display Formatting

Display scaled quantities as user-friendly fractions:

```typescript
// Common cooking fractions and their decimal equivalents
const FRACTION_MAP: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
  [0.5, '½'], [0.625, '⅝'], [0.666, '⅔'], [0.75, '¾'], [0.875, '⅞'],
];

const TOLERANCE = 0.03;  // How close to a fraction we need to be

export function formatQuantity(value: number, unit: string | null): string {
  if (value === 0) return '';

  const whole = Math.floor(value);
  const fraction = value - whole;

  // Try to find a nice fraction match
  let fractionStr = '';
  for (const [decimal, symbol] of FRACTION_MAP) {
    if (Math.abs(fraction - decimal) < TOLERANCE) {
      fractionStr = symbol;
      break;
    }
  }

  // Build display string
  if (whole === 0 && fractionStr) {
    return fractionStr;
  } else if (fractionStr) {
    return `${whole} ${fractionStr}`;
  } else if (fraction === 0) {
    return whole.toString();
  } else {
    // No nice fraction, round to reasonable precision
    return value < 10 ? value.toFixed(1) : Math.round(value).toString();
  }
}

// Unit-specific rounding rules
export function roundForUnit(value: number, unit: string | null): number {
  if (!unit) return value;

  const unitLower = unit.toLowerCase();

  // Tablespoons/teaspoons: round to nearest ¼
  if (['tablespoon', 'teaspoon'].includes(unitLower)) {
    return Math.round(value * 4) / 4;
  }

  // Cups: round to nearest ⅛
  if (unitLower === 'cup') {
    return Math.round(value * 8) / 8;
  }

  // Whole items (cloves, eggs, etc.): round to nearest whole
  if (['clove', 'egg', 'head', 'bunch', 'can', 'jar'].includes(unitLower)) {
    return Math.round(value);
  }

  // Default: keep one decimal
  return Math.round(value * 10) / 10;
}
```

### Grocery List Aggregation with Scaling

When generating grocery lists, scale and combine ingredients:

```typescript
export function aggregateGroceryList(
  weekId: number,
  multiplier: number = 1.0
): GroceryItem[] {
  const db = getDb();

  // Get all ingredients from all recipes in the week's meal plan
  const rows = db.exec(`
    SELECT
      i.name,
      i.quantity * :multiplier as quantity,
      i.unit,
      i.category,
      GROUP_CONCAT(r.slug) as recipe_sources
    FROM days d
    JOIN day_meals dm ON dm.day_id = d.id
    JOIN recipes r ON r.id = dm.recipe_id
    JOIN ingredients i ON i.recipe_id = r.id
    WHERE d.week_id = :weekId
    GROUP BY i.name, i.unit, i.category
    ORDER BY i.category, i.name
  `, { weekId, multiplier });

  // Post-process: combine like items, smart unit conversion
  return combineAndNormalize(rows);
}

function combineAndNormalize(rows: any[]): GroceryItem[] {
  const combined = new Map<string, GroceryItem>();

  for (const row of rows) {
    const key = normalizeIngredientKey(row.name);

    if (combined.has(key)) {
      const existing = combined.get(key)!;
      // Try to combine quantities if units are compatible
      const combinedQty = combineQuantities(
        existing.quantity, existing.unit,
        row.quantity, row.unit
      );
      if (combinedQty) {
        existing.quantity = combinedQty.quantity;
        existing.unit = combinedQty.unit;
        existing.recipeSources = [...new Set([
          ...existing.recipeSources,
          ...row.recipe_sources.split(','),
        ])];
      }
    } else {
      combined.set(key, {
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        category: row.category,
        checked: false,
        recipeSources: row.recipe_sources.split(','),
      });
    }
  }

  return Array.from(combined.values());
}
```

---

## Database Initialization Flow

The app must initialize the database before rendering any data-dependent components.

### Initialization Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Startup                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Load wa-sqlite WASM module                                   │
│     - Fetches ~400-800KB WASM binary                            │
│     - Compiles and instantiates module                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Open/Create Database File                                    │
│     - Uses OPFS: /meal-prep.sqlite                              │
│     - Creates file if doesn't exist                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Run Migrations                                               │
│     - Check schema_migrations table                             │
│     - Apply any pending migrations                              │
│     - Create tables if fresh database                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Seed Data (if needed)                                        │
│     - Check user_state['db.seeded']                             │
│     - If not seeded, import bundled seed.json                   │
│     - Insert recipes, weeks, days, meals                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Initialize React Context                                     │
│     - Create database context with db instance                  │
│     - Mark app as ready                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Render App                                                   │
│     - DatabaseProvider wraps app                                │
│     - Children can now use useDatabase() hook                   │
└─────────────────────────────────────────────────────────────────┘
```

### React Integration with TanStack Query

The app uses TanStack Query for data fetching, which provides:
- **Request deduplication**: Prevents duplicate queries from concurrent components
- **Caching**: 30-second stale time, 5-minute garbage collection
- **Optimistic updates**: Immediate UI feedback for mutations
- **Error handling**: Centralized error logging via queryClient

```typescript
// src/lib/queryClient.ts - Query configuration

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  weeks: ['weeks'] as const,
  week: (id: number) => ['weeks', id] as const,
  recipes: ['recipes'] as const,
  recipe: (id: number) => ['recipes', id] as const,
  groceryListForWeek: (weekId: number) => ['groceryLists', { weekId }] as const,
  // ... more keys
} as const;
```

```typescript
// src/hooks/useDatabase.tsx - Database provider with StrictMode safety

let fullInitPromise: Promise<Database> | null = null;

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initDb = useCallback(async () => {
    try {
      // Module-level promise ensures single initialization
      if (!fullInitPromise) {
        fullInitPromise = initializeFully();
      }
      const database = await fullInitPromise;
      setDb(database);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize'));
      fullInitPromise = null; // Allow retry
    }
  }, []);

  // ... render DatabaseContext.Provider
}
```

```typescript
// src/hooks/useWeeks.ts - Example hook using TanStack Query

export function useWeeks() {
  const { isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.weeks,
    queryFn: getAllWeeks,
    enabled: isReady,  // Only fetch when database is ready
  });
}
```

### Loading States

```typescript
// src/components/LoadingScreen.tsx

export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

// src/components/ErrorScreen.tsx

export function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        {error.message || 'Failed to initialize the app. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Retry
      </button>
    </div>
  );
}
```

---

## Error Handling Strategy

### Database Errors

```typescript
// src/db/errors.ts

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class MigrationError extends DatabaseError {
  constructor(
    public readonly version: number,
    cause: Error
  ) {
    super(
      `Migration ${version} failed: ${cause.message}`,
      'MIGRATION_FAILED',
      cause
    );
    this.name = 'MigrationError';
  }
}

export class SeedError extends DatabaseError {
  constructor(cause: Error) {
    super(
      `Database seeding failed: ${cause.message}`,
      'SEED_FAILED',
      cause
    );
    this.name = 'SeedError';
  }
}

export class QueryError extends DatabaseError {
  constructor(
    public readonly query: string,
    cause: Error
  ) {
    super(
      `Query failed: ${cause.message}`,
      'QUERY_FAILED',
      cause
    );
    this.name = 'QueryError';
  }
}
```

### Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, info);
    // Could send to error reporting service
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
```

### API Error Handling Pattern

```typescript
// src/api/utils.ts

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}: ${message}`, error);
    throw new DatabaseError(
      `${context}: ${message}`,
      'OPERATION_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

// Usage in API functions
export async function getRecipeById(id: number): Promise<RecipeWithDetails | null> {
  return withErrorHandling(async () => {
    const db = getDb();
    const result = db.exec(`SELECT * FROM recipes WHERE id = ?`, [id]);
    if (result.length === 0) return null;
    return mapRowToRecipe(result[0]);
  }, `Failed to fetch recipe ${id}`);
}
```

---

## Schema Migrations

Handle schema evolution with versioned migrations:

```typescript
// src/db/migrations.ts

interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db) => {
      // Run the full schema.sql
      db.exec(schemaSQL);
    },
  },
  {
    version: 2,
    description: 'Add recipe source tracking',
    up: (db) => {
      db.run(`ALTER TABLE recipes ADD COLUMN source_format TEXT`);
    },
  },
  // Future migrations...
];

export async function runMigrations(db: Database): Promise<void> {
  // Ensure migrations table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get current version
  const result = db.exec(`SELECT MAX(version) as version FROM schema_migrations`);
  const currentVersion = result[0]?.values[0][0] as number ?? 0;

  // Apply pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.description}`);
      db.run('BEGIN TRANSACTION');
      try {
        migration.up(db);
        db.run(
          `INSERT INTO schema_migrations (version) VALUES (?)`,
          [migration.version]
        );
        db.run('COMMIT');
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    }
  }
}
```

---

## Future Directions

### URL Recipe Import (Planned)

Design for extracting recipes from external URLs:

```typescript
interface UrlImportService {
  canImport(url: string): boolean;
  importFromUrl(url: string): Promise<RecipeWithDetails>;
  parsers: Map<string, RecipeParser>;
}

interface RecipeParser {
  domain: string;
  parse(html: string): RecipeWithDetails;
}
```

**Implementation approach:**
1. Fetch URL content (may need CORS proxy)
2. Parse HTML for JSON-LD structured data (most recipe sites use this)
3. Fall back to DOM parsing for common recipe formats
4. Present preview for user confirmation before saving

### AI Integration (Planned)

Claude can work directly with SQL, making integration natural:

```typescript
interface AIPlanningService {
  generateWeekPlan(request: PlanRequest): Promise<WeekWithDetails>;
  suggestRecipes(criteria: RecipeCriteria): Promise<RecipeWithDetails[]>;
  optimizeGroceryList(list: GroceryList): Promise<GroceryOptimization>;
}

// AI can generate SQL queries directly
const aiTools = {
  queryRecipes: {
    description: "Search recipes using SQL",
    parameters: { sql: "string" },
    handler: (params) => db.exec(params.sql),
  },

  insertRecipe: {
    description: "Add a new recipe to the database",
    parameters: { recipe: "RecipeWithDetails" },
    handler: (params) => insertRecipeWithDetails(db, params.recipe),
  },

  createWeekPlan: {
    description: "Create a meal plan for a week",
    parameters: { week: "WeekWithDetails" },
    handler: (params) => insertWeekWithDetails(db, params.week),
  },
};
```

### Cloud Sync (Future)

SQLite makes sync straightforward:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client A  │────▶│  Sync API   │◀────│   Client B  │
│   (SQLite)  │     │  (Backend)  │     │   (SQLite)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Database  │
                    │  (Postgres) │
                    └─────────────┘
```

Options:
- **Electric SQL**: Postgres ↔ SQLite sync
- **CR-SQLite**: CRDT-based merge for offline-first
- **Custom**: Simple last-write-wins with change tracking

---

## File Locations

```
src/
├── db/
│   ├── index.ts          # Database initialization
│   ├── schema.sql        # SQL schema definition
│   ├── migrations.ts     # Schema migrations
│   └── seed.ts           # Initial data loading
├── types/
│   ├── database.ts       # All schema interfaces
│   └── index.ts          # Re-exports
├── api/
│   ├── data.ts           # Import/export API
│   ├── recipes.ts        # Recipe CRUD operations
│   ├── weeks.ts          # Week/day operations
│   └── grocery.ts        # Grocery list operations
├── hooks/
│   ├── useDatabase.ts    # Database initialization hook
│   ├── useRecipes.ts     # Recipe query hooks
│   ├── useWeeks.ts       # Week/day query hooks
│   ├── useGroceryList.ts # Grocery list hooks
│   └── useAppState.ts    # User preferences hook
├── data/
│   └── seed.json         # Bundled seed data
└── utils/
    ├── markdown-parser.ts # Markdown recipe parser
    └── export.ts          # Export formatters
```

---

## Cooklang Integration (ADR-006)

The app uses [Cooklang](https://cooklang.org/) as the primary authoring format for recipes. We use **standard Cooklang with no custom extensions** — app semantics are layered on top through directory structure and `.mealplan` files.

### Parser Package

We use the official `@cooklang/cooklang` package (WASM-powered, compiled from Rust):

```typescript
import { Parser } from '@cooklang/cooklang';

const parser = new Parser();
const result = parser.parse(cookFileContent);

// Result structure:
// {
//   recipe: { ingredients, cookware, timers, sections, ... },
//   metadata: { title, tags, servings, cuisine, ... },
//   report: string
// }
```

### Semantic Layering

Instead of custom metadata fields, we infer meaning from context:

| Semantic | Source | Example |
|----------|--------|---------|
| Recipe type | Directory path | `components/grains/` = component |
| Category | Subdirectory | `components/proteins/` = protein |
| Week assignment | `.mealplan` file | `week-1.mealplan` references the recipe |
| Meal slot | `.mealplan` file | `days[].meals.lunch.recipe` |

### Standard Cooklang Metadata

Recipes use standard `>> key: value` metadata:

```cooklang
>> title: Cilantro-Lime Rice
>> cuisine: Mexican
>> tags: grain, vegan, gluten-free
>> servings: 4
>> yield: 4 cups
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water, covered, 1-2 minutes.
```

### Component References

Meal recipes reference component recipes using path syntax (standard Cooklang — we just interpret paths as links):

```cooklang
Scoop @../components/grains/lemon-herb-quinoa{1%cup} into bowl.
```

The parser stores this as:
- `ingredient.name`: `"lemon-herb-quinoa"` (just the filename)
- `ingredient.reference.components`: `["components", "grains"]` (path parts)

The app recognizes ingredients starting with `../` or `./` as references to other recipe files.

### Import Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   .cook files   │────▶│  Cooklang WASM  │────▶│   Structured    │
│   (Cooklang)    │     │    Parser       │     │   Recipe AST    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  .mealplan files│────▶│   YAML Parser   │────▶────────▶│
│   (YAML)        │     │   + Validator   │              │
└─────────────────┘     └─────────────────┘              │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Transform to  │────▶│  Insert into    │
                        │   DB Schema     │     │    SQLite       │
                        └─────────────────┘     └─────────────────┘
```

### Meal Plan Schema

Meal plans are validated against a JSON Schema (`schemas/mealplan.schema.json`):

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(mealplanSchema);
const mealplan = parseYaml(mealplanFileContent);

if (!validate(mealplan)) {
  console.error('Validation errors:', validate.errors);
}
```

### Test Coverage

- `src/lib/cooklang/parser.test.ts` - Cooklang parser integration tests
- `src/lib/mealplan/schema.test.ts` - Mealplan schema validation tests

---

## Summary

| Aspect | MVP | Future |
|--------|-----|--------|
| Storage | SQLite (wa-sqlite + OPFS) | + Cloud sync option |
| Import | JSON, Markdown, SQLite file, **Cooklang** | + URL extraction |
| Export | JSON, Markdown, SQLite file | + Cooklang round-trip, schema.org |
| Planning | Manual UI | + AI assistance (SQL-native) |
| Users | Single user | + Household sharing |
| Config | App state in DB | Same |
| Queries | Full SQL power | Same |
| Content Format | **Cooklang + .mealplan** | + Community contributions |
