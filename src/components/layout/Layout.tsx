// Layout component
// Main app layout with header, navigation, content, and footer

import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { Header } from './Header';
import { Navigation, type NavigationSection } from './Navigation';
import { Footer } from './Footer';
import { routes } from '@/router';

export function Layout() {
  const { weekId } = useParams<{ weekId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse week number from URL (default to 1)
  const weekNumber = weekId ? parseInt(weekId, 10) : 1;
  const year = new Date().getFullYear();

  // Determine active section from path
  const activeSection = useMemo((): NavigationSection => {
    if (location.pathname.includes('/shop')) return 'shop';
    if (location.pathname.includes('/prep')) return 'prep';
    return 'plan';
  }, [location.pathname]);

  // Navigation handlers
  const handleWeekChange = useCallback(
    (newWeek: number, _newYear: number) => {
      // Navigate to the same section in the new week
      if (activeSection === 'plan') {
        void navigate(routes.week(newWeek));
      } else if (activeSection === 'shop') {
        void navigate(routes.shop(newWeek));
      } else {
        // activeSection === 'prep'
        void navigate(routes.prep(newWeek));
      }
    },
    [navigate, activeSection]
  );

  const handlePrevWeek = useCallback(() => {
    if (weekNumber > 1) {
      handleWeekChange(weekNumber - 1, year);
    }
  }, [weekNumber, year, handleWeekChange]);

  const handleNextWeek = useCallback(() => {
    if (weekNumber < 5) {
      handleWeekChange(weekNumber + 1, year);
    }
  }, [weekNumber, year, handleWeekChange]);

  const handleSectionChange = useCallback(
    (section: NavigationSection) => {
      const targetWeek = weekId ?? '1';
      switch (section) {
        case 'plan':
          void navigate(routes.week(targetWeek));
          break;
        case 'shop':
          void navigate(routes.shop(targetWeek));
          break;
        case 'prep':
          void navigate(routes.prep(targetWeek));
          break;
      }
    },
    [navigate, weekId]
  );

  // Only show week-specific navigation when on a week page
  const showWeekNavigation = weekId != null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {showWeekNavigation ? (
        <>
          <Header
            weekNumber={weekNumber}
            year={year}
            onWeekChange={handleWeekChange}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
          <Navigation activeSection={activeSection} onSectionChange={handleSectionChange} />
        </>
      ) : (
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <h1 className="text-xl font-bold text-green-700">Meal Planner</h1>
          </div>
        </header>
      )}
      <main className="flex-1 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
