# ADR 003: TanStack Query Adoption for Data Fetching

## Status

Accepted

## Date

2025-12-28

## Context

The application uses custom React hooks for data fetching from the client-side SQLite database. These hooks follow a manual pattern with `useState` and `useEffect`:

### Current Architecture (Before)

```typescript
// Example: useWeeks.ts
export function useWeeks(): UseWeeksResult {
  const { isReady } = useDatabase();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeeks = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllWeeks();
      setWeeks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weeks'));
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    void fetchWeeks();
  }, [fetchWeeks]);

  return { weeks, isLoading, error, refetch: fetchWeeks };
}
```

### Problems Identified

1. **Race conditions with React StrictMode**: React 18/19 StrictMode double-invokes effects, causing concurrent database operations that corrupt wa-sqlite's internal state.

2. **No request deduplication**: Multiple components using the same hook trigger duplicate queries.

3. **No caching**: Data is refetched on every mount, even if recently retrieved.

4. **Repetitive boilerplate**: Each hook repeats the same loading/error/data state pattern (~40 lines per hook).

5. **Manual cache invalidation**: No built-in way to invalidate related queries after mutations.

6. **No background refetching**: Stale data persists until manual refetch.

### Hooks Affected

| File | Hooks | Lines |
|------|-------|-------|
| `useWeeks.ts` | 6 hooks | 267 |
| `useRecipes.ts` | 8 hooks | 300 |
| `useGroceryList.ts` | 3 hooks | 457 |
| **Total** | **17 hooks** | **1024** |

## Decision

Adopt **TanStack Query v5** (formerly React Query) as the data fetching layer.

### Why TanStack Query?

1. **Industry standard**: Most popular React data fetching library in 2025
2. **Request deduplication**: Automatically prevents duplicate concurrent requests
3. **Smart caching**: Configurable stale times and cache invalidation
4. **StrictMode compatible**: Designed to work with React 18/19 concurrent features
5. **Optimistic updates**: Built-in support for mutations with rollback
6. **DevTools**: Powerful debugging tools for query inspection
7. **TypeScript-first**: Excellent type inference

### New Architecture (After)

```typescript
// Example: useWeeks.ts with TanStack Query
import { useQuery } from '@tanstack/react-query';
import { getAllWeeks } from '@/api/weeks';
import { useDatabase } from './useDatabase';

export function useWeeks() {
  const { isReady } = useDatabase();

  return useQuery({
    queryKey: ['weeks'],
    queryFn: getAllWeeks,
    enabled: isReady,
  });
}
```

### Query Key Structure

```
['weeks']                          - All weeks
['weeks', id]                      - Single week by ID
['weeks', { number, year }]        - Week by number/year
['weeks', id, 'days']              - Days for a week
['days', dayId, 'meals']           - Meals for a day

['recipes']                        - All recipes
['recipes', id]                    - Single recipe by ID
['recipes', { slug }]              - Recipe by slug
['recipes', { mealType }]          - Recipes by meal type
['recipes', { tag }]               - Recipes by tag

['groceryLists']                   - All grocery lists
['groceryLists', { weekId }]       - Grocery list for week
['groceryLists', id]               - Grocery list by ID
```

### Mutations

```typescript
// Example: Toggle grocery item
const toggleItem = useMutation({
  mutationFn: ({ itemId, checked }) => toggleGroceryItem(itemId, checked),
  onMutate: async ({ itemId, checked }) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['groceryLists'] });
    const previous = queryClient.getQueryData(['groceryLists', listId]);
    queryClient.setQueryData(['groceryLists', listId], (old) => ({
      ...old,
      items: old.items.map(i => i.id === itemId ? { ...i, checked } : i),
    }));
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['groceryLists', listId], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['groceryLists'] });
  },
});
```

## Consequences

### Positive

- **Eliminates race conditions**: Built-in request deduplication
- **Reduces boilerplate**: ~70% reduction in hook code
- **Improves UX**: Background refetching keeps data fresh
- **Better debugging**: DevTools show query state
- **Easier testing**: Queries are easier to mock

### Negative

- **New dependency**: Adds ~13kb to bundle (gzipped)
- **Learning curve**: Team needs to learn TanStack Query patterns
- **Migration effort**: 17 hooks need refactoring

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes during migration | Incremental refactoring with tests |
| Query key collisions | Documented key structure above |
| Over-fetching | Configure appropriate staleTime |

## Implementation Plan

1. Install TanStack Query and configure QueryClientProvider
2. Refactor `useWeeks.ts` hooks (6 hooks)
3. Refactor `useRecipes.ts` hooks (8 hooks)
4. Refactor `useGroceryList.ts` hooks with mutations (3 hooks)
5. Add error logging utilities
6. Write tests for refactored hooks
7. Remove old boilerplate code

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Query vs SWR 2025 Comparison](https://refine.dev/blog/react-query-vs-tanstack-query-vs-swr-2025/)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
