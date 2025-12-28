// Grocery list hooks using static data + Zustand for user state
// Generates grocery lists from week recipes and persists user interactions

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GroceryListWithItems, GroceryItem } from '@/types';
import { generateGroceryListForWeek, getWeekById } from '@/data';
import type { StaticGroceryItem } from '@/data';
import { useUserState, useGroceryActions, type CustomGroceryItem } from '@/store/userState';
import { queryKeys } from '@/lib/queryClient';

// Defensive helper to ensure a value is a string or undefined
// Used to protect against corrupted localStorage data that might not match types
function safeString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value == null) return undefined;
  // Reject objects to prevent "[object Object]" rendering
  if (typeof value === 'object') return undefined;
  // For primitives (number, boolean), convert to string representation
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return undefined;
}

// Defensive helper to ensure a value is a non-null string
// Uses 'unknown' to bypass TypeScript's type assumptions about the input
function ensureString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return '';
}

// Convert static grocery item + user state to GroceryItem type
function toGroceryItem(
  item: StaticGroceryItem,
  weekId: number,
  userState: {
    checked: Record<string, boolean>;
    notes: Record<string, string>;
    quantities: Record<string, number>;
  },
  index: number
): GroceryItem {
  const stateKey = `${String(weekId)}-${item.itemKey}`;

  // Defensive: ensure values from localStorage are correct types
  const checkedValue = userState.checked[stateKey];
  const notesValue = userState.notes[stateKey];
  const quantityValue = userState.quantities[stateKey];

  return {
    id: index + 1, // Synthetic ID based on position
    listId: weekId,
    name: ensureString(item.name),
    quantity: typeof item.quantity === 'number' ? item.quantity : 0,
    unit: safeString(item.unit),
    category: safeString(item.category) ?? 'other',
    checked: typeof checkedValue === 'boolean' ? checkedValue : false,
    recipeSources: Array.isArray(item.recipeSources)
      ? item.recipeSources.map((s) => ensureString(s))
      : [],
    userQuantity: typeof quantityValue === 'number' ? quantityValue : undefined,
    userNotes: safeString(notesValue),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
  };
}

// Convert custom grocery item to GroceryItem type
function customToGroceryItem(
  item: CustomGroceryItem,
  weekId: number,
  userState: {
    checked: Record<string, boolean>;
  },
  baseIndex: number
): GroceryItem {
  const stateKey = `${String(weekId)}-custom-${item.id}`;
  const checkedValue = userState.checked[stateKey];

  return {
    id: baseIndex,
    listId: weekId,
    name: ensureString(item.name),
    quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
    unit: safeString(item.unit),
    category: safeString(item.category) ?? 'other',
    checked: typeof checkedValue === 'boolean' ? checkedValue : false,
    recipeSources: ['Custom'],
    userQuantity: typeof item.quantity === 'number' ? item.quantity : undefined,
    userNotes: safeString(item.notes),
    sortOrder: 9999 + baseIndex, // Custom items at the end
  };
}

// Interface for mutation result handlers
interface UseGroceryListForWeekResult {
  list: GroceryListWithItems | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  toggleItem: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  updateNotes: (itemId: number, notes: string | null) => Promise<void>;
  addItem: (item: Omit<GroceryItem, 'id' | 'listId'>) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearChecked: () => Promise<void>;
  regenerate: () => Promise<void>;
  updateMultiplier: (multiplier: number) => Promise<void>;
}

// Stable empty array reference to prevent infinite re-renders
const EMPTY_CUSTOM_ITEMS: CustomGroceryItem[] = [];

export function useGroceryListForWeek(weekId: number): UseGroceryListForWeekResult {
  const actions = useGroceryActions();

  // Get user state for this week - use stable references to prevent infinite loops
  const groceryCheckedItems = useUserState((state) => state.groceryCheckedItems);
  const groceryItemNotes = useUserState((state) => state.groceryItemNotes);
  const groceryUserQuantities = useUserState((state) => state.groceryUserQuantities);
  // Use stable empty array reference when no custom items exist
  const customGroceryItemsRaw = useUserState((state) => state.customGroceryItems[weekId]);
  const customGroceryItems = customGroceryItemsRaw ?? EMPTY_CUSTOM_ITEMS;
  const servingMultiplier = useUserState((state) => state.servingMultiplier);
  // Get action from stable getState() instead of selector
  const setServingMultiplier = useUserState.getState().setServingMultiplier;

  // Query for generating the static grocery list
  const query = useQuery({
    queryKey: queryKeys.groceryListForWeek(weekId),
    queryFn: () => Promise.resolve(generateGroceryListForWeek(weekId)),
    enabled: weekId > 0,
    staleTime: Infinity, // Static data never goes stale
  });

  // Get week info for the list name
  const week = useMemo(() => getWeekById(weekId), [weekId]);

  // Build the full grocery list with user state
  const list = useMemo((): GroceryListWithItems | null => {
    if (!query.data || !week) return null;

    const userState = {
      checked: groceryCheckedItems,
      notes: groceryItemNotes,
      quantities: groceryUserQuantities,
    };

    // Convert static items to GroceryItem format
    const staticItems = query.data.map((item, index) =>
      toGroceryItem(item, weekId, userState, index)
    );

    // Add custom items
    const customItems = customGroceryItems.map((item, index) =>
      customToGroceryItem(
        item,
        weekId,
        { checked: groceryCheckedItems },
        staticItems.length + index + 1
      )
    );

    // Apply serving multiplier to quantities
    const allItems = [...staticItems, ...customItems].map((item) => ({
      ...item,
      quantity: item.quantity ? item.quantity * servingMultiplier : item.quantity,
    }));

    return {
      id: weekId,
      weekId,
      name: `Week ${String(week.weekNumber)} - ${week.name ?? 'Meal Plan'}`,
      multiplier: servingMultiplier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: allItems,
    };
  }, [
    query.data,
    week,
    weekId,
    groceryCheckedItems,
    groceryItemNotes,
    groceryUserQuantities,
    customGroceryItems,
    servingMultiplier,
  ]);

  // Create item key lookup for mutations
  const itemKeyLookup = useMemo(() => {
    if (!query.data) return new Map<number, string>();
    const staticData = query.data;
    const lookup = new Map<number, string>();
    staticData.forEach((item, index) => {
      lookup.set(index + 1, item.itemKey);
    });
    // Add custom items
    const baseIndex = staticData.length;
    customGroceryItems.forEach((item, index) => {
      lookup.set(baseIndex + index + 1, `custom-${item.id}`);
    });
    return lookup;
  }, [query.data, customGroceryItems]);

  // Toggle item checked state
  const toggleItem = useCallback(
    (itemId: number): Promise<void> => {
      const itemKey = itemKeyLookup.get(itemId);
      if (itemKey) {
        actions.toggleGroceryItem(weekId, itemKey);
      }
      return Promise.resolve();
    },
    [weekId, itemKeyLookup, actions]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    (itemId: number, quantity: number): Promise<void> => {
      const itemKey = itemKeyLookup.get(itemId);
      if (itemKey) {
        actions.setGroceryUserQuantity(weekId, itemKey, quantity);
      }
      return Promise.resolve();
    },
    [weekId, itemKeyLookup, actions]
  );

  // Update item notes
  const updateNotes = useCallback(
    (itemId: number, notes: string | null): Promise<void> => {
      const itemKey = itemKeyLookup.get(itemId);
      if (itemKey) {
        actions.setGroceryItemNotes(weekId, itemKey, notes);
      }
      return Promise.resolve();
    },
    [weekId, itemKeyLookup, actions]
  );

  // Add custom item
  const addItem = useCallback(
    (item: Omit<GroceryItem, 'id' | 'listId'>): Promise<void> => {
      // Build the custom item, only including defined properties
      const customItem: Omit<CustomGroceryItem, 'id'> = {
        name: item.name,
      };
      if (item.quantity !== undefined) {
        customItem.quantity = item.quantity;
      }
      if (item.unit !== undefined) {
        customItem.unit = item.unit;
      }
      if (item.category !== undefined) {
        customItem.category = item.category;
      }
      if (item.userNotes !== undefined) {
        customItem.notes = item.userNotes;
      }
      actions.addCustomGroceryItem(weekId, customItem);
      return Promise.resolve();
    },
    [weekId, actions]
  );

  // Remove custom item
  const removeItem = useCallback(
    (itemId: number): Promise<void> => {
      const itemKey = itemKeyLookup.get(itemId);
      if (itemKey?.startsWith('custom-')) {
        const customId = itemKey.replace('custom-', '');
        actions.removeCustomGroceryItem(weekId, customId);
      }
      // Note: Static items cannot be removed, only unchecked
      return Promise.resolve();
    },
    [weekId, itemKeyLookup, actions]
  );

  // Clear all checked items
  const clearChecked = useCallback((): Promise<void> => {
    actions.clearGroceryCheckedItems(weekId);
    return Promise.resolve();
  }, [weekId, actions]);

  // Regenerate list (reset user state)
  const regenerate = useCallback((): Promise<void> => {
    actions.resetGroceryForWeek(weekId);
    return Promise.resolve();
  }, [weekId, actions]);

  // Update serving multiplier
  const updateMultiplier = useCallback(
    (multiplier: number): Promise<void> => {
      setServingMultiplier(multiplier);
      return Promise.resolve();
    },
    [setServingMultiplier]
  );

  return {
    list,
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
    toggleItem,
    updateQuantity,
    updateNotes,
    addItem,
    removeItem,
    clearChecked,
    regenerate,
    updateMultiplier,
  };
}

// Interface for grocery list by ID result
interface UseGroceryListByIdResult extends Omit<UseGroceryListForWeekResult, 'refetch'> {
  refetch: () => Promise<void>;
  deleteList: () => Promise<void>;
}

export function useGroceryListById(id: number): UseGroceryListByIdResult {
  // For static data, list ID is the same as week ID
  const weekResult = useGroceryListForWeek(id);
  const actions = useGroceryActions();

  const deleteList = useCallback((): Promise<void> => {
    // For static data, "deleting" means resetting user state
    actions.resetGroceryForWeek(id);
    return Promise.resolve();
  }, [id, actions]);

  return {
    ...weekResult,
    deleteList,
  };
}

// Get all grocery lists (one per week)
export function useAllGroceryLists() {
  return useQuery({
    queryKey: queryKeys.groceryLists,
    queryFn: () => {
      // Generate lists for all 5 weeks
      const lists: GroceryListWithItems[] = [];
      for (let weekId = 1; weekId <= 5; weekId++) {
        const week = getWeekById(weekId);
        if (week) {
          const items = generateGroceryListForWeek(weekId);
          lists.push({
            id: weekId,
            weekId,
            name: `Week ${String(week.weekNumber)} - ${week.name ?? 'Meal Plan'}`,
            multiplier: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: items.map((item, index) => ({
              id: index + 1,
              listId: weekId,
              name: ensureString(item.name),
              quantity: typeof item.quantity === 'number' ? item.quantity : 0,
              unit: safeString(item.unit),
              category: safeString(item.category) ?? 'other',
              checked: false,
              recipeSources: Array.isArray(item.recipeSources)
                ? item.recipeSources.map((s) => ensureString(s))
                : [],
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
            })),
          });
        }
      }
      return Promise.resolve(lists);
    },
    staleTime: Infinity,
  });
}

// Legacy interface for backward compatibility
interface UseAllGroceryListsLegacyResult {
  lists: GroceryListWithItems[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAllGroceryListsLegacy(): UseAllGroceryListsLegacyResult {
  const query = useAllGroceryLists();

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}
