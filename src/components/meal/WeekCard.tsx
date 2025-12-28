// WeekCard component
// Card for selecting a week from the home page

import type { Week } from '@/types';
import { Card } from '../common/Card';

interface WeekCardProps {
  week: Week;
  onClick: () => void;
  isActive?: boolean;
}

export function WeekCard({ week, onClick, isActive = false }: WeekCardProps) {
  return (
    <Card padding="md" hover onClick={onClick} className={isActive ? 'ring-2 ring-green-500' : ''}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Week {week.weekNumber}</h3>
          {week.name && <p className="text-sm text-gray-600">{week.name}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
          <span className="text-lg font-bold">{week.weekNumber}</span>
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
