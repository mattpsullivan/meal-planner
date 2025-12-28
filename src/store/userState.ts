/**
 * User state store with localStorage persistence
 * Manages shopping list checks, preferences, and prep progress
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Custom grocery item (user-added)
export interface CustomGroceryItem {
  id: string; // Generated unique ID
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  notes?: string;
}

export interface UserState {
  // Shopping list - checked items by item ID
  checkedItems: Record<string, boolean>;

  // User preferences
  currentWeekId: number;
  servingMultiplier: number;

  // Prep tracking - completed step IDs by week ID
  completedPrepSteps: Record<number, string[]>;

  // UI preferences
  theme: 'light' | 'dark' | 'system';

  // Grocery list user state (per week)
  groceryCheckedItems: Record<string, boolean>; // key: `${weekId}-${itemKey}`
  customGroceryItems: Record<number, CustomGroceryItem[]>; // key: weekId
  groceryItemNotes: Record<string, string>; // key: `${weekId}-${itemKey}`
  groceryUserQuantities: Record<string, number>; // key: `${weekId}-${itemKey}`

  // Actions
  toggleItem: (itemId: string) => void;
  setItemChecked: (itemId: string, checked: boolean) => void;
  clearCheckedItems: () => void;
  clearCheckedItemsForWeek: (weekId: number) => void;

  setCurrentWeek: (weekId: number) => void;
  setServingMultiplier: (multiplier: number) => void;

  togglePrepStep: (weekId: number, stepId: string) => void;
  setPrepStepCompleted: (weekId: number, stepId: string, completed: boolean) => void;
  resetWeekPrepProgress: (weekId: number) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Grocery actions
  toggleGroceryItem: (weekId: number, itemKey: string) => void;
  setGroceryItemChecked: (weekId: number, itemKey: string, checked: boolean) => void;
  addCustomGroceryItem: (weekId: number, item: Omit<CustomGroceryItem, 'id'>) => void;
  removeCustomGroceryItem: (weekId: number, itemId: string) => void;
  setGroceryItemNotes: (weekId: number, itemKey: string, notes: string | null) => void;
  setGroceryUserQuantity: (weekId: number, itemKey: string, quantity: number | null) => void;
  clearGroceryCheckedItems: (weekId: number) => void;
  resetGroceryForWeek: (weekId: number) => void;

  // Utility
  resetAll: () => void;
}

const initialState = {
  checkedItems: {},
  currentWeekId: 1,
  servingMultiplier: 1,
  completedPrepSteps: {},
  theme: 'system' as const,
  groceryCheckedItems: {},
  customGroceryItems: {},
  groceryItemNotes: {},
  groceryUserQuantities: {},
};

export const useUserState = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,

      // Shopping list actions
      toggleItem: (itemId) =>
        set((state) => ({
          checkedItems: {
            ...state.checkedItems,
            [itemId]: !state.checkedItems[itemId],
          },
        })),

      setItemChecked: (itemId, checked) =>
        set((state) => ({
          checkedItems: {
            ...state.checkedItems,
            [itemId]: checked,
          },
        })),

      clearCheckedItems: () => set({ checkedItems: {} }),

      clearCheckedItemsForWeek: (weekId) =>
        set((state) => {
          // Remove items that start with the week prefix
          const prefix = `week-${String(weekId)}-`;
          const filtered = Object.fromEntries(
            Object.entries(state.checkedItems).filter(([key]) => !key.startsWith(prefix))
          );
          return { checkedItems: filtered };
        }),

      // Preference actions
      setCurrentWeek: (weekId) => set({ currentWeekId: weekId }),

      setServingMultiplier: (multiplier) => set({ servingMultiplier: multiplier }),

      // Prep tracking actions
      togglePrepStep: (weekId, stepId) =>
        set((state) => {
          const currentSteps = state.completedPrepSteps[weekId] ?? [];
          const isCompleted = currentSteps.includes(stepId);

          return {
            completedPrepSteps: {
              ...state.completedPrepSteps,
              [weekId]: isCompleted
                ? currentSteps.filter((s) => s !== stepId)
                : [...currentSteps, stepId],
            },
          };
        }),

      setPrepStepCompleted: (weekId, stepId, completed) =>
        set((state) => {
          const currentSteps = state.completedPrepSteps[weekId] ?? [];
          const isCurrentlyCompleted = currentSteps.includes(stepId);

          if (completed === isCurrentlyCompleted) {
            return state; // No change needed
          }

          return {
            completedPrepSteps: {
              ...state.completedPrepSteps,
              [weekId]: completed
                ? [...currentSteps, stepId]
                : currentSteps.filter((s) => s !== stepId),
            },
          };
        }),

      resetWeekPrepProgress: (weekId) =>
        set((state) => ({
          completedPrepSteps: {
            ...state.completedPrepSteps,
            [weekId]: [],
          },
        })),

      // Theme action
      setTheme: (theme) => set({ theme }),

      // Grocery actions
      toggleGroceryItem: (weekId, itemKey) =>
        set((state) => {
          const key = `${String(weekId)}-${itemKey}`;
          return {
            groceryCheckedItems: {
              ...state.groceryCheckedItems,
              [key]: !state.groceryCheckedItems[key],
            },
          };
        }),

      setGroceryItemChecked: (weekId, itemKey, checked) =>
        set((state) => {
          const key = `${String(weekId)}-${itemKey}`;
          return {
            groceryCheckedItems: {
              ...state.groceryCheckedItems,
              [key]: checked,
            },
          };
        }),

      addCustomGroceryItem: (weekId, item) =>
        set((state) => {
          const existing = state.customGroceryItems[weekId] ?? [];
          const newItem: CustomGroceryItem = {
            ...item,
            id: `custom-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`,
          };
          return {
            customGroceryItems: {
              ...state.customGroceryItems,
              [weekId]: [...existing, newItem],
            },
          };
        }),

      removeCustomGroceryItem: (weekId, itemId) =>
        set((state) => {
          const existing = state.customGroceryItems[weekId] ?? [];
          return {
            customGroceryItems: {
              ...state.customGroceryItems,
              [weekId]: existing.filter((item) => item.id !== itemId),
            },
          };
        }),

      setGroceryItemNotes: (weekId, itemKey, notes) =>
        set((state) => {
          const key = `${String(weekId)}-${itemKey}`;
          if (notes === null) {
            // Remove the key by filtering it out
            const newNotes = Object.fromEntries(
              Object.entries(state.groceryItemNotes).filter(([k]) => k !== key)
            );
            return { groceryItemNotes: newNotes };
          }
          return {
            groceryItemNotes: {
              ...state.groceryItemNotes,
              [key]: notes,
            },
          };
        }),

      setGroceryUserQuantity: (weekId, itemKey, quantity) =>
        set((state) => {
          const key = `${String(weekId)}-${itemKey}`;
          if (quantity === null) {
            // Remove the key by filtering it out
            const newQuantities = Object.fromEntries(
              Object.entries(state.groceryUserQuantities).filter(([k]) => k !== key)
            );
            return { groceryUserQuantities: newQuantities };
          }
          return {
            groceryUserQuantities: {
              ...state.groceryUserQuantities,
              [key]: quantity,
            },
          };
        }),

      clearGroceryCheckedItems: (weekId) =>
        set((state) => {
          const prefix = `${String(weekId)}-`;
          const filtered = Object.fromEntries(
            Object.entries(state.groceryCheckedItems).filter(([key]) => !key.startsWith(prefix))
          );
          return { groceryCheckedItems: filtered };
        }),

      resetGroceryForWeek: (weekId) =>
        set((state) => {
          const prefix = `${String(weekId)}-`;
          const filteredChecked = Object.fromEntries(
            Object.entries(state.groceryCheckedItems).filter(([key]) => !key.startsWith(prefix))
          );
          const filteredNotes = Object.fromEntries(
            Object.entries(state.groceryItemNotes).filter(([key]) => !key.startsWith(prefix))
          );
          const filteredQuantities = Object.fromEntries(
            Object.entries(state.groceryUserQuantities).filter(([key]) => !key.startsWith(prefix))
          );
          const { [weekId]: _removed, ...remainingCustomItems } = state.customGroceryItems;
          return {
            groceryCheckedItems: filteredChecked,
            groceryItemNotes: filteredNotes,
            groceryUserQuantities: filteredQuantities,
            customGroceryItems: remainingCustomItems,
          };
        }),

      // Reset everything
      resetAll: () => set(initialState),
    }),
    {
      name: 'vegan-meal-prep-user-state',
      storage: createJSONStorage(() => localStorage),
      version: 2, // Bumped to clear potentially corrupted data from pre-static era
      // Only persist user data, not actions
      partialize: (state) => ({
        checkedItems: state.checkedItems,
        currentWeekId: state.currentWeekId,
        servingMultiplier: state.servingMultiplier,
        completedPrepSteps: state.completedPrepSteps,
        theme: state.theme,
        groceryCheckedItems: state.groceryCheckedItems,
        customGroceryItems: state.customGroceryItems,
        groceryItemNotes: state.groceryItemNotes,
        groceryUserQuantities: state.groceryUserQuantities,
      }),
      migrate: (persistedState, version) => {
        // Reset all data for version 1 (pre-static data architecture)
        if (version < 2) {
          console.log('Migrating user state from version', version, 'to 2');
          return initialState;
        }
        return persistedState as UserState;
      },
    }
  )
);

// Selector hooks for common patterns
export function useCheckedItems() {
  return useUserState((state) => state.checkedItems);
}

export function useIsItemChecked(itemId: string) {
  return useUserState((state) => state.checkedItems[itemId] ?? false);
}

export function useCurrentWeek() {
  return useUserState((state) => state.currentWeekId);
}

export function useServingMultiplier() {
  return useUserState((state) => state.servingMultiplier);
}

export function useCompletedPrepSteps(weekId: number) {
  return useUserState((state) => state.completedPrepSteps[weekId] ?? []);
}

export function useIsPrepStepCompleted(weekId: number, stepId: string) {
  return useUserState((state) => state.completedPrepSteps[weekId]?.includes(stepId) ?? false);
}

export function useTheme() {
  return useUserState((state) => state.theme);
}

// Grocery selector hooks
export function useGroceryCheckedItems(weekId: number) {
  return useUserState((state) => {
    const prefix = `${String(weekId)}-`;
    return Object.fromEntries(
      Object.entries(state.groceryCheckedItems).filter(([key]) => key.startsWith(prefix))
    );
  });
}

export function useIsGroceryItemChecked(weekId: number, itemKey: string) {
  const key = `${String(weekId)}-${itemKey}`;
  return useUserState((state) => state.groceryCheckedItems[key] ?? false);
}

export function useCustomGroceryItems(weekId: number) {
  return useUserState((state) => state.customGroceryItems[weekId] ?? []);
}

export function useGroceryItemNotes(weekId: number, itemKey: string) {
  const key = `${String(weekId)}-${itemKey}`;
  return useUserState((state) => state.groceryItemNotes[key]);
}

export function useGroceryUserQuantity(weekId: number, itemKey: string) {
  const key = `${String(weekId)}-${itemKey}`;
  return useUserState((state) => state.groceryUserQuantities[key]);
}

// Get grocery actions - memoized to prevent infinite re-render loops
// Actions are stable references from Zustand, so we can memoize with empty deps
export function useGroceryActions() {
  return useMemo(
    () => ({
      toggleGroceryItem: useUserState.getState().toggleGroceryItem,
      setGroceryItemChecked: useUserState.getState().setGroceryItemChecked,
      addCustomGroceryItem: useUserState.getState().addCustomGroceryItem,
      removeCustomGroceryItem: useUserState.getState().removeCustomGroceryItem,
      setGroceryItemNotes: useUserState.getState().setGroceryItemNotes,
      setGroceryUserQuantity: useUserState.getState().setGroceryUserQuantity,
      clearGroceryCheckedItems: useUserState.getState().clearGroceryCheckedItems,
      resetGroceryForWeek: useUserState.getState().resetGroceryForWeek,
    }),
    []
  );
}
