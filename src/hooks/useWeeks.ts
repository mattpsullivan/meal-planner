// Week data hooks using TanStack Query with static data
// Provides reactive access to week and day data with automatic caching

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { Week, WeekWithDetails, DayWithMeals, DayMealWithRecipe } from '@/types';
import { getAllWeeks, getWeekById, getWeekByNumber, getDaysForWeek, getMealsForDay } from '@/data';
import { queryKeys } from '@/lib/queryClient';

// Get all weeks
export function useWeeks() {
  return useQuery({
    queryKey: queryKeys.weeks,
    queryFn: () => Promise.resolve(getAllWeeks()),
    staleTime: Infinity, // Static data never goes stale
  });
}

// Legacy interface for backward compatibility
interface UseWeeksResult {
  weeks: Week[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWeeksLegacy(): UseWeeksResult {
  const query = useWeeks();

  return {
    weeks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get single week by ID with details
export function useWeek(id: number) {
  return useQuery({
    queryKey: queryKeys.week(id),
    queryFn: () => Promise.resolve(getWeekById(id) ?? null),
    enabled: id > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseWeekResult {
  week: WeekWithDetails | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWeekLegacy(id: number): UseWeekResult {
  const query = useWeek(id);

  return {
    week: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get week by number (year is ignored for static data since we only have 2026)
export function useWeekByNumber(weekNumber: number, _year: number) {
  return useQuery({
    queryKey: queryKeys.weekByNumber(weekNumber, _year),
    queryFn: () => Promise.resolve(getWeekByNumber(weekNumber) ?? null),
    enabled: weekNumber > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
export function useWeekByNumberLegacy(weekNumber: number, year: number): UseWeekResult {
  const query = useWeekByNumber(weekNumber, year);

  return {
    week: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get days for a week
export function useDaysForWeek(weekId: number) {
  return useQuery({
    queryKey: queryKeys.daysForWeek(weekId),
    queryFn: () => Promise.resolve(getDaysForWeek(weekId)),
    enabled: weekId > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseDaysResult {
  days: DayWithMeals[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDaysForWeekLegacy(weekId: number): UseDaysResult {
  const query = useDaysForWeek(weekId);

  return {
    days: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Get meals for a day
export function useMealsForDay(dayId: number) {
  return useQuery({
    queryKey: queryKeys.mealsForDay(dayId),
    queryFn: () => Promise.resolve(getMealsForDay(dayId)),
    enabled: dayId > 0,
    staleTime: Infinity,
  });
}

// Legacy interface
interface UseMealsResult {
  meals: DayMealWithRecipe[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMealsForDayLegacy(dayId: number): UseMealsResult {
  const query = useMealsForDay(dayId);

  return {
    meals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

// Hook for navigating between weeks
interface UseWeekNavigationResult {
  currentWeek: WeekWithDetails | null;
  weekNumber: number;
  year: number;
  isLoading: boolean;
  error: Error | null;
  goToWeek: (weekNumber: number, year: number) => void;
  nextWeek: () => void;
  prevWeek: () => void;
}

export function useWeekNavigation(initialWeek = 1, initialYear = 2026): UseWeekNavigationResult {
  const [weekNumber, setWeekNumber] = useState(initialWeek);
  const [year, setYear] = useState(initialYear);
  const query = useWeekByNumber(weekNumber, year);

  const goToWeek = useCallback((newWeekNumber: number, newYear: number) => {
    setWeekNumber(newWeekNumber);
    setYear(newYear);
  }, []);

  const nextWeek = useCallback(() => {
    // For our static data, we only have weeks 1-5
    if (weekNumber >= 5) {
      setWeekNumber(1);
    } else {
      setWeekNumber((w) => w + 1);
    }
  }, [weekNumber]);

  const prevWeek = useCallback(() => {
    // For our static data, we only have weeks 1-5
    if (weekNumber <= 1) {
      setWeekNumber(5);
    } else {
      setWeekNumber((w) => w - 1);
    }
  }, [weekNumber]);

  return {
    currentWeek: query.data ?? null,
    weekNumber,
    year,
    isLoading: query.isLoading,
    error: query.error,
    goToWeek,
    nextWeek,
    prevWeek,
  };
}
