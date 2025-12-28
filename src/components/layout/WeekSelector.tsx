// Week selector component
// Allows navigation between meal plan weeks

interface WeekSelectorProps {
  weekNumber: number;
  year: number;
  onWeekChange: (weekNumber: number, year: number) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  totalWeeks?: number;
}

export function WeekSelector({
  weekNumber,
  year,
  onWeekChange,
  onPrevWeek,
  onNextWeek,
  totalWeeks = 5,
}: WeekSelectorProps) {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrevWeek}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
        aria-label="Previous week"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="flex items-center gap-1">
        {weeks.map((week) => (
          <button
            key={week}
            onClick={() => {
              onWeekChange(week, year);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              week === weekNumber ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={`Week ${String(week)}`}
            aria-current={week === weekNumber ? 'true' : undefined}
          >
            {week}
          </button>
        ))}
      </div>

      <button
        onClick={onNextWeek}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
        aria-label="Next week"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
