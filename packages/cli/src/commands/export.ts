/**
 * Export command - converts .mealplan files to JSON export format
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createParser, findCookFiles, parseRecipeFile } from '../lib/cooklang.js';
import {
  parseMealplanFile,
  mealplanToExportWeek,
  getReferencedRecipePaths,
} from '../lib/mealplan.js';
import type { MealplanExport, ExportRecipe } from '../lib/types.js';

interface ExportOptions {
  output?: string;
  recipes?: string;
  pretty?: boolean;
}

export const exportCommand = new Command('export')
  .description('Convert a .mealplan file to JSON export format')
  .argument('<mealplan-file>', 'Path to the .mealplan file')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('-r, --recipes <dir>', 'Base directory for recipe files (default: auto-detect)')
  .option('--pretty', 'Pretty-print JSON output')
  .action((mealplanFile: string, options: ExportOptions) => {
    try {
      runExport(mealplanFile, options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function runExport(mealplanFile: string, options: ExportOptions): void {
  // Resolve mealplan file path
  const mealplanPath = path.resolve(mealplanFile);
  if (!fs.existsSync(mealplanPath)) {
    throw new Error(`Mealplan file not found: ${mealplanPath}`);
  }

  // Auto-detect recipes directory if not specified
  let recipesDir: string;
  if (options.recipes) {
    recipesDir = path.resolve(options.recipes);
  } else {
    // Try to find recipes directory relative to mealplan file
    // Assume structure: recipes/plans/week-1.mealplan -> recipes/
    let searchDir = path.dirname(mealplanPath);
    while (searchDir !== path.dirname(searchDir)) {
      const potentialRecipesDir = path.join(searchDir, 'components');
      if (fs.existsSync(potentialRecipesDir)) {
        recipesDir = searchDir;
        break;
      }
      // Also check if current dir has components/meals structure
      if (
        fs.existsSync(path.join(searchDir, 'components')) ||
        fs.existsSync(path.join(searchDir, 'meals'))
      ) {
        recipesDir = searchDir;
        break;
      }
      searchDir = path.dirname(searchDir);
    }
    // Fallback: assume recipes dir is parent of plans dir
    const plansDir = path.dirname(mealplanPath);
    if (path.basename(plansDir) === 'plans') {
      recipesDir = path.dirname(plansDir);
    } else {
      recipesDir = plansDir;
    }
  }

  if (!fs.existsSync(recipesDir)) {
    throw new Error(`Recipes directory not found: ${recipesDir}`);
  }

  console.error(`Using recipes directory: ${recipesDir}`);

  // Parse the mealplan
  const mealplan = parseMealplanFile(mealplanPath);
  console.error(`Parsed mealplan: ${mealplan.name ?? `Week ${String(mealplan.week_number)}`}`);

  // Get referenced recipe paths
  const referencedPaths = getReferencedRecipePaths(mealplan);
  console.error(`Found ${String(referencedPaths.size)} referenced recipes`);

  // Parse all recipes
  const parser = createParser();
  const recipeSlugMap = new Map<string, string>();
  const recipes: ExportRecipe[] = [];

  // First, parse all .cook files to build the slug map
  const allCookFiles = findCookFiles(recipesDir);
  console.error(`Found ${String(allCookFiles.length)} .cook files in recipes directory`);

  for (const cookFile of allCookFiles) {
    const relativePath = path.relative(recipesDir, cookFile);
    const relativePathWithoutExt = relativePath.replace(/\.cook$/, '');

    // Check if this recipe is referenced
    if (referencedPaths.has(relativePath) || referencedPaths.has(relativePathWithoutExt)) {
      const recipe = parseRecipeFile(cookFile, parser, recipesDir, recipeSlugMap);
      if (recipe) {
        recipes.push(recipe);
        console.error(`  Included: ${recipe.name} (${recipe.id})`);
      }
    } else {
      // Still add to slug map for reference resolution
      const slug = path.basename(cookFile, '.cook');
      recipeSlugMap.set(relativePathWithoutExt, slug);
      recipeSlugMap.set(relativePath, slug);
    }
  }

  // Convert mealplan to export week
  const week = mealplanToExportWeek(mealplan, recipeSlugMap);

  // Build export object
  const exportData: MealplanExport = {
    version: 1,
    exported_at: new Date().toISOString(),
    source: mealplan.name ?? `Week ${String(mealplan.week_number)}`,
    recipes,
    weeks: [week],
  };

  // Output
  const jsonOutput = options.pretty
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);

  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, jsonOutput);
    console.error(`\nExported to: ${outputPath}`);
    console.error(`  Recipes: ${String(recipes.length)}`);
    console.error(`  Weeks: 1`);
    console.error(`  Prep steps: ${String(week.prep_steps.length)}`);
  } else {
    // Output to stdout
    console.log(jsonOutput);
  }
}
