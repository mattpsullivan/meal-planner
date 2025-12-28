// Content parser for weekly meal plan markdown files
// Extracts recipes, meal schedules, and grocery lists

import type { MealType, IngredientCategory } from '@/types';
import { parseIngredient, categorizeIngredient } from './ingredient-parser';

// Types for parsed content
export interface ParsedWeek {
  weekNumber: number;
  title: string;
  theme: string;
  startDate: string;
  endDate: string;
  recipes: ParsedRecipe[];
  days: ParsedDay[];
  prepSteps: ParsedPrepStep[];
}

export interface ParsedRecipe {
  name: string;
  category: string; // e.g., "Grains", "Proteins", "Sauces"
  yield: string | null;
  storageDays: number | null;
  storageNotes: string | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: ParsedRecipeIngredient[];
  instructions: string[];
  usedIn: string[];
  tags: string[];
  mealTypes: MealType[];
}

export interface ParsedRecipeIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  optional: boolean;
  note: string | null;
  category: IngredientCategory;
}

export interface ParsedDay {
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  meals: ParsedMeal[];
}

export interface ParsedMeal {
  mealType: MealType;
  recipeName: string;
  assemblyNotes: string | null;
  cookTime: number | null;
}

export interface ParsedPrepStep {
  timeMinutes: number;
  description: string;
}

// Parse week header like "# Week 1: January 1-7, 2026"
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

  // Convert to ISO date format
  const monthNum = getMonthNumber(month);
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-${startDay.padStart(2, '0')}`;
  const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${endDay.padStart(2, '0')}`;

  return { weekNumber, startDate, endDate };
}

// Parse theme line like "## Mediterranean + Mexican"
function parseTheme(content: string): string {
  const themeRegex = /^##\s+(.+)$/m;
  const match = themeRegex.exec(content);
  return match?.[1]?.trim() ?? '';
}

// Parse storage info like "**Storage:** 5 days refrigerated"
function parseStorageInfo(text: string): {
  days: number | null;
  notes: string | null;
} {
  const storageRegex = /\*\*Storage:\*\*\s*(\d+)\s*days?\s*(.*)/i;
  const match = storageRegex.exec(text);
  if (match?.[1]) {
    return {
      days: parseInt(match[1], 10),
      notes: match[2]?.trim() ?? null,
    };
  }
  return { days: null, notes: null };
}

// Parse yield info like "**Yield:** ~4 cups"
function parseYield(text: string): string | null {
  const yieldRegex = /\*\*Yield:\*\*\s*(.+?)(?:\s*\||\s*$)/;
  const match = yieldRegex.exec(text);
  return match?.[1]?.trim() ?? null;
}

// Extract recipe sections from markdown
function extractRecipeSections(content: string): string[] {
  // Split on #### headers (recipe titles)
  const sections = content.split(/(?=^####\s+)/m);
  return sections.filter((s) => s.startsWith('####'));
}

// Parse a single recipe section
function parseRecipeSection(section: string, category: string): ParsedRecipe | null {
  const lines = section.split('\n');
  const firstLine = lines[0] ?? '';

  // Get recipe name from first line
  const nameMatch = /^####\s+(.+)$/.exec(firstLine);
  if (!nameMatch?.[1]) return null;

  const name = nameMatch[1].trim();

  // Find yield and storage line
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

  // Find ingredients section
  const ingredientsStart = lines.findIndex((l) => l.trim() === '**Ingredients:**');
  const instructionsStart = lines.findIndex((l) => l.trim() === '**Instructions:**');

  const ingredients: ParsedRecipeIngredient[] = [];
  if (ingredientsStart !== -1) {
    const end = instructionsStart !== -1 ? instructionsStart : lines.length;
    for (let i = ingredientsStart + 1; i < end; i++) {
      const line = lines[i]?.trim() ?? '';
      if (line.startsWith('-')) {
        const parsed = parseIngredient(line);
        ingredients.push({
          ...parsed,
          category: categorizeIngredient(parsed.name),
        });
      }
    }
  }

  // Find instructions
  const instructions: string[] = [];
  if (instructionsStart !== -1) {
    for (let i = instructionsStart + 1; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';
      if (!line) continue;
      if (line.startsWith('---')) break;
      if (line.startsWith('**Use in:**')) break;

      // Match numbered instructions
      const instructionMatch = /^\d+\.\s+(.+)$/.exec(line);
      if (instructionMatch?.[1]) {
        instructions.push(instructionMatch[1].trim());
      }
    }
  }

  // Find "Use in" suggestions
  const usedIn: string[] = [];
  const useInLine = lines.find((l) => l.startsWith('**Use in:**'));
  if (useInLine) {
    const items = useInLine.replace('**Use in:**', '').split(',');
    usedIn.push(...items.map((i) => i.trim()).filter(Boolean));
  }

  // Determine meal types based on category
  const mealTypes: MealType[] = determineMealTypes(category, name);

  // Extract tags from category and recipe content
  const tags = extractTags(category, name, section);

  return {
    name,
    category,
    yield: yieldValue,
    storageDays,
    storageNotes,
    prepTime: null,
    cookTime: null,
    ingredients,
    instructions,
    usedIn,
    tags,
    mealTypes,
  };
}

// Parse the daily meal schedule table
function parseDailySchedule(content: string): ParsedDay[] {
  const days: ParsedDay[] = [];

  // Find the daily schedule table
  const tableRegex =
    /\|\s*Day\s*\|\s*Breakfast\s*\|\s*Lunch\s*\|\s*Dinner\s*\|\s*Snacks\s*\|[\s\S]*?(?=\n---|\n#|\n\n\n)/;
  const tableMatch = tableRegex.exec(content);
  if (!tableMatch) return days;

  const tableContent = tableMatch[0];
  const tableLines = tableContent.split('\n').filter((l) => l.includes('|'));

  // Skip header and separator rows
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i] ?? '';
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;

    // Parse day cell like "**Thu 1**"
    const dayMatch = /\*\*(\w+)\s+(\d+)\*\*/.exec(cells[0] ?? '');
    if (!dayMatch?.[1] || !dayMatch[2]) continue;

    const dayOfWeek = dayMatch[1];
    const dayNumber = parseInt(dayMatch[2], 10);

    const meals: ParsedMeal[] = [
      {
        mealType: 'breakfast' as MealType,
        recipeName: cells[1] ?? '',
        assemblyNotes: null,
        cookTime: null,
      },
      {
        mealType: 'lunch' as MealType,
        recipeName: cells[2] ?? '',
        assemblyNotes: null,
        cookTime: null,
      },
      {
        mealType: 'dinner' as MealType,
        recipeName: cells[3] ?? '',
        assemblyNotes: null,
        cookTime: null,
      },
    ];

    // Add snack if present
    if (cells[4] && cells[4] !== '-') {
      meals.push({
        mealType: 'snack' as MealType,
        recipeName: cells[4],
        assemblyNotes: null,
        cookTime: null,
      });
    }

    days.push({
      dayNumber,
      date: '', // Will be filled in based on week start date
      dayOfWeek,
      meals,
    });
  }

  return days;
}

// Parse prep timeline
function parsePrepTimeline(content: string): ParsedPrepStep[] {
  const steps: ParsedPrepStep[] = [];

  // Find prep timeline table
  const tableRegex = /\|\s*Time\s*\|\s*Task\s*\|[\s\S]*?(?=\n---|\n#|\n\n\n)/;
  const tableMatch = tableRegex.exec(content);
  if (!tableMatch) return steps;

  const tableContent = tableMatch[0];
  const tableLines = tableContent.split('\n').filter((l) => l.includes('|'));

  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i] ?? '';
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    // Parse time like "0:00" or "1:30"
    const timeMatch = /(\d+):(\d+)/.exec(cells[0] ?? '');
    if (!timeMatch?.[1] || !timeMatch[2]) continue;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const totalMinutes = hours * 60 + minutes;

    steps.push({
      timeMinutes: totalMinutes,
      description: cells[1] ?? '',
    });
  }

  return steps;
}

// Extract category sections (### Grains, ### Proteins, etc.)
function extractCategorySections(content: string): { category: string; content: string }[] {
  const sections: { category: string; content: string }[] = [];

  // Find ## Component Recipes section
  const componentStart = content.indexOf('## Component Recipes');
  if (componentStart === -1) return sections;

  const componentEnd = content.indexOf('# Phase 3:', componentStart);
  const componentContent =
    componentEnd !== -1
      ? content.slice(componentStart, componentEnd)
      : content.slice(componentStart);

  // Split on ### headers
  const parts = componentContent.split(/(?=^###\s+[^#])/m);

  for (const part of parts) {
    const headerMatch = /^###\s+([^#\n]+)/.exec(part);
    if (headerMatch?.[1]) {
      sections.push({
        category: headerMatch[1].trim(),
        content: part,
      });
    }
  }

  return sections;
}

// Determine meal types based on category and name
function determineMealTypes(category: string, name: string): MealType[] {
  const lower = name.toLowerCase();
  const catLower = category.toLowerCase();

  if (catLower.includes('breakfast') || lower.includes('oat')) {
    return ['breakfast'];
  }
  if (catLower.includes('snack') || lower.includes('hummus')) {
    return ['snack'];
  }
  if (
    catLower.includes('sauce') ||
    catLower.includes('dressing') ||
    lower.includes('dressing') ||
    lower.includes('crema')
  ) {
    return ['lunch', 'dinner']; // Sauces used in main meals
  }
  if (catLower.includes('grain') || catLower.includes('protein')) {
    return ['lunch', 'dinner'];
  }

  return ['lunch', 'dinner'];
}

// Extract tags from recipe content
function extractTags(category: string, name: string, content: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase() + ' ' + content.toLowerCase();

  // Category-based tags
  if (category.toLowerCase().includes('grain')) tags.push('grain');
  if (category.toLowerCase().includes('protein')) tags.push('protein');
  if (category.toLowerCase().includes('sauce')) tags.push('sauce');
  if (category.toLowerCase().includes('breakfast')) tags.push('breakfast');
  if (category.toLowerCase().includes('snack')) tags.push('snack');

  // Content-based tags
  if (lower.includes('mexican') || lower.includes('taco')) {
    tags.push('mexican');
  }
  if (lower.includes('mediterranean') || lower.includes('greek') || lower.includes('tzatziki')) {
    tags.push('mediterranean');
  }
  if (lower.includes('quick') || lower.includes('easy')) tags.push('quick');
  if (lower.includes('no-cook') || lower.includes('raw')) tags.push('no-cook');

  return [...new Set(tags)]; // Remove duplicates
}

// Helper to get month number from name
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

// Main parser function
export function parseWeekPlan(content: string): ParsedWeek {
  const headerInfo = parseWeekHeader(content);
  const theme = parseTheme(content);

  const weekNumber = headerInfo?.weekNumber ?? 0;
  const startDate = headerInfo?.startDate ?? '';
  const endDate = headerInfo?.endDate ?? '';

  // Parse all recipes
  const recipes: ParsedRecipe[] = [];
  const categorySections = extractCategorySections(content);

  for (const { category, content: sectionContent } of categorySections) {
    const recipeSections = extractRecipeSections(sectionContent);
    for (const recipeSection of recipeSections) {
      const recipe = parseRecipeSection(recipeSection, category);
      if (recipe) {
        recipes.push(recipe);
      }
    }
  }

  // Parse daily schedule
  const days = parseDailySchedule(content);

  // Fill in dates for days
  if (startDate) {
    const start = new Date(startDate);
    for (const day of days) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + day.dayNumber - 1);
      day.date = dayDate.toISOString().split('T')[0] ?? '';
    }
  }

  // Parse prep timeline
  const prepSteps = parsePrepTimeline(content);

  return {
    weekNumber,
    title: `Week ${String(weekNumber)}`,
    theme,
    startDate,
    endDate,
    recipes,
    days,
    prepSteps,
  };
}
