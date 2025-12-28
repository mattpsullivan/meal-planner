// Recipe data hooks using TanStack Query with static data
// Provides reactive access to recipe data with automatic caching

import { useQuery } from '@tanstack/react-query';
import type { Recipe, RecipeWithDetails, MealType } from '@/types';
import {
  getAllRecipes,
  getRecipeById,
  getRecipeBySlug,
  searchRecipes,
  getRecipesByMealType,
  getRecipesByTag,
  getAllTags,
  getAllCuisines,
} from '@/data';
import { queryKeys } from '@/lib/queryClient';

// Get all recipes
export function useRecipes() {
  return useQuery({
    queryKey: queryKeys.recipes,
    queryFn: () => Promise.resolve(getAllRecipes()),
    staleTime: Infinity, // Static data never goes stale
  });
}

// Legacy interface for backward compatibility
interface UseRecipesResult {
  recipes: Recipe[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRecipesLegacy(): UseRecipesResult {
  const query = useRecipes();

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get single recipe by ID
export function useRecipe(id: number) {
  return useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: () => Promise.resolve(getRecipeById(id) ?? null),
    enabled: id > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseRecipeResult {
  recipe: RecipeWithDetails | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRecipeLegacy(id: number): UseRecipeResult {
  const query = useRecipe(id);

  return {
    recipe: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get recipe by slug
export function useRecipeBySlug(slug: string) {
  return useQuery({
    queryKey: queryKeys.recipeBySlug(slug),
    queryFn: () => Promise.resolve(getRecipeBySlug(slug) ?? null),
    enabled: slug.length > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
export function useRecipeBySlugLegacy(slug: string): UseRecipeResult {
  const query = useRecipeBySlug(slug);

  return {
    recipe: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Search recipes
export function useRecipeSearch(searchQuery: string) {
  return useQuery({
    queryKey: queryKeys.recipeSearch(searchQuery),
    queryFn: () => Promise.resolve(searchRecipes(searchQuery)),
    enabled: searchQuery.length > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseRecipeSearchResult {
  results: Recipe[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
}

export function useRecipeSearchLegacy(): UseRecipeSearchResult {
  return {
    results: [],
    isLoading: false,
    error: null,
    search: async () => {
      console.warn(
        'useRecipeSearchLegacy.search is deprecated. Use useRecipeSearch(query) instead.'
      );
      await Promise.resolve();
    },
  };
}

// Get recipes by meal type
export function useRecipesByMealType(type: MealType) {
  return useQuery({
    queryKey: queryKeys.recipesByMealType(type),
    queryFn: () => Promise.resolve(getRecipesByMealType(type)),
    staleTime: Infinity,
  });
}

// Legacy interface
export function useRecipesByMealTypeLegacy(type: MealType): UseRecipesResult {
  const query = useRecipesByMealType(type);

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get recipes by tag
export function useRecipesByTag(tag: string) {
  return useQuery({
    queryKey: queryKeys.recipesByTag(tag),
    queryFn: () => Promise.resolve(getRecipesByTag(tag)),
    enabled: tag.length > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
export function useRecipesByTagLegacy(tag: string): UseRecipesResult {
  const query = useRecipesByTag(tag);

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get all tags
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => Promise.resolve(getAllTags()),
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseTagsResult {
  tags: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useTagsLegacy(): UseTagsResult {
  const query = useTags();

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

// Get all cuisines
export function useCuisines() {
  return useQuery({
    queryKey: queryKeys.cuisines,
    queryFn: () => Promise.resolve(getAllCuisines()),
    staleTime: Infinity,
  });
}

// Legacy interface
export function useCuisinesLegacy(): UseTagsResult {
  const query = useCuisines();

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
