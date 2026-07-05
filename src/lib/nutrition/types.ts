// Nutrition types. The engine computes calories + macros (protein/carbs/fat)
// per recipe at build time and attaches them to seed.json. See docs/NUTRITION.md
// for the data model, the unit->grams conventions, and how to extend coverage.

export interface Macros {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

// Computed nutrition for one recipe (component or meal).
export interface RecipeNutrition {
  per_serving: Macros;
  total: Macros;
  total_grams: number;
  servings: number;
  // Direct (non-reference) ingredient names we had no data (or no usable unit) for.
  // These contribute 0 to the totals, so a low-coverage recipe under-reports.
  unmapped_ingredients: string[];
  // Fraction of this recipe's direct real ingredients that were mapped (0..1).
  // Component references are excluded (they roll up their own coverage).
  coverage: number;
}

// One ingredient's nutrition, per 100g, plus how to convert its recipe units to grams.
export interface IngredientNutritionEntry {
  per_100g: Macros;
  // grams for ONE of each non-weight unit this ingredient uses (e.g. { cup: 158, tbsp: 15 }).
  // Weight units (g, oz, lb, kg) are handled universally and never need an entry here.
  grams_per_unit?: Record<string, number>;
}

// For a component referenced by a volume/count unit (e.g. "1 cup of jasmine-rice"),
// how many grams one such unit of the finished component weighs. Weight-unit
// references (e.g. "4 oz of chicken") need no entry here.
export interface ComponentDensityEntry {
  grams_per_unit: Record<string, number>;
}

export interface NutritionData {
  ingredients: Record<string, IngredientNutritionEntry>;
  components: Record<string, ComponentDensityEntry>;
}
