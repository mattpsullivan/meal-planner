// Database type definitions
// See docs/DATA-ARCHITECTURE.md for complete schema documentation

// ============================================
// RECIPES
// ============================================

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  description?: string | undefined;
  cuisine?: string | undefined;
  servings: number;
  prepTime?: number | undefined;
  cookTime?: number | undefined;
  totalTime?: number | undefined;
  notes?: string | undefined;
  sourceType: SourceType;
  sourceUrl?: string | undefined;
  sourceImportedAt?: string | undefined;
  recipeType: RecipeType;
  createdAt: string;
  updatedAt: string;
}

export type SourceType = 'manual' | 'import' | 'url' | 'ai';

// Recipe types for meal vs component distinction
// - component: Prep recipes made during batch cooking (e.g., "Spiced Chickpeas")
// - meal: Assembly recipes that combine components (e.g., "Mediterranean Grain Bowl")
// - standalone: Traditional recipes with full ingredients (e.g., "Smoothie")
export type RecipeType = 'component' | 'meal' | 'standalone';

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  preparation?: string | undefined;
  category: IngredientCategory;
  optional: boolean;
  sortOrder: number;
  sourceRecipeId?: number | undefined; // For ingredients that are component recipes
}

export type IngredientCategory =
  | 'produce'
  | 'pantry'
  | 'refrigerated'
  | 'frozen'
  | 'spices'
  | 'oils-vinegars'
  | 'nuts-seeds'
  | 'grains'
  | 'legumes'
  | 'other';

export interface Instruction {
  id: number;
  recipeId: number;
  stepNumber: number;
  text: string;
  duration?: number | undefined;
  isParallel: boolean;
  timerLabel?: string | undefined;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'component' | 'sauce' | 'base';

// Ingredient with linked source recipe (for meal recipes with component references)
export interface IngredientWithSourceRecipe extends Ingredient {
  sourceRecipe?: Recipe | undefined;
}

// Full recipe with all relations
export interface RecipeWithDetails extends Recipe {
  ingredients: IngredientWithSourceRecipe[];
  instructions: Instruction[];
  tags: string[];
  mealTypes: MealType[];
}

// ============================================
// MEAL PLANS
// ============================================

export interface Week {
  id: number;
  weekNumber: number;
  year: number;
  name?: string | undefined;
  theme?: string | undefined;
  prepTimeTotal?: number | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface WeekComponent {
  id: number;
  weekId: number;
  category: string;
  item: string;
  recipeId?: number | undefined;
}

export interface PrepStep {
  id: number;
  weekId: number;
  timeMarker: string;
  task: string;
  duration?: number | undefined;
  recipeId?: number | undefined;
  sortOrder: number;
}

export interface Day {
  id: number;
  weekId: number;
  dayNumber: number;
  date?: string | undefined;
  dayName?: string | undefined;
}

export interface DayMeal {
  id: number;
  dayId: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: number | undefined;
  description?: string | undefined;
  notes?: string | undefined;
  sortOrder: number;
}

// Extended types with relations
export interface WeekWithDetails extends Week {
  components: WeekComponent[];
  prepSteps: PrepStep[];
  days: DayWithMeals[];
}

export interface DayWithMeals extends Day {
  meals: DayMealWithRecipe[];
}

export interface DayMealWithRecipe extends DayMeal {
  recipe?: Recipe | undefined;
}

// ============================================
// GROCERY
// ============================================

export interface GroceryList {
  id: number;
  weekId?: number | undefined;
  name?: string | undefined;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItem {
  id: number;
  listId: number;
  name: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  category?: string | undefined;
  checked: boolean;
  recipeSources: string[];
  userQuantity?: number | undefined;
  userNotes?: string | undefined;
  sortOrder: number;
}

export interface GroceryListWithItems extends GroceryList {
  items: GroceryItem[];
}

// ============================================
// USER STATE
// ============================================

export interface UserState {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface UserPreferences {
  servings: number;
  dietaryRestrictions: string[];
  theme: 'light' | 'dark' | 'system';
}

// ============================================
// DATABASE EXPORT/IMPORT
// ============================================

export interface DatabaseExport {
  version: string;
  exportedAt: string;
  data: {
    recipes: RecipeWithDetails[];
    weeks: WeekWithDetails[];
    groceryLists: GroceryListWithItems[];
    userState: UserState[];
  };
}
