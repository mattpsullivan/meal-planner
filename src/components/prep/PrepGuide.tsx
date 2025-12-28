// PrepGuide component
// Full prep workflow with timeline and active step

import { useState, useCallback, useMemo } from 'react';
import type { PrepStep, WeekWithDetails } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { PrepTimeline, PrepProgressBadge } from './PrepTimeline';
import { PrepStepCard } from './PrepStep';
import { PrepTimer } from './PrepTimer';

interface PrepGuideProps {
  week: WeekWithDetails;
  onStepComplete?: ((stepId: number) => void) | undefined;
}

export function PrepGuide({ week, onStepComplete }: PrepGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const steps = week.prepSteps;
  const activeStep = steps[activeStepIndex];

  const toggleStepComplete = useCallback(
    (stepId: number) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        if (next.has(stepId)) {
          next.delete(stepId);
        } else {
          next.add(stepId);
          onStepComplete?.(stepId);
        }
        return next;
      });
    },
    [onStepComplete]
  );

  const goToNextStep = useCallback(() => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    }
  }, [activeStepIndex, steps.length]);

  const goToPrevStep = useCallback(() => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  }, [activeStepIndex]);

  const totalTime = useMemo(() => {
    return steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
  }, [steps]);

  const remainingTime = useMemo(() => {
    return steps
      .filter((step) => !completedSteps.has(step.id))
      .reduce((sum, step) => sum + (step.duration ?? 0), 0);
  }, [steps, completedSteps]);

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No prep steps available for this week.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Week {week.weekNumber} Prep Guide
              </h2>
              <p className="text-sm text-gray-500">
                {steps.length} steps &middot; ~{totalTime} min total
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PrepProgressBadge steps={steps} completedSteps={completedSteps} />
              <span className="text-sm text-gray-600">~{remainingTime} min remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active step focus */}
      {activeStep != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Step</span>
              <span className="text-sm font-normal text-gray-500">
                {activeStepIndex + 1} of {steps.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <PrepStepCard
              step={activeStep}
              stepNumber={activeStepIndex + 1}
              isActive
              isCompleted={completedSteps.has(activeStep.id)}
              onComplete={toggleStepComplete}
              showRecipeLink
            />

            {/* Timer for current step */}
            {activeStep.duration != null && !completedSteps.has(activeStep.id) && (
              <div className="mt-4">
                <PrepTimer
                  durationMs={activeStep.duration * 60 * 1000}
                  label={activeStep.task}
                  onComplete={() => {
                    toggleStepComplete(activeStep.id);
                  }}
                />
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-4 flex justify-between">
              <Button variant="secondary" onClick={goToPrevStep} disabled={activeStepIndex === 0}>
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!completedSteps.has(activeStep.id)) {
                    toggleStepComplete(activeStep.id);
                  }
                  goToNextStep();
                }}
                disabled={activeStepIndex === steps.length - 1}
              >
                {completedSteps.has(activeStep.id) ? 'Next' : 'Complete & Next'}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full timeline toggle */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={() => {
            setShowAllSteps(!showAllSteps);
          }}
        >
          {showAllSteps ? 'Hide' : 'Show'} All Steps
          <ChevronDownIcon
            className={`ml-1 h-4 w-4 transition-transform ${showAllSteps ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>

      {/* Full timeline */}
      {showAllSteps && (
        <Card>
          <CardHeader>
            <CardTitle>Full Prep Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <PrepTimeline
              steps={steps}
              completedSteps={completedSteps}
              currentStepId={activeStep?.id}
              onToggleStep={toggleStepComplete}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Quick overview component for navigation/preview
interface PrepGuidePreviewProps {
  steps: PrepStep[];
  completedSteps?: Set<number> | undefined;
}

export function PrepGuidePreview({ steps, completedSteps = new Set() }: PrepGuidePreviewProps) {
  const totalTime = steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
  const remainingSteps = steps.filter((step) => !completedSteps.has(step.id)).length;

  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-900">{steps.length} prep steps</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="text-sm text-gray-500">~{totalTime} min</span>
      </div>
      {completedSteps.size > 0 && (
        <PrepProgressBadge steps={steps} completedSteps={completedSteps} />
      )}
      {remainingSteps === 0 && (
        <span className="text-sm font-medium text-green-600">Complete!</span>
      )}
    </div>
  );
}

// Icons
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

function ChevronRightIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
