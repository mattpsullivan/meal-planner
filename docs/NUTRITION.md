# Nutrition Pipeline

Calories + macros (protein / carbs / fat) are computed **at build time** and baked
into `src/data/seed.json`, one block per recipe. Nothing is fetched at runtime.
This doc is how to extend and reason about that pipeline.

## TL;DR — add nutrition for a new ingredient

1. Open `recipes/ingredient-nutrition.json`.
2. Add an entry under `ingredients`, keyed by the **lowercased ingredient name**
   exactly as it appears in the `.cook` files:

   ```json
   "chicken breasts": { "per_100g": { "kcal": 120, "protein_g": 22.5, "carb_g": 0, "fat_g": 2.6 } }
   ```

3. If the ingredient is used with a **volume or count unit** (cup, tbsp, clove,
   each, …), add the grams for one of each such unit:

   ```json
   "olive oil": {
     "per_100g": { "kcal": 884, "protein_g": 0, "carb_g": 0, "fat_g": 100 },
     "grams_per_unit": { "tbsp": 13.5, "tsp": 4.5 }
   }
   ```

   Weight units (`g`, `oz`, `lb`, `kg`) are handled universally — you never add them.
4. Regenerate the seed and read the coverage report:

   ```bash
   pnpm tsx scripts/generate-seed-from-cooklang.ts
   ```

   It prints `Nutrition coverage: N/M recipes fully mapped` followed by the distinct
   **unmapped ingredients**, most-used first. Work that list top-down to raise coverage.
5. `pnpm exec prettier --write src/data/seed.json recipes/ingredient-nutrition.json`
   then `pnpm check` (the JSON is prettier-checked in CI).

## Coverage status

The dataset currently covers the **Week-7 omnivore recipes fully**; the other weeks
are partial. A recipe's `nutrition.coverage` (0–1) is the fraction of its own
non-reference ingredients that were mapped. **A recipe below 1.0 under-reports** —
unmapped ingredients contribute 0. Surface nutrition in the UI accordingly (e.g.
show an "estimated / incomplete" note when `coverage < 1`).

## Data model

`recipes/ingredient-nutrition.json` has two maps:

- **`ingredients`** — keyed by lowercased name. Each has `per_100g` macros and an
  optional `grams_per_unit` for its non-weight units.
- **`components`** — keyed by recipe **id** (e.g. `jasmine-rice`). Only needed when a
  meal references a component by a **volume/count** unit (`@../.../jasmine-rice{1%cup}`);
  the value is the grams one such unit of the *finished* component weighs. Components
  referenced by weight (`{4%oz}`) need no entry.

Per-recipe output attached to `seed.json`:

```jsonc
"nutrition": {
  "per_serving": { "kcal": 580, "protein_g": 32.9, "carb_g": 61.1, "fat_g": 23.1 },
  "total":       { "kcal": 580, "protein_g": 32.9, "carb_g": 61.1, "fat_g": 23.1 },
  "total_grams": 470,
  "servings": 1,
  "coverage": 1
}
```

## How it's computed

Implemented in `src/lib/nutrition/` (pure, unit-tested), invoked by the seed generator:

- **`convert.ts`** — `unit → grams`. Weight units are universal constants; every other
  unit is ingredient-specific via `grams_per_unit`. Units are normalized (`cups`→`cup`,
  missing/`(none)`→`each`).
- **`compute.ts`** — `computeNutrition(recipe, ctx)`:
  - Real ingredient: `grams = quantity × grams/unit`; `macros = per_100g × grams/100`.
  - **Component reference** (`source_recipe_id` set): recurse into the component, then
    add `componentTotalMacros × (referenceGrams / componentTotalGrams)` — i.e. the
    fraction of the component's mass this meal uses. Mirrors the diet-derivation
    roll-up in `src/data/index.ts`; memoized with a cycle guard.
  - `per_serving = total / servings`.
  - Fractional Cooklang quantities (`1/2` → `{ whole, num, den }`) are resolved by
    `resolveQuantity`.

The generator (`scripts/generate-seed-from-cooklang.ts`) loads the dataset, computes
each recipe, attaches `nutrition`, and logs the coverage report.

## Accuracy — read this

This is **approximate**, good for trends and hitting protein, **not clinical**. Sources
of error, roughly in order:

- **Volume/count → grams** is inherently fuzzy (a "cup of chopped spinach" varies a lot).
- **Raw vs cooked**: `per_100g` values are for the ingredient as listed in the recipe
  (usually raw); cooking changes weight and density.
- **Component density** for volume references is a single average `grams_per_unit`.
- Rounding: `kcal` to whole numbers, macros to 0.1 g.

Expect ±10–20% on a finished dish. Don't present it as exact.

**Important — teen profiles:** per the product decision, Claire & Will are tracked
**awareness-only** (protein + calories for education, no calorie-deficit targets).
Don't build deficit UI on top of these numbers for minors.

## Tests

`src/lib/nutrition/nutrition.test.ts` covers unit conversion, fraction resolution,
per-serving math, unmapped/coverage, weight- and volume-unit component roll-up, and
the cycle guard. Run: `pnpm test:run src/lib/nutrition/nutrition.test.ts`.

## Not yet done (next increments)

- **UI**: surface `nutrition` on `RecipeCard`, the recipe detail page, and weekly-plan
  totals (sum across a plan's meals). The data is in `seed.json`; the display is the
  remaining work.
- **Full-catalog coverage**: map the ~170 remaining ingredients from Weeks 1–6 (the
  generator's unmapped list is the worklist).
- A dedicated `mp nutrition:check` CLI subcommand (today the generator prints the
  same report at build time).
