# Meal Plan Import System Design

## Overview

Enable users to import new meal plans at runtime without rebuilding the app. This involves:
1. A CLI tool to convert `.cook` and `.mealplan` files to portable JSON
2. Runtime import API to load JSON into the database
3. UI for users to import plans

---

## Current Architecture

```
Build Time:
  recipes/*.cook + recipes/plans/*.mealplan
          ↓
  scripts/generate-seed-from-cooklang.ts
          ↓
  src/data/seed.json (bundled)
          ↓
  Database seeded on first app load
```

**Limitation:** New content requires rebuild and re-deploy.

---

## Proposed Architecture

```
Build Time (unchanged):
  recipes/*.cook + *.mealplan → seed.json → initial database

Runtime Import:
  User's .cook + .mealplan files
          ↓
  CLI: scripts/export-mealplan.ts (or browser-based converter)
          ↓
  mealplan-export.json (portable format)
          ↓
  App: Import UI → api/data.ts → Database
```

---

## Export Format: `mealplan-export.json`

A self-contained JSON file with all recipes and week data needed for import.

```typescript
interface MealplanExport {
  // Format version for compatibility
  version: 1;

  // Export metadata
  exported_at: string;  // ISO timestamp
  source?: string;      // Optional: "Veganuary 2026 Week 6"

  // All recipes (components + meals) referenced by this plan
  recipes: ExportRecipe[];

  // Week definitions (can be multiple weeks in one export)
  weeks: ExportWeek[];
}

interface ExportRecipe {
  // Unique identifier (slug from filename)
  id: string;  // e.g., "cilantro-lime-rice"

  // Recipe metadata
  name: string;
  description?: string;
  recipe_type: 'component' | 'meal';

  // Categorization
  cuisine?: string;
  tags: string[];
  meal_types: string[];  // breakfast, lunch, dinner, snack

  // Timing
  prep_time?: number;    // minutes
  cook_time?: number;
  total_time?: number;

  // Serving info
  servings: number;
  serving_unit?: string;

  // Storage (for components)
  storage_days?: number;
  storage_method?: string;
  reheat_instructions?: string;

  // Content
  ingredients: ExportIngredient[];
  instructions: string[];
  notes?: string[];
}

interface ExportIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  category?: string;
  optional: boolean;

  // Reference to another recipe (for meal assemblies)
  source_recipe_id?: string;  // e.g., "cilantro-lime-rice"
}

interface ExportWeek {
  // Unique identifier
  id: string;  // e.g., "week-6"

  // Week metadata
  week_number: number;
  year: number;
  name: string;
  theme?: string;
  start_date: string;  // ISO date
  end_date: string;

  // Components made during batch cooking
  components: ExportComponent[];

  // Prep guide
  prep_steps: ExportPrepStep[];

  // Daily schedule
  days: ExportDay[];
}

interface ExportComponent {
  recipe_id: string;       // Reference to recipe
  component_type: string;  // grains, proteins, sauces, etc.
}

interface ExportPrepStep {
  step_number: number;
  time_minutes: number;    // Minutes from start (0 = beginning)
  description: string;
  duration?: number;       // How long this step takes
  recipe_id?: string;      // Optional link to recipe
}

interface ExportDay {
  day_number: number;      // 1-7
  date: string;            // ISO date
  day_of_week: string;     // Monday, Tuesday, etc.
  meals: ExportMeal[];
}

interface ExportMeal {
  meal_type: string;       // breakfast, lunch, dinner, snack
  recipe_id?: string;      // Reference to recipe (null for freeform)
  description?: string;    // Freeform description
  note?: string;           // Additional notes
  display_order: number;
}
```

---

## CLI Tool: `@vegan-meal-prep/cli`

The export tool is published as a standalone npm package, allowing anyone to convert Cooklang meal plans to the import format without cloning the main app repository.

### Package Structure

```
packages/cli/
├── package.json          # @vegan-meal-prep/cli
├── src/
│   ├── index.ts          # CLI entry point
│   ├── commands/
│   │   ├── export.ts     # export command
│   │   └── validate.ts   # validate command
│   ├── lib/
│   │   ├── cooklang.ts   # Cooklang parser wrapper
│   │   ├── mealplan.ts   # .mealplan parser
│   │   └── export.ts     # Export format generator
│   └── types/
│       └── export.ts     # MealplanExport types
├── bin/
│   └── vmp.js            # Executable entry
└── tsconfig.json
```

### Installation & Usage

```bash
# Install directly from GitHub (no npm publish required)
npx github:yourusername/vegan-meal-prep export recipes/plans/week-6.mealplan -o week-6.json

# Or with a specific branch/tag
npx github:yourusername/vegan-meal-prep#main export ...
npx github:yourusername/vegan-meal-prep#v1.0.0 export ...

# Install globally from GitHub
npm install -g github:yourusername/vegan-meal-prep
vmp export recipes/plans/week-6.mealplan -o week-6.json

# If published to npm (future)
npx @vegan-meal-prep/cli export recipes/plans/week-6.mealplan -o week-6.json
```

### GitHub Installation Options

Since the CLI lives in the main repo, there are a few ways to structure this:

#### Option A: Root-level CLI (Recommended for now)

Keep CLI entry point at repo root. The main `package.json` includes the `bin` field:

```json
{
  "name": "vegan-meal-prep",
  "bin": {
    "vmp": "./packages/cli/bin/vmp.js"
  }
}
```

This allows direct GitHub install:
```bash
npx github:yourusername/vegan-meal-prep export ...
```

#### Option B: Subdirectory Install (npm 8.5+)

Install from a subdirectory using the `#path:` syntax:

```bash
npx github:yourusername/vegan-meal-prep#path:packages/cli export ...
```

Note: Requires npm 8.5+ and may have caching quirks.

#### Option C: Separate CLI Repo

Extract CLI to its own repo for cleaner separation:
```bash
npx github:yourusername/vegan-meal-prep-cli export ...
```

**Recommendation:** Start with Option A (root-level bin), migrate to separate repo if the CLI grows significantly.

### Commands

#### `vmp export` - Export meal plan to JSON

```bash
# Export a single week
vmp export recipes/plans/week-6.mealplan -o week-6-export.json

# Export multiple weeks into one file
vmp export recipes/plans/week-6.mealplan recipes/plans/week-7.mealplan -o weeks-6-7.json

# Specify recipes directory (defaults to relative paths in .mealplan)
vmp export --recipes ./my-recipes plans/week-6.mealplan -o export.json

# Output to stdout (for piping)
vmp export recipes/plans/week-6.mealplan

# Pretty print with indentation
vmp export recipes/plans/week-6.mealplan --pretty -o export.json
```

#### `vmp validate` - Validate files without exporting

```bash
# Validate a .mealplan file and all referenced recipes
vmp validate recipes/plans/week-6.mealplan

# Validate a single .cook file
vmp validate recipes/components/grains/rice.cook

# Validate all files in a directory
vmp validate recipes/
```

### package.json

```json
{
  "name": "@vegan-meal-prep/cli",
  "version": "1.0.0",
  "description": "CLI tool for exporting Cooklang meal plans",
  "bin": {
    "vmp": "./bin/vmp.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "bin"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@cooklang/cooklang": "^x.x.x",
    "commander": "^12.0.0",
    "yaml": "^2.4.0",
    "ajv": "^8.12.0"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": ["cooklang", "meal-prep", "recipe", "vegan"]
}
```

### Why a Separate Package?

| Benefit | Description |
|---------|-------------|
| **No repo clone needed** | Authors can export without full app source |
| **Version independence** | CLI can update separately from app |
| **Reusable** | Other apps could use the same export format |
| **Lighter weight** | Only includes parsing deps, not React/UI |
| **CI/CD friendly** | Easy to add to recipe repo workflows |

### Monorepo Structure

The CLI package lives alongside the main app in a monorepo:

```
vegan-meal-prep/
├── package.json          # Root workspace config
├── packages/
│   ├── cli/              # @vegan-meal-prep/cli
│   │   └── package.json
│   └── app/              # Main web app (future refactor)
│       └── package.json
├── src/                  # Current app code (until refactored)
├── recipes/              # Cooklang recipes
└── docs/
```

Alternatively, the CLI can initially live in `scripts/` and be extracted to a package later.

### Implementation

```typescript
// packages/cli/src/commands/export.ts

import { parse as parseCooklang } from '@cooklang/cooklang';
import { parse as parseYaml } from 'yaml';

async function exportMealplan(
  mealplanPaths: string[],
  recipesDir: string,
  outputPath: string
): Promise<void> {
  const recipes = new Map<string, ExportRecipe>();
  const weeks: ExportWeek[] = [];

  for (const mealplanPath of mealplanPaths) {
    // 1. Parse the .mealplan file
    const mealplan = await parseMealplan(mealplanPath);

    // 2. Collect all referenced recipes
    const referencedRecipes = collectReferencedRecipes(mealplan);

    // 3. Parse each referenced .cook file
    for (const recipePath of referencedRecipes) {
      if (!recipes.has(recipePath)) {
        const recipe = await parseRecipeFile(recipesDir, recipePath);
        recipes.set(recipe.id, recipe);

        // Also parse any sub-recipes (ingredients that reference other recipes)
        for (const subRecipe of recipe.referencedRecipes) {
          if (!recipes.has(subRecipe)) {
            const sub = await parseRecipeFile(recipesDir, subRecipe);
            recipes.set(sub.id, sub);
          }
        }
      }
    }

    // 4. Convert mealplan to ExportWeek
    weeks.push(convertToExportWeek(mealplan, recipes));
  }

  // 5. Write output
  const output: MealplanExport = {
    version: 1,
    exported_at: new Date().toISOString(),
    recipes: Array.from(recipes.values()),
    weeks,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
}
```

---

## Import API: `src/api/data.ts`

### Functions

```typescript
// src/api/data.ts

/**
 * Import a meal plan export into the database.
 *
 * @param data - The parsed MealplanExport object
 * @param options - Import options
 * @returns Summary of what was imported
 */
export async function importMealplan(
  data: MealplanExport,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    onConflict = 'skip',  // 'skip' | 'replace' | 'error'
    validateOnly = false,  // Dry run - validate without importing
  } = options;

  // 1. Validate the export format
  validateExport(data);

  // 2. Check for conflicts with existing data
  const conflicts = await findConflicts(data);

  if (conflicts.length > 0 && onConflict === 'error') {
    throw new ImportConflictError(conflicts);
  }

  if (validateOnly) {
    return { validated: true, conflicts, imported: { recipes: 0, weeks: 0 } };
  }

  // 3. Import recipes (respecting conflict strategy)
  const recipeIdMap = await importRecipes(data.recipes, onConflict);

  // 4. Import weeks (linking to recipe IDs)
  const weekIds = await importWeeks(data.weeks, recipeIdMap, onConflict);

  // 5. Invalidate relevant query caches
  queryClient.invalidateQueries({ queryKey: ['recipes'] });
  queryClient.invalidateQueries({ queryKey: ['weeks'] });

  return {
    validated: true,
    conflicts,
    imported: {
      recipes: recipeIdMap.size,
      weeks: weekIds.length,
    },
  };
}

interface ImportOptions {
  onConflict?: 'skip' | 'replace' | 'error';
  validateOnly?: boolean;
}

interface ImportResult {
  validated: boolean;
  conflicts: Conflict[];
  imported: {
    recipes: number;
    weeks: number;
  };
}

interface Conflict {
  type: 'recipe' | 'week';
  id: string;
  existingName: string;
  importName: string;
}
```

### Conflict Handling

| Strategy | Behavior |
|----------|----------|
| `skip` | Keep existing, ignore imported duplicate |
| `replace` | Overwrite existing with imported |
| `error` | Abort import if any conflicts found |

---

## UI: Import Modal

### Location

Add to Settings/Menu or as a floating action button on the home page.

### Flow

```
1. User clicks "Import Meal Plan"
        ↓
2. File picker opens (accept .json)
        ↓
3. App validates the file
   - Shows preview: "Week 6: Thai Fusion (12 recipes, 7 days)"
   - Shows conflicts if any
        ↓
4. User confirms import
        ↓
5. Progress indicator during import
        ↓
6. Success: Navigate to imported week
   Error: Show error message with details
```

### Component

```typescript
// src/components/import/ImportModal.tsx

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MealplanExport | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text) as MealplanExport;

    // Validate and check conflicts
    const result = await importMealplan(data, { validateOnly: true });
    setPreview(data);
    setConflicts(result.conflicts);
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      await importMealplan(preview, { onConflict: 'skip' });
      onClose();
      // Navigate to first imported week
    } catch (error) {
      // Show error
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Import Meal Plan</h2>

      {!preview ? (
        <FileDropzone onFile={handleFileSelect} accept=".json" />
      ) : (
        <ImportPreview
          data={preview}
          conflicts={conflicts}
          onConfirm={handleImport}
          onCancel={() => setPreview(null)}
          loading={importing}
        />
      )}
    </Modal>
  );
}
```

---

## Export UI (Optional)

Allow users to export weeks from the app for sharing:

```typescript
// src/api/data.ts

export async function exportWeeksAsJson(weekIds: number[]): Promise<MealplanExport> {
  // 1. Fetch weeks with all related data
  const weeks = await Promise.all(weekIds.map(getWeekById));

  // 2. Collect all referenced recipes
  const recipeIds = new Set<number>();
  for (const week of weeks) {
    for (const component of week.components) {
      if (component.recipeId) recipeIds.add(component.recipeId);
    }
    for (const day of week.days) {
      for (const meal of day.meals) {
        if (meal.recipeId) recipeIds.add(meal.recipeId);
      }
    }
  }

  // 3. Fetch recipes
  const recipes = await Promise.all(
    Array.from(recipeIds).map(getRecipeById)
  );

  // 4. Build export object
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    recipes: recipes.map(convertToExportRecipe),
    weeks: weeks.map(convertToExportWeek),
  };
}
```

---

## Implementation Plan

### Phase 1: CLI Package Setup
- [ ] Create `packages/cli/` directory structure
- [ ] Set up package.json with `@vegan-meal-prep/cli` name
- [ ] Configure TypeScript and build tooling
- [ ] Add `commander` for CLI argument parsing
- [ ] Set up bin entry point (`vmp` command)

### Phase 2: Export Command
- [ ] Extract/refactor Cooklang parsing from `generate-seed-from-cooklang.ts`
- [ ] Implement `vmp export` command
- [ ] Add `.mealplan` file parsing
- [ ] Add recipe dependency resolution
- [ ] Generate `MealplanExport` JSON output
- [ ] Add tests for export format
- [ ] Test with existing weeks 1-5

### Phase 3: Validate Command
- [ ] Implement `vmp validate` command
- [ ] Validate `.cook` file syntax
- [ ] Validate `.mealplan` structure against JSON Schema
- [ ] Check recipe references exist
- [ ] Report errors with file/line context

### Phase 4: Publish Package
- [ ] Add README with usage examples
- [ ] Configure npm publishing
- [ ] Test `npx @vegan-meal-prep/cli` invocation
- [ ] Publish to npm registry

### Phase 5: Import API
- [ ] Define TypeScript types for export format in shared location
- [ ] Implement `importMealplan()` in `src/api/data.ts`
- [ ] Add conflict detection
- [ ] Add database insertion logic
- [ ] Add tests for import

### Phase 6: Import UI
- [ ] Create `ImportModal` component
- [ ] Add file dropzone with validation
- [ ] Add import preview with conflict display
- [ ] Add progress indicator
- [ ] Wire up to menu/settings

### Phase 7: Export UI (Optional)
- [ ] Add "Export Week" button to week page
- [ ] Implement `exportWeeksAsJson()`
- [ ] Generate downloadable JSON file

---

## Security Considerations

1. **Input Validation**: Strictly validate JSON structure before import
2. **Size Limits**: Limit import file size (e.g., 5MB)
3. **SQL Injection**: Use parameterized queries (already standard)
4. **XSS Prevention**: Sanitize recipe names/descriptions before display

---

## Future Enhancements

- **Cooklang in Browser**: Parse .cook files directly in the app (no CLI needed)
- **URL Import**: Import from a URL (e.g., shared meal plan links)
- **Partial Import**: Select which recipes/weeks to import from a file
- **Merge Strategies**: More sophisticated conflict resolution
- **Versioning**: Track recipe versions, allow rollback
