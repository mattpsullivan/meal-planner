# ADR-005: Meal vs Component Architecture

## Status
**Accepted** - Implemented in commits 497ca64, 2c784f2

## Context

The Vegan Meal Prep app needs to model two distinct concepts that are currently conflated:

1. **Components** (Prep Recipes) - Made during batch prep session, stored, reused across meals
2. **Meals** (Assemblies) - What you eat each day, combining multiple components

### Current State

The current data model treats everything as a "recipe" and links meals to a single recipe:

```sql
CREATE TABLE day_meals (
  recipe_id INTEGER REFERENCES recipes(id),  -- Single link only
  description TEXT,  -- Contains assembly info as free text
);
```

This is inadequate because:
- Most meals use 2-5 components (e.g., "Buddha Bowl" = rice + beans + veggies + sauce)
- Only ONE component can be linked; others are just mentioned in description text
- Users can't click through to see all component recipes

### Source Content Analysis

Reviewing the source content in `content/` reveals a clear three-tier structure:

| Tier | Example | Has Full Recipe? | Reusable? |
|------|---------|------------------|-----------|
| **Component** | Cilantro-Lime Rice | Yes (ingredients, steps, yield) | Yes (used in 3-5 meals) |
| **Meal** | Mediterranean Grain Bowl | No (assembly only) | No (specific day/time) |
| **Week Plan** | Week 1: Mediterranean | N/A | N/A |

#### Component Example (from Week 1)
```
Spiced Mediterranean Chickpeas
Yield: ~4 cups | Storage: 5 days refrigerated
Ingredients: 3 cans chickpeas, olive oil, garlic, cumin...
Instructions: [detailed cooking steps]
Use in: Mediterranean bowls, Greek salad, mezze plate
```

#### Meal Example (from Week 1, Thursday Dinner)
```
Mediterranean Grain Bowl
Assembly (5 min):
1. Scoop lemon-herb quinoa into bowl
2. Add spiced chickpeas
3. Add Mediterranean roasted vegetables
4. Dollop cashew tzatziki
5. Top with fresh cucumber, olives, pepitas
```

Key insight: **Meals don't have ingredient lists** - they reference components plus fresh garnishes.

## Decision Drivers

1. **Multi-component meals are the norm** - 80%+ of meals use 2+ components
2. **Components are reusable** - Same component appears in multiple meals
3. **Assembly instructions differ from cooking instructions** - 5-10 min vs 30-60 min
4. **Fresh items exist** - Some meals need fresh avocado, lime, cilantro (not prepped)
5. **User expectation** - Clicking a meal should show what components to grab

## Options Considered

### Option A: Junction Table for Meal-Component Links

Add a simple junction table linking meals to multiple components:

```sql
CREATE TABLE meal_components (
  id INTEGER PRIMARY KEY,
  meal_id INTEGER REFERENCES day_meals(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id),
  quantity TEXT,  -- Optional: "1 cup", "1/2 batch"
  sort_order INTEGER
);
```

**Seed data change:**
```json
{
  "meals": [{
    "meal_type": "dinner",
    "name": "Mediterranean Grain Bowl",
    "assembly_instructions": "Layer quinoa, chickpeas, veggies. Top with tzatziki.",
    "assembly_time_minutes": 5,
    "components": [
      { "recipe_id": "w1-lemon-herb-quinoa", "quantity": "1 cup" },
      { "recipe_id": "w1-spiced-chickpeas", "quantity": "1/2 cup" },
      { "recipe_id": "w1-mediterranean-roasted-vegetables" },
      { "recipe_id": "w1-cashew-tzatziki", "quantity": "2 tbsp" }
    ],
    "fresh_items": ["cucumber", "olives", "pepitas"]
  }]
}
```

**Pros:**
- Simple schema change
- Clear separation of concerns
- Easy to query all components for a meal

**Cons:**
- Fresh items are unstructured (just strings)
- Assembly instructions are free text
- Doesn't capture component category/role

### Option B: Meals as Recipes with Sub-Recipe References

Treat meals as a special type of recipe where some "ingredients" are actually component recipes:

```sql
-- Add recipe_type to distinguish
ALTER TABLE recipes ADD COLUMN recipe_type TEXT DEFAULT 'component';
-- Values: 'component', 'meal', 'standalone'

-- Ingredients can reference other recipes
ALTER TABLE ingredients ADD COLUMN source_recipe_id INTEGER REFERENCES recipes(id);
```

**Seed data:** Meals become recipes with ingredient entries that link to components:

```json
{
  "id": "w1-mediterranean-grain-bowl",
  "name": "Mediterranean Grain Bowl",
  "recipe_type": "meal",
  "ingredients": [
    { "name": "Lemon-Herb Quinoa", "quantity": 1, "unit": "cup", "source_recipe_id": "w1-lemon-herb-quinoa" },
    { "name": "Spiced Chickpeas", "quantity": 0.5, "unit": "cup", "source_recipe_id": "w1-spiced-chickpeas" },
    { "name": "cucumber, diced", "quantity": 0.5, "unit": "cup" },
    { "name": "kalamata olives", "quantity": 0.25, "unit": "cup" }
  ],
  "instructions": ["Layer quinoa in bowl", "Add chickpeas and vegetables", "..."]
}
```

**Pros:**
- Unified recipe model
- Ingredients with quantities work the same way
- Sub-recipes are a known pattern
- Fresh items are just regular ingredients (no source_recipe_id)

**Cons:**
- More complex schema
- Blurs the line between "prep this" and "assemble this"
- Meal "recipes" feel different from component recipes

### Option C: Hybrid - Components Table + Fresh Items

Combine explicit component links with a structured fresh items list:

```sql
CREATE TABLE meal_components (
  meal_id INTEGER REFERENCES day_meals(id),
  recipe_id INTEGER REFERENCES recipes(id),
  role TEXT,  -- 'base', 'protein', 'sauce', 'topping'
  quantity TEXT
);

CREATE TABLE meal_fresh_items (
  meal_id INTEGER REFERENCES day_meals(id),
  item TEXT,  -- "1 avocado, sliced"
  optional BOOLEAN DEFAULT FALSE
);

-- Update day_meals
ALTER TABLE day_meals ADD COLUMN assembly_time_minutes INTEGER;
ALTER TABLE day_meals ADD COLUMN assembly_instructions TEXT;
```

**Pros:**
- Most explicit model
- Fresh items are structured
- Roles enable smart UI grouping

**Cons:**
- Three tables for one concept
- May be over-engineered

## Recommendation

**Option B: Meals as Recipes with Sub-Recipe References**

Rationale:
1. **Conceptually clean** - A meal IS a recipe, just one where some ingredients have their own recipes
2. **Familiar pattern** - Sub-recipes/linked recipes are standard in recipe software
3. **Unified model** - One `recipes` table, one `ingredients` table, clear relationships
4. **Scaling** - Works for varying complexity (simple smoothie vs complex bowl)
5. **Grocery list generation** - Traversing sub-recipes for ingredient aggregation is straightforward

### Implementation Approach

1. **Add `recipe_type`** to recipes: `'component' | 'meal' | 'standalone'`
2. **Add `source_recipe_id`** to ingredients (nullable FK to recipes)
3. **Update seed.json** to include meal recipes with component references
4. **UI changes:**
   - Meal display shows linked components as clickable
   - Recipe page shows "Used in these meals" for components
   - Prep guide groups by recipe_type

### Data Migration

The existing component recipes stay as-is. We need to:
1. Add meal recipes to seed.json (extracted from Meal Assembly Guide sections)
2. Update day_meals to reference meal recipes (not component recipes)
3. Meal recipes have ingredients that reference component recipes

## Consequences

### Positive
- Clear domain model matching the source content structure
- Users can navigate from meal → components → full recipes
- Grocery list can aggregate across meal → component → ingredients
- Component reuse is explicit and queryable

### Negative
- Requires significant seed data restructuring
- Migration complexity for existing users (need full re-seed)
- More recipes in the database (meals + components)

### Neutral
- Recipe page needs conditional rendering based on recipe_type
- Search/filter may need recipe_type awareness

## References

- Source content: `content/week-*.md` (Meal Assembly Guide sections)
- Example PDF: `content/examples/February 1 Meal Plan.pdf`
- Current schema: `src/db/schema.sql`
- Current seed data: `src/data/seed.json`
