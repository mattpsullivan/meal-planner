// HomePage component
// Week selection grid - entry point of the app

import { Link } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useWeeks } from '@/hooks/useWeeks';
import { Skeleton } from '@/components/common/Skeleton';
import { routes } from '@/router';

export function HomePage() {
  const { data: weeks = [], isLoading, error } = useWeeks();

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load weeks: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Hero section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Vegan Meal Prep</h1>
          <p className="mt-2 text-lg text-gray-600">Your 5-week plant-based meal planning guide</p>
        </div>

        {/* Week cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="mb-2 h-6 w-24" />
                    <Skeleton className="mb-4 h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))
            : weeks.map((week) => (
                <WeekCard
                  key={week.id}
                  weekId={week.id}
                  weekNumber={week.weekNumber}
                  theme={week.theme}
                  name={week.name}
                />
              ))}
        </div>

        {/* Info section */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-green-800">How It Works</h2>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-start gap-2">
              <span className="mt-1">1.</span>
              <span>Choose a week to start your meal prep journey</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">2.</span>
              <span>View the weekly schedule and recipes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">3.</span>
              <span>Generate your grocery list and shop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">4.</span>
              <span>Follow the prep guide for efficient cooking</span>
            </li>
          </ul>
        </div>
      </div>
    </Container>
  );
}

// Week card component
interface WeekCardProps {
  weekId: number;
  weekNumber: number;
  theme?: string | undefined;
  name?: string | undefined;
}

function WeekCard({ weekId, weekNumber, theme, name }: WeekCardProps) {
  return (
    <Link to={routes.week(weekId)}>
      <Card hover className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Week {weekNumber}</h3>
            <Badge variant="green">View</Badge>
          </div>
          {theme != null && <p className="mb-2 font-medium text-green-700">{theme}</p>}
          {name != null && <p className="text-sm text-gray-600 line-clamp-2">{name}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
