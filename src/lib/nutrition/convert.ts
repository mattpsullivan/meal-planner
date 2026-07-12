// Unit -> grams conversion. This is the fiddliest part of the nutrition pipeline
// and the main source of approximation error (see docs/NUTRITION.md). Weight units
// are universal; every other unit (volume, count) is ingredient-specific and comes
// from the ingredient's `grams_per_unit` map.

// Universal weight units -> grams. These never need a per-ingredient override.
const WEIGHT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  kg: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  lb: 453.592,
  pound: 453.592,
};

// Map common plural/spelled unit forms to a single canonical key.
const UNIT_ALIASES: Record<string, string> = {
  cups: 'cup',
  tbsps: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  cloves: 'clove',
  cans: 'can',
  ounces: 'ounce',
  lbs: 'lb',
  pounds: 'pound',
  grams: 'gram',
  pieces: 'piece',
  slices: 'slice',
  wedges: 'wedge',
  heads: 'head',
  leaves: 'leaf',
  stalks: 'stalk',
  sprigs: 'sprig',
  bunches: 'bunch',
  inches: 'inch',
  handfuls: 'handful',
};

// Normalize a raw Cooklang unit to a canonical key. A missing/"(none)" unit means
// the ingredient is counted (e.g. "@lemon{1}"), which we key as "each".
export function normalizeUnit(unit: string | null | undefined): string {
  if (unit === null || unit === undefined) return 'each';
  const trimmed = unit.trim().toLowerCase();
  if (trimmed === '' || trimmed === '(none)') return 'each';
  const alias = UNIT_ALIASES[trimmed];
  return alias ?? trimmed;
}

// Grams for a universal weight unit, or null if the unit isn't a weight.
export function weightUnitGrams(unit: string): number | null {
  const grams = WEIGHT_GRAMS[unit];
  return grams ?? null;
}

// Convert quantity + unit to grams for a real ingredient, using its per-ingredient
// grams_per_unit map for non-weight units. Returns null when the unit can't be
// resolved (caller treats that as unmapped).
export function ingredientGrams(
  quantity: number,
  unit: string | null | undefined,
  gramsPerUnit?: Record<string, number>
): number | null {
  const u = normalizeUnit(unit);
  const weight = weightUnitGrams(u);
  if (weight !== null) return quantity * weight;
  const perUnit = gramsPerUnit?.[u];
  if (perUnit !== undefined) return quantity * perUnit;
  return null;
}
