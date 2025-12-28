/**
 * Cooklang parsing utilities
 */
import { Parser as CooklangParser } from '@cooklang/cooklang';
import type { ExportRecipe } from './types.js';
export declare function parseRecipeFile(filePath: string, parser: CooklangParser, recipesDir: string, recipeMap: Map<string, string>): ExportRecipe | null;
export declare function createParser(): CooklangParser;
export declare function findCookFiles(dir: string): string[];
//# sourceMappingURL=cooklang.d.ts.map