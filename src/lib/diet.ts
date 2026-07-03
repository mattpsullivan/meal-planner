// Diet classification helpers.
//
// A recipe's diet is the broadest category its ingredients require. We map each
// ingredient category to the minimum diet that can eat it, then combine: the
// most animal-inclusive ingredient wins. Vegan is the floor.

import type { Diet } from '@/types';

// Ordered most-to-least plant-based. Also the display / filter order.
export const DIETS: readonly Diet[] = ['vegan', 'vegetarian', 'pescatarian', 'omnivore'];

export const DIET_LABELS: Record<Diet, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  omnivore: 'Omnivore',
};

// Higher rank = more animal products required to eat it.
const DIET_RANK: Record<Diet, number> = {
  vegan: 0,
  vegetarian: 1,
  pescatarian: 2,
  omnivore: 3,
};

// The minimum diet needed to eat an ingredient in the given grocery category.
// Categories not tied to an animal product default to vegan.
export function dietFromCategory(category: string): Diet {
  switch (category) {
    case 'meat-poultry':
      return 'omnivore';
    case 'seafood':
      return 'pescatarian';
    case 'dairy-eggs':
      return 'vegetarian';
    default:
      return 'vegan';
  }
}

// Combine ingredient-level diets into the recipe's diet: the broadest
// (most animal-inclusive) one wins. Empty -> vegan.
export function combineDiets(diets: readonly Diet[]): Diet {
  return diets.reduce<Diet>((broadest, d) => (DIET_RANK[d] > DIET_RANK[broadest] ? d : broadest), 'vegan');
}

export function isDiet(value: string): value is Diet {
  return (DIETS as readonly string[]).includes(value);
}
