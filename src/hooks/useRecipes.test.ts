// Tests for useRecipes hooks with static data layer
// Run with: pnpm test:run src/hooks/useRecipes.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useRecipes,
  useRecipe,
  useRecipeBySlug,
  useRecipeSearch,
  useTags,
  useCuisines,
} from './useRecipes';
import { createWrapper } from '@/test/testUtils';
import * as dataLayer from '@/data';
import { queryKeys } from '@/lib/queryClient';

// Mock the data layer
vi.mock('@/data');

describe('useRecipes hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useRecipes', () => {
    it('resolves with data from the data layer', async () => {
      vi.mocked(dataLayer.getAllRecipes).mockReturnValue([]);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('returns recipes data on success', async () => {
      const mockRecipes = [
        {
          id: 1,
          name: 'Recipe 1',
          slug: 'recipe-1',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          sourceType: 'import' as const,
          recipeType: 'component' as const,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 2,
          name: 'Recipe 2',
          slug: 'recipe-2',
          servings: 2,
          prepTime: 10,
          cookTime: 20,
          sourceType: 'import' as const,
          recipeType: 'component' as const,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      vi.mocked(dataLayer.getAllRecipes).mockReturnValue(mockRecipes);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRecipes);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useRecipe', () => {
    it('fetches recipe by ID when enabled', async () => {
      const mockRecipe = {
        id: 1,
        name: 'Test Recipe',
        slug: 'test-recipe',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        ingredients: [],
        instructions: [],
        tags: [],
        mealTypes: [],
        sourceType: 'import' as const,
        recipeType: 'component' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(dataLayer.getRecipeById).mockReturnValue(mockRecipe);

      const { result } = renderHook(() => useRecipe(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(dataLayer.getRecipeById).toHaveBeenCalledWith(1);
      expect(result.current.data).toEqual(mockRecipe);
    });

    it('does not fetch when ID is 0', () => {
      const { result } = renderHook(() => useRecipe(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.getRecipeById).not.toHaveBeenCalled();
    });
  });

  describe('useRecipeBySlug', () => {
    it('fetches recipe by slug when enabled', async () => {
      const mockRecipe = {
        id: 1,
        name: 'Test Recipe',
        slug: 'test-recipe',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        ingredients: [],
        instructions: [],
        tags: [],
        mealTypes: [],
        sourceType: 'import' as const,
        recipeType: 'component' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(dataLayer.getRecipeBySlug).mockReturnValue(mockRecipe);

      const { result } = renderHook(() => useRecipeBySlug('test-recipe'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(dataLayer.getRecipeBySlug).toHaveBeenCalledWith('test-recipe');
      expect(result.current.data).toEqual(mockRecipe);
    });

    it('does not fetch when slug is empty', () => {
      const { result } = renderHook(() => useRecipeBySlug(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.getRecipeBySlug).not.toHaveBeenCalled();
    });
  });

  describe('useRecipeSearch', () => {
    it('searches recipes when query is provided', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Tofu Stir Fry',
          slug: 'tofu-stir-fry',
          servings: 4,
          prepTime: 10,
          cookTime: 15,
          sourceType: 'import' as const,
          recipeType: 'component' as const,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      vi.mocked(dataLayer.searchRecipes).mockReturnValue(mockResults);

      const { result } = renderHook(() => useRecipeSearch('tofu'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(dataLayer.searchRecipes).toHaveBeenCalledWith('tofu');
      expect(result.current.data).toEqual(mockResults);
    });

    it('does not search when query is empty', () => {
      const { result } = renderHook(() => useRecipeSearch(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.searchRecipes).not.toHaveBeenCalled();
    });
  });

  describe('useTags', () => {
    it('fetches all tags', async () => {
      const mockTags = ['quick', 'healthy', 'protein-rich', 'gluten-free'];

      vi.mocked(dataLayer.getAllTags).mockReturnValue(mockTags);

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTags);
    });
  });

  describe('useCuisines', () => {
    it('fetches all cuisines', async () => {
      const mockCuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean'];

      vi.mocked(dataLayer.getAllCuisines).mockReturnValue(mockCuisines);

      const { result } = renderHook(() => useCuisines(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCuisines);
    });
  });

  describe('query keys', () => {
    it('uses correct query key for useRecipes', () => {
      expect(queryKeys.recipes).toEqual(['recipes']);
    });

    it('uses correct query key for useRecipe', () => {
      expect(queryKeys.recipe(1)).toEqual(['recipes', 1]);
      expect(queryKeys.recipe(42)).toEqual(['recipes', 42]);
    });

    it('uses correct query key for useRecipeBySlug', () => {
      expect(queryKeys.recipeBySlug('test-slug')).toEqual(['recipes', { slug: 'test-slug' }]);
    });

    it('uses correct query key for useRecipeSearch', () => {
      expect(queryKeys.recipeSearch('tofu')).toEqual(['recipes', 'search', 'tofu']);
    });

    it('uses correct query key for useTags', () => {
      expect(queryKeys.tags).toEqual(['recipes', 'tags']);
    });

    it('uses correct query key for useCuisines', () => {
      expect(queryKeys.cuisines).toEqual(['recipes', 'cuisines']);
    });
  });
});
