// WeekCard component
// Card for selecting a week from the home page

import type { Week } from '@/types';
import { Card } from '../common/Card';

// Format date range like "Jan 1-4" or "Jan 26 - Feb 1"
function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${String(startDay)}-${String(endDay)}`;
  }
  return `${startMonth} ${String(startDay)} - ${endMonth} ${String(endDay)}`;
}

interface WeekCardProps {
  week: Week;
  onClick: () => void;
  isActive?: boolean;
}

export function WeekCard({ week, onClick, isActive = false }: WeekCardProps) {
  const dateRange = formatDateRange(week.startDate, week.endDate);

  return (
    <Card padding="md" hover onClick={onClick} className={isActive ? 'ring-2 ring-green-500' : ''}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {week.weekNumber === 0 ? 'Kickoff' : `Week ${String(week.weekNumber)}`}
          </h3>
          {week.theme && <p className="text-sm text-gray-600">{week.theme}</p>}
          {dateRange && <p className="text-xs text-gray-400 mt-1">{dateRange}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
          <span className="text-lg font-bold">{week.weekNumber === 0 ? 'K' : week.weekNumber}</span>
        </div>
      </div>
    </Card>
  );
}

// Grid of week cards
interface WeekCardGridProps {
  weeks: Week[];
  activeWeekId?: number;
  onWeekSelect: (week: Week) => void;
}

export function WeekCardGrid({ weeks, activeWeekId, onWeekSelect }: WeekCardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {weeks.map((week) => (
        <WeekCard
          key={week.id}
          week={week}
          onClick={() => {
            onWeekSelect(week);
          }}
          isActive={week.id === activeWeekId}
        />
      ))}
    </div>
  );
}
