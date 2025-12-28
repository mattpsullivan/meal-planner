// React hooks barrel export
// Re-exports all hooks for convenient importing

// Recipes
export {
  useRecipes,
  useRecipe,
  useRecipeBySlug,
  useRecipeSearch,
  useRecipesByMealType,
  useRecipesByTag,
  useTags,
  useCuisines,
} from './useRecipes';

// Weeks and days
export {
  useWeeks,
  useWeek,
  useWeekByNumber,
  useDaysForWeek,
  useMealsForDay,
  useWeekNavigation,
} from './useWeeks';

// Grocery lists
export { useGroceryListForWeek, useGroceryListById, useAllGroceryLists } from './useGroceryList';

// User state (from Zustand store)
export {
  useUserState,
  useCheckedItems,
  useIsItemChecked,
  useCurrentWeek,
  useServingMultiplier,
  useCompletedPrepSteps,
  useIsPrepStepCompleted,
  useTheme,
  useGroceryCheckedItems,
  useIsGroceryItemChecked,
  useCustomGroceryItems,
  useGroceryItemNotes,
  useGroceryUserQuantity,
  useGroceryActions,
} from '@/store/userState';
