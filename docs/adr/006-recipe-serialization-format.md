# ADR-006: Recipe Serialization Format

## Status
**Accepted** - Implemented with standard Cooklang (no custom extensions)

## Context

The Vegan Meal Prep app needs a standardized format for:
1. **Authoring** recipes (human-writeable source files)
2. **Storing** recipes in the database (structured data)
3. **Exchanging** recipes (import/export with other systems)
4. **Validating** recipe data (schema enforcement)

Our unique requirements stem from meal prep's component-based architecture (ADR-005):
- **Component recipes**: Batch-prepped items with full cooking instructions
- **Meal recipes**: Assemblies that reference components + fresh items
- **Weekly plans**: 7-day schedules linking meals to days
- **Prep timelines**: Coordinated batch cooking sessions

### Current State

Source content lives in markdown files (`content/week-*.md`) with embedded recipes in prose format. These are manually converted to JSON (`src/data/seed.json`). This process is:
- Error-prone (manual parsing)
- Not validated (no schema enforcement)
- Not portable (bespoke JSON structure)
- Hard to author (JSON isn't human-friendly)

---

## Research: Existing Recipe Formats

### 1. Schema.org/Recipe (JSON-LD)

**Overview**: W3C standard for structured recipe data, primarily for SEO.

**Structure** (simplified):
```json
{
  "@type": "Recipe",
  "name": "Cilantro-Lime Rice",
  "recipeIngredient": ["2 cups rice", "3 cups water"],
  "recipeInstructions": [
    {"@type": "HowToStep", "text": "Rinse rice..."}
  ],
  "prepTime": "PT10M",
  "cookTime": "PT20M",
  "recipeYield": "4 servings",
  "recipeCuisine": "Mexican",
  "suitableForDiet": "VeganDiet"
}
```

**Pros**:
- Industry standard (AllRecipes, Epicurious, BBC Good Food use it)
- Excellent tool support (recipe extractors, Google Rich Results)
- Comprehensive schema (nutrition, dietary restrictions, equipment)
- JSON is universally parseable

**Cons**:
- Painful to write by hand (verbose, quotes everywhere)
- Ingredients are unstructured strings (`"2 cups rice"`)
- No native sub-recipe/component linking
- No meal planning concepts

**Assessment**: Good for **export/interop**, poor for **authoring**.

### 2. Cooklang

**Overview**: Markup language designed specifically for recipes. Text files with inline annotations.

**Syntax**:
```
Rinse @rice{2%cups} until water runs clear.

Combine rice, @water{3%cups}, and @salt{1%tsp} in #pot{}.
Cook ~{20%minutes} until done.

Stir in @lime juice{2%tbsp} and @cilantro{1/2%cup}(chopped).
```

**Metadata** (YAML front matter):
```yaml
---
title: Cilantro-Lime Rice
servings: 4
time:
  prep: 10 minutes
  cook: 20 minutes
tags: [grain, mexican, vegan]
---
```

**Sub-recipe references**:
```
Layer @./components/Cilantro-Lime Rice{1%cup} in bowl.
Add @./components/Spiced Chickpeas{1/2%cup}.
```

**Pros**:
- Human-readable and writable (reads like natural instructions)
- Ingredients embedded in steps (no duplication)
- Built-in quantity/unit parsing
- Native recipe references via file paths
- Active ecosystem (CLI tools, apps, VSCode extension)
- Automatic shopping list generation
- Pantry inventory support (TOML)

**Cons**:
- No native meal planning/weekly schedule concepts
- Ingredient list is implicit (extracted from steps)
- Can't list ingredients without them being in steps
- Relatively new (smaller recipe corpus)
- File-based references assume filesystem structure

**Assessment**: Excellent for **authoring**, good for **components**, needs extension for **meal planning**.

### 3. Open Recipe Format (ORF)

**Overview**: YAML-based format designed by a chef/software engineer.

**Structure**:
```yaml
recipe_name: Cilantro-Lime Rice
recipe_uuid: vmp:w1-cilantro-lime-rice

yields:
  - amount: 4
    unit: cups

ingredients:
  - amounts:
      - amount: 2
        unit: cups
    processing: [rinsed]
    item: long-grain white rice
    usda_num: 20044
  - amounts:
      - amount: 3
        unit: cups
    item: water

steps:
  - step: Rinse rice until water runs clear.
  - step: Combine rice, water, and salt in pot.
    haccp:
      control_point: Ensure water is clean.
  - step: Cook until done.
    notes:
      - About 20 minutes for white rice.

notes: |
  Reheating: Microwave with splash of water, covered.

X-source_week: 1
X-storage_days: 5
```

**Pros**:
- YAML is human-readable/writable
- Structured ingredients (quantity, unit, processing, USDA codes)
- Extensible via `X-` prefix custom fields
- Professional kitchen features (HACCP, yields, notes)
- Designed for food service (scaling, multiple yields)

**Cons**:
- Verbose compared to Cooklang
- Limited tooling ecosystem
- No native sub-recipe linking
- No meal planning concepts
- Steps separated from ingredients (duplication risk)

**Assessment**: Good for **professional/commercial**, overengineered for **home meal prep**.

### 4. RecipeML

**Overview**: XML-based format from 2000-2002.

**Structure**:
```xml
<recipeml>
  <recipe>
    <head><title>Cilantro-Lime Rice</title></head>
    <ingredients>
      <ing><amt><qty>2</qty><unit>cups</unit></amt>
        <item>long-grain white rice</item></ing>
    </ingredients>
    <directions>
      <step>Rinse rice until water runs clear.</step>
    </directions>
  </recipe>
</recipeml>
```

**Pros**:
- Structured ingredients with quantity/unit parsing
- Large corpus (10,000+ recipes available)
- DTD validation

**Cons**:
- XML verbosity (painful to write)
- Stale (no updates since 2002)
- Licensing issues
- No modern tooling

**Assessment**: **Avoid** - obsolete format.

### 5. h-recipe Microformat

**Overview**: HTML class-based markup for embedding recipe data in web pages.

```html
<div class="h-recipe">
  <h1 class="p-name">Cilantro-Lime Rice</h1>
  <ul>
    <li class="p-ingredient">2 cups rice</li>
  </ul>
  <div class="e-instructions">...</div>
</div>
```

**Assessment**: Display format only, not suitable for authoring/storage.

---

## Comparison Matrix

| Criterion | Schema.org | Cooklang | ORF | RecipeML | RecipeMD |
|-----------|------------|----------|-----|----------|----------|
| Human authoring | Poor | Excellent | Good | Poor | Good |
| Structured ingredients | Partial | Good | Excellent | Good | Good |
| Sub-recipe linking | No | Yes (files) | No | No | Yes (links) |
| Meal planning | No | No | No | No | No |
| Validation/Schema | JSON Schema | Grammar | YAML Schema | DTD | CommonMark |
| Tool ecosystem | Excellent | Good | Limited | Dead | Limited |
| Industry adoption | High | Growing | Low | Legacy | Low |
| Extensibility | Limited | Metadata | X- fields | No | Limited |

---

## Community & Ecosystem Analysis

### Cooklang

**GitHub Stats** ([cooklang org](https://github.com/cooklang)):
- **Organization**: 31 repositories, 377 followers
- **CLI (cookcli)**: 1,050 stars, 64 forks - Rust-based, actively maintained
- **Specification**: 662 stars, 14 forks
- **Obsidian Plugin**: 290 stars - popular integration
- **TypeScript Parser**: 86 stars (archived, opportunity!)
- **Recipe Importer**: 47 stars - converts from other formats

**Community Features**:
- [Cooklang Federation](https://cooklang.org/docs/use-cases/publishing-recipes/) - Decentralized recipe sharing
- Hacktoberfest participation - welcoming to contributors
- Active Discord community
- Multiple parser implementations (Rust, TypeScript, Python, Swift)

**Tooling Opportunities**:
- ✅ Parsers exist in multiple languages
- ⚠️ TypeScript parser archived - **opportunity to maintain/fork**
- ❌ No meal planning support - **major opportunity**
- ❌ No batch cooking/prep timeline tools
- ❌ No grocery aggregation across linked recipes

### Tandoor Recipes

**GitHub Stats** ([TandoorRecipes/recipes](https://github.com/TandoorRecipes/recipes)):
- **Stars**: 7,800+ (largest recipe management project)
- **Forks**: 745
- **Contributors**: 348
- **Releases**: 170 (very active)

**Data Ecosystem**:
- [open-tandoor-data](https://github.com/TandoorRecipes/open-tandoor-data) - Shared ingredient/unit database
- Imports from schema.org JSON-LD websites
- Open Database License (ODbL)

**Relevance**: Tandoor is an **application**, not a format standard. However:
- Their import/export challenges show the need for better formats
- Their open-tandoor-data could be valuable for ingredient standardization
- Large user base = potential adopters of better tooling

### RecipeMD

**GitHub Stats** ([RecipeMD/RecipeMD](https://github.com/RecipeMD/RecipeMD)):
- **Stars**: 81
- **Forks**: 8
- **Contributors**: 6

**Assessment**: Small community, limited momentum. Markdown-based like Cooklang but less feature-rich and smaller ecosystem.

### Schema.org/Recipe

**Adoption** ([2024 Web Almanac](https://almanac.httparchive.org/en/2024/structured-data)):
- 45+ million domains use schema.org markup
- 72.6% of Google first-page results use schema
- JSON-LD adoption grew from 37% (2022) to 43% (2024)
- Used by AllRecipes, Epicurious, BBC Good Food, etc.

**Relevance**: Industry standard for **discovery/SEO**, not authoring. Essential for export/interoperability.

### Open Recipe Databases

| Database | Recipes | License | API | Vegan Filter |
|----------|---------|---------|-----|--------------|
| [Open Food Facts](https://world.openfoodfacts.org/data) | 3M+ products | ODbL | Yes | Yes |
| [TheMealDB](https://www.themealdb.com/) | 283 | Free | Yes | Limited |
| [Spoonacular](https://spoonacular.com/food-api) | 500K+ | Freemium | Yes | Yes |
| [Edamam](https://developer.edamam.com/) | 2.3M | Commercial | Yes | Yes |

**Note**: These are recipe **search APIs**, not open datasets. Only Open Food Facts allows bulk download, but it's primarily a **product** database (nutrition info), not a recipe database.

---

## Ecosystem Gap Analysis

### What Exists
- ✅ Human-readable recipe authoring (Cooklang)
- ✅ Web interoperability standard (schema.org)
- ✅ Recipe management applications (Tandoor, Mealie, Paprika)
- ✅ Ingredient/nutrition databases (Open Food Facts, USDA)

### What's Missing
- ❌ **Meal planning data model** - No format handles weekly schedules
- ❌ **Batch cooking/prep support** - No timeline coordination
- ❌ **Component-based recipes** - Limited sub-recipe linking
- ❌ **Grocery aggregation** - No standard for combining ingredient lists
- ❌ **Vegan-specific open database** - No bulk-downloadable vegan recipe corpus

### Opportunity Assessment

| Opportunity | Effort | Impact | Community Benefit |
|-------------|--------|--------|-------------------|
| Cooklang meal planning extension | Medium | High | Would fill major gap |
| Cooklang TypeScript parser revival | Low | Medium | Enables web apps |
| Cooklang ↔ schema.org converter | Medium | High | Bridges ecosystems |
| Meal prep timeline format | Medium | High | Novel contribution |
| Open vegan recipe dataset | High | High | Community resource |

---

## Decision Drivers

1. **Authoring experience**: Must be pleasant to write recipes by hand
2. **Component linking**: Meals must reference component recipes
3. **Meal planning**: Weekly schedules, prep timelines, grocery aggregation
4. **Validation**: Catch errors before database import
5. **Interoperability**: Export to schema.org for sharing
6. **Tooling**: Leverage existing parsers where possible
7. **Community potential**: Opportunity to contribute to/build open source ecosystem
8. **Existing adoption**: Build on formats with momentum, not create orphans

---

## Options

### Option A: Pure Cooklang

Adopt Cooklang as-is for component recipes, extend with conventions for meals/planning.

**Implementation**:
- Component recipes: Standard `.cook` files
- Meal recipes: `.cook` files that only reference other recipes
- Weekly plans: Separate YAML/JSON manifest linking recipes to days
- Custom metadata fields for meal prep specifics

```
-- FILE: components/cilantro-lime-rice.cook
---
tags: [grain, mexican]
source_week: 1
storage_days: 5
yield: 4 cups
---

Rinse @rice{2%cups} until water runs clear.
...
```

```
-- FILE: meals/mediterranean-grain-bowl.cook
---
tags: [bowl, assembly]
recipe_type: meal
prep_time: 5 minutes
---

Scoop @./components/lemon-herb-quinoa{1%cup} into bowl.
Add @./components/spiced-chickpeas{1/2%cup}.
Add @./components/mediterranean-roasted-vegetables{1/2%cup}.
Dollop @./components/cashew-tzatziki{2%tbsp}.
Top with @cucumber{1/4%cup}(diced), @kalamata olives{2%tbsp}, and @pepitas{1%tbsp}.
Drizzle with @./components/lemon-tahini-dressing{1%tbsp}.
```

```yaml
# FILE: plans/week-1.yaml
week: 1
year: 2026
theme: Mediterranean + Mexican
start_date: 2026-01-01

days:
  - day: 1
    date: 2026-01-01
    meals:
      breakfast: meals/smoothie
      lunch: null  # Prep day - ad hoc
      dinner: meals/mediterranean-grain-bowl
      snack: meals/hummus-and-veg

prep_timeline:
  - time: "0:00"
    task: Start quinoa
    recipe: components/lemon-herb-quinoa
  - time: "0:05"
    task: Start lentils
```

**Pros**:
- Leverage Cooklang parser/tools
- Human-friendly authoring
- Recipe references work naturally

**Cons**:
- Weekly plans need separate format
- Non-standard metadata fields
- Two formats to learn (Cooklang + YAML)

### Option B: Extended YAML (ORF-inspired)

Design a YAML-based format inspired by ORF but tailored for meal prep.

**Implementation**:

```yaml
# FILE: components/cilantro-lime-rice.yaml
id: w1-cilantro-lime-rice
name: Cilantro-Lime Rice
type: component

yield:
  amount: 4
  unit: cups
storage:
  days: 5
  method: refrigerated
  reheat: Microwave with splash of water, covered.

ingredients:
  - name: long-grain white rice
    amount: 2
    unit: cups
    category: grains
    prep: rinsed
  - name: water
    amount: 3
    unit: cups
    category: pantry

instructions:
  - Rinse rice until water runs clear.
  - Combine rice, water, and salt in pot. Cook until done.
  - Fluff with fork. While hot, stir in lime juice, zest, oil, and cilantro.
  - Cool and store.

tags: [grain, mexican]
meal_types: [lunch, dinner]
```

```yaml
# FILE: meals/mediterranean-grain-bowl.yaml
id: w1-meal-mediterranean-grain-bowl
name: Mediterranean Grain Bowl
type: meal

prep_time: 5 minutes
servings: 1

components:
  - recipe: components/lemon-herb-quinoa
    amount: 1
    unit: cup
  - recipe: components/spiced-chickpeas
    amount: 0.5
    unit: cup
  - recipe: components/mediterranean-roasted-vegetables
    amount: 0.5
    unit: cup
  - recipe: components/cashew-tzatziki
    amount: 2
    unit: tbsp
  - recipe: components/lemon-tahini-dressing
    amount: 1
    unit: tbsp

fresh_items:
  - name: cucumber
    amount: 0.25
    unit: cup
    prep: diced
  - name: kalamata olives
    amount: 2
    unit: tbsp
  - name: pepitas
    amount: 1
    unit: tbsp

instructions:
  - Scoop quinoa into bowl.
  - Add chickpeas and roasted vegetables.
  - Dollop tzatziki in center.
  - Top with cucumber, olives, and pepitas.
  - Drizzle with tahini dressing.

tags: [bowl, quick-assembly]
```

**Pros**:
- Single format for everything (recipes, meals, plans)
- Explicit structure (no parsing ambiguity)
- Easy to validate with JSON Schema
- Components vs fresh items clearly separated
- Works well with existing seed.json structure

**Cons**:
- More verbose than Cooklang
- Ingredients listed separately from instructions
- Less "readable as prose"

### Option C: Hybrid - Cooklang for Components, YAML for Meals/Plans

Use each format for what it's best at.

**Implementation**:
- **Component recipes**: Cooklang (`.cook` files) - authoring experience matters most
- **Meal recipes**: YAML (`.yaml` files) - explicit component linking
- **Weekly plans**: YAML (`.yaml` files) - structured scheduling
- **Export**: Generate schema.org JSON-LD for interoperability

**Pros**:
- Best authoring experience for detailed recipes
- Explicit structure for compositions
- Plays to each format's strengths

**Cons**:
- Two formats to learn and maintain
- Tooling complexity (two parsers)
- Conversion between formats

### Option D: Bespoke JSON with Markdown Instructions

Design a JSON schema optimized for our needs, with markdown for instruction text.

```json
{
  "$schema": "./recipe.schema.json",
  "id": "w1-cilantro-lime-rice",
  "name": "Cilantro-Lime Rice",
  "type": "component",
  "source_week": 1,

  "yield": { "amount": 4, "unit": "cups" },
  "storage": { "days": 5, "method": "refrigerated" },
  "times": { "prep": 5, "cook": 20 },

  "ingredients": [
    { "name": "long-grain white rice", "amount": 2, "unit": "cups", "category": "grains" },
    { "name": "water", "amount": 3, "unit": "cups" }
  ],

  "instructions": "1. Rinse rice until water runs clear.\n2. Combine rice, water, and salt in pot.\n3. Cook until done (~20 min).\n4. Fluff and stir in lime juice, zest, oil, cilantro.",

  "tags": ["grain", "mexican"],
  "meal_types": ["lunch", "dinner"]
}
```

**Pros**:
- Direct mapping to database schema
- JSON Schema validation
- No conversion needed for database import
- Markdown instructions are readable

**Cons**:
- Worst authoring experience (JSON quotes, escaping)
- Ingredients separate from instructions
- Not interoperable with any standard

---

## Recommendation

**Option A: Cooklang for Recipes + YAML Extension for Meal Planning**

Given the community analysis, we should **build on Cooklang's momentum** rather than create another orphan format.

### Rationale

1. **Community momentum**: 1,000+ stars, active development, welcoming to contributors
2. **Existing tooling**: Parsers in Rust, TypeScript, Python; CLI; Obsidian plugin
3. **Recipe authoring**: Best-in-class human-readable format for writing recipes
4. **Sub-recipe linking**: Native support via `@./path/Recipe{qty}` syntax
5. **Federation model**: Aligns with open sharing philosophy
6. **Contribution opportunity**: Meal planning is a **major gap** we can fill

### What We Adopt From Cooklang

- `.cook` file format for all recipes (components and meals)
- Standard `>> key: value` metadata
- Ingredient syntax: `@ingredient{qty%unit}`
- Timer syntax: `~{time%unit}`
- Recipe references: `@../components/recipe-name{qty%unit}` (standard syntax, we interpret paths as links)

### Semantic Layering (No Format Extensions)

Instead of extending Cooklang with custom metadata fields, we **layer our semantics on top** using existing structure:

| Semantic | Source | Example |
|----------|--------|---------|
| Recipe type | Directory path | `recipes/components/` = component, `recipes/meals/` = meal |
| Category | Subdirectory | `components/grains/`, `components/proteins/` |
| Week assignment | `.mealplan` file | Referenced in `week-1.mealplan` |
| Meal slot | `.mealplan` file | Listed under `days[].meals.lunch` |

This approach:
- **No format extensions** — pure standard Cooklang
- **No proposal process needed** — we're just using it as designed
- **Maximum interoperability** — any Cooklang tool works with our recipes
- **Clear separation** — recipe content vs. organizational metadata

Storage metadata uses standard Cooklang fields (flattened):
```cooklang
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water, covered, 1-2 minutes.
```

### Meal Plan Files (`.mealplan` format)

A YAML-based format for weekly schedules that references `.cook` files:

```yaml
# week-1.mealplan
schema: cooklang-mealplan/v1
week: 1
year: 2026
theme: Mediterranean + Mexican
start_date: 2026-01-01

components:
  - recipe: components/cilantro-lime-rice.cook
    category: grain
  - recipe: components/spiced-chickpeas.cook
    category: protein

days:
  - day: 1
    date: 2026-01-01
    meals:
      breakfast: meals/smoothie.cook
      lunch: null
      dinner: meals/mediterranean-grain-bowl.cook
      snacks:
        - meals/hummus-and-veg.cook

prep_timeline:
  - time: "0:00"
    task: Start quinoa
    recipe: components/lemon-herb-quinoa.cook
    duration: 15
  - time: "0:05"
    task: Start lentils
    recipe: components/lentil-walnut-taco-meat.cook
    duration: 25
```

### Potential Community Contributions

| Contribution | Target | Description |
|--------------|--------|-------------|
| `.mealplan` format spec | New repo | YAML format for meal planning on top of Cooklang |
| Grocery aggregation CLI | New repo | Parse mealplan, aggregate ingredients across recipes |
| Schema.org export tool | New repo | Convert Cooklang to schema.org/Recipe JSON-LD |
| Vegan recipe corpus | Open dataset | Our recipes as open content |

### Why This Approach Wins

1. **Pure standard Cooklang**: No extensions means maximum interoperability
2. **Clear separation of concerns**: Recipe content in `.cook`, organization in `.mealplan`
3. **No proposal process needed**: We're using Cooklang as designed
4. **Filling a real gap**: `.mealplan` format addresses meal planning needs
5. **Contribution-ready**: Our tooling can benefit the broader community

### Format Specification

See Appendix A for the complete schema specification.

---

## Implementation Plan

### Phase 1: Format Specification & Tooling Assessment
1. Review Cooklang spec in detail, identify extension points
2. Draft `.mealplan` format specification
3. Evaluate existing Cooklang parsers for our needs:
   - [cooklang-ts](https://github.com/cooklang/cooklang-ts) (archived) - fork candidate
   - [cooklang-rs](https://github.com/cooklang/cooklang-rs) - reference implementation
4. Define JSON Schema for `.mealplan` validation

### Phase 2: Content Migration
1. Create `recipes/` directory structure:
   ```
   recipes/
   ├── components/          # Batch prep items (.cook files)
   │   ├── grains/
   │   ├── proteins/
   │   ├── sauces/
   │   └── vegetables/
   ├── meals/               # Assembly recipes (.cook files)
   │   ├── bowls/
   │   ├── tacos/
   │   └── salads/
   └── plans/               # Weekly schedules (.mealplan files)
       ├── week-1.mealplan
       └── week-2.mealplan
   ```
2. Convert Week 1 markdown to Cooklang format (manual, establish patterns)
3. Build conversion script for remaining weeks
4. Validate all content

### Phase 3: Parser & Import Pipeline
1. Fork/revive cooklang-ts or integrate cooklang-rs via WASM
2. Build `.mealplan` parser (YAML + recipe resolution)
3. Build Cooklang → Database import script (`scripts/import-recipes.ts`)
4. Implement grocery aggregation logic

### Phase 4: Community Contribution
1. Publish `.mealplan` spec as RFC to Cooklang community
2. Contribute storage/meal-prep metadata fields to spec discussions
3. Open source our TypeScript parser improvements
4. Release grocery aggregation tool

### Phase 5: Export & Interoperability
1. Build Database → Cooklang export (round-trip)
2. Build Cooklang → schema.org/Recipe export
3. Document integration with Tandoor, Mealie, etc.

---

## Consequences

### Positive
- **Community leverage**: Building on 1,000+ star project with active maintainers
- **Best authoring experience**: Cooklang reads like natural recipe instructions
- **Contribution opportunity**: Meal planning extension fills real gap in ecosystem
- **Future-proof**: If adopted by Cooklang, we're on the standard; if not, still valid
- **Tooling head start**: Existing parsers, CLI, editor plugins
- **Interoperability path**: Schema.org export enables sharing with wider ecosystem
- **Version control friendly**: Both `.cook` and `.mealplan` diff well in git

### Negative
- **Two formats**: Recipes in Cooklang, plans in YAML (but clear separation of concerns)
- **Parser work**: May need to fork/maintain TypeScript parser
- **Community alignment**: Extension proposals may not be accepted upstream
- **Learning curve**: Team needs to learn Cooklang syntax

### Neutral
- **Migration effort**: Converting existing content is similar regardless of target format
- **Database mapping**: Still need transformation layer (Cooklang AST → SQLite rows)

### Community Impact
- **Give back**: Our tooling can benefit the broader Cooklang community
- **Meal prep niche**: We become the reference implementation for batch cooking
- **Vegan corpus**: Our recipe dataset could be contributed to open repositories

---

## Appendix A: Format Specification (Draft)

### Component Recipe (Standard Cooklang `.cook` file)

Located in `recipes/components/` — recipe type inferred from path.

```cooklang
>> title: Cilantro-Lime Rice
>> cuisine: Mexican
>> tags: grain, vegan, gluten-free
>> servings: 4
>> yield: 4 cups
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water, covered, 1-2 minutes.

Rinse @rice{2%cups} until water runs clear.

Combine rice, @water{3%cups}, and @kosher salt{1%tsp} in #pot{}. Cook ~{20%minutes} until done.

Fluff with fork. While still hot, stir in @fresh lime juice{2%tbsp}, @lime zest{1}, @olive oil{1%tbsp}, and @fresh cilantro{1/2%cup}(finely chopped).

Let cool, then transfer to airtight container.
```

### Meal Recipe (Standard Cooklang `.cook` file with component references)

Located in `recipes/meals/` — recipe type inferred from path.

```cooklang
>> title: Mediterranean Grain Bowl
>> cuisine: Mediterranean
>> tags: bowl, quick-assembly, vegan
>> servings: 1

-- This is an assembly recipe - all components should be prepped ahead.

Scoop @../components/grains/lemon-herb-quinoa{1%cup} into bowl.

Add @../components/proteins/spiced-chickpeas{1/2%cup} on one side.

Add @../components/vegetables/mediterranean-roasted-vegetables{1/2%cup}.

Dollop @../components/sauces/cashew-tzatziki{2%tbsp} in the center.

Top with fresh @cucumber{1/4%cup}(diced), @kalamata olives{2%tbsp}, and @pepitas{1%tbsp}.

Drizzle with @../components/sauces/lemon-tahini-dressing{1%tbsp}.
```

### Meal Plan (`.mealplan` YAML file)

```yaml
# week-1.mealplan
$schema: https://example.com/schemas/mealplan.v1.json

id: week-1
week_number: 1
year: 2026
name: "Week 1: Mediterranean + Mexican"
theme: Mediterranean + Mexican
start_date: 2026-01-01

# Components prepared during batch cooking session
components:
  grains:
    - components/grains/cilantro-lime-rice.cook
    - components/grains/lemon-herb-quinoa.cook
  proteins:
    - components/proteins/spiced-chickpeas.cook
    - components/proteins/smoky-black-beans.cook
    - components/proteins/lentil-walnut-taco-meat.cook
  sauces:
    - components/sauces/cashew-tzatziki.cook
    - components/sauces/chipotle-crema.cook
    - components/sauces/lemon-tahini-dressing.cook
  vegetables:
    - components/vegetables/mediterranean-roasted-vegetables.cook
    - components/vegetables/fajita-vegetables.cook
  breakfast:
    - components/breakfast/overnight-oats.cook
    - components/breakfast/chickpea-scramble-base.cook
    - components/breakfast/smoothie-packs.cook
  snacks:
    - components/snacks/classic-hummus.cook
    - components/snacks/energy-balls.cook
    - components/snacks/roasted-chickpeas.cook

# Daily meal schedule
days:
  - day: 1
    date: 2026-01-01
    day_name: Thursday
    meals:
      breakfast:
        recipe: meals/smoothie.cook
      lunch:
        description: "Prep-Day Avocado Toast"  # Ad-hoc, no recipe
        note: "Toast bread, mash avocado with salt, pepper, red pepper flakes"
      dinner:
        recipe: meals/mediterranean-grain-bowl.cook
      snacks:
        - recipe: meals/hummus-and-veg.cook

  - day: 2
    date: 2026-01-02
    day_name: Friday
    meals:
      breakfast:
        recipe: components/breakfast/overnight-oats.cook
        note: "Jar 1: Chocolate Cherry"
      lunch:
        recipe: meals/mediterranean-grain-bowl.cook
      dinner:
        recipe: meals/loaded-black-bean-tacos.cook
      snacks:
        - recipe: components/snacks/energy-balls.cook

# Prep timeline for batch cooking session
prep_timeline:
  - time: "0:00"
    task: Start quinoa (Instant Pot or stovetop)
    recipe: components/grains/lemon-herb-quinoa.cook
    duration: 15
  - time: "0:05"
    task: Start lentils cooking
    recipe: components/proteins/lentil-walnut-taco-meat.cook
    duration: 25
  - time: "0:10"
    task: Soak cashews in boiling water
    duration: 15
  - time: "0:10"
    task: Chop all onions, peppers, garlic (mise en place)
    duration: 15
  - time: "0:25"
    task: Start rice cooking
    recipe: components/grains/cilantro-lime-rice.cook
    duration: 20
  # ... continues

# Grocery list overrides (for items not captured in recipes)
grocery_additions:
  - name: avocados
    amount: 5
    unit: whole
    note: "For tacos, bowls, toast"
  - name: limes
    amount: 6
    note: "For rice, beans, bowls"
```

### Metadata Fields Reference

Standard Cooklang metadata (no custom extensions):

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Recipe name |
| `cuisine` | string | Cuisine type (e.g., "Mexican", "Mediterranean") |
| `tags` | string | Comma-separated tags (e.g., "grain, vegan, gluten-free") |
| `servings` | int | Number of servings |
| `yield` | string | Output amount (e.g., "4 cups") |
| `storage_days` | int | How long it keeps (days) |
| `storage_method` | string | `refrigerated`, `frozen`, or `room-temp` |
| `reheat` | string | Reheating instructions |

Semantic information inferred from context:

| Semantic | Source |
|----------|--------|
| Recipe type | Directory path (`components/` vs `meals/`) |
| Category | Subdirectory (`grains/`, `proteins/`, etc.) |
| Week assignment | `.mealplan` file references |
| Meal slot | `.mealplan` day/meal structure |

---

## References

- [Schema.org/Recipe](https://schema.org/Recipe) - W3C structured data standard
- [Cooklang Specification](https://cooklang.org/docs/spec/) - Recipe markup language
- [Cooklang GitHub](https://github.com/cooklang) - Organization with 31 repos, 377 followers
- [Open Recipe Format](https://open-recipe-format.readthedocs.io/) - YAML-based recipe format
- [Tandoor Recipes](https://github.com/TandoorRecipes/recipes) - 7.8k star recipe management app
- [Recipe Formats Comparison](https://rknight.me/blog/thinking-about-recipe-formats-more-than-anyone-should/) - Developer analysis
- [2024 Web Almanac - Structured Data](https://almanac.httparchive.org/en/2024/structured-data) - Schema.org adoption stats
- ADR-005: Meal vs Component Architecture (internal)
