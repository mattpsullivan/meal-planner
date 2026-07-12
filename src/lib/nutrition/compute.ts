// Recipe nutrition computation. Mirrors the diet-derivation recursion in
// src/data/index.ts: a meal rolls up the nutrition of the components it
// references (by source_recipe_id), scaled by how much of each it uses.
//
// Model (see docs/NUTRITION.md):
//   - Real ingredient: grams = quantity x grams/unit; macros = per_100g x grams/100.
//   - Component reference: the referenced grams as a fraction of the component's
//     total grams, times the component's total macros. Weight-unit references
//     ("4 oz chicken") convert directly; volume/count references ("1 cup rice")
//     use a component density entry.
//   - A recipe's total_grams is the sum of everything it contains; per_serving is
//     total / servings.

import type { Macros, NutritionData, RecipeNutrition } from './types';
import { ingredientGrams, normalizeUnit, weightUnitGrams } from './convert';

// Cooklang stores fractional amounts as a fraction object (e.g. "1/2" ->
// { whole: 0, num: 1, den: 2 }) rather than a number, so quantity is a union.
export type QuantityInput =
  | number
  | { whole?: number; num?: number; den?: number }
  | null
  | undefined;

export interface NutritionIngredient {
  name: string;
  quantity: QuantityInput;
  unit: string | null | undefined;
  source_recipe_id?: string | null;
}

// Resolve a raw Cooklang quantity (number or fraction object) to a number.
export function resolveQuantity(quantity: QuantityInput): number {
  if (quantity === null || quantity === undefined) return 0;
  if (typeof quantity === 'number') return quantity;
  const whole = quantity.whole ?? 0;
  const num = quantity.num ?? 0;
  const den = quantity.den ?? 0;
  return whole + (den !== 0 ? num / den : 0);
}

export interface NutritionRecipe {
  id: string;
  servings: number;
  ingredients: NutritionIngredient[];
}

const ZERO: Macros = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 };

function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carb_g: a.carb_g + b.carb_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein_g: m.protein_g * factor,
    carb_g: m.carb_g * factor,
    fat_g: m.fat_g * factor,
  };
}

// Grams contributed by a component reference. Weight units convert universally;
// volume/count units need a density entry for the component id. Null if unknown.
function referenceGrams(
  quantity: number,
  unit: string | null | undefined,
  componentId: string,
  data: NutritionData
): number | null {
  const u = normalizeUnit(unit);
  const weight = weightUnitGrams(u);
  if (weight !== null) return quantity * weight;
  const density = data.components[componentId]?.grams_per_unit[u];
  if (density !== undefined) return quantity * density;
  return null;
}

export interface ComputeContext {
  data: NutritionData;
  getRecipeById: (id: string) => NutritionRecipe | undefined;
  cache?: Map<string, RecipeNutrition>;
  stack?: Set<string>;
}

// Compute nutrition for a recipe, recursing into component references. Memoized
// via ctx.cache; ctx.stack guards against cyclic references.
export function computeNutrition(recipe: NutritionRecipe, ctx: ComputeContext): RecipeNutrition {
  const cache = ctx.cache ?? new Map<string, RecipeNutrition>();
  const stack = ctx.stack ?? new Set<string>();

  const cached = cache.get(recipe.id);
  if (cached) return cached;

  const servings = recipe.servings > 0 ? recipe.servings : 1;
  if (stack.has(recipe.id)) {
    // Cycle guard: return an empty result without caching the partial.
    return {
      per_serving: { ...ZERO },
      total: { ...ZERO },
      total_grams: 0,
      servings,
      unmapped_ingredients: [],
      coverage: 1,
    };
  }
  stack.add(recipe.id);

  let total: Macros = { ...ZERO };
  let totalGrams = 0;
  const unmapped: string[] = [];
  let realCount = 0;
  let mappedCount = 0;

  for (const ing of recipe.ingredients) {
    const qty = resolveQuantity(ing.quantity);

    if (ing.source_recipe_id !== null && ing.source_recipe_id !== undefined) {
      const component = ctx.getRecipeById(ing.source_recipe_id);
      if (!component) continue;
      const compNutrition = computeNutrition(component, { ...ctx, cache, stack });
      const refGrams = referenceGrams(qty, ing.unit, ing.source_recipe_id, ctx.data);
      if (refGrams === null || compNutrition.total_grams <= 0) continue;
      const factor = refGrams / compNutrition.total_grams;
      total = addMacros(total, scaleMacros(compNutrition.total, factor));
      totalGrams += refGrams;
      continue;
    }

    realCount++;
    const entry = ctx.data.ingredients[ing.name.toLowerCase()];
    if (!entry) {
      unmapped.push(ing.name);
      continue;
    }
    const grams = ingredientGrams(qty, ing.unit, entry.grams_per_unit);
    if (grams === null) {
      unmapped.push(ing.name);
      continue;
    }
    mappedCount++;
    total = addMacros(total, scaleMacros(entry.per_100g, grams / 100));
    totalGrams += grams;
  }

  stack.delete(recipe.id);

  const result: RecipeNutrition = {
    per_serving: scaleMacros(total, 1 / servings),
    total,
    total_grams: totalGrams,
    servings,
    unmapped_ingredients: unmapped,
    coverage: realCount === 0 ? 1 : mappedCount / realCount,
  };
  cache.set(recipe.id, result);
  return result;
}

// Round a macro block to sensible precision for storage/display.
export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carb_g: Math.round(m.carb_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
  };
}
