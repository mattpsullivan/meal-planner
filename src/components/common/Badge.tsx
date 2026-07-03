// Badge component
// For tags, labels, and status indicators

import type { ReactNode } from 'react';
import type { Diet } from '@/types';
import { DIET_LABELS } from '@/lib/diet';

type BadgeVariant = 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Meal type specific badges
export function MealTypeBadge({ type }: { type: string }) {
  // Defensive: ensure type is a string before rendering
  if (typeof type !== 'string') {
    console.warn('MealTypeBadge: received non-string type:', type);
    return null;
  }

  const variants: Record<string, BadgeVariant> = {
    breakfast: 'yellow',
    lunch: 'green',
    dinner: 'blue',
    snack: 'purple',
    dessert: 'red',
  };

  return <Badge variant={variants[type.toLowerCase()] ?? 'default'}>{type}</Badge>;
}

// Diet badge (vegan / vegetarian / pescatarian / omnivore)
const dietVariants: Record<Diet, BadgeVariant> = {
  vegan: 'green',
  vegetarian: 'yellow',
  pescatarian: 'blue',
  omnivore: 'red',
};

export function DietBadge({ diet }: { diet: Diet }) {
  return <Badge variant={dietVariants[diet]}>{DIET_LABELS[diet]}</Badge>;
}

// Category badges for grocery items
export function CategoryBadge({ category }: { category: string }) {
  // Defensive: ensure category is a string before rendering
  if (typeof category !== 'string') {
    console.warn('CategoryBadge: received non-string category:', category);
    return null;
  }

  const variants: Record<string, BadgeVariant> = {
    produce: 'green',
    'meat-poultry': 'red',
    seafood: 'blue',
    'dairy-eggs': 'blue',
    grains: 'yellow',
    legumes: 'green',
    'nuts-seeds': 'yellow',
    pantry: 'default',
    refrigerated: 'blue',
    frozen: 'purple',
    'oils-vinegars': 'default',
    spices: 'yellow',
  };

  return (
    <Badge variant={variants[category.toLowerCase()] ?? 'default'} size="sm">
      {category}
    </Badge>
  );
}
