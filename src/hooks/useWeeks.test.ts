// Tests for useWeeks hooks with static data layer
// Run with: pnpm test:run src/hooks/useWeeks.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeks, useWeek, useWeekByNumber } from './useWeeks';
import { createWrapper } from '@/test/testUtils';
import * as dataLayer from '@/data';
import { queryKeys } from '@/lib/queryClient';

// Mock the data layer
vi.mock('@/data');

describe('useWeeks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useWeeks', () => {
    it('resolves with data from the data layer', async () => {
      vi.mocked(dataLayer.getAllWeeks).mockReturnValue([]);

      const { result } = renderHook(() => useWeeks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('returns weeks data on success', async () => {
      const mockWeeks = [
        {
          id: 1,
          weekNumber: 1,
          year: 2026,
          theme: 'Week 1',
          name: 'Test Week 1',
          days: [],
          prepSteps: [],
          components: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 2,
          weekNumber: 2,
          year: 2026,
          theme: 'Week 2',
          name: 'Test Week 2',
          days: [],
          prepSteps: [],
          components: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      vi.mocked(dataLayer.getAllWeeks).mockReturnValue(mockWeeks);

      const { result } = renderHook(() => useWeeks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWeeks);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useWeek', () => {
    it('fetches week by ID when enabled', async () => {
      const mockWeek = {
        id: 1,
        weekNumber: 1,
        year: 2026,
        theme: 'Week 1',
        name: 'Test Week',
        days: [],
        prepSteps: [],
        components: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(dataLayer.getWeekById).mockReturnValue(mockWeek);

      const { result } = renderHook(() => useWeek(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(dataLayer.getWeekById).toHaveBeenCalledWith(1);
      expect(result.current.data).toEqual(mockWeek);
    });

    it('does not fetch when ID is 0', () => {
      const { result } = renderHook(() => useWeek(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.getWeekById).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is negative', () => {
      const { result } = renderHook(() => useWeek(-1), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.getWeekById).not.toHaveBeenCalled();
    });
  });

  describe('useWeekByNumber', () => {
    it('fetches week by number and year', async () => {
      const mockWeek = {
        id: 1,
        weekNumber: 5,
        year: 2026,
        theme: 'Week 5',
        name: 'Test Week',
        days: [],
        prepSteps: [],
        components: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(dataLayer.getWeekByNumber).mockReturnValue(mockWeek);

      const { result } = renderHook(() => useWeekByNumber(5, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Note: The hook only passes weekNumber to getWeekByNumber (year is ignored for static data)
      expect(dataLayer.getWeekByNumber).toHaveBeenCalledWith(5);
      expect(result.current.data).toEqual(mockWeek);
    });

    it('does not fetch when week number is 0', () => {
      const { result } = renderHook(() => useWeekByNumber(0, 2026), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(dataLayer.getWeekByNumber).not.toHaveBeenCalled();
    });
  });

  describe('query keys', () => {
    it('uses correct query key for useWeeks', () => {
      expect(queryKeys.weeks).toEqual(['weeks']);
    });

    it('uses correct query key for useWeek', () => {
      expect(queryKeys.week(1)).toEqual(['weeks', 1]);
      expect(queryKeys.week(42)).toEqual(['weeks', 42]);
    });

    it('uses correct query key for useWeekByNumber', () => {
      expect(queryKeys.weekByNumber(5, 2026)).toEqual(['weeks', { weekNumber: 5, year: 2026 }]);
    });
  });
});
