// PrepTimeline component
// Visual timeline of prep steps

import { useMemo } from 'react';
import type { PrepStep } from '@/types';
import { PrepStepCompact } from './PrepStep';

interface PrepTimelineProps {
  steps: PrepStep[];
  completedSteps: Set<number>;
  currentStepId?: number | undefined;
  onToggleStep?: ((stepId: number) => void) | undefined;
}

export function PrepTimeline({
  steps,
  completedSteps,
  currentStepId,
  onToggleStep,
}: PrepTimelineProps) {
  // Group steps by time marker
  const groupedSteps = useMemo(() => {
    const groups = new Map<string, PrepStep[]>();

    for (const step of steps) {
      const existing = groups.get(step.timeMarker) ?? [];
      existing.push(step);
      groups.set(step.timeMarker, existing);
    }

    // Convert to array sorted by first step's sortOrder
    return Array.from(groups.entries())
      .sort(([, stepsA], [, stepsB]) => {
        const orderA = stepsA[0]?.sortOrder ?? 0;
        const orderB = stepsB[0]?.sortOrder ?? 0;
        return orderA - orderB;
      })
      .map(([timeMarker, groupSteps]) => ({
        timeMarker,
        steps: groupSteps.sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [steps]);

  const totalSteps = steps.length;
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Prep Progress</span>
        <span className="text-sm text-gray-500">
          {completedCount}/{totalSteps} steps
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${String(progressPercent)}%` }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 h-full w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {groupedSteps.map(({ timeMarker, steps: groupSteps }, index) => (
            <TimelineGroup
              key={timeMarker || `group-${String(index)}`}
              timeMarker={timeMarker}
              steps={groupSteps}
              completedSteps={completedSteps}
              currentStepId={currentStepId}
              onToggleStep={onToggleStep}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Time-grouped steps
interface TimelineGroupProps {
  timeMarker: string;
  steps: PrepStep[];
  completedSteps: Set<number>;
  currentStepId?: number | undefined;
  onToggleStep?: ((stepId: number) => void) | undefined;
}

function TimelineGroup({
  timeMarker,
  steps,
  completedSteps,
  currentStepId,
  onToggleStep,
}: TimelineGroupProps) {
  const allCompleted = steps.every((step) => completedSteps.has(step.id));
  const hasCurrent = steps.some((step) => step.id === currentStepId);

  return (
    <div className="relative pl-8">
      {/* Time marker dot */}
      <div
        className={`absolute left-0 top-2 h-6 w-6 rounded-full border-2 border-white ${
          allCompleted ? 'bg-green-500' : hasCurrent ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      />

      {/* Time marker label */}
      <div className="mb-2 text-sm font-semibold text-gray-900">{timeMarker}</div>

      {/* Steps in this time block */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
        {steps.map((step) => (
          <PrepStepCompact
            key={step.id}
            step={step}
            isCompleted={completedSteps.has(step.id)}
            onToggle={onToggleStep}
          />
        ))}
      </div>
    </div>
  );
}

// Compact progress indicator
interface PrepProgressBadgeProps {
  steps: PrepStep[];
  completedSteps: Set<number>;
}

export function PrepProgressBadge({ steps, completedSteps }: PrepProgressBadgeProps) {
  const totalSteps = steps.length;
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${String(progressPercent)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">
        {completedCount}/{totalSteps}
      </span>
    </div>
  );
}
