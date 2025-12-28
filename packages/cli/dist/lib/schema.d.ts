/**
 * JSON Schema validation for mealplan exports
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    stats?: {
        recipeCount: number;
        weekCount: number;
        prepStepCount: number;
    };
}
export declare function validateMealplanExport(data: unknown): ValidationResult;
//# sourceMappingURL=schema.d.ts.map