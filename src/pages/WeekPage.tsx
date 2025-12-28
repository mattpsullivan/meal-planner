// WeekPage component
// Week overview with daily schedule

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { WeekCalendar } from '@/components/meal/WeekCalendar';
import { useWeek } from '@/hooks/useWeeks';
import { routes } from '@/router';

export function WeekPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const navigate = useNavigate();
  const weekIdNum = weekId ? parseInt(weekId, 10) : 1;
  const { data: week, isLoading, error } = useWeek(weekIdNum);

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load week: {error.message}</p>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </Container>
    );
  }

  if (week == null) {
    return (
      <Container>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-700">Week not found.</p>
          <Link
            to={routes.home()}
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            Go back to week selection
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Week header */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Week {week.weekNumber}</h1>
            {week.theme != null && <Badge variant="green">{week.theme}</Badge>}
          </div>
          {week.name != null && <p className="mt-2 text-gray-600">{week.name}</p>}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link to={routes.shop(weekIdNum)}>
            <Button variant="primary">
              <ShoppingCartIcon className="mr-2 h-4 w-4" />
              Grocery List
            </Button>
          </Link>
          <Link to={routes.prep(weekIdNum)}>
            <Button variant="secondary">
              <ClockIcon className="mr-2 h-4 w-4" />
              Prep Guide
            </Button>
          </Link>
        </div>

        {/* Components list (what's being made this week) */}
        {week.components.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>This Week's Components</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {week.components.map((component) =>
                  component.recipeId != null ? (
                    <Link key={component.id} to={routes.recipe(component.recipeId)}>
                      <Badge variant="default" className="cursor-pointer hover:bg-gray-200">
                        {component.item}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge key={component.id} variant="default">
                      {component.item}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily schedule calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Schedule</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <WeekCalendar
              days={week.days}
              onDayClick={(dayId) => {
                void navigate(routes.day(weekIdNum, dayId));
              }}
              onMealClick={(mealId) => {
                const meal = week.days.flatMap((d) => d.meals).find((m) => m.id === mealId);
                if (meal?.recipe != null) {
                  void navigate(routes.recipe(meal.recipe.id));
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

// Icons
function ShoppingCartIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M1 1.75A.75.75 0 011.75 1h1.628a1.75 1.75 0 011.734 1.51L5.18 3a65.25 65.25 0 0113.36 1.412.75.75 0 01.58.875 48.645 48.645 0 01-1.618 6.2.75.75 0 01-.712.513H6a2.503 2.503 0 00-2.292 1.5H17.25a.75.75 0 010 1.5H2.76a.75.75 0 01-.748-.807 4.002 4.002 0 012.716-3.486L3.626 2.716a.25.25 0 00-.248-.216H1.75A.75.75 0 011 1.75zM6 17.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
