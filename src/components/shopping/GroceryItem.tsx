// GroceryItem component
// Individual grocery item with checkbox and actions

import type { GroceryItem as GroceryItemType } from '@/types';
import { Checkbox } from '../common/Checkbox';
import { CategoryBadge } from '../common/Badge';

// Defensive helper: ensure value is safe to render as React child
// Prevents "Objects are not valid as a React child" errors
function safeRender(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  // Reject objects/arrays - don't render them
  if (typeof value === 'object') {
    console.warn('safeRender: attempted to render object:', value);
    return '[invalid]';
  }
  // For any other type, return empty string rather than risk toString
  return '';
}

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: (itemId: number, checked: boolean) => void;
  onQuantityChange?: ((itemId: number, quantity: number) => void) | undefined;
  onDelete?: ((itemId: number) => void) | undefined;
  showCategory?: boolean | undefined;
  showRecipeSources?: boolean | undefined;
}

export function GroceryItem({
  item,
  onToggle,
  onQuantityChange,
  onDelete,
  showCategory = false,
  showRecipeSources = false,
}: GroceryItemProps) {
  const displayQuantity = item.userQuantity ?? item.quantity;
  const quantityText = formatQuantity(displayQuantity, item.unit);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        item.checked ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={item.checked}
          onChange={(checked) => {
            onToggle(item.id, checked);
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`text-sm font-medium ${
                item.checked ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {quantityText && (
                <span className="font-normal text-gray-600">{safeRender(quantityText)} </span>
              )}
              {safeRender(item.name)}
            </span>
            {showCategory && item.category != null && typeof item.category === 'string' && (
              <span className="ml-2">
                <CategoryBadge category={item.category} />
              </span>
            )}
          </div>

          {onDelete != null && (
            <button
              onClick={() => {
                onDelete(item.id);
              }}
              className="text-gray-400 transition-colors hover:text-red-500"
              aria-label="Delete item"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {item.userNotes != null && typeof item.userNotes === 'string' && (
          <p className="mt-1 text-xs text-gray-500">{safeRender(item.userNotes)}</p>
        )}

        {showRecipeSources &&
          Array.isArray(item.recipeSources) &&
          item.recipeSources.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              From: {item.recipeSources.map((s) => safeRender(s)).join(', ')}
            </p>
          )}

        {onQuantityChange != null && !item.checked && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => {
                const current = displayQuantity ?? 1;
                if (current > 1) onQuantityChange(item.id, current - 1);
              }}
              className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              disabled={!displayQuantity || displayQuantity <= 1}
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="min-w-[2rem] text-center text-sm">{displayQuantity ?? 1}</span>
            <button
              onClick={() => {
                const current = displayQuantity ?? 1;
                onQuantityChange(item.id, current + 1);
              }}
              className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for inline lists
interface GroceryItemCompactProps {
  item: GroceryItemType;
  onToggle: (itemId: number, checked: boolean) => void;
}

export function GroceryItemCompact({ item, onToggle }: GroceryItemCompactProps) {
  const displayQuantity = item.userQuantity ?? item.quantity;
  const quantityText = formatQuantity(displayQuantity, item.unit);

  return (
    <div className="flex items-center gap-2 py-1">
      <Checkbox
        checked={item.checked}
        onChange={(checked) => {
          onToggle(item.id, checked);
        }}
      />
      <span className={`text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {quantityText && <span className="text-gray-500">{safeRender(quantityText)} </span>}
        {safeRender(item.name)}
      </span>
    </div>
  );
}

// Helper functions
function formatQuantity(quantity: number | undefined, unit: string | undefined): string {
  if (quantity == null) return '';

  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  };

  let quantityStr: string;
  if (Number.isInteger(quantity)) {
    quantityStr = String(quantity);
  } else {
    const wholePart = Math.floor(quantity);
    const fractionalPart = quantity - wholePart;

    let fractionSymbol = '';
    for (const [value, symbol] of Object.entries(fractions)) {
      if (Math.abs(fractionalPart - parseFloat(value)) < 0.05) {
        fractionSymbol = symbol;
        break;
      }
    }

    if (fractionSymbol) {
      quantityStr = wholePart > 0 ? `${String(wholePart)} ${fractionSymbol}` : fractionSymbol;
    } else {
      quantityStr = quantity.toFixed(1);
    }
  }

  return unit != null ? `${quantityStr} ${unit}` : quantityStr;
}

// Icons
function TrashIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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
