# Mealplan File Format Specification

**Version:** 1.0
**Status:** Stable
**Schema:** `schemas/mealplan.schema.json`

---

## Overview

The `.mealplan` format is a YAML-based file format for defining weekly meal plans that reference Cooklang (`.cook`) recipe files. It provides structure for:

- **Weekly metadata** (dates, themes, naming)
- **Component lists** (batch-prepped recipes grouped by category)
- **Daily meal schedules** (breakfast, lunch, dinner, snacks)
- **Prep timelines** (coordinated batch cooking sessions)
- **Grocery additions** (items not captured in recipe files)

---

## File Structure

```yaml
# Comments start with #
$schema: ../schemas/mealplan.v1.json   # Optional schema reference

# Required fields
id: week-1                              # Unique identifier
week_number: 1                          # Week number (1-53)
year: 2026                              # Year
days: [...]                             # Daily meal schedules

# Optional fields
name: "Week 1: Mediterranean + Mexican"  # Display name
theme: Mediterranean + Mexican           # Cuisine theme(s)
start_date: 2026-01-01                   # ISO date (YYYY-MM-DD)
end_date: 2026-01-07                     # ISO date (YYYY-MM-DD)
prep_time_total: 150                     # Total prep time in minutes

components: {...}                        # Batch-prepped recipes
prep_timeline: [...]                     # Cooking session timeline
grocery_additions: {...}                 # Additional grocery items
```

---

## Fields Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier matching `week-N` pattern | `week-1` |
| `week_number` | integer | Week number within year (1-53) | `1` |
| `year` | integer | Year (2020-2100) | `2026` |
| `days` | array | Daily meal schedules (1-7 items) | See [Days](#days) |

### Optional Metadata

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `$schema` | string | JSON Schema reference | `../schemas/mealplan.v1.json` |
| `name` | string | Display name for the week | `"Week 1: Mediterranean + Mexican"` |
| `theme` | string | Cuisine theme(s) | `Mediterranean + Mexican` |
| `start_date` | date | Start date (ISO 8601) | `2026-01-01` |
| `end_date` | date | End date (ISO 8601) | `2026-01-07` |
| `prep_time_total` | integer | Total batch cooking time in minutes | `150` |

---

## Components

The `components` object groups batch-prepped recipes by category. Each category contains an array of recipe paths.

```yaml
components:
  grains:
    - components/grains/cilantro-lime-rice.cook
    - components/grains/lemon-herb-quinoa.cook
  proteins:
    - components/proteins/spiced-chickpeas.cook
    - components/proteins/smoky-black-beans.cook
  sauces:
    - components/sauces/cashew-tzatziki.cook
    - components/sauces/lemon-tahini-dressing.cook
  vegetables:
    - components/vegetables/mediterranean-roasted-vegetables.cook
    - components/vegetables/fajita-vegetables.cook
  breakfast:
    - components/breakfast/overnight-oats.cook
    - components/breakfast/chickpea-scramble-base.cook
  snacks:
    - components/snacks/classic-hummus.cook
    - components/snacks/energy-balls.cook
```

### Standard Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `grains` | Batch-cooked grains and starches | Rice, quinoa, farro |
| `proteins` | Protein-rich components | Chickpeas, lentils, tofu |
| `sauces` | Sauces, dressings, dips | Tzatziki, tahini dressing |
| `vegetables` | Roasted/prepped vegetables | Roasted peppers, fajita veggies |
| `breakfast` | Breakfast prep items | Overnight oats, scramble base |
| `snacks` | Snack items | Hummus, energy balls |

Custom categories are allowed using `additionalProperties`.

### Recipe Path Format

Recipe paths must:
- Be relative to the `recipes/` directory
- End with `.cook` extension
- Use lowercase alphanumeric characters, hyphens, underscores, and slashes

**Pattern:** `^[a-zA-Z0-9/_-]+\.cook$`

**Examples:**
- `components/grains/cilantro-lime-rice.cook`
- `meals/bowls/mediterranean-grain-bowl.cook`

---

## Days

The `days` array contains daily meal schedules. Each day is an object with meals.

```yaml
days:
  - day: 1
    date: 2026-01-01
    day_name: Thursday
    is_prep_day: true
    meals:
      breakfast:
        recipe: components/breakfast/smoothie-packs.cook
        note: "Blend while prepping"
      lunch:
        description: "Prep-Day Avocado Toast"
        note: "Eat while things are in the oven"
      dinner:
        recipe: meals/bowls/mediterranean-grain-bowl.cook
      snacks:
        - recipe: components/snacks/classic-hummus.cook
          note: "Serve with raw veggies"
```

### Day Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `day` | integer | Yes | Day number (1-7) |
| `date` | date | No | ISO 8601 date |
| `day_name` | enum | No | Day name (Monday-Sunday) |
| `is_prep_day` | boolean | No | Whether this is batch cooking day |
| `meals` | object | Yes | Meal assignments |

### Meals Object

```yaml
meals:
  breakfast: <meal_entry>
  lunch: <meal_entry>
  dinner: <meal_entry>
  snacks:
    - <meal_entry>
    - <meal_entry>
```

### Meal Entry Types

A meal entry can be one of three forms:

**1. Recipe Reference** (most common):
```yaml
breakfast:
  recipe: components/breakfast/overnight-oats.cook
  note: "Jar 1: Chocolate Cherry"
```

**2. Freeform Description** (for ad-hoc meals):
```yaml
lunch:
  description: "Prep-Day Avocado Toast"
  note: "Toast bread, mash avocado with salt, pepper, red pepper flakes"
```

**3. Null** (no meal planned):
```yaml
lunch: null
```

### Meal Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `recipe` | string | Path to `.cook` file (required for recipe entries) |
| `description` | string | Freeform text (required for description entries) |
| `note` | string | Optional additional notes |

---

## Prep Timeline

The `prep_timeline` array defines the batch cooking session as a sequence of timed tasks.

```yaml
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
    note: "For tzatziki and chipotle crema"
  - time: "0:10"
    task: Chop all onions, peppers, garlic (mise en place)
    duration: 15
```

### Prep Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `time` | string | Yes | Time marker in `H:MM` or `HH:MM` format |
| `task` | string | Yes | Description of the task |
| `recipe` | string | No | Associated recipe path |
| `duration` | integer | No | Task duration in minutes |
| `note` | string | No | Additional notes |

### Time Format

**Pattern:** `^[0-9]{1,2}:[0-9]{2}$`

Times are relative to the start of the prep session (0:00).

**Examples:**
- `0:00` - Start of prep
- `0:30` - 30 minutes in
- `1:15` - 1 hour 15 minutes in
- `2:30` - 2 hours 30 minutes in

---

## Grocery Additions

The `grocery_additions` object lists items not captured in component recipes.

```yaml
grocery_additions:
  produce:
    - name: avocados
      amount: 5-6
      note: "For tacos, bowls, toast"
    - name: limes
      amount: 6
      note: "For rice, beans, crema, bowls"
    - name: romaine lettuce
      amount: 2
      unit: heads
      note: "Tacos, salads, wraps"
  pantry:
    - name: flour tortillas
      amount: 12
      unit: large
```

### Standard Grocery Categories

| Category | Description |
|----------|-------------|
| `produce` | Fresh fruits and vegetables |
| `pantry` | Shelf-stable items |
| `refrigerated` | Items requiring refrigeration |
| `frozen` | Frozen items |
| `spices` | Spices and seasonings |

Custom categories are allowed.

### Grocery Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Item name |
| `amount` | number/string | No | Quantity (can be range like "5-6") |
| `unit` | string | No | Unit of measurement |
| `note` | string | No | Usage notes |

---

## Complete Example

```yaml
# Week 1: Mediterranean + Mexican
# Vegan Meal Prep - Veganuary 2026

$schema: ../schemas/mealplan.v1.json

id: week-1
week_number: 1
year: 2026
name: "Week 1: Mediterranean + Mexican"
theme: Mediterranean + Mexican
start_date: 2026-01-01
end_date: 2026-01-07

prep_time_total: 150  # 2.5 hours

components:
  grains:
    - components/grains/cilantro-lime-rice.cook
    - components/grains/lemon-herb-quinoa.cook
  proteins:
    - components/proteins/spiced-mediterranean-chickpeas.cook
    - components/proteins/smoky-black-beans.cook
  sauces:
    - components/sauces/cashew-tzatziki.cook
    - components/sauces/lemon-tahini-dressing.cook
  vegetables:
    - components/vegetables/mediterranean-roasted-vegetables.cook
    - components/vegetables/fajita-vegetables.cook
  breakfast:
    - components/breakfast/overnight-oats.cook
  snacks:
    - components/snacks/classic-hummus.cook

days:
  - day: 1
    date: 2026-01-01
    day_name: Thursday
    is_prep_day: true
    meals:
      breakfast:
        recipe: components/breakfast/smoothie-packs.cook
        note: "Blend while prepping"
      lunch:
        description: "Prep-Day Avocado Toast"
        note: "Toast bread, mash avocado with salt, pepper, red pepper flakes"
      dinner:
        recipe: meals/bowls/mediterranean-grain-bowl.cook
      snacks:
        - recipe: components/snacks/classic-hummus.cook
          note: "Serve with raw veggies"

  - day: 2
    date: 2026-01-02
    day_name: Friday
    meals:
      breakfast:
        recipe: components/breakfast/overnight-oats.cook
        note: "Jar 1: Chocolate Cherry"
      lunch:
        recipe: meals/bowls/mediterranean-grain-bowl.cook
      dinner:
        recipe: meals/tacos/loaded-black-bean-tacos.cook
      snacks:
        - recipe: components/snacks/peanut-butter-energy-balls.cook

  - day: 3
    date: 2026-01-03
    day_name: Saturday
    meals:
      breakfast:
        recipe: components/breakfast/chickpea-scramble-base.cook
        note: "Add spinach when reheating"
      lunch:
        recipe: meals/salads/taco-salad-bowl.cook
      dinner:
        recipe: meals/wraps/lentil-walnut-lettuce-wraps.cook
      snacks:
        - recipe: components/snacks/spiced-roasted-chickpeas.cook

  - day: 4
    date: 2026-01-04
    day_name: Sunday
    meals:
      breakfast:
        recipe: components/breakfast/smoothie-packs.cook
      lunch:
        recipe: meals/salads/big-greek-salad.cook
      dinner:
        recipe: meals/bowls/burrito-bowl.cook
      snacks:
        - recipe: components/snacks/classic-hummus.cook

  - day: 5
    date: 2026-01-05
    day_name: Monday
    meals:
      breakfast:
        recipe: components/breakfast/overnight-oats.cook
        note: "Jar 2: Apple Cinnamon"
      lunch:
        recipe: meals/plates/mediterranean-mezze-plate.cook
      dinner:
        recipe: meals/bowls/stuffed-sweet-potatoes.cook
      snacks:
        - recipe: components/snacks/peanut-butter-energy-balls.cook

  - day: 6
    date: 2026-01-06
    day_name: Tuesday
    meals:
      breakfast:
        recipe: components/breakfast/chickpea-scramble-base.cook
      lunch:
        recipe: meals/bowls/burrito-bowl.cook
      dinner:
        recipe: meals/tacos/fajita-night.cook
        note: "Quick sauté if fajita veg is low"
      snacks:
        - recipe: components/snacks/spiced-roasted-chickpeas.cook

  - day: 7
    date: 2026-01-07
    day_name: Wednesday
    meals:
      breakfast:
        recipe: components/breakfast/overnight-oats.cook
        note: "Jar 3: Tropical"
      lunch:
        description: "Use-It-Up Bowl"
        note: "Whatever grains + protein + veg + sauce"
      dinner:
        description: "Clean-Out Bowl"
        note: "Combine remaining components. Add avocado."
      snacks:
        - description: "Whatever's left"

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
    note: "For tzatziki and chipotle crema"
  - time: "0:10"
    task: Chop all onions, peppers, garlic (mise en place)
    duration: 15
  - time: "0:25"
    task: Start rice cooking
    recipe: components/grains/cilantro-lime-rice.cook
    duration: 20
  - time: "0:30"
    task: Prep and roast Mediterranean vegetables
    recipe: components/vegetables/mediterranean-roasted-vegetables.cook
    duration: 35
  - time: "2:30"
    task: Clean up and store everything
    duration: 15

grocery_additions:
  produce:
    - name: avocados
      amount: 5-6
      note: "For tacos, bowls, toast"
    - name: limes
      amount: 6
      note: "For rice, beans, crema, bowls"
    - name: romaine lettuce
      amount: 2
      unit: heads
      note: "Tacos, salads, wraps"
    - name: baby carrots
      amount: 1
      unit: bag
      note: "Snacking with hummus"
```

---

## Validation

### JSON Schema

The format is validated using JSON Schema. The schema file is located at:
```
schemas/mealplan.schema.json
```

### CLI Validation

```bash
# Validate a mealplan file
vmp validate recipes/plans/week-1.mealplan

# Validate all mealplan files
vmp validate recipes/plans/
```

### Programmatic Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema = require('./schemas/mealplan.schema.json');
const validate = ajv.compile(schema);

const content = fs.readFileSync('recipes/plans/week-1.mealplan', 'utf-8');
const mealplan = parseYaml(content);

const valid = validate(mealplan);
if (!valid) {
  console.error(validate.errors);
}
```

---

## Relationship with Cooklang

The `.mealplan` format is designed to work alongside standard Cooklang `.cook` files:

1. **Recipe content** lives in `.cook` files (human-authored using Cooklang syntax)
2. **Organization and scheduling** lives in `.mealplan` files (YAML structure)
3. **Recipe type** is inferred from directory path:
   - `recipes/components/` = batch-prepped component
   - `recipes/meals/` = assembly/final dish
4. **Cross-references** in meal recipes use Cooklang's standard ingredient path syntax:
   ```cooklang
   Add @../components/sauces/tzatziki{2%tbsp} to the bowl.
   ```

This separation keeps recipes portable (standard Cooklang) while adding meal planning capabilities.

---

## Related Documentation

- [Cooklang Recipe Format Guide](./COOKLANG-GUIDE.md) - How to write `.cook` files
- [ADR-006: Recipe Serialization Format](./adr/006-recipe-serialization-format.md) - Decision rationale
- [Mealplan Import/Export Design](./design/MEALPLAN-IMPORT.md) - Runtime import system
- [PDF to Cooklang Conversion](./design/PDF-TO-COOKLANG.md) - Converting meal plan PDFs

---

## Changelog

### v1.0 (2024)
- Initial stable release
- Core fields: id, week_number, year, days
- Components grouped by category
- Daily meal schedules with recipe/description entries
- Prep timeline with timed tasks
- Grocery additions by category
