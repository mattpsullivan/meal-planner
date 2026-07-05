/**
 * Static data layer for GitHub Pages deployment
 * Loads recipe and meal plan data from bundled JSON
 */

import seedData from './seed.json';
import { combineDiets, dietFromCategory, isDiet } from '@/lib/diet';
import type {
  Diet,
  Recipe,
  RecipeWithDetails,
  Ingredient,
  IngredientWithSourceRecipe,
  Instruction,
  MealType,
  IngredientCategory,
  WeekWithDetails,
  DayWithMeals,
  DayMeal,
  DayMealWithRecipe,
  PrepStep,
  WeekComponent,
  NutritionSummary,
} from '@/types';

// Type for raw seed data
interface SeedRecipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  yield_amount: number | null;
  yield_unit: string | null;
  storage_days: number | null;
  storage_instructions: string | null;
  source_week: number | null;
  recipe_type: string;
  ingredients: SeedIngredient[];
  instructions: SeedInstruction[];
  tags: string[];
  meal_types: string[];
  nutrition?: NutritionSummary;
}

interface SeedIngredient {
  name: string;
  quantity: number | { whole: number; num: number; den: number; err: number } | null;
  unit: string | null;
  preparation: string | null;
  optional: boolean;
  note: string | null;
  category: string;
  display_order: number;
  source_recipe_id: string | null;
}

// Instructions can be either strings or objects
type SeedInstruction =
  | string
  | {
      step: number;
      text: string;
      timer_minutes: number | null;
    };

interface SeedWeek {
  id: string;
  week_number: number;
  title: string;
  theme: string;
  start_date: string;
  end_date: string;
  components: { recipe_id: string; component_type: string }[];
  prep_steps: {
    step_number: number;
    time_minutes: number;
    description: string;
    recipe_id: string | null;
    duration?: number | null;
  }[];
  days: SeedDay[];
}

interface SeedDay {
  day_number: number;
  date: string;
  day_of_week: string;
  meals: SeedMeal[];
}

interface SeedMeal {
  meal_type: string;
  recipe_id: string | null;
  recipe_name: string;
  display_order: number;
}

// Parse fraction quantities
function parseQuantity(
  qty: number | { whole: number; num: number; den: number; err: number } | null
): number | undefined {
  if (qty === null) return undefined;
  if (typeof qty === 'number') return qty;
  // Fraction object
  return qty.whole + qty.num / qty.den;
}

// Create slug from id
function toSlug(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Format time_minutes to a readable time marker (e.g., "0:00", "0:05", "1:30")
function formatTimeMarker(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours)}:${String(mins).padStart(2, '0')}`;
}

// Map category string to IngredientCategory
function mapCategory(cat: string): IngredientCategory {
  const mapping: Record<string, IngredientCategory> = {
    produce: 'produce',
    'meat-poultry': 'meat-poultry',
    seafood: 'seafood',
    'dairy-eggs': 'dairy-eggs',
    pantry: 'pantry',
    refrigerated: 'refrigerated',
    frozen: 'frozen',
    spices: 'spices',
    'oils-vinegars': 'oils-vinegars',
    'nuts-seeds': 'nuts-seeds',
    grains: 'grains',
    legumes: 'legumes',
  };
  return mapping[cat.toLowerCase()] ?? 'other';
}

// Transform seed recipe to typed Recipe
function transformRecipe(seed: SeedRecipe, index: number): Recipe {
  return {
    id: index + 1, // Use 1-based numeric IDs
    slug: toSlug(seed.id),
    name: seed.name,
    description: seed.description ?? undefined,
    cuisine: seed.description ?? undefined, // Using description as cuisine placeholder
    servings: seed.servings,
    prepTime: seed.prep_time_minutes ?? undefined,
    cookTime: seed.cook_time_minutes ?? undefined,
    totalTime: (seed.prep_time_minutes ?? 0) + (seed.cook_time_minutes ?? 0) || undefined,
    notes: seed.storage_instructions ?? undefined,
    sourceType: 'import',
    recipeType: (seed.recipe_type || 'component') as Recipe['recipeType'],
    diet: deriveDiet(seed),
    nutrition: seed.nutrition,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Transform seed recipe to RecipeWithDetails
function transformRecipeWithDetails(
  seed: SeedRecipe,
  index: number,
  allRecipes: SeedRecipe[]
): RecipeWithDetails {
  const recipe = transformRecipe(seed, index);

  const ingredients: IngredientWithSourceRecipe[] = seed.ingredients.map((ing, ingIndex) => {
    const base: Ingredient = {
      id: index * 1000 + ingIndex + 1,
      recipeId: recipe.id,
      name: ing.name,
      quantity: parseQuantity(ing.quantity),
      unit: ing.unit ?? undefined,
      preparation: ing.preparation ?? undefined,
      category: mapCategory(ing.category),
      optional: ing.optional,
      sortOrder: ing.display_order,
      sourceRecipeId: ing.source_recipe_id
        ? allRecipes.findIndex((r) => r.id === ing.source_recipe_id) + 1
        : undefined,
    };

    // Add source recipe if it's a component reference
    if (ing.source_recipe_id) {
      const sourceIdx = allRecipes.findIndex((r) => r.id === ing.source_recipe_id);
      const sourceRecipe = allRecipes[sourceIdx];
      if (sourceIdx >= 0 && sourceRecipe) {
        return {
          ...base,
          sourceRecipe: transformRecipe(sourceRecipe, sourceIdx),
        };
      }
    }

    return base;
  });

  const instructions: Instruction[] = seed.instructions.map((inst, instIndex) => {
    // Handle both string and object instruction formats
    if (typeof inst === 'string') {
      return {
        id: index * 1000 + instIndex + 1,
        recipeId: recipe.id,
        stepNumber: instIndex + 1,
        text: inst,
        duration: undefined,
        isParallel: false,
        timerLabel: undefined,
      };
    }
    return {
      id: index * 1000 + instIndex + 1,
      recipeId: recipe.id,
      stepNumber: inst.step,
      text: inst.text,
      duration: inst.timer_minutes ?? undefined,
      isParallel: false,
      timerLabel: inst.timer_minutes ? `Step ${String(inst.step)}` : undefined,
    };
  });

  return {
    ...recipe,
    ingredients,
    instructions,
    tags: seed.tags,
    mealTypes: seed.meal_types as MealType[],
  };
}

// Build recipe lookup by slug and id
// Cast through unknown to handle JSON type inference
const seedRecipes = (seedData as unknown as { recipes: SeedRecipe[]; weeks: SeedWeek[] }).recipes;
const seedWeeks = (seedData as unknown as { recipes: SeedRecipe[]; weeks: SeedWeek[] }).weeks;

// Derive each recipe's diet (hybrid: an explicit diet-named tag wins, otherwise
// infer from ingredient categories, rolling up referenced component recipes so a
// meal inherits the broadest diet of anything it assembles). Memoized; the stack
// set guards against cyclic component references.
const seedRecipesById = new Map(seedRecipes.map((r) => [r.id, r]));
const dietCache = new Map<string, Diet>();

function deriveDiet(seed: SeedRecipe, stack = new Set<string>()): Diet {
  const cached = dietCache.get(seed.id);
  if (cached) return cached;

  const explicit = seed.tags.find(isDiet);
  if (explicit) {
    dietCache.set(seed.id, explicit);
    return explicit;
  }

  if (stack.has(seed.id)) return 'vegan'; // cycle guard; don't cache partial result
  stack.add(seed.id);

  const ingredientDiets: Diet[] = seed.ingredients.map((ing) => {
    if (ing.source_recipe_id) {
      const component = seedRecipesById.get(ing.source_recipe_id);
      return component ? deriveDiet(component, stack) : 'vegan';
    }
    return dietFromCategory(ing.category);
  });

  stack.delete(seed.id);
  const diet = combineDiets(ingredientDiets);
  dietCache.set(seed.id, diet);
  return diet;
}

// Pre-compute all recipes
const recipesWithDetails: RecipeWithDetails[] = seedRecipes.map((r, i) =>
  transformRecipeWithDetails(r, i, seedRecipes)
);

const recipes: Recipe[] = recipesWithDetails.map((r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  cuisine: r.cuisine,
  servings: r.servings,
  prepTime: r.prepTime,
  cookTime: r.cookTime,
  totalTime: r.totalTime,
  notes: r.notes,
  sourceType: r.sourceType,
  sourceUrl: r.sourceUrl,
  sourceImportedAt: r.sourceImportedAt,
  recipeType: r.recipeType,
  diet: r.diet,
  nutrition: r.nutrition,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
}));

// Lookup maps
const recipesBySlug = new Map(recipesWithDetails.map((r) => [r.slug, r]));
const recipesById = new Map(recipesWithDetails.map((r) => [r.id, r]));
const recipeIdByOldId = new Map(seedRecipes.map((r, i) => [r.id, i + 1]));

// Transform weeks
function transformWeek(seed: SeedWeek, index: number): WeekWithDetails {
  const weekId = index + 1;

  const components: WeekComponent[] = seed.components.map((c, i) => ({
    id: weekId * 100 + i + 1,
    weekId,
    category: c.component_type,
    item: c.recipe_id,
    recipeId: recipeIdByOldId.get(c.recipe_id),
  }));

  const prepSteps: PrepStep[] = seed.prep_steps.map((p, i) => ({
    id: weekId * 100 + i + 1,
    weekId,
    timeMarker: formatTimeMarker(p.time_minutes),
    task: p.description,
    duration: p.duration ?? undefined,
    recipeId: p.recipe_id ? recipeIdByOldId.get(p.recipe_id) : undefined,
    sortOrder: i,
  }));

  const days: DayWithMeals[] = seed.days.map((d) => {
    const dayId = weekId * 10 + d.day_number;

    const meals: DayMealWithRecipe[] = d.meals.map((m, mealIndex) => {
      const recipeId = m.recipe_id ? recipeIdByOldId.get(m.recipe_id) : undefined;
      const recipe = recipeId ? recipesById.get(recipeId) : undefined;

      return {
        id: dayId * 10 + mealIndex + 1,
        dayId,
        mealType: m.meal_type as DayMeal['mealType'],
        recipeId,
        description: m.recipe_id ? undefined : m.recipe_name,
        notes: undefined,
        sortOrder: m.display_order,
        recipe: recipe
          ? {
              id: recipe.id,
              slug: recipe.slug,
              name: recipe.name,
              description: recipe.description,
              cuisine: recipe.cuisine,
              servings: recipe.servings,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              totalTime: recipe.totalTime,
              notes: recipe.notes,
              sourceType: recipe.sourceType,
              recipeType: recipe.recipeType,
              diet: recipe.diet,
              createdAt: recipe.createdAt,
              updatedAt: recipe.updatedAt,
            }
          : undefined,
      };
    });

    return {
      id: dayId,
      weekId,
      dayNumber: d.day_number,
      date: d.date,
      dayName: d.day_of_week,
      meals,
    };
  });

  return {
    id: weekId,
    weekNumber: seed.week_number,
    year: 2026,
    name: seed.title,
    theme: seed.theme,
    startDate: seed.start_date,
    endDate: seed.end_date,
    prepTimeTotal: seed.prep_steps.reduce((sum, p) => sum + (p.duration ?? 0), 0) || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    components,
    prepSteps,
    days,
  };
}

const weeksWithDetails: WeekWithDetails[] = seedWeeks.map((w, i) => transformWeek(w, i));

// Export static data
export const staticData = {
  recipes,
  recipesWithDetails,
  recipesBySlug,
  recipesById,
  weeksWithDetails,
};

// Export convenience getters
export function getAllRecipes(): Recipe[] {
  return recipes;
}

export function getRecipeById(id: number): RecipeWithDetails | undefined {
  return recipesById.get(id);
}

export function getRecipeBySlug(slug: string): RecipeWithDetails | undefined {
  return recipesBySlug.get(slug);
}

export function searchRecipes(query: string): Recipe[] {
  const q = query.toLowerCase();
  return recipes.filter(
    (r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
  );
}

export function getRecipesByTag(tag: string): Recipe[] {
  const matchingIds = new Set(
    recipesWithDetails.filter((r) => r.tags.includes(tag)).map((r) => r.id)
  );
  return recipes.filter((r) => matchingIds.has(r.id));
}

export function getRecipesByMealType(type: MealType): Recipe[] {
  const matchingIds = new Set(
    recipesWithDetails.filter((r) => r.mealTypes.includes(type)).map((r) => r.id)
  );
  return recipes.filter((r) => matchingIds.has(r.id));
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  recipesWithDetails.forEach((r) => {
    r.tags.forEach((t) => tags.add(t));
  });
  return Array.from(tags).sort();
}

export function getAllCuisines(): string[] {
  const cuisines = new Set<string>();
  recipes.forEach((r) => r.cuisine && cuisines.add(r.cuisine));
  return Array.from(cuisines).sort();
}

export function getAllWeeks(): WeekWithDetails[] {
  return weeksWithDetails;
}

export function getWeekById(id: number): WeekWithDetails | undefined {
  return weeksWithDetails.find((w) => w.id === id);
}

export function getWeekByNumber(weekNumber: number): WeekWithDetails | undefined {
  return weeksWithDetails.find((w) => w.weekNumber === weekNumber);
}

export function getDaysForWeek(weekId: number): DayWithMeals[] {
  const week = weeksWithDetails.find((w) => w.id === weekId);
  return week?.days ?? [];
}

export function getMealsForDay(dayId: number): DayMealWithRecipe[] {
  for (const week of weeksWithDetails) {
    const day = week.days.find((d) => d.id === dayId);
    if (day) {
      return day.meals;
    }
  }
  return [];
}

// Grocery item generated from static data
export interface StaticGroceryItem {
  itemKey: string; // Unique key for the item (name-unit-category normalized)
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  recipeSources: string[]; // Recipe names that use this ingredient
  sortOrder: number;
}

// Generate grocery list items from a week's recipes
export function generateGroceryListForWeek(weekId: number): StaticGroceryItem[] {
  const week = weeksWithDetails.find((w) => w.id === weekId);
  if (!week) return [];

  // Collect all recipe IDs from the week's meals
  const recipeIds = new Set<number>();
  for (const day of week.days) {
    for (const meal of day.meals) {
      if (meal.recipeId) {
        recipeIds.add(meal.recipeId);
      }
    }
  }

  // Also add component recipes from the week
  for (const component of week.components) {
    if (component.recipeId) {
      recipeIds.add(component.recipeId);
    }
  }

  // Aggregate ingredients from all recipes
  // Note: We use `unit: string | undefined` to match exactOptionalPropertyTypes requirements
  const ingredientMap = new Map<
    string,
    {
      name: string;
      quantity: number;
      unit: string | undefined;
      category: string;
      recipeSources: Set<string>;
    }
  >();

  for (const recipeId of recipeIds) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) continue;

    for (const ing of recipe.ingredients) {
      // Skip ingredients that reference other recipes (component references)
      if (ing.sourceRecipeId) continue;

      // Create a normalized key for grouping similar ingredients
      const normalizedName = ing.name.toLowerCase().trim();
      const normalizedUnit = ing.unit?.toLowerCase().trim() ?? '';
      const key = `${normalizedName}|${normalizedUnit}|${ing.category}`;

      const existing = ingredientMap.get(key);
      if (existing) {
        existing.quantity += ing.quantity ?? 0;
        existing.recipeSources.add(recipe.name);
      } else {
        ingredientMap.set(key, {
          name: ing.name,
          quantity: ing.quantity ?? 0,
          unit: ing.unit,
          category: ing.category,
          recipeSources: new Set([recipe.name]),
        });
      }
    }
  }

  // Convert to array and sort by category, then name
  const categoryOrder: Record<string, number> = {
    produce: 1,
    refrigerated: 2,
    frozen: 3,
    pantry: 4,
    grains: 5,
    legumes: 6,
    'nuts-seeds': 7,
    spices: 8,
    'oils-vinegars': 9,
    other: 10,
  };

  const items: StaticGroceryItem[] = Array.from(ingredientMap.entries()).map(
    ([key, value], index) => {
      const item: StaticGroceryItem = {
        itemKey: key,
        name: value.name,
        quantity: value.quantity,
        category: value.category,
        recipeSources: Array.from(value.recipeSources),
        sortOrder: index,
      };
      // Only add unit if it's defined (for exactOptionalPropertyTypes)
      if (value.unit !== undefined) {
        item.unit = value.unit;
      }
      return item;
    }
  );

  items.sort((a, b) => {
    const catOrderA = categoryOrder[a.category] ?? 99;
    const catOrderB = categoryOrder[b.category] ?? 99;
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
    return a.name.localeCompare(b.name);
  });

  // Update sort orders after sorting
  items.forEach((item, index) => {
    item.sortOrder = index;
  });

  return items;
}
