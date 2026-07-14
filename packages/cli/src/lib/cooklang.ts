/**
 * Cooklang parsing utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Parser as CooklangParser } from '@cooklang/cooklang';
import type {
  ExportRecipe,
  ExportIngredient,
  CooklangQuantity,
  CooklangIngredient,
  CooklangSection,
  CooklangResult,
  CooklangCookware,
  CooklangTimer,
} from './types.js';

// =========== Category Detection ===========

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
    'tortilla',
    'syrup',
    'cocoa',
    'tomato paste',
    'chipotle',
    'adobo',
  ],
  refrigerated: ['milk', 'yogurt', 'cream', 'tofu', 'tempeh', 'feta', 'cheese', 'salsa'],
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

// =========== Parsing Utilities ===========

function parseQuantityValue(quantity?: CooklangQuantity): number | null {
  if (!quantity?.value?.value?.value) return null;

  const value = quantity.value.value.value;

  // Handle simple number
  if (typeof value === 'number') {
    return value;
  }

  // Handle fraction object {whole, num, den, err}
  const whole = value.whole ?? 0;
  const num = value.num ?? 0;
  const den = value.den ?? 1;
  // Calculate decimal: whole + (num/den)
  return whole + (den > 0 ? num / den : 0);
}

function formatTimer(timer?: CooklangTimer): string {
  const value = parseQuantityValue(timer?.quantity);
  const unit = timer?.quantity?.unit;
  if (value === null) return timer?.name ?? '';
  return unit ? `${String(value)} ${unit}` : String(value);
}

function extractInstructions(
  sections: CooklangSection[],
  ingredients: CooklangIngredient[],
  cookware: CooklangCookware[] = [],
  timers: CooklangTimer[] = []
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
          if (item.type === 'ingredient' && item.index !== undefined) {
            // Look up ingredient by index - index is required for ingredient items
            const ing = ingredients[item.index];
            return ing.name;
          }
          if (item.type === 'cookware') return cookware[item.index ?? 0]?.name ?? '';
          if (item.type === 'timer') return formatTimer(timers[item.index ?? 0]);
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

// =========== Recipe Parsing ===========

export function parseRecipeFile(
  filePath: string,
  parser: CooklangParser,
  recipesDir: string,
  recipeMap: Map<string, string>
): ExportRecipe | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parser.parse(content) as CooklangResult;

  // Derive recipe type from path
  const relativePath = path.relative(recipesDir, filePath);
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
    tags = rawTags.map((t: string) => t.trim().toLowerCase());
  }

  // Custom metadata
  const custom = result.metadata.custom ?? {};
  const storageDays = custom.storage_days ? parseInt(custom.storage_days, 10) : null;
  const storageMethod = custom.storage_method;
  const reheat = custom.reheat;
  const yieldAmount = custom.yield;

  const storageInstructions = [storageMethod, reheat].filter(Boolean).join('. ');

  // Parse ingredients
  const ingredients: ExportIngredient[] = result.recipe.ingredients.map((ing, idx) => {
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
  const instructions = extractInstructions(
    result.recipe.sections,
    result.recipe.ingredients,
    result.recipe.cookware ?? [],
    result.recipe.timers ?? []
  );

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
    ingredients,
    instructions,
    tags,
    meal_types: mealTypes,
    recipe_type: recipeType,
  };
}

export function createParser(): CooklangParser {
  return new CooklangParser();
}

export function findCookFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findCookFiles(fullPath));
    } else if (entry.name.endsWith('.cook')) {
      files.push(fullPath);
    }
  }

  return files;
}
