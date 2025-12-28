// LoadingScreen component
// Full-page loading indicator

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Inline loading spinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  };

  return (
    <div
      className={`animate-spin rounded-full border-gray-200 border-t-green-600 ${sizeStyles[size]}`}
    />
  );
}
