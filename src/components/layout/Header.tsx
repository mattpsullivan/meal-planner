// Header component
// App header with logo and week navigation

import { Link } from 'react-router-dom';
import { Container } from './Container';
import { WeekSelector } from './WeekSelector';

interface HeaderProps {
  weekNumber: number;
  year: number;
  onWeekChange: (weekNumber: number, year: number) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function Header({ weekNumber, year, onWeekChange, onPrevWeek, onNextWeek }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 11-3.6 15.15c.87-1.94 3.6-2.15 3.6-4.15 0-1.5-1-2.5-2-3.5s-2-2-2-3.5c0-2.5 2-4 4-4zm-1 6a1 1 0 112 0v2a1 1 0 11-2 0V10z" />
              </svg>
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="text-lg font-semibold text-gray-900">Meal Planner</h1>
              <p className="hidden text-sm text-gray-500 md:block">Weekly meal planning</p>
            </div>
          </Link>

          <WeekSelector
            weekNumber={weekNumber}
            year={year}
            onWeekChange={onWeekChange}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
          />
        </div>
      </Container>
    </header>
  );
}
