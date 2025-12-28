// WeekOverview component
// Summary view of a week's meal plan

import type { WeekWithDetails } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface WeekOverviewProps {
  week: WeekWithDetails;
  onComponentClick?: ((componentId: number) => void) | undefined;
}

export function WeekOverview({ week, onComponentClick }: WeekOverviewProps) {
  // Count total meals across all days
  const totalMeals = week.days.reduce((sum, day) => sum + day.meals.length, 0);

  // Get unique recipes used this week
  const uniqueRecipes = new Set(
    week.days.flatMap((day) =>
      day.meals.map((meal) => meal.recipe?.slug).filter((slug): slug is string => slug != null)
    )
  );

  // Count days with meals
  const daysWithMeals = week.days.filter((d) => d.meals.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Week summary card */}
      <Card>
        <CardHeader>
          <CardTitle>Week {String(week.weekNumber)} Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Meals"
              value={String(totalMeals)}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            <StatCard
              label="Unique Recipes"
              value={String(uniqueRecipes.size)}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              }
            />
            <StatCard
              label="Days Planned"
              value={`${String(daysWithMeals)}/7`}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            <StatCard
              label="Prep Steps"
              value={String(week.prepSteps.length)}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Week components */}
      {week.components.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Week Components</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="mb-3 text-sm text-gray-600">Key components you'll prepare this week:</p>
            <div className="flex flex-wrap gap-2">
              {week.components.map((component) => (
                <button
                  key={component.id}
                  onClick={() => {
                    onComponentClick?.(component.id);
                  }}
                  className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 transition-colors hover:bg-green-200"
                >
                  {component.item}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly theme or notes */}
      {week.name != null && (
        <Card>
          <CardHeader>
            <CardTitle>Week Theme</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <h3 className="text-lg font-medium text-gray-900">{week.name}</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for stats
function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
