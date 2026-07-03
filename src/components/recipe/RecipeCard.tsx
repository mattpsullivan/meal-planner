// RecipeCard component
// Compact recipe preview for lists and grids

import type { Recipe } from '@/types';
import { Card } from '../common/Card';
import { Badge, DietBadge, MealTypeBadge } from '../common/Badge';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: (() => void) | undefined;
  showMealTypes?: boolean | undefined;
  mealTypes?: string[] | undefined;
}

export function RecipeCard({
  recipe,
  onClick,
  showMealTypes = false,
  mealTypes = [],
}: RecipeCardProps) {
  const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <Card padding="md" hover={Boolean(onClick)} onClick={onClick}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 line-clamp-2">{recipe.name}</h3>
          {recipe.cuisine != null && (
            <Badge variant="default" size="sm">
              {recipe.cuisine}
            </Badge>
          )}
        </div>

        {recipe.description != null && (
          <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {totalTime} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {recipe.servings} servings
          </span>
          {recipe.diet != null && <DietBadge diet={recipe.diet} />}
        </div>

        {showMealTypes && mealTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {mealTypes.map((type) => (
              <MealTypeBadge key={type} type={type} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Grid layout for recipe cards
interface RecipeCardGridProps {
  recipes: Recipe[];
  onRecipeClick?: ((recipe: Recipe) => void) | undefined;
  emptyMessage?: string | undefined;
}

export function RecipeCardGrid({
  recipes,
  onRecipeClick,
  emptyMessage = 'No recipes found',
}: RecipeCardGridProps) {
  if (recipes.length === 0) {
    return <div className="py-12 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={
            onRecipeClick
              ? () => {
                  onRecipeClick(recipe);
                }
              : undefined
          }
        />
      ))}
    </div>
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
