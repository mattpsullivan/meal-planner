// TanStack Query client configuration
// See docs/adr/003-tanstack-query-adoption.md for architecture details

import { QueryClient } from '@tanstack/react-query';

// Error logging utility
function logQueryError(error: unknown, query: unknown): void {
  const queryKey = (query as { queryKey?: unknown }).queryKey;
  console.error('[Query Error]', {
    queryKey,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}

function logMutationError(
  error: unknown,
  variables: unknown,
  _context: unknown,
  mutation: unknown
): void {
  const mutationKey = (mutation as { options?: { mutationKey?: unknown } }).options?.mutationKey;
  console.error('[Mutation Error]', {
    mutationKey,
    variables,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed queries up to 2 times
      retry: 2,
      // Don't refetch on window focus for local DB
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect for local DB
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Set up global error handlers
queryClient.setDefaultOptions({
  queries: {
    ...queryClient.getDefaultOptions().queries,
    meta: {
      onError: logQueryError,
    },
  },
  mutations: {
    ...queryClient.getDefaultOptions().mutations,
    onError: logMutationError,
  },
});

// Export query keys for consistent usage across the app
export const queryKeys = {
  // Weeks
  weeks: ['weeks'] as const,
  week: (id: number) => ['weeks', id] as const,
  weekByNumber: (weekNumber: number, year: number) => ['weeks', { weekNumber, year }] as const,
  daysForWeek: (weekId: number) => ['weeks', weekId, 'days'] as const,
  mealsForDay: (dayId: number) => ['days', dayId, 'meals'] as const,

  // Recipes
  recipes: ['recipes'] as const,
  recipe: (id: number) => ['recipes', id] as const,
  recipeBySlug: (slug: string) => ['recipes', { slug }] as const,
  recipesByMealType: (mealType: string) => ['recipes', { mealType }] as const,
  recipesByTag: (tag: string) => ['recipes', { tag }] as const,
  recipeSearch: (query: string) => ['recipes', 'search', query] as const,
  tags: ['recipes', 'tags'] as const,
  cuisines: ['recipes', 'cuisines'] as const,

  // Grocery Lists
  groceryLists: ['groceryLists'] as const,
  groceryList: (id: number) => ['groceryLists', id] as const,
  groceryListForWeek: (weekId: number) => ['groceryLists', { weekId }] as const,
} as const;
