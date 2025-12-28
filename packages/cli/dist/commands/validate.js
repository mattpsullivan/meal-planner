/**
 * Validate command - validates JSON export files against the schema
 */
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { validateMealplanExport } from '../lib/schema.js';
export const validateCommand = new Command('validate')
    .description('Validate a JSON export file')
    .argument('<json-file>', 'Path to the JSON export file')
    .option('--strict', 'Fail on warnings (missing optional fields)')
    .action((jsonFile, options) => {
    try {
        runValidate(jsonFile, options);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(2);
    }
});
function runValidate(jsonFile, options) {
    // Resolve file path
    const filePath = path.resolve(jsonFile);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    // Read and parse JSON
    let data;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
    }
    catch (e) {
        throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Validate
    const result = validateMealplanExport(data);
    // Output results
    if (result.errors.length > 0) {
        console.error(`\u2717 Invalid: ${jsonFile}`);
        console.error('\nErrors:');
        for (const error of result.errors) {
            console.error(`  - ${error}`);
        }
    }
    if (result.warnings.length > 0) {
        console.error('\nWarnings:');
        for (const warning of result.warnings) {
            console.error(`  - ${warning}`);
        }
    }
    if (result.valid && result.errors.length === 0) {
        console.log(`\u2713 Valid: ${jsonFile}`);
        if (result.stats) {
            console.log(`  - ${String(result.stats.recipeCount)} recipes`);
            console.log(`  - ${String(result.stats.weekCount)} week(s)`);
            console.log(`  - ${String(result.stats.prepStepCount)} prep steps`);
        }
    }
    // Exit with appropriate code
    if (!result.valid || result.errors.length > 0) {
        process.exit(1);
    }
    if (options.strict && result.warnings.length > 0) {
        console.error('\nStrict mode: treating warnings as errors');
        process.exit(1);
    }
}
//# sourceMappingURL=validate.js.map