// Tests for WeekCalendar component
// Run with: pnpm test:run src/components/meal/WeekCalendar.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekCalendar } from './WeekCalendar';
import type { DayWithMeals } from '@/types';

// Helper to create mock day data
function createMockDay(
  id: number,
  dayNumber: number,
  dayName: string,
  meals: { id: number; mealType: string; description: string }[] = []
): DayWithMeals {
  return {
    id,
    weekId: 1,
    dayNumber,
    dayName,
    meals: meals.map((m) => ({
      id: m.id,
      dayId: id,
      mealType: m.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      description: m.description,
      sortOrder: 0,
    })),
  };
}

describe('WeekCalendar', () => {
  describe('day number handling', () => {
    it('should render days with standard 1-7 numbering', () => {
      const days: DayWithMeals[] = [
        createMockDay(1, 1, 'Monday', [{ id: 1, mealType: 'breakfast', description: 'Oatmeal' }]),
        createMockDay(2, 2, 'Tuesday', [{ id: 2, mealType: 'breakfast', description: 'Smoothie' }]),
        createMockDay(3, 3, 'Wednesday', [{ id: 3, mealType: 'breakfast', description: 'Toast' }]),
      ];

      render(<WeekCalendar days={days} />);

      // Component renders both mobile and desktop layouts, so use getAllByText
      expect(screen.getAllByText('Monday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tuesday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Wednesday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Oatmeal').length).toBeGreaterThan(0);
    });

    it('should render days with cumulative numbering (week 2: 8-14)', () => {
      // Week 2 has day numbers 8-14
      const days: DayWithMeals[] = [
        createMockDay(8, 8, 'Monday', [{ id: 1, mealType: 'breakfast', description: 'Granola' }]),
        createMockDay(9, 9, 'Tuesday', [{ id: 2, mealType: 'lunch', description: 'Salad' }]),
        createMockDay(10, 10, 'Wednesday', [{ id: 3, mealType: 'dinner', description: 'Curry' }]),
      ];

      render(<WeekCalendar days={days} />);

      // Should display day names from database, not derived from dayNumber
      expect(screen.getAllByText('Monday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tuesday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Wednesday').length).toBeGreaterThan(0);
      // Meals should be visible (rendered in both mobile and desktop layouts)
      expect(screen.getAllByText('Granola').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Salad').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Curry').length).toBeGreaterThan(0);
    });

    it('should render days with cumulative numbering (week 5: 29-31)', () => {
      // Week 5 only has 3 days with numbers 29-31
      const days: DayWithMeals[] = [
        createMockDay(29, 29, 'Monday', [
          { id: 1, mealType: 'breakfast', description: 'Day 29 meal' },
        ]),
        createMockDay(30, 30, 'Tuesday', [
          { id: 2, mealType: 'breakfast', description: 'Day 30 meal' },
        ]),
        createMockDay(31, 31, 'Wednesday', [
          { id: 3, mealType: 'breakfast', description: 'Day 31 meal' },
        ]),
      ];

      render(<WeekCalendar days={days} />);

      expect(screen.getAllByText('Day 29 meal').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Day 30 meal').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Day 31 meal').length).toBeGreaterThan(0);
    });

    it('should sort days by dayNumber', () => {
      // Pass days in non-sorted order
      const days: DayWithMeals[] = [
        createMockDay(3, 3, 'Wednesday', [{ id: 3, mealType: 'breakfast', description: 'Third' }]),
        createMockDay(1, 1, 'Monday', [{ id: 1, mealType: 'breakfast', description: 'First' }]),
        createMockDay(2, 2, 'Tuesday', [{ id: 2, mealType: 'breakfast', description: 'Second' }]),
      ];

      render(<WeekCalendar days={days} />);

      const meals = screen.getAllByText(/First|Second|Third/);
      expect(meals[0]).toHaveTextContent('First');
      expect(meals[1]).toHaveTextContent('Second');
      expect(meals[2]).toHaveTextContent('Third');
    });
  });

  describe('empty states', () => {
    it('should show "No data" for missing days', () => {
      const days: DayWithMeals[] = [
        createMockDay(1, 1, 'Monday', [{ id: 1, mealType: 'breakfast', description: 'Oatmeal' }]),
        // Only 1 day provided, should show empty slots for others
      ];

      render(<WeekCalendar days={days} />);

      // Should show "No data" for empty day slots
      const noDataElements = screen.getAllByText('No data');
      expect(noDataElements.length).toBeGreaterThan(0);
    });

    it('should show "No meals planned" for days with no meals', () => {
      const days: DayWithMeals[] = [
        createMockDay(1, 1, 'Monday', []), // No meals
      ];

      render(<WeekCalendar days={days} />);

      expect(screen.getByText('No meals planned')).toBeInTheDocument();
    });
  });

  describe('click handlers', () => {
    it('should call onDayClick when day is clicked', () => {
      const onDayClick = vi.fn();

      const days: DayWithMeals[] = [
        createMockDay(1, 1, 'Monday', [{ id: 1, mealType: 'breakfast', description: 'Oatmeal' }]),
      ];

      render(<WeekCalendar days={days} onDayClick={onDayClick} />);

      fireEvent.click(screen.getByText('Monday'));

      expect(onDayClick).toHaveBeenCalledWith(1);
    });

    it('should call onMealClick when meal is clicked', () => {
      const onMealClick = vi.fn();

      const days: DayWithMeals[] = [
        createMockDay(1, 1, 'Monday', [{ id: 42, mealType: 'breakfast', description: 'Oatmeal' }]),
      ];

      render(<WeekCalendar days={days} onMealClick={onMealClick} />);

      // Get all meal elements (rendered in both mobile and desktop)
      const mealElements = screen.getAllByText('Oatmeal');
      const firstMeal = mealElements[0];
      if (firstMeal) fireEvent.click(firstMeal);

      expect(onMealClick).toHaveBeenCalledWith(42);
    });
  });
});
