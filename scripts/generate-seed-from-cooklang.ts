#!/usr/bin/env npx tsx
/**
 * Generate seed data from Cooklang recipes and .mealplan files
 *
 * Run with: npx tsx scripts/generate-seed-from-cooklang.ts
 *
 * This script:
 * 1. Parses all .cook files from recipes/ directory
 * 2. Parses all .mealplan files from recipes/plans/
 * 3. Transforms to seed.json format for database seeding
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Parser as CooklangParser } from '@cooklang/cooklang';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========== Types ===========

interface SeedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  optional: boolean;
  note: string | null;
  category: string;
  display_order: number;
  source_recipe_id?: string | null;
}

interface SeedRecipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  yield_amount: string | null;
  yield_unit: string | null;
  storage_days: number | null;
  storage_instructions: string | null;
  source_week: number | null;
  ingredients: SeedIngredient[];
  instructions: string[];
  tags: string[];
  meal_types: string[];
  recipe_type: 'component' | 'meal' | 'standalone';
}

interface SeedComponent {
  recipe_id: string;
  component_type: string;
}

interface SeedPrepStep {
  step_number: number;
  time_minutes: number;
  description: string;
  recipe_id?: string | null;
}

interface SeedMeal {
  meal_type: string;
  recipe_id: string | null;
  recipe_name: string;
  display_order: number;
}

interface SeedDay {
  day_number: number;
  date: string;
  day_of_week: string;
  meals: SeedMeal[];
}

interface SeedWeek {
  id: string;
  week_number: number;
  title: string;
  theme: string;
  start_date: string;
  end_date: string;
  components: SeedComponent[];
  prep_steps: SeedPrepStep[];
  days: SeedDay[];
}

interface SeedData {
  recipes: SeedRecipe[];
  weeks: SeedWeek[];
}

// Mealplan file structure
interface MealEntry {
  recipe?: string;
  description?: string;
  note?: string;
}

interface MealplanDay {
  day: number;
  date?: string;
  day_name?: string;
  is_prep_day?: boolean;
  meals: {
    breakfast?: MealEntry | null;
    lunch?: MealEntry | null;
    dinner?: MealEntry | null;
    snacks?: MealEntry[];
  };
}

interface MealplanPrepStep {
  time: string;
  task: string;
  recipe?: string;
  duration?: number;
  note?: string;
}

interface Mealplan {
  id: string;
  week_number: number;
  year: number;
  name?: string;
  theme?: string;
  start_date?: string;
  end_date?: string;
  prep_time_total?: number;
  components?: Record<string, string[]>;
  days: MealplanDay[];
  prep_timeline?: MealplanPrepStep[];
}

// =========== Category Detection ===========

// Keep in sync with CATEGORY_KEYWORDS in src/utils/ingredient-parser.ts.
// Matching is first-hit substring in insertion order, so ordering encodes
// precedence — see the note in that file for the meat/seafood/dairy rules.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    'onion',
    'garlic',
    'pepper',
    'tomato',
    'cucumber',
    'lettuce',
    'spinach',
    'avocado',
    'lime',
    'lemon',
    'cilantro',
    'parsley',
    'dill',
    'basil',
    'zucchini',
    'carrot',
    'celery',
    'banana',
    'apple',
    'berry',
    'mango',
    'jalapeño',
    'sweet potato',
    'kale',
    'romaine',
    'cherry tomatoes',
    'bell',
    'eggplant',
    'butternut',
  ],
  pantry: [
    'flour',
    'sugar',
    'salt',
    'pasta',
    'canned',
    'dried',
    'broth',
    'stock',
    'fish sauce',
    'oyster sauce',
    'tortilla',
    'syrup',
    'cocoa',
    'tomato paste',
    'chipotle',
    'adobo',
  ],
  'meat-poultry': [
    'chicken',
    'turkey',
    'beef',
    'pork',
    'bacon',
    'sausage',
    'steak',
    'lamb',
    'chorizo',
    'prosciutto',
    'pancetta',
    'meatball',
  ],
  seafood: [
    'salmon',
    'shrimp',
    'tuna',
    'fish',
    'cod',
    'crab',
    'scallop',
    'shellfish',
    'tilapia',
    'anchovy',
    'sardine',
    'halibut',
    'mussel',
    'clam',
    'lobster',
  ],
  refrigerated: ['tofu', 'tempeh', 'salsa', 'hummus'],
  frozen: ['frozen'],
  spices: [
    'cumin',
    'paprika',
    'coriander',
    'oregano',
    'cinnamon',
    'cayenne',
    'chili powder',
    'turmeric',
    'garlic powder',
    'onion powder',
    'red pepper flakes',
    'smoked paprika',
  ],
  'oils-vinegars': ['oil', 'olive', 'vegetable oil', 'coconut oil', 'vinegar'],
  'nuts-seeds': [
    'cashew',
    'walnut',
    'almond',
    'peanut',
    'nut',
    'seed',
    'pepita',
    'tahini',
    'chia',
    'hemp',
  ],
  'dairy-eggs': [
    'milk',
    'yogurt',
    'cream',
    'feta',
    'cheese',
    'egg',
    'butter',
    'parmesan',
    'mozzarella',
    'ricotta',
    'ghee',
    'buttermilk',
  ],
  grains: ['rice', 'quinoa', 'oat', 'barley', 'farro', 'bulgur'],
  legumes: ['bean', 'lentil', 'chickpea', 'pea'],
};

function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

// =========== Cooklang Parsing ===========

interface CooklangQuantity {
  value?: { value?: { value?: number } };
  unit?: string;
}

interface CooklangIngredient {
  name: string;
  quantity?: CooklangQuantity;
  reference?: { components?: string[] } | null;
  modifiers?: string;
}

interface CooklangStepItem {
  type: string;
  value?: string;
  index?: number;
}

interface CooklangStep {
  type: string;
  value?: {
    items?: CooklangStepItem[];
    number?: number;
  };
}

interface CooklangSection {
  name?: string | null;
  content?: CooklangStep[];
}

interface CooklangResult {
  metadata: {
    title?: string;
    tags?: string;
    servings?: number;
    cuisine?: string;
    custom?: Record<string, string>;
  };
  recipe: {
    ingredients: CooklangIngredient[];
    sections: CooklangSection[];
  };
}

function parseQuantityValue(quantity?: CooklangQuantity): number | null {
  if (!quantity?.value?.value?.value) return null;
  return quantity.value.value.value;
}

function extractInstructions(
  sections: CooklangSection[],
  ingredients: CooklangIngredient[]
): string[] {
  const instructions: string[] = [];

  for (const section of sections) {
    if (!section.content) continue;

    for (const step of section.content) {
      if (step.type !== 'step' || !step.value?.items) continue;

      // Reconstruct the step text
      const text = step.value.items
        .map((item) => {
          if (item.type === 'text') return item.value ?? '';
          if (item.type === 'ingredient') {
            // Look up ingredient by index
            const ing = ingredients[item.index ?? 0];
            return ing?.name ?? '';
          }
          if (item.type === 'cookware') return '[cookware]';
          if (item.type === 'timer') return '[timer]';
          return '';
        })
        .join('');

      if (text.trim()) {
        instructions.push(text.trim());
      }
    }
  }

  return instructions;
}

function parseRecipeFile(
  filePath: string,
  parser: CooklangParser,
  recipeMap: Map<string, string>
): SeedRecipe | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parser.parse(content) as CooklangResult;

  // Derive recipe type from path
  const relativePath = path.relative(path.join(__dirname, '..', 'recipes'), filePath);
  const isComponent = relativePath.startsWith('components/');
  const isMeal = relativePath.startsWith('meals/');
  const recipeType: 'component' | 'meal' | 'standalone' = isComponent
    ? 'component'
    : isMeal
      ? 'meal'
      : 'standalone';

  // Derive category from subdirectory
  const pathParts = relativePath.split('/');
  const category = pathParts[1] ?? 'other';

  // Generate slug from filename
  const fileName = path.basename(filePath, '.cook');
  const slug = fileName;

  // Store mapping for later resolution
  recipeMap.set(relativePath.replace(/\.cook$/, ''), slug);
  recipeMap.set(relativePath, slug);

  // Parse metadata
  const title = result.metadata.title ?? fileName;
  const servings = result.metadata.servings ?? 1;
  const cuisine = result.metadata.cuisine ?? null;

  // Tags can be a string or array depending on parser version
  const rawTags = result.metadata.tags;
  let tags: string[] = [];
  if (typeof rawTags === 'string') {
    tags = rawTags.split(',').map((t) => t.trim().toLowerCase());
  } else if (Array.isArray(rawTags)) {
    tags = rawTags.map((t) => String(t).trim().toLowerCase());
  }

  // Custom metadata
  const custom = result.metadata.custom ?? {};
  const storageDays = custom.storage_days ? parseInt(custom.storage_days, 10) : null;
  const storageMethod = custom.storage_method ?? null;
  const reheat = custom.reheat ?? null;
  const yieldAmount = custom.yield ?? null;

  const storageInstructions = [storageMethod, reheat].filter(Boolean).join('. ');

  // Parse ingredients
  const ingredients: SeedIngredient[] = result.recipe.ingredients.map((ing, idx) => {
    // Check if this is a reference to another recipe
    let sourceRecipeId: string | null = null;
    if (ing.reference?.components && ing.reference.components.length > 0) {
      // Build the path from reference components
      const refPath = ing.reference.components.join('/') + '/' + ing.name;
      sourceRecipeId = recipeMap.get(refPath) ?? ing.name;
    }

    return {
      name: ing.name,
      quantity: parseQuantityValue(ing.quantity),
      unit: ing.quantity?.unit ?? null,
      preparation: ing.modifiers ?? null,
      optional: false,
      note: null,
      category: categorizeIngredient(ing.name),
      display_order: idx,
      source_recipe_id: sourceRecipeId,
    };
  });

  // Parse instructions from sections
  const instructions = extractInstructions(result.recipe.sections, result.recipe.ingredients);

  // Determine meal types based on category
  let mealTypes: string[] = [];
  if (category.includes('breakfast')) {
    mealTypes = ['breakfast'];
  } else if (category.includes('snack')) {
    mealTypes = ['snack'];
  } else if (category.includes('sauce') || category.includes('dressing')) {
    mealTypes = ['lunch', 'dinner'];
  } else {
    mealTypes = ['lunch', 'dinner'];
  }

  // Add category to tags if not present
  if (!tags.includes(category)) {
    tags.push(category);
  }

  return {
    id: slug,
    name: title,
    description: cuisine ? `${cuisine} recipe` : null,
    servings,
    prep_time_minutes: null,
    cook_time_minutes: null,
    yield_amount: yieldAmount,
    yield_unit: null,
    storage_days: storageDays,
    storage_instructions: storageInstructions || null,
    source_week: null, // Will be set from mealplan
    ingredients,
    instructions,
    tags,
    meal_types: mealTypes,
    recipe_type: recipeType,
  };
}

// =========== Mealplan Parsing ===========

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((n) => parseInt(n, 10));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function recipePathToSlug(recipePath: string): string {
  // Convert "components/grains/rice.cook" to "rice"
  const fileName = path.basename(recipePath, '.cook');
  return fileName;
}

function recipePathToId(recipePath: string): string {
  // Keep full path but without .cook extension for unique identification
  return recipePath.replace(/\.cook$/, '');
}

function parseMealplan(filePath: string): Mealplan {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Remove YAML-style comments that start with #
  const cleanContent = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

  return parseYaml(cleanContent) as Mealplan;
}

function extractMealsFromDay(day: MealplanDay, recipeSlugMap: Map<string, string>): SeedMeal[] {
  const meals: SeedMeal[] = [];
  let order = 0;

  const addMeal = (mealType: string, entry: MealEntry | null | undefined) => {
    if (!entry) return;

    const recipeId = entry.recipe
      ? (recipeSlugMap.get(recipePathToId(entry.recipe)) ?? recipePathToSlug(entry.recipe))
      : null;
    const recipeName = entry.recipe
      ? recipePathToSlug(entry.recipe).replace(/-/g, ' ')
      : (entry.description ?? '');

    meals.push({
      meal_type: mealType,
      recipe_id: recipeId,
      recipe_name: recipeName,
      display_order: order++,
    });
  };

  addMeal('breakfast', day.meals.breakfast);
  addMeal('lunch', day.meals.lunch);
  addMeal('dinner', day.meals.dinner);

  if (day.meals.snacks) {
    for (const snack of day.meals.snacks) {
      addMeal('snack', snack);
    }
  }

  return meals;
}

function mealplanToSeedWeek(mealplan: Mealplan, recipeSlugMap: Map<string, string>): SeedWeek {
  // Convert components to SeedComponent format
  const components: SeedComponent[] = [];
  if (mealplan.components) {
    for (const [category, recipes] of Object.entries(mealplan.components)) {
      for (const recipePath of recipes) {
        const recipeId =
          recipeSlugMap.get(recipePathToId(recipePath)) ?? recipePathToSlug(recipePath);
        components.push({
          recipe_id: recipeId,
          component_type: category,
        });
      }
    }
  }

  // Convert prep timeline
  const prepSteps: SeedPrepStep[] = (mealplan.prep_timeline ?? []).map((step, idx) => {
    // Look up recipe ID if a recipe is referenced
    let recipeId: string | null = null;
    if (step.recipe) {
      recipeId = recipeSlugMap.get(recipePathToId(step.recipe)) ?? recipePathToSlug(step.recipe);
    }
    return {
      step_number: idx,
      time_minutes: parseTimeToMinutes(step.time),
      description: step.task,
      recipe_id: recipeId,
    };
  });

  // Convert days
  const days: SeedDay[] = mealplan.days.map((day) => ({
    day_number: day.day,
    date: day.date ?? '',
    day_of_week: day.day_name ?? '',
    meals: extractMealsFromDay(day, recipeSlugMap),
  }));

  return {
    id: mealplan.id,
    week_number: mealplan.week_number,
    title: mealplan.name ?? `Week ${mealplan.week_number}`,
    theme: mealplan.theme ?? '',
    start_date: mealplan.start_date ?? '',
    end_date: mealplan.end_date ?? '',
    components,
    prep_steps: prepSteps,
    days,
  };
}

// =========== Main Script ===========

function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function main(): void {
  const recipesDir = path.join(__dirname, '..', 'recipes');
  const outputDir = path.join(__dirname, '..', 'src', 'data');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const parser = new CooklangParser();
  const recipeSlugMap = new Map<string, string>();

  // Find all .cook files
  const cookFiles = findFiles(recipesDir, /\.cook$/);
  console.log(`Found ${cookFiles.length} .cook files`);

  // Parse all recipes
  const recipes: SeedRecipe[] = [];
  for (const cookFile of cookFiles) {
    const recipe = parseRecipeFile(cookFile, parser, recipeSlugMap);
    if (recipe) {
      recipes.push(recipe);
      console.log(`  Parsed: ${recipe.name} (${recipe.id})`);
    }
  }

  // Find all .mealplan files
  const mealplanFiles = findFiles(recipesDir, /\.mealplan$/);
  console.log(`\nFound ${mealplanFiles.length} .mealplan files`);

  // Parse all mealplans
  const weeks: SeedWeek[] = [];
  for (const mealplanFile of mealplanFiles) {
    const mealplan = parseMealplan(mealplanFile);
    const week = mealplanToSeedWeek(mealplan, recipeSlugMap);
    weeks.push(week);
    console.log(
      `  Parsed: ${week.title} (${week.days.length} days, ${week.components.length} components)`
    );

    // Update source_week for recipes referenced in this mealplan
    for (const component of week.components) {
      const recipe = recipes.find((r) => r.id === component.recipe_id);
      if (recipe) {
        recipe.source_week = week.week_number;
      }
    }
  }

  // Sort weeks by week number
  weeks.sort((a, b) => a.week_number - b.week_number);

  // Build seed data
  const seedData: SeedData = {
    recipes,
    weeks,
  };

  // Write seed data
  const outputFile = path.join(outputDir, 'seed.json');
  fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2));

  console.log(`\nGenerated seed data:`);
  console.log(`  Recipes: ${seedData.recipes.length}`);
  console.log(`    Components: ${recipes.filter((r) => r.recipe_type === 'component').length}`);
  console.log(`    Meals: ${recipes.filter((r) => r.recipe_type === 'meal').length}`);
  console.log(`  Weeks: ${seedData.weeks.length}`);
  console.log(`\nOutput: ${outputFile}`);
}

main();
