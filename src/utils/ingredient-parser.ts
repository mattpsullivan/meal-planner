// Ingredient parsing utilities
// See docs/DATA-ARCHITECTURE.md for parsing algorithm details

import type { IngredientCategory } from '@/types';

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  optional: boolean;
  note: string | null;
}

// Regex patterns for quantity parsing
const QUANTITY_PATTERNS = {
  mixed: /^(\d+)\s+(\d+)\/(\d+)/, // "1 1/2 cups"
  fraction: /^(\d+)\/(\d+)/, // "1/2 cup"
  range: /^(\d+)-(\d+)/, // "3-4 cloves"
  whole: /^(\d+(?:\.\d+)?)/, // "2 cups" or "2.5 cups"
  unicode: /^([½⅓⅔¼¾⅛⅜⅝⅞])/, // "½ cup"
};

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

// Common unit abbreviations and variations
const UNIT_ALIASES: Record<string, string> = {
  tbsp: 'tablespoon',
  tbs: 'tablespoon',
  tsp: 'teaspoon',
  oz: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  c: 'cup',
  pt: 'pint',
  qt: 'quart',
  gal: 'gallon',
  ml: 'milliliter',
  l: 'liter',
  g: 'gram',
  kg: 'kilogram',
};

// Units that are commonly used in recipes
const UNITS = new Set([
  'cup',
  'cups',
  'tablespoon',
  'tablespoons',
  'teaspoon',
  'teaspoons',
  'ounce',
  'ounces',
  'pound',
  'pounds',
  'pint',
  'pints',
  'clove',
  'cloves',
  'head',
  'heads',
  'bunch',
  'bunches',
  'can',
  'cans',
  'jar',
  'jars',
  'bag',
  'bags',
  'container',
  'containers',
  'medium',
  'large',
  'small',
]);

function parseQuantity(str: string): { value: number; consumed: number } | null {
  // Try mixed number first (1 1/2)
  const mixedMatch = QUANTITY_PATTERNS.mixed.exec(str);
  if (mixedMatch?.[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    return { value: whole + num / denom, consumed: mixedMatch[0].length };
  }

  // Try fraction (1/2)
  const fractionMatch = QUANTITY_PATTERNS.fraction.exec(str);
  if (fractionMatch?.[1] && fractionMatch[2]) {
    const num = parseInt(fractionMatch[1], 10);
    const denom = parseInt(fractionMatch[2], 10);
    return { value: num / denom, consumed: fractionMatch[0].length };
  }

  // Try unicode fraction (½)
  const unicodeMatch = QUANTITY_PATTERNS.unicode.exec(str);
  if (unicodeMatch?.[1]) {
    const fraction = UNICODE_FRACTIONS[unicodeMatch[1]];
    if (fraction !== undefined) {
      return { value: fraction, consumed: 1 };
    }
  }

  // Try whole/decimal number
  const wholeMatch = QUANTITY_PATTERNS.whole.exec(str);
  if (wholeMatch?.[1]) {
    return {
      value: parseFloat(wholeMatch[1]),
      consumed: wholeMatch[0].length,
    };
  }

  return null;
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase();
  // Remove trailing 's' for plurals
  const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
  return singular;
}

export function parseIngredient(line: string): ParsedIngredient {
  let remaining = line.trim();
  let quantity: number | null = null;
  let unit: string | null = null;
  let preparation: string | null = null;
  let optional = false;
  let note: string | null = null;

  // Remove leading dash/bullet
  remaining = remaining.replace(/^[-•*]\s*/, '');

  // Check for optional marker
  if (/\(optional\)/i.test(remaining)) {
    optional = true;
    remaining = remaining.replace(/\(optional\)/i, '').trim();
  }

  // Extract parenthetical notes like "(15 oz each)"
  const noteRegex = /\(([^)]+)\)/;
  const noteMatch = noteRegex.exec(remaining);
  if (noteMatch?.[1] && !noteMatch[1].toLowerCase().includes('optional')) {
    note = noteMatch[1];
    remaining = remaining.replace(noteMatch[0], '').trim();
  }

  // Parse quantity
  const qtyResult = parseQuantity(remaining);
  if (qtyResult) {
    quantity = qtyResult.value;
    remaining = remaining.slice(qtyResult.consumed).trim();
  }

  // Parse unit
  const words = remaining.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() ?? '';
  if (firstWord && (UNITS.has(firstWord) || firstWord in UNIT_ALIASES)) {
    unit = UNIT_ALIASES[firstWord] ?? normalizeUnit(firstWord);
    remaining = words.slice(1).join(' ');
  }

  // Check for preparation (after comma)
  const commaIndex = remaining.indexOf(',');
  if (commaIndex !== -1) {
    preparation = remaining.slice(commaIndex + 1).trim();
    remaining = remaining.slice(0, commaIndex).trim();
  }

  return {
    quantity,
    unit,
    name: remaining,
    preparation,
    optional,
    note,
  };
}

// Categorization keywords.
//
// IMPORTANT: matching is first-hit substring, in object insertion order, so
// ordering encodes precedence. Deliberate choices below:
//   - `pantry` precedes `meat-poultry`/`seafood` so "chicken broth" / "fish
//     sauce" land in pantry, while "chicken breast" / "salmon" fall through.
//   - `dairy-eggs` follows `nuts-seeds` so "peanut butter" stays nuts, then
//     plain "butter" / "milk" reach dairy.
//   - `produce` carries `eggplant` / `butternut` as guards against the `egg`
//     and `butter` substrings.
const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  produce: [
    'onion',
    'garlic',
    'pepper',
    'tomato',
    'cucumber',
    'lettuce',
    'spinach',
    'avocado',
    'lime',
    'lemon',
    'cilantro',
    'parsley',
    'dill',
    'basil',
    'zucchini',
    'carrot',
    'celery',
    'banana',
    'apple',
    'berry',
    'mango',
    'jalapeño',
    'sweet potato',
    'eggplant',
    'butternut',
  ],
  pantry: [
    'flour',
    'maple syrup',
    'sugar',
    'salt',
    'pasta',
    'can',
    'canned',
    'dried',
    'broth',
    'stock',
    'fish sauce',
    'oyster sauce',
    'tortilla',
    'syrup',
    'cocoa',
    'tomato paste',
  ],
  'meat-poultry': [
    'chicken',
    'turkey',
    'beef',
    'pork',
    'bacon',
    'sausage',
    'steak',
    'lamb',
    'chorizo',
    'prosciutto',
    'pancetta',
    'meatball',
  ],
  seafood: [
    'salmon',
    'shrimp',
    'tuna',
    'fish',
    'cod',
    'crab',
    'scallop',
    'shellfish',
    'tilapia',
    'anchovy',
    'sardine',
    'halibut',
    'mussel',
    'clam',
    'lobster',
  ],
  refrigerated: ['tofu', 'tempeh', 'salsa', 'hummus'],
  frozen: ['frozen'],
  spices: [
    'cumin',
    'paprika',
    'coriander',
    'oregano',
    'cinnamon',
    'cayenne',
    'chili powder',
    'turmeric',
    'pepper',
    'garlic powder',
    'onion powder',
    'red pepper flakes',
  ],
  'oils-vinegars': ['oil', 'olive', 'vegetable oil', 'coconut oil', 'vinegar'],
  'nuts-seeds': [
    'cashew',
    'walnut',
    'almond',
    'peanut',
    'nut',
    'seed',
    'pepita',
    'tahini',
    'chia',
    'hemp',
  ],
  'dairy-eggs': [
    'milk',
    'yogurt',
    'cream',
    'feta',
    'cheese',
    'egg',
    'butter',
    'parmesan',
    'mozzarella',
    'ricotta',
    'ghee',
    'buttermilk',
  ],
  grains: ['rice', 'quinoa', 'oat', 'barley', 'farro', 'bulgur'],
  legumes: ['bean', 'lentil', 'chickpea', 'pea'],
  other: [],
};

export function categorizeIngredient(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as IngredientCategory;
    }
  }
  return 'other';
}
