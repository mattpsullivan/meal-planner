// PrepPage component
// Prep guide for a week

import { useParams, Link } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/common/Skeleton';
import { PrepGuide } from '@/components/prep/PrepGuide';
import { useWeek } from '@/hooks/useWeeks';
import { routes } from '@/router';

export function PrepPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const weekIdNum = weekId ? parseInt(weekId, 10) : 1;
  const { data: week, isLoading, error } = useWeek(weekIdNum);

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load prep guide: {error.message}</p>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
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
        {/* Header */}
        <div>
          <Link
            to={routes.week(weekIdNum)}
            className="mb-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            Week {week.weekNumber}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Prep Guide</h1>
          {week.theme != null && <p className="mt-1 text-gray-600">{week.theme}</p>}
        </div>

        {/* Prep guide */}
        <PrepGuide week={week} />
      </div>
    </Container>
  );
}

// Icon
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
