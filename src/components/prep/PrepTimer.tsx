// PrepTimer component
// Countdown timer for prep steps

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button';

type TimerState = 'idle' | 'running' | 'paused' | 'completed';

interface PrepTimerProps {
  durationMs: number;
  label: string;
  onComplete?: (() => void) | undefined;
  autoStart?: boolean | undefined;
  compact?: boolean | undefined;
}

export function PrepTimer({
  durationMs,
  label,
  onComplete,
  autoStart = false,
  compact = false,
}: PrepTimerProps) {
  const [state, setState] = useState<TimerState>(autoStart ? 'running' : 'idle');
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const progress = 1 - remainingMs / durationMs;
  const displayTime = formatTime(remainingMs);

  const tick = useCallback(() => {
    if (endTimeRef.current === null) return;

    const now = Date.now();
    const remaining = Math.max(0, endTimeRef.current - now);
    setRemainingMs(remaining);

    if (remaining === 0) {
      setState('completed');
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onComplete?.();
    }
  }, [onComplete]);

  const start = useCallback(() => {
    endTimeRef.current = Date.now() + remainingMs;
    setState('running');
    intervalRef.current = window.setInterval(tick, 100);
  }, [remainingMs, tick]);

  const pause = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    endTimeRef.current = Date.now() + remainingMs;
    setState('running');
    intervalRef.current = window.setInterval(tick, 100);
  }, [remainingMs, tick]);

  const reset = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
    setRemainingMs(durationMs);
    setState('idle');
  }, [durationMs]);

  // Auto-start if specified
  useEffect(() => {
    if (autoStart && state === 'idle') {
      start();
    }
  }, [autoStart, state, start]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          className={`font-mono text-sm ${
            state === 'completed'
              ? 'text-green-600'
              : state === 'running'
                ? 'text-blue-600'
                : 'text-gray-600'
          }`}
        >
          {displayTime}
        </span>
        {state === 'idle' && (
          <button onClick={start} className="text-blue-600 hover:text-blue-700 text-xs">
            Start
          </button>
        )}
        {state === 'running' && (
          <button onClick={pause} className="text-gray-600 hover:text-gray-700 text-xs">
            Pause
          </button>
        )}
        {state === 'paused' && (
          <button onClick={resume} className="text-blue-600 hover:text-blue-700 text-xs">
            Resume
          </button>
        )}
        {state === 'completed' && <span className="text-xs text-green-600">Done!</span>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium text-gray-700">{label}</div>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-100 ${
            state === 'completed' ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${String(progress * 100)}%` }}
        />
      </div>

      {/* Time display */}
      <div
        className={`mb-4 text-center font-mono text-4xl font-bold ${
          state === 'completed'
            ? 'text-green-600'
            : remainingMs < 60000
              ? 'text-red-600'
              : 'text-gray-900'
        }`}
      >
        {displayTime}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        {state === 'idle' && (
          <Button onClick={start} variant="primary">
            <PlayIcon className="mr-1 h-4 w-4" />
            Start
          </Button>
        )}
        {state === 'running' && (
          <Button onClick={pause} variant="secondary">
            <PauseIcon className="mr-1 h-4 w-4" />
            Pause
          </Button>
        )}
        {state === 'paused' && (
          <>
            <Button onClick={resume} variant="primary">
              <PlayIcon className="mr-1 h-4 w-4" />
              Resume
            </Button>
            <Button onClick={reset} variant="ghost">
              Reset
            </Button>
          </>
        )}
        {state === 'completed' && (
          <Button onClick={reset} variant="secondary">
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline timer for step display
interface PrepTimerInlineProps {
  durationMs: number;
  onComplete?: (() => void) | undefined;
}

export function PrepTimerInline({ durationMs, onComplete }: PrepTimerInlineProps) {
  return <PrepTimer durationMs={durationMs} label="" onComplete={onComplete} compact />;
}

// Helper function
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Icons
function PlayIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}
