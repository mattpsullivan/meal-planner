/**
 * Mealplan parsing utilities
 */
import type { Mealplan, ExportWeek } from './types.js';
export declare function parseTimeToMinutes(time: string): number;
export declare function recipePathToSlug(recipePath: string): string;
export declare function recipePathToId(recipePath: string): string;
export declare function parseMealplanFile(filePath: string): Mealplan;
export declare function mealplanToExportWeek(mealplan: Mealplan, recipeSlugMap: Map<string, string>): ExportWeek;
export declare function getReferencedRecipePaths(mealplan: Mealplan): Set<string>;
//# sourceMappingURL=mealplan.d.ts.map