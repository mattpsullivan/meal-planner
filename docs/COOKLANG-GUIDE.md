# Cooklang Recipe Format Guide

This guide explains how to write recipes in Cooklang format for the Meal Planner app.

We use **standard Cooklang** with no custom extensions. Our app layers additional semantics on top through directory structure and `.mealplan` files.

## Quick Reference

| Element | Syntax | Example |
|---------|--------|---------|
| Ingredient | `@name{qty%unit}` | `@rice{2%cups}` |
| Cookware | `#name{}` | `#pot{}` |
| Timer | `~{time%unit}` | `~{20%minutes}` |
| Metadata | `>> key: value` | `>> title: My Recipe` |
| Section | `== Section Name` | `== Prep` |
| Comment | `-- text` | `-- This is a note` |

---

## Basic Recipe Structure

```cooklang
>> title: Recipe Name
>> tags: vegan, gluten-free
>> servings: 4

Instructions go here with @ingredients{qty%unit} inline.

Cook in #cookware{} for ~{time%unit}.
```

---

## Metadata

Use `>> key: value` for metadata at the top of the file:

```cooklang
>> title: Cilantro-Lime Rice
>> cuisine: Mexican
>> tags: grain, vegan, gluten-free
>> servings: 4
>> yield: 4 cups
```

### Standard Metadata Fields

| Field | Description |
|-------|-------------|
| `title` | Recipe name |
| `cuisine` | Cuisine type |
| `tags` | Comma-separated descriptive tags |
| `servings` | Number of servings |
| `yield` | Output amount (e.g., "4 cups") |

### Storage Metadata (for meal prep)

For batch prep components, include storage info:

```cooklang
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water, covered, 1-2 minutes.
```

---

## Ingredients

Ingredients are marked with `@` and include quantity and unit in braces:

```cooklang
@long-grain white rice{2%cups}     -- 2 cups of rice
@olive oil{2%tbsp}                 -- 2 tablespoons of oil
@garlic{3%cloves}                  -- 3 cloves of garlic
@salt{1%tsp}                       -- 1 teaspoon of salt
@fresh cilantro{1/2%cup}           -- 1/2 cup of cilantro
```

### Fractions

Use standard fractions - the parser handles them:

```cooklang
@flour{1/2%cup}           -- Half cup
@butter{1 1/2%tbsp}       -- One and a half tablespoons
@sugar{3/4%cup}           -- Three quarters cup
```

### Multi-word Ingredients

Ingredients with spaces work naturally:

```cooklang
@long-grain white rice{2%cups}
@fresh lime juice{2%tbsp}
@ground black pepper{}
```

### Preparation Notes

Add preparation in parentheses after the ingredient:

```cooklang
@onion{1}(finely diced)
@garlic{3%cloves}(minced)
@chickpeas{1%can}(drained and rinsed)
@fresh cilantro{1/2%cup}(chopped)
```

### Ingredients Without Quantity

Some ingredients don't need specific amounts:

```cooklang
Season with @salt{} and @black pepper{} to taste.
Garnish with @fresh parsley{}.
```

---

## Cookware

Mark cookware with `#`:

```cooklang
Bring water to boil in #large pot{}.
Transfer to #serving bowl{}.
Blend in #high-powered blender{} until smooth.
Heat #cast iron skillet{} over medium-high heat.
```

---

## Timers

Add timers with `~`:

```cooklang
Cook for ~{20%minutes} until tender.
Let rest ~{5%minutes} before serving.
Simmer ~{30-35%minutes} until thickened.
```

### Named Timers

Give timers labels for clarity:

```cooklang
Bake ~potatoes{45%minutes} until fork-tender.
Cook ~rice{20%minutes} until water is absorbed.
```

---

## Sections

Use `==` to create named sections:

```cooklang
== Prep

Dice @onion{1} and mince @garlic{4%cloves}.
Drain and rinse @chickpeas{2%cans}.

== Cook

Heat @olive oil{2%tbsp} in #skillet{}.
Add onion and cook ~{5%minutes} until soft.

== Serve

Transfer to bowls and garnish with @fresh parsley{}.
```

---

## Comments

Use `--` for comments that won't appear in output:

```cooklang
-- This is a comment, not shown to users

Add @rice{2%cups} to pot.  -- Can substitute jasmine rice

-- TIPS:
-- - Watch pot closely after 15 minutes
-- - Rice should be fluffy, not mushy
```

---

## Recipe References (Component Links)

Meal recipes can reference component recipes using path syntax. This is standard Cooklang - we just interpret paths as links to other recipes:

```cooklang
Scoop @../components/grains/lemon-herb-quinoa{1%cup} into #bowl{}.

Add @../components/proteins/spiced-chickpeas{1/2%cup} on one side.

Dollop @../components/sauces/cashew-tzatziki{2%tbsp} in the center.
```

**Path format**: `@../relative/path/to/recipe-name{qty%unit}`

The app recognizes ingredients starting with `../` or `./` as references to other recipe files.

---

## Our Semantic Layer

We use standard Cooklang but add meaning through:

### 1. Directory Structure

```
recipes/
├── components/              # Batch prep items (inferred as "component" type)
│   ├── grains/
│   ├── proteins/
│   ├── sauces/
│   ├── vegetables/
│   ├── breakfast/
│   └── snacks/
├── meals/                   # Assembly recipes (inferred as "meal" type)
│   ├── bowls/
│   ├── tacos/
│   └── salads/
└── plans/                   # Weekly schedules
    └── week-1.mealplan
```

- **Recipe type** is inferred from path: `components/` = batch prep, `meals/` = assembly
- **Category** is inferred from subdirectory: `grains/`, `proteins/`, `sauces/`, etc.

### 2. Meal Plan Files

The `.mealplan` YAML file defines:
- Which recipes belong to which week
- Daily meal assignments (breakfast, lunch, dinner)
- Prep day timeline
- Grocery additions

See `recipes/plans/week-1.mealplan` for example.

### 3. Path-Based References

Ingredients starting with `../` are interpreted as links to other recipe files, enabling:
- Automatic dependency tracking
- Grocery list aggregation across components
- Meal-to-component relationship mapping

---

## File Organization

### Naming Conventions

- Use lowercase with hyphens: `cilantro-lime-rice.cook`
- Be descriptive but concise
- Include key distinguishing features (e.g., `smoky-black-beans` vs `black-beans`)

---

## Full Example: Component Recipe

```cooklang
>> title: Lemon-Herb Quinoa
>> cuisine: Mediterranean
>> tags: grain, vegan, gluten-free, soy-free
>> servings: 4
>> yield: 4 cups
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water, covered, 1-2 minutes.

== Instant Pot Method

Combine @quinoa{1.5%cups}(rinsed well), @vegetable broth{3%cups}, and @kosher salt{1/2%tsp} in #Instant Pot{}.

Pressure cook on high ~{1%minute}, then natural release ~{10%minutes}.

== Stovetop Method

Bring @quinoa{1.5%cups}(rinsed well), @vegetable broth{3%cups}, and @kosher salt{1/2%tsp} to boil in #medium pot{}.

Reduce to simmer, cover, cook ~{15%minutes}. Rest covered ~{5%minutes}.

== Finishing

Fluff with fork.

Stir in @fresh lemon juice{2%tbsp}, zest of @lemon{1}, @olive oil{2%tbsp}, @fresh parsley{1/4%cup}(chopped), and @black pepper{}(freshly cracked).

Cool and store in airtight container.

-- Used in: Mediterranean bowls, grain bowls, mezze plates
```

---

## Full Example: Meal Recipe

```cooklang
>> title: Mediterranean Grain Bowl
>> cuisine: Mediterranean
>> tags: bowl, quick-assembly, vegan, gluten-free
>> servings: 1

-- This is an assembly recipe - all components should be prepped ahead.
-- Adjust quantities based on hunger and available components.

Scoop @../components/grains/lemon-herb-quinoa{1%cup} into #bowl{}.

Add @../components/proteins/spiced-mediterranean-chickpeas{1/2%cup} on one side.

Add @../components/vegetables/mediterranean-roasted-vegetables{1/2%cup}.

Dollop @../components/sauces/cashew-tzatziki{2%tbsp} in the center.

Top with fresh @cucumber{1/4%cup}(diced), @kalamata olives{2%tbsp}, and @pepitas{1%tbsp}.

Drizzle with @../components/sauces/lemon-tahini-dressing{1%tbsp}.

-- Assembly time: 5 minutes
-- Best enjoyed immediately, but components keep 5 days refrigerated
```

---

## Validation

Run tests to validate your recipes:

```bash
pnpm test:run src/lib/cooklang/parser.test.ts
pnpm test:run src/lib/mealplan/schema.test.ts
```

---

## Resources

- [Cooklang Official Spec](https://cooklang.org/docs/spec/)
- [Cooklang GitHub](https://github.com/cooklang)
- [ADR-006: Recipe Serialization Format](./adr/006-recipe-serialization-format.md)
