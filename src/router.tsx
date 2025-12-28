// Router configuration
// Defines all application routes

import { createHashRouter, Navigate, useRouteError, Link } from 'react-router-dom';
import { Layout } from './components/layout';

// Lazy-load pages for code splitting
import { lazy, Suspense } from 'react';
import { LoadingScreen } from './components/feedback/LoadingScreen';

// Route-level error boundary component
// This catches errors in routes and displays a friendly error page
function RouteErrorBoundary() {
  const error = useRouteError();

  // Extract error message safely
  let errorMessage = 'An unexpected error occurred';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'statusText' in error) {
    errorMessage = String(error.statusText);
  }

  // Log error for debugging
  console.error('Route error:', error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="mb-4 text-gray-600">{errorMessage}</p>
        <div className="flex gap-3">
          <Link to="/" className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Go Home
          </Link>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const WeekPage = lazy(() => import('./pages/WeekPage').then((m) => ({ default: m.WeekPage })));
const DayPage = lazy(() => import('./pages/DayPage').then((m) => ({ default: m.DayPage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const PrepPage = lazy(() => import('./pages/PrepPage').then((m) => ({ default: m.PrepPage })));
const RecipePage = lazy(() =>
  import('./pages/RecipePage').then((m) => ({ default: m.RecipePage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Suspense wrapper for lazy-loaded pages
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

// Using HashRouter for GitHub Pages compatibility
// Hash-based routing works without server-side configuration
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <HomePage />
          </LazyPage>
        ),
      },
      {
        path: 'week/:weekId',
        children: [
          {
            index: true,
            element: (
              <LazyPage>
                <WeekPage />
              </LazyPage>
            ),
          },
          {
            path: 'day/:dayId',
            element: (
              <LazyPage>
                <DayPage />
              </LazyPage>
            ),
          },
          {
            path: 'shop',
            element: (
              <LazyPage>
                <ShopPage />
              </LazyPage>
            ),
          },
          {
            path: 'prep',
            element: (
              <LazyPage>
                <PrepPage />
              </LazyPage>
            ),
          },
        ],
      },
      {
        path: 'recipe/:recipeId',
        element: (
          <LazyPage>
            <RecipePage />
          </LazyPage>
        ),
      },
      {
        path: '404',
        element: (
          <LazyPage>
            <NotFoundPage />
          </LazyPage>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/404" replace />,
      },
    ],
  },
]);

// Route paths for type-safe navigation
export const routes = {
  home: () => '/',
  week: (weekId: number | string) => `/week/${String(weekId)}`,
  day: (weekId: number | string, dayId: number | string) =>
    `/week/${String(weekId)}/day/${String(dayId)}`,
  shop: (weekId: number | string) => `/week/${String(weekId)}/shop`,
  prep: (weekId: number | string) => `/week/${String(weekId)}/prep`,
  recipe: (recipeId: number | string) => `/recipe/${String(recipeId)}`,
} as const;
