# PDF to Cooklang Conversion System Design

## Overview

Design a mechanism to convert meal plan PDFs (like Rainbow Plant Life's "February 1 Meal Plan") into:
1. Component recipes (`.cook` files in `recipes/components/`)
2. Meal recipes (`.cook` files in `recipes/meals/`)
3. A weekly plan file (`.mealplan` in `recipes/plans/`)

---

## Source PDF Structure Analysis

Based on the "February 1 Meal Plan" PDF, meal plan PDFs typically contain:

| Section | Content | Target Output |
|---------|---------|---------------|
| Cover | Title, season, photos | Mealplan metadata |
| This Week's Meals | Overview of 3-4 recipes | Mealplan `days` structure |
| Grocery List | Ingredients by category | Validation/reference |
| Grocery Notes | Substitutions, tips | Recipe `notes` |
| Component Prep | Sauce/prep recipes | `components/*.cook` files |
| Full Recipes | Main dishes | `meals/*.cook` files |
| Recipe Notes | Storage, tips per recipe | Recipe metadata |
| Appendix | Emergency meals, nutrition | Optional reference |

---

## Target Output Structure

```
recipes/
├── components/
│   ├── sauces/
│   │   ├── easy-queso.cook
│   │   └── lemon-tahini-vinaigrette.cook
│   ├── proteins/
│   │   └── drained-chickpeas.cook
│   └── spice-blends/
│       └── harissa-blend.cook
├── meals/
│   ├── quesadillas/
│   │   └── buffalo-chickpea-quesadillas.cook
│   ├── bowls/
│   │   └── loaded-burrito-bowls.cook
│   ├── stews/
│   │   └── stewed-harissa-chickpeas.cook
│   └── salads/
│       └── brussels-kale-salad.cook
└── plans/
    └── february-1.mealplan
```

---

## Conversion Architecture

### Option A: LLM-Assisted Pipeline (Recommended)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  PDF File   │────▶│ Text/Vision  │────▶│ LLM Parsing  │────▶│  Structured │
│             │     │  Extraction  │     │   (Claude)   │     │    JSON     │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
                                                                     │
                    ┌──────────────┐     ┌──────────────┐            │
                    │  .mealplan   │◀────│  Cooklang    │◀───────────┘
                    │    file      │     │  Generator   │
                    └──────────────┘     └──────────────┘
```

**Why LLM-assisted:**
- PDFs have inconsistent formatting
- Recipe text is narrative, needs semantic parsing
- Ingredient quantities are expressed in various ways
- Component/meal classification requires understanding
- Cross-references between recipes need inference

### Option B: Interactive CLI Wizard

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  PDF File   │────▶│  pdfjs-dist  │────▶│  Structured  │
│             │     │  extraction  │     │   Sections   │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                    ┌──────────────┐            ▼
                    │   CLI with   │◀────  User prompts
                    │  validation  │       for ambiguous
                    └──────────────┘         items
```

### Recommended: Hybrid Approach

Combine both: Use LLM for heavy lifting, CLI for validation and edge cases.

---

## Data Models

### Intermediate JSON Format (PDF → JSON)

```typescript
interface ParsedMealPlan {
  // Metadata extracted from cover/title
  metadata: {
    title: string;           // "February 1 Meal Plan"
    season?: string;         // "Winter 2024"
    source?: string;         // "Rainbow Plant Life"
    servings_per_meal?: number;
  };

  // Component prep recipes (sauces, bases, etc.)
  components: ParsedRecipe[];

  // Full meal recipes
  meals: ParsedRecipe[];

  // Weekly schedule (if specified)
  schedule?: {
    meal_order: string[];    // ["Buffalo Chickpea Quesadillas", "Harissa Chickpeas", ...]
    side_dishes: string[];   // ["Brussels & Kale Salad"]
    pairings?: Record<string, string[]>;  // { "Quesadillas": ["Brussels & Kale Salad"] }
  };

  // Grocery list for validation
  grocery_list?: GrocerySection[];

  // Notes and tips
  notes?: {
    shortcuts?: string[];
    substitutions?: Record<string, string>;
    storage?: Record<string, string>;
  };
}

interface ParsedRecipe {
  // Basic info
  title: string;
  description?: string;

  // Classification
  recipe_type: 'component' | 'meal';
  category?: string;         // grains, proteins, sauces, bowls, tacos, etc.
  cuisine?: string;          // Mexican, Mediterranean, Moroccan, etc.
  tags?: string[];           // vegan, gluten-free, etc.

  // Timing
  servings?: number;
  serving_unit?: string;     // "quesadillas", "cups", etc.
  active_time?: number;      // minutes
  inactive_time?: number;

  // Storage (for components)
  storage_days?: number;
  storage_method?: string;   // refrigerated, frozen, pantry
  reheat?: string;

  // Content
  ingredients: ParsedIngredient[];
  instructions: ParsedInstruction[];
  notes?: string[];

  // Dependencies (components used by this recipe)
  uses_components?: string[];  // ["Easy Queso", "Drained Chickpeas"]
}

interface ParsedIngredient {
  name: string;              // "raw cashews"
  quantity?: number | string; // 1, "1/2", "1 to 2", etc.
  unit?: string;             // "cup", "TBSP", "cloves", etc.
  preparation?: string;      // "finely chopped", "diced"
  notes?: string;            // "from meal prep"
  optional?: boolean;

  // If this ingredient is a prepped component
  is_component_ref?: boolean;
  component_name?: string;   // "Easy Queso"
}

interface ParsedInstruction {
  step_number: number;
  text: string;
  sub_steps?: string[];      // For nested instructions (a, b, c)
  timer?: {
    duration: number;
    unit: string;            // "minutes", "seconds"
  };
  references_component?: string;  // If step uses a prepped component
}

interface GrocerySection {
  category: string;          // "Produce", "Pantry", "Spices", etc.
  items: {
    name: string;
    quantity: string;
    used_in?: string[];      // Which recipes use this
  }[];
}
```

---

## LLM Prompting Strategy

### Phase 1: Document Structure Analysis

```
You are analyzing a meal plan PDF. Identify the following sections and their page ranges:
- Cover/Title page
- This Week's Meals overview
- Grocery List
- Grocery Notes
- Component/Prep recipes
- Main recipes
- Appendix/Nutrition

For each section, note:
1. Start and end page numbers
2. Key content types (text, tables, recipe cards)
3. Any cross-references between sections
```

### Phase 2: Recipe Extraction

```
Extract recipes from this meal plan section. For each recipe, provide:

1. TITLE: Exact recipe name
2. TYPE: "component" (prep ahead sauce/base) or "meal" (full dish)
3. CATEGORY: Suggest appropriate folder (grains, proteins, sauces, bowls, etc.)
4. CUISINE: Primary cuisine influence
5. SERVINGS: Number and unit (e.g., "4 servings", "2 cups")
6. TIME: Active and inactive time in minutes
7. STORAGE: Days, method, reheat instructions (for components)

8. INGREDIENTS: For each ingredient:
   - name: ingredient name (lowercase, multi-word OK)
   - quantity: number or fraction
   - unit: standardized (tsp, tbsp, cup, oz, g, etc.)
   - preparation: any prep notes (diced, minced, etc.)
   - optional: true/false
   - is_component: true if referencing another recipe in this plan

9. INSTRUCTIONS: Array of steps, preserving sub-steps

10. NOTES: Storage tips, variations, nutrition boosts

11. USES_COMPONENTS: List component recipe names this recipe depends on
```

### Phase 3: Cross-Reference Resolution

```
Given these extracted recipes, identify:

1. Which recipes are COMPONENTS (made ahead, used in other recipes)
2. Which recipes are MEALS (final dishes that may use components)
3. For each MEAL, list the COMPONENTS it uses

Map ingredient references to component recipes:
- "Queso (from meal prep)" → references "Easy Queso" component
- "Shredded Kale and Brussels Sprouts (from meal prep)" → references prep step in salad
- "Half batch of Drained Chickpeas" → references "Drained Chickpeas" component
```

---

## Cooklang Generation Rules

### Ingredient Formatting

| PDF Format | Cooklang Output |
|------------|-----------------|
| `1 cup (135g) raw cashews` | `@raw cashews{1%cup}` |
| `4 TBSP / 56g vegan butter` | `@vegan butter{4%tbsp}` |
| `1 medium yellow onion, diced` | `@yellow onion{1}(diced)` |
| `4 garlic cloves, finely chopped` | `@garlic{4%cloves}(finely chopped)` |
| `Kosher salt to taste` | `@kosher salt{}` |
| `Queso - 1⅓ cups (from meal prep)` | `@../components/sauces/easy-queso{1 1/3%cups}` |

### Component References in Meals

When a meal uses a prepped component:

```cooklang
-- Buffalo Chickpea Quesadillas uses Easy Queso component
Spread @../components/sauces/easy-queso{1/4%cup} onto one tortilla.

-- Uses Drained Chickpeas component
In a bowl, roughly mash @../components/proteins/drained-chickpeas{375%g} with #fork{}.
```

### Unit Standardization

| PDF | Cooklang Standard |
|-----|-------------------|
| TBSP, Tbsp, tablespoon | `tbsp` |
| tsp, teaspoon | `tsp` |
| oz, ounce | `oz` |
| g, gram | `g` |
| mL, ml | `mL` |
| lb, pound | `lb` |

### Filename Generation

```
Title: "Buffalo Chickpea Quesadillas"
→ Slug: "buffalo-chickpea-quesadillas"
→ Path: "meals/quesadillas/buffalo-chickpea-quesadillas.cook"

Title: "Easy Queso Sauce"
→ Slug: "easy-queso"
→ Path: "components/sauces/easy-queso.cook"
```

---

## CLI Tool Design: `vmp convert`

### Commands

```bash
# Convert a PDF to Cooklang recipes and mealplan
vmp convert input.pdf --output ./recipes/

# Interactive mode with review steps
vmp convert input.pdf --interactive

# Use vision model for better extraction
vmp convert input.pdf --use-vision

# Specify the AI model to use
vmp convert input.pdf --model claude-3-opus

# Preview without writing files
vmp convert input.pdf --dry-run

# Validate existing conversion
vmp convert input.pdf --validate-only
```

### Interactive Flow

```
$ vmp convert "February 1 Meal Plan.pdf" --interactive

📄 Analyzing PDF structure...
Found 22 pages with 4 main recipes and 4 prep components.

📋 Detected Recipes:
  COMPONENTS:
    1. Easy Queso Sauce → components/sauces/easy-queso.cook
    2. Drained Chickpeas → components/proteins/drained-chickpeas.cook
    3. Lemon-Tahini Vinaigrette → components/sauces/lemon-tahini-vinaigrette.cook
    4. Harissa Blend → components/spice-blends/harissa-blend.cook

  MEALS:
    1. Buffalo Chickpea Quesadillas → meals/quesadillas/buffalo-chickpea-quesadillas.cook
    2. Brussels & Kale Salad → meals/salads/brussels-kale-salad.cook
    3. Stewed Harissa Chickpeas → meals/stews/stewed-harissa-chickpeas.cook
    4. Loaded Burrito Bowls → meals/bowls/loaded-burrito-bowls.cook

? Confirm recipe classification? (Y/n) y

🔗 Resolving component references...
  • Buffalo Chickpea Quesadillas uses: Easy Queso, Drained Chickpeas
  • Brussels & Kale Salad uses: Lemon-Tahini Vinaigrette
  • Harissa Chickpeas uses: Harissa Blend, Drained Chickpeas
  • Burrito Bowls uses: Easy Queso

? Review extracted ingredients for "Easy Queso Sauce"?
  1. @raw cashews{1%cup}
  2. @vegan yogurt{1/2%cup}
  3. @salsa{1/2%cup}
  4. @water{2%tbsp}
  ... (y to confirm, e to edit, s to skip)

✅ Generated 8 recipe files
✅ Generated february-1.mealplan

Output:
  recipes/components/sauces/easy-queso.cook
  recipes/components/proteins/drained-chickpeas.cook
  recipes/components/sauces/lemon-tahini-vinaigrette.cook
  recipes/components/spice-blends/harissa-blend.cook
  recipes/meals/quesadillas/buffalo-chickpea-quesadillas.cook
  recipes/meals/salads/brussels-kale-salad.cook
  recipes/meals/stews/stewed-harissa-chickpeas.cook
  recipes/meals/bowls/loaded-burrito-bowls.cook
  recipes/plans/february-1.mealplan
```

---

## Example Output Files

### Component: `recipes/components/sauces/easy-queso.cook`

```cooklang
>> title: Easy Queso Sauce
>> cuisine: Mexican
>> tags: sauce, vegan, gluten-free, soy-free
>> servings: 8
>> yield: 2 cups
>> storage_days: 7
>> storage_method: refrigerated
>> reheat: Gently reheat in saucepan over low heat, adding splash of plant milk if thick.

-- Shared component used in Buffalo Chickpea Quesadillas and Loaded Burrito Bowls

== Prep

Soak @raw cashews{1%cup} in boiling water for ~{10-15%minutes}. If no high-powered blender, boil for ~{15-20%minutes}.

Drain cashews in #colander{} and rinse with fresh water.

== Blend

Add soaked cashews to #high-powered blender{} (or #food processor{}).

Add @vegan yogurt{1/2%cup}(good-quality, thick, plain), @salsa{1/2%cup}, @water{2%tbsp}, @ground cumin{1%tsp}, @chili powder{1/2%tsp}, @smoked paprika{1/2%tsp}, @black pepper{}(freshly cracked), @nutritional yeast{2%tbsp}, @pickled jalapeños{2%tbsp}, and @jalapeño brine{2%tbsp}.

Blend until thick, creamy, and smooth, scraping down sides as needed.

Taste and adjust: add @kosher salt{} to taste, more jalapeños for tangy heat, or more nutritional yeast for cheesy flavor.

== Store

Transfer to #jar{} and store in fridge for about 1 week.
```

### Meal: `recipes/meals/quesadillas/buffalo-chickpea-quesadillas.cook`

```cooklang
>> title: Buffalo Chickpea Quesadillas
>> cuisine: American
>> tags: main, vegan, comfort-food
>> servings: 4
>> yield: 4 quesadillas
>> prep_time: 10
>> cook_time: 25

-- Components used: Easy Queso, Drained Chickpeas
-- Serve with: Brussels & Kale Salad

== Buffalo Sauce

Melt @vegan butter{4%tbsp} in #heatproof bowl{} in microwave (or in #saucepan{} on stove).

Add @Frank's RedHot hot sauce{4%tbsp}, @garlic powder{1/8%tsp}, @cayenne pepper{}(pinch, optional), @kosher salt{}(pinch), and @coconut sugar{2%tsp}.

Whisk until completely incorporated. Set aside.

== Buffalo Chickpeas

Roughly mash @../components/proteins/drained-chickpeas{375%g}(half batch) with #fork{} or #potato masher{}, leaving some beans intact.

Heat @neutral oil{1%tbsp} in #large skillet{} over medium heat.

Add @yellow onion{1}(diced, ~2 cups) and cook ~{4-5%minutes} until softened.

Add @garlic{4%cloves}(finely chopped) and cook ~{1%minute}, stirring frequently.

Pour in buffalo sauce and mashed chickpeas. Bring to boil.

Reduce heat to low and simmer ~{2%minutes}, stirring occasionally.

Mix in @scallions{1%bunch}(white and light green parts, sliced). Turn off heat.

Wipe out skillet for quesadillas.

== Assemble & Cook

Spread @../components/sauces/easy-queso{1/4%cup} onto one @flour tortilla{1%large}, leaving border around edges.

Arrange about 1/2 cup buffalo chickpea filling on top and spread across queso.

Place another tortilla on top to cover.

Lightly grease #large skillet{} with oil and place over medium heat.

Add quesadilla and place #smaller skillet{} on top to press down. Weigh down with cans if desired.

Cook ~{3%minutes}, then flip and cook ~{1-2%minutes} until both sides are crispy and browned.

Repeat with remaining tortillas, queso, and filling.

== Serve

Serve quesadillas with Brussels & Kale Salad on the side.

-- Storage: Store filling separately from queso. Filling keeps 3-4 days, queso about 1 week.
-- Tips: If sensitive to spicy food, use less hot sauce. For GF, use gluten-free tortillas.
```

### Mealplan: `recipes/plans/february-1.mealplan`

```yaml
# February 1 Meal Plan
# Rainbow Plant Life - Winter 2024

$schema: ../schemas/mealplan.v1.json

id: february-1
name: "February 1 Meal Plan"
theme: Winter Comfort Food
source: Rainbow Plant Life
year: 2024
week_number: 5

# Estimated prep time for batch cooking
prep_time_total: 90  # 60-90 minutes

# Components prepared during batch cooking session
components:
  sauces:
    - components/sauces/easy-queso.cook
    - components/sauces/lemon-tahini-vinaigrette.cook
  proteins:
    - components/proteins/drained-chickpeas.cook
  spice-blends:
    - components/spice-blends/harissa-blend.cook
  vegetables:
    - components/vegetables/shredded-kale-brussels.cook

# Meal order as presented in PDF
meals:
  - recipe: meals/quesadillas/buffalo-chickpea-quesadillas.cook
    label: "Meal 1"
    serve_with:
      - meals/salads/brussels-kale-salad.cook
  - recipe: meals/stews/stewed-harissa-chickpeas.cook
    label: "Meal 2"
    serve_with:
      - meals/salads/brussels-kale-salad.cook
  - recipe: meals/bowls/loaded-burrito-bowls.cook
    label: "Meal 3"
  - recipe: meals/salads/brussels-kale-salad.cook
    label: "Side"
    note: "Make twice - once with quesadillas, once with harissa chickpeas"

# Prep timeline for batch cooking session
prep_timeline:
  - time: "0:00"
    task: "Soak cashews in boiling water"
    duration: 15
    note: "For Easy Queso"
  - time: "0:05"
    task: "Make Easy Queso Sauce"
    recipe: components/sauces/easy-queso.cook
    duration: 10
  - time: "0:15"
    task: "Drain and prep chickpeas"
    recipe: components/proteins/drained-chickpeas.cook
    duration: 10
    note: "Divide in half for quesadillas and harissa"
  - time: "0:25"
    task: "Make Lemon-Tahini Vinaigrette"
    recipe: components/sauces/lemon-tahini-vinaigrette.cook
    duration: 10
  - time: "0:35"
    task: "Make Harissa Blend"
    recipe: components/spice-blends/harissa-blend.cook
    duration: 5
  - time: "0:40"
    task: "Prep vegetables (kale, Brussels, onions, garlic)"
    duration: 25
  - time: "1:05"
    task: "Prep fajita vegetables (bell peppers, red onion, jalapeño)"
    duration: 15
  - time: "1:20"
    task: "Clean up and store everything"
    duration: 10

# Grocery additions not captured in component recipes
grocery_additions:
  produce:
    - name: avocados
      amount: "1-2"
      note: "For burrito bowls"
    - name: limes
      amount: 2
      note: "For burrito bowls"
    - name: cilantro
      amount: 1 bunch
      note: "For burrito bowls, harissa chickpeas"
  pantry:
    - name: flour tortillas
      amount: 8
      note: "Large, for quesadillas"
    - name: long-grain white rice
      amount: "2 cups"
      note: "For harissa chickpeas and burrito bowls"
```

---

## Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Add PDF parsing dependency (`pdfjs-dist` or `pdf-parse`)
- [ ] Create `packages/cli/src/commands/convert.ts`
- [ ] Define intermediate JSON schema (`ParsedMealPlan`)
- [ ] Add schema validation with `ajv`

### Phase 2: PDF Extraction
- [ ] Implement text extraction from PDF pages
- [ ] Implement section detection (grocery, prep, recipes)
- [ ] Handle multi-column layouts
- [ ] Extract page numbers for reference

### Phase 3: LLM Integration
- [ ] Add Anthropic SDK dependency
- [ ] Implement structured prompting for recipe extraction
- [ ] Implement ingredient parsing prompt
- [ ] Implement instruction parsing prompt
- [ ] Add retry/fallback logic

### Phase 4: Cooklang Generation
- [ ] Implement `generateCooklang(recipe: ParsedRecipe): string`
- [ ] Implement ingredient formatting (`@name{qty%unit}`)
- [ ] Implement timer detection and formatting
- [ ] Implement cookware detection
- [ ] Implement section markers (`==`)

### Phase 5: Mealplan Generation
- [ ] Implement component classification logic
- [ ] Implement cross-reference detection
- [ ] Generate `.mealplan` YAML structure
- [ ] Link recipes to generated files

### Phase 6: CLI Polish
- [ ] Add `--interactive` mode
- [ ] Add `--dry-run` preview
- [ ] Add validation and error reporting
- [ ] Add progress indicators

### Phase 7: Testing
- [ ] Unit tests for ingredient parsing
- [ ] Unit tests for Cooklang generation
- [ ] Integration test with sample PDF
- [ ] Validate generated files parse correctly

---

## Technical Dependencies

```json
{
  "dependencies": {
    "pdfjs-dist": "^4.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "commander": "^12.0.0",
    "yaml": "^2.4.0",
    "ajv": "^8.12.0",
    "inquirer": "^9.2.0",
    "ora": "^8.0.0",
    "chalk": "^5.3.0"
  }
}
```

---

## Alternative: Manual Paste Workflow

For users without API access, provide a simpler workflow:

1. Copy text from PDF sections
2. Paste into web UI or CLI prompt
3. Tool structures the content with pattern matching
4. User reviews and corrects
5. Generate Cooklang files

This reduces LLM dependency but requires more user interaction.

---

## Security Considerations

1. **API Key Management**: Use environment variables, never commit keys
2. **PDF Validation**: Verify file type before processing
3. **Content Sanitization**: Escape special characters in generated Cooklang
4. **Rate Limiting**: Implement backoff for API calls
5. **Local Processing**: Offer offline mode with reduced functionality

---

## Future Enhancements

- **Vision Model Integration**: Use Claude's vision capabilities for better PDF understanding
- **Template Learning**: Learn from existing recipes to improve extraction
- **Batch Processing**: Convert multiple PDFs in one session
- **Web Interface**: Browser-based converter with drag-and-drop
- **Recipe Database**: Match extracted recipes to known recipes for validation
