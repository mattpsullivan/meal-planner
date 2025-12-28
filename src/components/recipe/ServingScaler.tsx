// ServingScaler component
// Allows users to adjust serving size and see scaled quantities

import { useState, useCallback } from 'react';
import { Button } from '../common/Button';

interface ServingScalerProps {
  baseServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
  minServings?: number | undefined;
  maxServings?: number | undefined;
}

export function ServingScaler({
  baseServings,
  currentServings,
  onChange,
  minServings = 1,
  maxServings = 12,
}: ServingScalerProps) {
  const scale = currentServings / baseServings;

  const increment = useCallback(() => {
    if (currentServings < maxServings) {
      onChange(currentServings + 1);
    }
  }, [currentServings, maxServings, onChange]);

  const decrement = useCallback(() => {
    if (currentServings > minServings) {
      onChange(currentServings - 1);
    }
  }, [currentServings, minServings, onChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">Servings:</span>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={decrement}
          disabled={currentServings <= minServings}
          aria-label="Decrease servings"
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-lg font-semibold text-gray-900">
          {currentServings}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={increment}
          disabled={currentServings >= maxServings}
          aria-label="Increase servings"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      {scale !== 1 && (
        <span className="text-sm text-green-600">
          ({scale > 1 ? '+' : ''}
          {Math.round((scale - 1) * 100)}%)
        </span>
      )}
    </div>
  );
}

// Compact inline version
interface ServingScalerInlineProps {
  baseServings: number;
  onChange: (servings: number) => void;
}

export function ServingScalerInline({ baseServings, onChange }: ServingScalerInlineProps) {
  const [servings, setServings] = useState(baseServings);

  const handleChange = useCallback(
    (newServings: number) => {
      setServings(newServings);
      onChange(newServings);
    },
    [onChange]
  );

  return (
    <ServingScaler baseServings={baseServings} currentServings={servings} onChange={handleChange} />
  );
}

// Preset multiplier buttons
interface ServingMultiplierProps {
  baseServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
}

export function ServingMultiplier({
  baseServings,
  currentServings,
  onChange,
}: ServingMultiplierProps) {
  const multipliers = [0.5, 1, 2, 3];
  const currentMultiplier = currentServings / baseServings;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Scale:</span>
      <div className="flex gap-1">
        {multipliers.map((mult) => (
          <button
            key={mult}
            onClick={() => {
              onChange(Math.round(baseServings * mult));
            }}
            className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
              Math.abs(currentMultiplier - mult) < 0.01
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {mult === 1 ? '1x' : `${String(mult)}x`}
          </button>
        ))}
      </div>
    </div>
  );
}

// Icons
function MinusIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}
