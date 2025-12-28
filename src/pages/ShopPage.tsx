// ShopPage component
// Grocery list for a week

import { useParams, Link } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/common/Skeleton';
import { GroceryList } from '@/components/shopping/GroceryList';
import { useGroceryListForWeek } from '@/hooks/useGroceryList';
import { useWeek } from '@/hooks/useWeeks';
import { routes } from '@/router';

export function ShopPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const weekIdNum = weekId ? parseInt(weekId, 10) : 1;
  const { data: week, isLoading: weekLoading } = useWeek(weekIdNum);
  const {
    list,
    isLoading: listLoading,
    error,
    toggleItem,
    updateQuantity,
    removeItem,
    clearChecked,
    regenerate,
  } = useGroceryListForWeek(weekIdNum);

  const isLoading = weekLoading || listLoading;

  if (error != null) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load grocery list: {errorMessage}</p>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (list == null) {
    return (
      <Container>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Week {week?.weekNumber} Grocery List</h1>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="mb-4 text-gray-700">No grocery list generated yet.</p>
            <button
              onClick={() => {
                void regenerate();
              }}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Generate Grocery List
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to={routes.week(weekIdNum)}
              className="mb-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              Week {week?.weekNumber}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
          </div>
        </div>

        {/* Grocery list */}
        <GroceryList
          list={list}
          onToggleItem={(itemId, _checked) => {
            void toggleItem(itemId);
          }}
          onUpdateQuantity={(itemId, quantity) => {
            void updateQuantity(itemId, quantity);
          }}
          onDeleteItem={(itemId) => {
            void removeItem(itemId);
          }}
          onClearChecked={() => {
            void clearChecked();
          }}
          onRegenerate={() => {
            void regenerate();
          }}
          showRecipeSources
        />
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
