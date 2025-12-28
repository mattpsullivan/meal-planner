// Skeleton component
// Loading placeholder for content

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gray-200';

  const variantStyles = {
    text: 'rounded h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${String(width)}px` : width;
  if (height) style.height = typeof height === 'number' ? `${String(height)}px` : height;

  return <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} style={style} />;
}

// Preset skeleton patterns

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="mb-3 h-5 w-2/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function MealCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <Skeleton variant="rectangular" width={80} height={80} />
      <div className="flex-1">
        <Skeleton className="mb-2 h-4 w-1/4" />
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function RecipeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton variant="rectangular" height={200} className="w-full" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="rectangular" height={100} />
        <Skeleton variant="rectangular" height={100} />
      </div>
    </div>
  );
}
