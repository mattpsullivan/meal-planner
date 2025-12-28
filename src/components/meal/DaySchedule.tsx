// DaySchedule component
// Displays all meals for a single day

import type { DayWithMeals, MealType } from '@/types';
import { Card, CardHeader, CardTitle } from '../common/Card';
import { MealCard, EmptyMealSlot } from './MealCard';

interface DayScheduleProps {
  day: DayWithMeals;
  onMealClick?: ((mealId: number) => void) | undefined;
  onAddMeal?: ((dayId: number, mealType: MealType) => void) | undefined;
  showEmptySlots?: boolean | undefined;
  compact?: boolean | undefined;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Convert dayNumber (1-7, Mon-Sun) to day name
function getDayName(dayNumber: number): string {
  // dayNumber is 1-7 where 1=Monday, 7=Sunday
  // DAY_NAMES is 0-6 where 0=Sunday
  const dayIndex = dayNumber === 7 ? 0 : dayNumber;
  return DAY_NAMES[dayIndex] ?? 'Unknown';
}

export function DaySchedule({
  day,
  onMealClick,
  onAddMeal,
  showEmptySlots = true,
  compact = false,
}: DayScheduleProps) {
  const dayName = day.dayName ?? getDayName(day.dayNumber);

  // Group meals by type
  const mealsByType = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = day.meals.filter((m) => m.mealType === type);
      return acc;
    },
    {} as Record<MealType, typeof day.meals>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">{dayName}</h3>
        {day.meals.length > 0 ? (
          day.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onClick={
                onMealClick
                  ? () => {
                      onMealClick(meal.id);
                    }
                  : undefined
              }
              compact
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">No meals planned</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{dayName}</span>
          <span className="text-sm font-normal text-gray-500">{day.meals.length} meals</span>
        </CardTitle>
      </CardHeader>
      <div className="space-y-4 pt-4">
        {MEAL_TYPES.map((mealType) => {
          const meals = mealsByType[mealType];
          const hasMeals = meals.length > 0;

          if (!hasMeals && !showEmptySlots) return null;

          return (
            <div key={mealType}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {mealType}
              </h4>
              {hasMeals ? (
                <div className="space-y-2">
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onClick={
                        onMealClick
                          ? () => {
                              onMealClick(meal.id);
                            }
                          : undefined
                      }
                      compact
                    />
                  ))}
                </div>
              ) : (
                <EmptyMealSlot
                  mealType={mealType}
                  onAddMeal={
                    onAddMeal
                      ? () => {
                          onAddMeal(day.id, mealType);
                        }
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Compact horizontal layout for week view
interface DayScheduleCompactProps {
  day: DayWithMeals;
  onMealClick?: ((mealId: number) => void) | undefined;
  isToday?: boolean | undefined;
}

export function DayScheduleCompact({ day, onMealClick, isToday = false }: DayScheduleCompactProps) {
  const dayName = day.dayName ?? getDayName(day.dayNumber);
  const shortDayName = dayName.slice(0, 3);

  return (
    <div
      className={`rounded-lg border p-3 ${
        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-medium ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
          {shortDayName}
        </span>
        {isToday && (
          <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">Today</span>
        )}
      </div>
      <div className="space-y-1">
        {day.meals.length > 0 ? (
          day.meals.slice(0, 3).map((meal) => (
            <button
              key={meal.id}
              onClick={() => {
                onMealClick?.(meal.id);
              }}
              className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100"
            >
              {meal.recipe?.name ?? meal.description ?? 'Unknown'}
            </button>
          ))
        ) : (
          <p className="px-2 py-1 text-xs text-gray-400">No meals</p>
        )}
        {day.meals.length > 3 && (
          <p className="px-2 text-xs text-gray-500">+{day.meals.length - 3} more</p>
        )}
      </div>
    </div>
  );
}
