// MealCard component
// Displays a single meal with recipe preview

import type { DayMealWithRecipe, MealType } from '@/types';
import { Card } from '../common/Card';
import { MealTypeBadge } from '../common/Badge';

interface MealCardProps {
  meal: DayMealWithRecipe;
  onClick?: (() => void) | undefined;
  compact?: boolean | undefined;
}

export function MealCard({ meal, onClick, compact = false }: MealCardProps) {
  const { recipe, mealType, description } = meal;

  // Use recipe name if available, otherwise fall back to meal description
  const displayName = recipe?.name ?? description ?? 'Unknown Recipe';

  if (compact) {
    return (
      <Card
        padding="sm"
        hover={Boolean(onClick)}
        onClick={onClick}
        className="flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          {recipe?.prepTime != null && (
            <p className="text-xs text-gray-500">{recipe.prepTime} min prep</p>
          )}
        </div>
        <MealTypeBadge type={mealType} />
      </Card>
    );
  }

  return (
    <Card padding="none" hover={Boolean(onClick)} onClick={onClick}>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900">{displayName}</h3>
          <MealTypeBadge type={mealType} />
        </div>
        {recipe?.description != null && (
          <p className="mb-3 text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {recipe?.prepTime != null && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {recipe.prepTime}m prep
            </span>
          )}
          {recipe?.cookTime != null && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {recipe.cookTime}m cook
            </span>
          )}
          {recipe != null && (
            <span className="flex items-center gap-1">
              <UsersIcon className="h-4 w-4" />
              {recipe.servings} servings
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Helper icons
function ClockIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

// Placeholder component when no meal is assigned
interface EmptyMealSlotProps {
  mealType: MealType;
  onAddMeal?: (() => void) | undefined;
}

export function EmptyMealSlot({ mealType, onAddMeal }: EmptyMealSlotProps) {
  return (
    <button
      onClick={onAddMeal}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500 transition-colors hover:border-green-400 hover:bg-green-50 hover:text-green-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
      </svg>
      Add {mealType}
    </button>
  );
}
