// DayPage component
// Single day detail view with meals

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { DaySchedule } from '@/components/meal/DaySchedule';
import { useWeek } from '@/hooks/useWeeks';
import { routes } from '@/router';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayPage() {
  const { weekId, dayId } = useParams<{ weekId: string; dayId: string }>();
  const navigate = useNavigate();
  const weekIdNum = weekId ? parseInt(weekId, 10) : 1;
  const dayIdNum = dayId ? parseInt(dayId, 10) : 1;
  const { data: week, isLoading, error } = useWeek(weekIdNum);

  const day = week?.days.find((d) => d.id === dayIdNum);

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load day: {error.message}</p>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (day == null) {
    return (
      <Container>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-700">Day not found.</p>
          <Link
            to={routes.week(weekIdNum)}
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            Go back to week view
          </Link>
        </div>
      </Container>
    );
  }

  // Get day name
  const dayIndex = day.dayNumber === 7 ? 0 : day.dayNumber;
  const dayName = DAY_NAMES[dayIndex] ?? 'Day';

  // Get prev/next day IDs
  const dayIds = week?.days.map((d) => d.id) ?? [];
  const currentIndex = dayIds.indexOf(dayIdNum);
  const prevDayId = currentIndex > 0 ? dayIds[currentIndex - 1] : undefined;
  const nextDayId = currentIndex < dayIds.length - 1 ? dayIds[currentIndex + 1] : undefined;

  return (
    <Container>
      <div className="space-y-6">
        {/* Day header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={routes.week(weekIdNum)}
              className="mb-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              Week {week?.weekNumber}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{dayName}</h1>
          </div>
          <div className="flex gap-2">
            {prevDayId != null && (
              <Link to={routes.day(weekIdNum, prevDayId)}>
                <Button variant="ghost" size="sm">
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {nextDayId != null && (
              <Link to={routes.day(weekIdNum, nextDayId)}>
                <Button variant="ghost" size="sm">
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Day schedule */}
        <DaySchedule
          day={day}
          onMealClick={(mealId) => {
            const meal = day.meals.find((m) => m.id === mealId);
            if (meal?.recipe != null) {
              void navigate(routes.recipe(meal.recipe.id));
            }
          }}
        />
      </div>
    </Container>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}
