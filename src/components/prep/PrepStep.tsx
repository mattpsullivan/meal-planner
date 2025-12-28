// PrepStep component
// Individual prep step card

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { PrepStep as PrepStepType } from '@/types';
import { Card, CardContent } from '../common/Card';
import { PrepTimerInline } from './PrepTimer';

interface PrepStepProps {
  step: PrepStepType;
  stepNumber: number;
  isActive?: boolean | undefined;
  isCompleted?: boolean | undefined;
  onComplete?: ((stepId: number) => void) | undefined;
  showRecipeLink?: boolean | undefined;
}

export function PrepStepCard({
  step,
  stepNumber,
  isActive = false,
  isCompleted = false,
  onComplete,
  showRecipeLink: _showRecipeLink = false,
}: PrepStepProps) {
  const [timerCompleted, setTimerCompleted] = useState(false);

  const handleTimerComplete = useCallback(() => {
    setTimerCompleted(true);
  }, []);

  const handleMarkComplete = useCallback(() => {
    onComplete?.(step.id);
  }, [onComplete, step.id]);

  return (
    <Card
      className={`transition-all ${
        isActive ? 'ring-2 ring-blue-500 ring-offset-2' : isCompleted ? 'opacity-60' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Step number indicator */}
          <button
            onClick={handleMarkComplete}
            disabled={onComplete == null}
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              isCompleted
                ? 'bg-green-600 text-white'
                : isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${onComplete != null ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {isCompleted ? <CheckIcon className="h-4 w-4" /> : stepNumber}
          </button>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                {/* Time marker */}
                <span className="text-sm font-medium text-gray-500">{step.timeMarker}</span>

                {/* Task description - link to recipe if available */}
                {step.recipeId != null ? (
                  <Link
                    to={`/recipe/${String(step.recipeId)}`}
                    className={`mt-1 block text-sm ${
                      isCompleted
                        ? 'text-gray-400 line-through'
                        : 'text-blue-600 hover:text-blue-800 hover:underline'
                    }`}
                  >
                    {step.task}
                    <span className="ml-1 text-xs">→</span>
                  </Link>
                ) : (
                  <p
                    className={`mt-1 text-sm ${
                      isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {step.task}
                  </p>
                )}
              </div>

              {/* Duration / Timer */}
              {step.duration != null && (
                <div className="flex-shrink-0">
                  {isActive && !isCompleted && !timerCompleted ? (
                    <PrepTimerInline
                      durationMs={step.duration * 60 * 1000}
                      onComplete={handleTimerComplete}
                    />
                  ) : (
                    <span className="text-sm text-gray-500">{step.duration} min</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for timeline view
interface PrepStepCompactProps {
  step: PrepStepType;
  isCompleted?: boolean | undefined;
  onToggle?: ((stepId: number) => void) | undefined;
}

export function PrepStepCompact({ step, isCompleted = false, onToggle }: PrepStepCompactProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
        isCompleted ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <button
        onClick={() => {
          onToggle?.(step.id);
        }}
        disabled={onToggle == null}
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs ${
          isCompleted ? 'bg-green-600 text-white' : 'border border-gray-300 bg-white'
        } ${onToggle != null ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {isCompleted && <CheckIcon className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{step.timeMarker}</span>
          {step.duration != null && (
            <span className="text-xs text-gray-400">({step.duration} min)</span>
          )}
        </div>
        {step.recipeId != null ? (
          <Link
            to={`/recipe/${String(step.recipeId)}`}
            className={`block truncate text-sm ${
              isCompleted
                ? 'text-gray-400 line-through'
                : 'text-blue-600 hover:text-blue-800 hover:underline'
            }`}
          >
            {step.task}
          </Link>
        ) : (
          <p
            className={`truncate text-sm ${
              isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
            }`}
          >
            {step.task}
          </p>
        )}
      </div>
    </div>
  );
}

// Icon
function CheckIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}
