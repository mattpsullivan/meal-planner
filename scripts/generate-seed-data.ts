#!/usr/bin/env npx tsx
// Generate seed data from markdown content files
// Run with: npx tsx scripts/generate-seed-data.ts

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import parsers - we need to use relative paths since this is a script
// We'll replicate the essential parsing logic here for the Node.js environment

interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  optional: boolean;
  note: string | null;
}

interface SeedRecipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  yield_amount: string | null;
  yield_unit: string | null;
  storage_days: number | null;
  storage_instructions: string | null;
  source_week: number;
  ingredients: SeedIngredient[];
  instructions: string[];
  tags: string[];
  meal_types: string[];
}

interface SeedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  optional: boolean;
  note: string | null;
  category: string;
  display_order: number;
}

interface SeedWeek {
  id: string;
  week_number: number;
  title: string;
  theme: string;
  start_date: string;
  end_date: string;
  components: SeedComponent[];
  prep_steps: SeedPrepStep[];
  days: SeedDay[];
}

interface SeedComponent {
  recipe_id: string;
  component_type: string;
}

interface SeedPrepStep {
  step_number: number;
  time_minutes: number;
  description: string;
}

interface SeedDay {
  day_number: number;
  date: string;
  day_of_week: string;
  meals: SeedMeal[];
}

interface SeedMeal {
  meal_type: string;
  recipe_id: string | null;
  recipe_name: string;
  display_order: number;
}

interface SeedData {
  recipes: SeedRecipe[];
  weeks: SeedWeek[];
}

// =========== Ingredient Parser ===========

const QUANTITY_PATTERNS = {
  mixed: /^(\d+)\s+(\d+)\/(\d+)/,
  fraction: /^(\d+)\/(\d+)/,
  range: /^(\d+)-(\d+)/,
  whole: /^(\d+(?:\.\d+)?)/,
  unicode: /^([½⅓⅔¼¾⅛⅜⅝⅞])/,
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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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
  ],
  pantry: [
    'flour',
    'sugar',
    'salt',
    'pasta',
    'can',
    'canned',
    'dried',
    'broth',
    'stock',
    'tortilla',
    'syrup',
    'cocoa',
    'tomato paste',
  ],
  refrigerated: ['milk', 'yogurt', 'cream', 'tofu', 'tempeh', 'feta', 'cheese', 'salsa'],
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
  grains: ['rice', 'quinoa', 'oat', 'barley', 'farro', 'bulgur'],
  legumes: ['bean', 'lentil', 'chickpea', 'pea'],
};

function parseQuantity(str: string): { value: number; consumed: number } | null {
  const mixedMatch = QUANTITY_PATTERNS.mixed.exec(str);
  if (mixedMatch?.[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    return { value: whole + num / denom, consumed: mixedMatch[0].length };
  }

  const fractionMatch = QUANTITY_PATTERNS.fraction.exec(str);
  if (fractionMatch?.[1] && fractionMatch[2]) {
    const num = parseInt(fractionMatch[1], 10);
    const denom = parseInt(fractionMatch[2], 10);
    return { value: num / denom, consumed: fractionMatch[0].length };
  }

  const unicodeMatch = QUANTITY_PATTERNS.unicode.exec(str);
  if (unicodeMatch?.[1]) {
    const fraction = UNICODE_FRACTIONS[unicodeMatch[1]];
    if (fraction !== undefined) {
      return { value: fraction, consumed: 1 };
    }
  }

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
  const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
  return singular;
}

function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

function parseIngredient(line: string): ParsedIngredient {
  let remaining = line.trim();
  let quantity: number | null = null;
  let unit: string | null = null;
  let preparation: string | null = null;
  let optional = false;
  let note: string | null = null;

  remaining = remaining.replace(/^[-•*]\s*/, '');

  if (/\(optional\)/i.test(remaining)) {
    optional = true;
    remaining = remaining.replace(/\(optional\)/i, '').trim();
  }

  const noteRegex = /\(([^)]+)\)/;
  const noteMatch = noteRegex.exec(remaining);
  if (noteMatch?.[1] && !noteMatch[1].toLowerCase().includes('optional')) {
    note = noteMatch[1];
    remaining = remaining.replace(noteMatch[0], '').trim();
  }

  const qtyResult = parseQuantity(remaining);
  if (qtyResult) {
    quantity = qtyResult.value;
    remaining = remaining.slice(qtyResult.consumed).trim();
  }

  const words = remaining.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() ?? '';
  if (firstWord && (UNITS.has(firstWord) || firstWord in UNIT_ALIASES)) {
    unit = UNIT_ALIASES[firstWord] ?? normalizeUnit(firstWord);
    remaining = words.slice(1).join(' ');
  }

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

// =========== Content Parser ===========

function getMonthNumber(month: string): number {
  const months: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  return months[month.toLowerCase()] ?? 1;
}

function parseWeekHeader(content: string): {
  weekNumber: number;
  startDate: string;
  endDate: string;
} | null {
  const headerRegex = /^#\s+Week\s+(\d+):\s+(\w+)\s+(\d+)-(\d+),\s+(\d{4})/m;
  const match = headerRegex.exec(content);
  if (!match) return null;

  const weekNumber = parseInt(match[1] ?? '0', 10);
  const month = match[2] ?? '';
  const startDay = match[3] ?? '1';
  const endDay = match[4] ?? '7';
  const year = match[5] ?? '2026';

  const monthNum = getMonthNumber(month);
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-${startDay.padStart(2, '0')}`;
  const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${endDay.padStart(2, '0')}`;

  return { weekNumber, startDate, endDate };
}

function parseTheme(content: string): string {
  const themeRegex = /^##\s+(.+)$/m;
  const match = themeRegex.exec(content);
  return match?.[1]?.trim() ?? '';
}

function parseStorageInfo(text: string): {
  days: number | null;
  notes: string | null;
} {
  const storageRegex = /\*\*Storage:\*\*\s*(\d+)\s*days?\s*(.*)/i;
  const match = storageRegex.exec(text);
  if (match) {
    return {
      days: parseInt(match[1] ?? '0', 10),
      notes: match[2]?.trim() ?? null,
    };
  }
  return { days: null, notes: null };
}

function parseYield(text: string): string | null {
  const yieldRegex = /\*\*Yield:\*\*\s*(.+?)(?:\s*\||\s*$)/;
  const match = yieldRegex.exec(text);
  return match?.[1]?.trim() ?? null;
}

function extractRecipeSections(content: string): string[] {
  const sections = content.split(/(?=^####\s+)/m);
  return sections.filter((s) => s.startsWith('####'));
}

function determineMealTypes(category: string, name: string): string[] {
  const lower = name.toLowerCase();
  const catLower = category.toLowerCase();

  if (catLower.includes('breakfast') || lower.includes('oat')) {
    return ['breakfast'];
  }
  if (catLower.includes('snack') || lower.includes('hummus') || lower.includes('energy ball')) {
    return ['snack'];
  }
  if (
    catLower.includes('sauce') ||
    catLower.includes('dressing') ||
    lower.includes('dressing') ||
    lower.includes('crema')
  ) {
    return ['lunch', 'dinner'];
  }
  if (catLower.includes('grain') || catLower.includes('protein')) {
    return ['lunch', 'dinner'];
  }

  return ['lunch', 'dinner'];
}

function extractTags(category: string, name: string, content: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase() + ' ' + content.toLowerCase();

  if (category.toLowerCase().includes('grain')) tags.push('grain');
  if (category.toLowerCase().includes('protein')) tags.push('protein');
  if (category.toLowerCase().includes('sauce')) tags.push('sauce');
  if (category.toLowerCase().includes('breakfast')) tags.push('breakfast');
  if (category.toLowerCase().includes('snack')) tags.push('snack');

  if (lower.includes('mexican') || lower.includes('taco')) {
    tags.push('mexican');
  }
  if (lower.includes('mediterranean') || lower.includes('greek') || lower.includes('tzatziki')) {
    tags.push('mediterranean');
  }
  if (lower.includes('quick') || lower.includes('easy')) tags.push('quick');
  if (lower.includes('no-cook') || lower.includes('raw')) tags.push('no-cook');

  return [...new Set(tags)];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRecipeSection(
  section: string,
  category: string,
  weekNumber: number
): SeedRecipe | null {
  const lines = section.split('\n');

  const nameMatch = /^####\s+(.+)$/.exec(lines[0] ?? '');
  if (!nameMatch) return null;

  const name = nameMatch[1].trim();
  const id = `w${String(weekNumber)}-${slugify(name)}`;

  let yieldValue: string | null = null;
  let storageDays: number | null = null;
  let storageNotes: string | null = null;

  for (const line of lines.slice(1, 10)) {
    if (line.includes('**Yield:**') || line.includes('**Storage:**')) {
      yieldValue = parseYield(line) ?? yieldValue;
      const storage = parseStorageInfo(line);
      storageDays = storage.days ?? storageDays;
      storageNotes = storage.notes ?? storageNotes;
    }
  }

  const ingredientsStart = lines.findIndex((l) => l.trim() === '**Ingredients:**');
  const instructionsStart = lines.findIndex((l) => l.trim() === '**Instructions:**');

  const ingredients: SeedIngredient[] = [];
  if (ingredientsStart !== -1) {
    const end = instructionsStart !== -1 ? instructionsStart : lines.length;
    let order = 0;
    for (let i = ingredientsStart + 1; i < end; i++) {
      const line = lines[i]?.trim() ?? '';
      if (line.startsWith('-')) {
        const parsed = parseIngredient(line);
        ingredients.push({
          ...parsed,
          category: categorizeIngredient(parsed.name),
          display_order: order++,
        });
      }
    }
  }

  const instructions: string[] = [];
  if (instructionsStart !== -1) {
    for (let i = instructionsStart + 1; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';
      if (!line) continue;
      if (line.startsWith('---')) break;
      if (line.startsWith('**Use in:**')) break;

      const instructionMatch = /^\d+\.\s+(.+)$/.exec(line);
      if (instructionMatch) {
        instructions.push(instructionMatch[1].trim());
      }
    }
  }

  const mealTypes = determineMealTypes(category, name);
  const tags = extractTags(category, name, section);

  return {
    id,
    name,
    description: `${category} component`,
    servings: 4,
    prep_time_minutes: null,
    cook_time_minutes: null,
    yield_amount: yieldValue,
    yield_unit: null,
    storage_days: storageDays,
    storage_instructions: storageNotes,
    source_week: weekNumber,
    ingredients,
    instructions,
    tags,
    meal_types: mealTypes,
  };
}

function extractCategorySections(content: string): { category: string; content: string }[] {
  const sections: { category: string; content: string }[] = [];

  const componentStart = content.indexOf('## Component Recipes');
  if (componentStart === -1) return sections;

  const componentEnd = content.indexOf('# Phase 3:', componentStart);
  const componentContent =
    componentEnd !== -1
      ? content.slice(componentStart, componentEnd)
      : content.slice(componentStart);

  const parts = componentContent.split(/(?=^###\s+[^#])/m);

  for (const part of parts) {
    const headerMatch = /^###\s+([^#\n]+)/.exec(part);
    if (headerMatch) {
      sections.push({
        category: headerMatch[1].trim(),
        content: part,
      });
    }
  }

  return sections;
}

function parseDailySchedule(content: string, startDate: string): SeedDay[] {
  const days: SeedDay[] = [];

  const tableRegex =
    /\|\s*Day\s*\|\s*Breakfast\s*\|\s*Lunch\s*\|\s*Dinner\s*\|\s*Snacks\s*\|[\s\S]*?(?=\n---|\n#|\n\n\n)/;
  const tableMatch = tableRegex.exec(content);
  if (!tableMatch) return days;

  const tableContent = tableMatch[0];
  const tableLines = tableContent.split('\n').filter((l) => l.includes('|'));

  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i] ?? '';
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;

    const dayMatch = /\*\*(\w+)\s+(\d+)\*\*/.exec(cells[0] ?? '');
    if (!dayMatch) continue;

    const dayOfWeek = dayMatch[1];
    const dayNumber = parseInt(dayMatch[2], 10);

    const start = new Date(startDate);
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + dayNumber - 1);
    const dateStr = dayDate.toISOString().split('T')[0] ?? '';

    const meals: SeedMeal[] = [];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (let j = 1; j <= 4; j++) {
      const recipeName = cells[j] ?? '';
      if (recipeName && recipeName !== '-') {
        meals.push({
          meal_type: mealTypes[j - 1] ?? 'snack',
          recipe_id: null, // Will be resolved later
          recipe_name: recipeName,
          display_order: j - 1,
        });
      }
    }

    days.push({
      day_number: dayNumber,
      date: dateStr,
      day_of_week: dayOfWeek,
      meals,
    });
  }

  return days;
}

function parsePrepTimeline(content: string): SeedPrepStep[] {
  const steps: SeedPrepStep[] = [];

  const tableRegex = /\|\s*Time\s*\|\s*Task\s*\|[\s\S]*?(?=\n---|\n#|\n\n\n)/;
  const tableMatch = tableRegex.exec(content);
  if (!tableMatch) return steps;

  const tableContent = tableMatch[0];
  const tableLines = tableContent.split('\n').filter((l) => l.includes('|'));

  let stepNumber = 0;
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i] ?? '';
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    const timeMatch = /(\d+):(\d+)/.exec(cells[0] ?? '');
    if (!timeMatch) continue;

    const hours = parseInt(timeMatch[1] ?? '0', 10);
    const minutes = parseInt(timeMatch[2] ?? '0', 10);
    const totalMinutes = hours * 60 + minutes;

    steps.push({
      step_number: stepNumber++,
      time_minutes: totalMinutes,
      description: cells[1] ?? '',
    });
  }

  return steps;
}

function parseWeekPlan(content: string): {
  weekNumber: number;
  theme: string;
  startDate: string;
  endDate: string;
  recipes: SeedRecipe[];
  prepSteps: SeedPrepStep[];
  days: SeedDay[];
} {
  const headerInfo = parseWeekHeader(content);

  const weekNumber = headerInfo?.weekNumber ?? 0;
  const startDate = headerInfo?.startDate ?? '';
  const endDate = headerInfo?.endDate ?? '';
  const theme = parseTheme(content);

  const recipes: SeedRecipe[] = [];
  const categorySections = extractCategorySections(content);

  for (const { category, content: sectionContent } of categorySections) {
    const recipeSections = extractRecipeSections(sectionContent);
    for (const recipeSection of recipeSections) {
      const recipe = parseRecipeSection(recipeSection, category, weekNumber);
      if (recipe) {
        recipes.push(recipe);
      }
    }
  }

  const days = parseDailySchedule(content, startDate);
  const prepSteps = parsePrepTimeline(content);

  return {
    weekNumber,
    theme,
    startDate,
    endDate,
    recipes,
    prepSteps,
    days,
  };
}

// =========== Main Script ===========

function main(): void {
  const contentDir = path.join(__dirname, '..', 'content');
  const outputDir = path.join(__dirname, '..', 'src', 'data');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const seedData: SeedData = {
    recipes: [],
    weeks: [],
  };

  // Process each week
  for (let weekNum = 1; weekNum <= 5; weekNum++) {
    const weekDir = path.join(contentDir, `week-${String(weekNum)}`);
    const planFile = path.join(weekDir, `week-${String(weekNum)}-plan.md`);

    if (!fs.existsSync(planFile)) {
      console.log(`Skipping week ${String(weekNum)}: file not found`);
      continue;
    }

    console.log(`Parsing week ${String(weekNum)}...`);
    const content = fs.readFileSync(planFile, 'utf-8');
    const parsed = parseWeekPlan(content);

    // Add recipes
    seedData.recipes.push(...parsed.recipes);

    // Create week entry
    const week: SeedWeek = {
      id: `week-${String(weekNum)}`,
      week_number: weekNum,
      title: `Week ${String(weekNum)}`,
      theme: parsed.theme,
      start_date: parsed.startDate,
      end_date: parsed.endDate,
      components: parsed.recipes.map((r) => ({
        recipe_id: r.id,
        component_type: r.tags[0] ?? 'other',
      })),
      prep_steps: parsed.prepSteps,
      days: parsed.days,
    };

    seedData.weeks.push(week);
  }

  // Write seed data
  const outputFile = path.join(outputDir, 'seed.json');
  fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2));

  console.log(`\nGenerated seed data:`);
  console.log(`  Recipes: ${String(seedData.recipes.length)}`);
  console.log(`  Weeks: ${String(seedData.weeks.length)}`);
  console.log(`\nOutput: ${outputFile}`);
}

main();
