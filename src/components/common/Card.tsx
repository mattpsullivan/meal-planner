// Card component
// Container with optional padding and shadow

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string | undefined;
  padding?: 'none' | 'sm' | 'md' | 'lg' | undefined;
  hover?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${paddingStyles[padding]} ${
        hover ? 'transition-shadow hover:shadow-md' : ''
      } ${onClick ? 'w-full text-left cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`border-b border-gray-100 pb-3 ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={`font-semibold text-gray-900 ${className}`}>{children}</h3>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}
