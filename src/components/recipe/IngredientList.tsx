// IngredientList component
// Displays recipe ingredients with optional scaling
// Supports linked component recipes for meal assemblies

import { Link } from 'react-router-dom';
import type { IngredientWithSourceRecipe } from '@/types';
import { Checkbox } from '../common/Checkbox';
import { routes } from '@/router';

interface IngredientListProps {
  ingredients: IngredientWithSourceRecipe[];
  scale?: number | undefined;
  showCheckboxes?: boolean | undefined;
  checkedIds?: Set<number> | undefined;
  onToggle?: ((ingredientId: number) => void) | undefined;
}

export function IngredientList({
  ingredients,
  scale = 1,
  showCheckboxes = false,
  checkedIds = new Set(),
  onToggle,
}: IngredientListProps) {
  // Group by category if available
  const groupedIngredients = groupByCategory(ingredients);
  const categories = Object.keys(groupedIngredients);
  const hasCategories =
    categories.length > 1 || (categories[0] !== 'other' && categories.length === 1);

  if (hasCategories) {
    return (
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              {formatCategory(category)}
            </h4>
            <ul className="space-y-2">
              {groupedIngredients[category]?.map((ingredient) => (
                <IngredientItem
                  key={ingredient.id}
                  ingredient={ingredient}
                  scale={scale}
                  showCheckbox={showCheckboxes}
                  isChecked={checkedIds.has(ingredient.id)}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {ingredients.map((ingredient) => (
        <IngredientItem
          key={ingredient.id}
          ingredient={ingredient}
          scale={scale}
          showCheckbox={showCheckboxes}
          isChecked={checkedIds.has(ingredient.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

// Individual ingredient item
interface IngredientItemProps {
  ingredient: IngredientWithSourceRecipe;
  scale?: number | undefined;
  showCheckbox?: boolean | undefined;
  isChecked?: boolean | undefined;
  onToggle?: ((ingredientId: number) => void) | undefined;
}

function IngredientItem({
  ingredient,
  scale = 1,
  showCheckbox = false,
  isChecked = false,
  onToggle,
}: IngredientItemProps) {
  const scaledQuantity =
    ingredient.quantity != null ? formatQuantity(ingredient.quantity * scale) : null;

  const ingredientText = formatIngredient(ingredient, scaledQuantity);
  const hasSourceRecipe = ingredient.sourceRecipe != null;

  if (showCheckbox) {
    return (
      <li>
        <Checkbox
          checked={isChecked}
          onChange={() => {
            onToggle?.(ingredient.id);
          }}
          label={ingredientText}
          description={ingredient.preparation}
        />
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${hasSourceRecipe ? 'bg-blue-500' : 'bg-green-500'}`}
      />
      <div>
        {hasSourceRecipe && ingredient.sourceRecipe ? (
          <Link
            to={routes.recipe(ingredient.sourceRecipe.id)}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {ingredientText}
          </Link>
        ) : (
          <span className={isChecked ? 'text-gray-400 line-through' : 'text-gray-900'}>
            {ingredientText}
          </span>
        )}
        {ingredient.preparation != null && (
          <span className="ml-1 text-gray-500">({ingredient.preparation})</span>
        )}
        {hasSourceRecipe && <span className="ml-1 text-xs text-blue-500">(component)</span>}
      </div>
    </li>
  );
}

// Helper functions
function groupByCategory(
  ingredients: IngredientWithSourceRecipe[]
): Record<string, IngredientWithSourceRecipe[]> {
  return ingredients.reduce<Record<string, IngredientWithSourceRecipe[]>>((acc, ingredient) => {
    const category = ingredient.category;
    acc[category] ??= [];
    acc[category].push(ingredient);
    return acc;
  }, {});
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
}

function formatQuantity(quantity: number): string {
  // Handle common fractions
  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  };

  // Check if it's a whole number
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  // Check for common fractions
  const wholePart = Math.floor(quantity);
  const fractionalPart = quantity - wholePart;

  // Find closest fraction
  for (const [value, symbol] of Object.entries(fractions)) {
    if (Math.abs(fractionalPart - parseFloat(value)) < 0.05) {
      return wholePart > 0 ? `${String(wholePart)} ${symbol}` : symbol;
    }
  }

  // Default to decimal with 1-2 places
  return quantity.toFixed(quantity < 10 ? 1 : 0);
}

function formatIngredient(
  ingredient: IngredientWithSourceRecipe,
  scaledQuantity: string | null
): string {
  const parts: string[] = [];

  if (scaledQuantity != null) {
    parts.push(scaledQuantity);
  }

  if (ingredient.unit != null) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  return parts.join(' ');
}

// Compact inline list for recipe cards
export function IngredientListCompact({
  ingredients,
  maxItems = 5,
}: {
  ingredients: IngredientWithSourceRecipe[];
  maxItems?: number | undefined;
}) {
  const displayItems = ingredients.slice(0, maxItems);
  const remaining = ingredients.length - maxItems;

  return (
    <p className="text-sm text-gray-600">
      {displayItems.map((i) => i.name).join(', ')}
      {remaining > 0 && <span className="text-gray-400"> +{remaining} more</span>}
    </p>
  );
}
