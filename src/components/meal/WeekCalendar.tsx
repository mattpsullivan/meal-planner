// WeekCalendar component
// 7-day grid view of the week's meals

import type { DayWithMeals } from '@/types';
import { DayScheduleCompact } from './DaySchedule';

interface WeekCalendarProps {
  days: DayWithMeals[];
  onMealClick?: ((mealId: number) => void) | undefined;
  onDayClick?: ((dayId: number) => void) | undefined;
  currentDayNumber?: number | undefined; // 1-7, to highlight today
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekCalendar({
  days,
  onMealClick,
  onDayClick,
  currentDayNumber,
}: WeekCalendarProps) {
  // Sort days by dayNumber
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  // Map sorted days to 7-day slots (handles both 1-7 and cumulative numbering)
  // Use the actual days in order, filling remaining slots with null
  const allDays: ((typeof sortedDays)[number] | undefined)[] = [];
  for (let i = 0; i < 7; i++) {
    allDays.push(sortedDays[i]);
  }

  return (
    <>
      {/* Mobile: vertical list layout */}
      <div className="space-y-3 lg:hidden">
        {allDays.map((day, index) => {
          const dayNumber = index + 1;
          const isToday = currentDayNumber === dayNumber;

          if (day == null) {
            return (
              <div key={dayNumber} className="rounded-lg border border-dashed border-gray-200 p-4">
                <span className="text-sm font-medium text-gray-400">{DAY_NAMES[index]}</span>
                <p className="mt-1 text-sm text-gray-400">No data</p>
              </div>
            );
          }

          return (
            <DayCardMobile
              key={day.id}
              day={day}
              isToday={isToday}
              dayIndex={index}
              onDayClick={onDayClick}
              onMealClick={onMealClick}
            />
          );
        })}
      </div>

      {/* Desktop: 7-column grid layout */}
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
        {allDays.map((day, index) => {
          const dayNumber = index + 1;
          const isToday = currentDayNumber === dayNumber;

          if (day == null) {
            return (
              <div key={dayNumber} className="rounded-lg border border-dashed border-gray-200 p-3">
                <span className="text-sm font-medium text-gray-400">{DAY_NAMES[index]}</span>
                <p className="mt-2 text-xs text-gray-400">No data</p>
              </div>
            );
          }

          return (
            <div
              key={day.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onDayClick?.(day.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick?.(day.id);
                }
              }}
              className="cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <DayScheduleCompact day={day} onMealClick={onMealClick} isToday={isToday} />
            </div>
          );
        })}
      </div>
    </>
  );
}

// Mobile-optimized day card with full meal names visible
interface DayCardMobileProps {
  day: DayWithMeals;
  isToday: boolean;
  dayIndex: number; // 0-6, position in the week
  onDayClick?: ((dayId: number) => void) | undefined;
  onMealClick?: ((mealId: number) => void) | undefined;
}

function DayCardMobile({ day, isToday, dayIndex, onDayClick, onMealClick }: DayCardMobileProps) {
  // Use day.dayName from DB if available, otherwise fall back to index-based name
  const dayName = day.dayName ?? DAY_NAMES[dayIndex] ?? 'Day';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onDayClick?.(day.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDayClick?.(day.id);
        }
      }}
      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`font-medium ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
          {dayName}
        </span>
        {isToday && (
          <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">Today</span>
        )}
      </div>
      <div className="space-y-2">
        {day.meals.length > 0 ? (
          day.meals.map((meal) => (
            <div
              key={meal.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMealClick?.(meal.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onMealClick?.(meal.id);
                }
              }}
              className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            >
              <span className="text-gray-900">
                {meal.recipe?.name ?? meal.description ?? 'Unknown'}
              </span>
              <span className="ml-2 text-xs capitalize text-gray-500">{meal.mealType}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No meals planned</p>
        )}
      </div>
    </div>
  );
}

// Alternative list view for mobile
export function WeekList({ days, onMealClick, onDayClick, currentDayNumber }: WeekCalendarProps) {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="space-y-3">
      {sortedDays.map((day) => {
        const isToday = currentDayNumber === day.dayNumber;

        return (
          <div
            key={day.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              onDayClick?.(day.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDayClick?.(day.id);
              }
            }}
            className="w-full cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <DayScheduleCompact day={day} onMealClick={onMealClick} isToday={isToday} />
          </div>
        );
      })}
    </div>
  );
}
