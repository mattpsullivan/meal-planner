import { describe, it, expect } from 'vitest';
import { normalizeUnit, weightUnitGrams, ingredientGrams } from './convert';
import { computeNutrition, resolveQuantity, roundMacros, type NutritionRecipe } from './compute';
import type { NutritionData } from './types';

describe('convert', () => {
  it('normalizes unit forms', () => {
    expect(normalizeUnit('cups')).toBe('cup');
    expect(normalizeUnit('TBSP')).toBe('tbsp');
    expect(normalizeUnit('cloves')).toBe('clove');
    expect(normalizeUnit(undefined)).toBe('each');
    expect(normalizeUnit('(none)')).toBe('each');
    expect(normalizeUnit('')).toBe('each');
  });

  it('resolves universal weight units', () => {
    expect(weightUnitGrams('oz')).toBeCloseTo(28.3495, 3);
    expect(weightUnitGrams('lb')).toBeCloseTo(453.592, 2);
    expect(weightUnitGrams('cup')).toBeNull();
  });

  it('resolves numeric and fraction-object quantities', () => {
    expect(resolveQuantity(2.5)).toBe(2.5);
    expect(resolveQuantity(null)).toBe(0);
    // Cooklang fraction objects: "1/2" and "1 1/2"
    expect(resolveQuantity({ whole: 0, num: 1, den: 2 })).toBe(0.5);
    expect(resolveQuantity({ whole: 1, num: 1, den: 2 })).toBe(1.5);
    expect(resolveQuantity({ whole: 0, num: 1, den: 0 })).toBe(0); // guard div-by-zero
  });

  it('converts ingredient quantities to grams', () => {
    // weight unit: no per-ingredient map needed
    expect(ingredientGrams(8, 'oz')).toBeCloseTo(226.796, 2);
    // volume unit via per-ingredient map
    expect(ingredientGrams(1, 'cup', { cup: 158 })).toBe(158);
    expect(ingredientGrams(2, 'tbsp', { tbsp: 13.5 })).toBe(27);
    // unknown unit with no mapping
    expect(ingredientGrams(1, 'pinch', { cup: 158 })).toBeNull();
  });
});

const DATA: NutritionData = {
  ingredients: {
    chicken: { per_100g: { kcal: 165, protein_g: 31, carb_g: 0, fat_g: 3.6 } },
    rice: {
      per_100g: { kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3 },
      grams_per_unit: { cup: 158 },
    },
    oil: {
      per_100g: { kcal: 884, protein_g: 0, carb_g: 0, fat_g: 100 },
      grams_per_unit: { tbsp: 13.5 },
    },
  },
  components: {
    'rice-component': { grams_per_unit: { cup: 158 } },
  },
};

const riceComponent: NutritionRecipe = {
  id: 'rice-component',
  servings: 4,
  ingredients: [{ name: 'rice', quantity: 1, unit: 'cup' }],
};
const chickenRecipe: NutritionRecipe = {
  id: 'chicken-recipe',
  servings: 2,
  ingredients: [{ name: 'chicken', quantity: 8, unit: 'oz' }],
};
const RECIPES: Record<string, NutritionRecipe> = {
  'rice-component': riceComponent,
  'chicken-recipe': chickenRecipe,
};

function ctx() {
  return { data: DATA, getRecipeById: (id: string) => RECIPES[id] };
}

describe('computeNutrition', () => {
  it('computes totals and per-serving from real ingredients', () => {
    const n = computeNutrition(riceComponent, ctx());
    // 158g rice -> 130 kcal/100g * 1.58
    expect(n.total.kcal).toBeCloseTo(205.4, 1);
    expect(n.total_grams).toBe(158);
    expect(n.per_serving.kcal).toBeCloseTo(205.4 / 4, 1);
    expect(n.coverage).toBe(1);
    expect(n.unmapped_ingredients).toEqual([]);
  });

  it('flags unmapped ingredients and lowers coverage', () => {
    const recipe: NutritionRecipe = {
      id: 'mystery',
      servings: 1,
      ingredients: [
        { name: 'rice', quantity: 1, unit: 'cup' },
        { name: 'unobtanium', quantity: 2, unit: 'cup' },
      ],
    };
    const n = computeNutrition(recipe, ctx());
    expect(n.coverage).toBe(0.5);
    expect(n.unmapped_ingredients).toEqual(['unobtanium']);
    // only the mapped ingredient contributes
    expect(n.total.kcal).toBeCloseTo(205.4, 1);
  });

  it('rolls up a weight-unit component reference', () => {
    // 4 oz of chicken-recipe (which is 8 oz total) -> half its macros
    const meal: NutritionRecipe = {
      id: 'chicken-meal',
      servings: 1,
      ingredients: [
        { name: 'chicken', quantity: 4, unit: 'oz', source_recipe_id: 'chicken-recipe' },
      ],
    };
    const chicken = computeNutrition(chickenRecipe, ctx());
    const n = computeNutrition(meal, ctx());
    expect(n.total.kcal).toBeCloseTo(chicken.total.kcal / 2, 1);
  });

  it('rolls up a volume-unit component reference via density', () => {
    // 2 cups of rice-component; density 158 g/cup -> 316 g of a 158 g component -> 2x its macros
    const meal: NutritionRecipe = {
      id: 'rice-meal',
      servings: 1,
      ingredients: [{ name: 'rice', quantity: 2, unit: 'cup', source_recipe_id: 'rice-component' }],
    };
    const rice = computeNutrition(riceComponent, ctx());
    const n = computeNutrition(meal, ctx());
    expect(n.total.kcal).toBeCloseTo(rice.total.kcal * 2, 1);
  });

  it('does not infinite-loop on cyclic references', () => {
    const cyclicA: NutritionRecipe = {
      id: 'a',
      servings: 1,
      ingredients: [{ name: 'a', quantity: 1, unit: 'oz', source_recipe_id: 'b' }],
    };
    const cyclicB: NutritionRecipe = {
      id: 'b',
      servings: 1,
      ingredients: [{ name: 'b', quantity: 1, unit: 'oz', source_recipe_id: 'a' }],
    };
    const cyclic: Record<string, NutritionRecipe> = { a: cyclicA, b: cyclicB };
    const n = computeNutrition(cyclicA, {
      data: DATA,
      getRecipeById: (id: string) => cyclic[id],
    });
    expect(n).toBeDefined();
    expect(Number.isFinite(n.total.kcal)).toBe(true);
  });

  it('rounds macros for storage', () => {
    expect(roundMacros({ kcal: 205.44, protein_g: 4.267, carb_g: 44.24, fat_g: 0.47 })).toEqual({
      kcal: 205,
      protein_g: 4.3,
      carb_g: 44.2,
      fat_g: 0.5,
    });
  });
});
