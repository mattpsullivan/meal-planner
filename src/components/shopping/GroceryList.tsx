// GroceryList component
// Full grocery list view with categories and actions

import { useMemo, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import type {
  GroceryListWithItems,
  GroceryItem as GroceryItemType,
  IngredientCategory,
} from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { NoItemsEmptyState } from '../common/EmptyState';
import { GroceryItem, GroceryItemCompact } from './GroceryItem';

// Per-item error boundary to isolate failures
interface ItemErrorBoundaryProps {
  children: ReactNode;
  itemId: number;
}

interface ItemErrorBoundaryState {
  hasError: boolean;
}

class ItemErrorBoundary extends Component<ItemErrorBoundaryProps, ItemErrorBoundaryState> {
  constructor(props: ItemErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ItemErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error rendering grocery item ${String(this.props.itemId)}:`, error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          Failed to render item
        </div>
      );
    }
    return this.props.children;
  }
}

interface GroceryListProps {
  list: GroceryListWithItems;
  onToggleItem: (itemId: number, checked: boolean) => void;
  onUpdateQuantity?: ((itemId: number, quantity: number) => void) | undefined;
  onDeleteItem?: ((itemId: number) => void) | undefined;
  onClearChecked?: (() => void) | undefined;
  onRegenerate?: (() => void) | undefined;
  showRecipeSources?: boolean | undefined;
}

// Category display order (roughly grocery-aisle order)
const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat-poultry',
  'seafood',
  'dairy-eggs',
  'refrigerated',
  'frozen',
  'pantry',
  'grains',
  'legumes',
  'nuts-seeds',
  'oils-vinegars',
  'spices',
  'other',
];

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: 'Produce',
  'meat-poultry': 'Meat & Poultry',
  seafood: 'Seafood',
  'dairy-eggs': 'Dairy & Eggs',
  refrigerated: 'Refrigerated',
  frozen: 'Frozen',
  pantry: 'Pantry',
  grains: 'Grains',
  legumes: 'Legumes',
  'nuts-seeds': 'Nuts & Seeds',
  'oils-vinegars': 'Oils & Vinegars',
  spices: 'Spices & Seasonings',
  other: 'Other',
};

export function GroceryList({
  list,
  onToggleItem,
  onUpdateQuantity,
  onDeleteItem,
  onClearChecked,
  onRegenerate,
  showRecipeSources = false,
}: GroceryListProps) {
  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<IngredientCategory, GroceryItemType[]>();

    for (const item of list.items) {
      // Map string category to IngredientCategory, defaulting to 'other'
      const rawCategory = item.category ?? 'other';
      const category = CATEGORY_ORDER.includes(rawCategory as IngredientCategory)
        ? (rawCategory as IngredientCategory)
        : 'other';
      const existing = groups.get(category) ?? [];
      existing.push(item);
      groups.set(category, existing);
    }

    // Sort categories by defined order
    const sortedCategories = CATEGORY_ORDER.filter((cat) => groups.has(cat));

    return sortedCategories.map((category) => ({
      category,
      items: groups.get(category) ?? [],
    }));
  }, [list.items]);

  // Calculate progress
  const totalItems = list.items.length;
  const checkedItems = list.items.filter((i) => i.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  if (totalItems === 0) {
    return <NoItemsEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Shopping Progress</span>
                <span className="text-sm text-gray-500">
                  {checkedItems}/{totalItems} items
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${String(progressPercent)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {checkedItems > 0 && onClearChecked != null && (
          <Button variant="secondary" size="sm" onClick={onClearChecked}>
            Clear checked ({checkedItems})
          </Button>
        )}
        {onRegenerate != null && (
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate list
          </Button>
        )}
      </div>

      {/* Grouped items */}
      {groupedItems.map(({ category, items }) => (
        <GroceryCategory
          key={category}
          category={category}
          items={items}
          onToggleItem={onToggleItem}
          onUpdateQuantity={onUpdateQuantity}
          onDeleteItem={onDeleteItem}
          showRecipeSources={showRecipeSources}
        />
      ))}
    </div>
  );
}

// Category section
interface GroceryCategoryProps {
  category: IngredientCategory;
  items: GroceryItemType[];
  onToggleItem: (itemId: number, checked: boolean) => void;
  onUpdateQuantity?: ((itemId: number, quantity: number) => void) | undefined;
  onDeleteItem?: ((itemId: number) => void) | undefined;
  showRecipeSources?: boolean | undefined;
}

export function GroceryCategory({
  category,
  items,
  onToggleItem,
  onUpdateQuantity,
  onDeleteItem,
  showRecipeSources = false,
}: GroceryCategoryProps) {
  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{CATEGORY_LABELS[category]}</span>
          <span
            className={`text-sm font-normal ${allChecked ? 'text-green-600' : 'text-gray-500'}`}
          >
            {checkedCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {items.map((item) => (
            <ItemErrorBoundary key={item.id} itemId={item.id}>
              <GroceryItem
                item={item}
                onToggle={onToggleItem}
                onQuantityChange={onUpdateQuantity}
                onDelete={onDeleteItem}
                showRecipeSources={showRecipeSources}
              />
            </ItemErrorBoundary>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact list version (for sidebar or modal)
interface GroceryListCompactProps {
  list: GroceryListWithItems;
  onToggleItem: (itemId: number, checked: boolean) => void;
  maxItems?: number | undefined;
}

export function GroceryListCompact({ list, onToggleItem, maxItems }: GroceryListCompactProps) {
  const displayItems = maxItems != null ? list.items.slice(0, maxItems) : list.items;
  const remainingCount = maxItems != null ? list.items.length - maxItems : 0;

  if (list.items.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No items in your grocery list.</p>;
  }

  return (
    <div className="space-y-1">
      {displayItems.map((item) => (
        <ItemErrorBoundary key={item.id} itemId={item.id}>
          <GroceryItemCompact item={item} onToggle={onToggleItem} />
        </ItemErrorBoundary>
      ))}
      {remainingCount > 0 && (
        <p className="text-sm text-gray-500 pt-2">+{remainingCount} more items</p>
      )}
    </div>
  );
}

// Progress indicator for header/nav
interface GroceryProgressProps {
  list: GroceryListWithItems;
}

export function GroceryProgress({ list }: GroceryProgressProps) {
  const totalItems = list.items.length;
  const checkedItems = list.items.filter((i) => i.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${String(progressPercent)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">
        {checkedItems}/{totalItems}
      </span>
    </div>
  );
}
