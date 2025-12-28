/**
 * JSON Schema validation for mealplan exports
 */
import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
// Handle ESM default exports - these are always defined
const Ajv = AjvModule.default;
const addFormats = addFormatsModule.default;
// JSON Schema for MealplanExport
const mealplanExportSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['version', 'exported_at', 'recipes', 'weeks'],
    properties: {
        version: {
            type: 'integer',
            const: 1,
        },
        exported_at: {
            type: 'string',
            format: 'date-time',
        },
        source: {
            type: 'string',
        },
        recipes: {
            type: 'array',
            items: {
                $ref: '#/definitions/recipe',
            },
        },
        weeks: {
            type: 'array',
            items: {
                $ref: '#/definitions/week',
            },
        },
    },
    definitions: {
        recipe: {
            type: 'object',
            required: ['id', 'name', 'servings', 'ingredients', 'instructions', 'tags', 'meal_types', 'recipe_type'],
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: ['string', 'null'] },
                servings: { type: 'integer', minimum: 1 },
                prep_time_minutes: { type: ['integer', 'null'] },
                cook_time_minutes: { type: ['integer', 'null'] },
                yield_amount: { type: ['string', 'null'] },
                yield_unit: { type: ['string', 'null'] },
                storage_days: { type: ['integer', 'null'] },
                storage_instructions: { type: ['string', 'null'] },
                ingredients: {
                    type: 'array',
                    items: { $ref: '#/definitions/ingredient' },
                },
                instructions: {
                    type: 'array',
                    items: { type: 'string' },
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                },
                meal_types: {
                    type: 'array',
                    items: { type: 'string' },
                },
                recipe_type: {
                    type: 'string',
                    enum: ['component', 'meal', 'standalone'],
                },
            },
        },
        ingredient: {
            type: 'object',
            required: ['name', 'category', 'display_order'],
            properties: {
                name: { type: 'string' },
                quantity: { type: ['number', 'null'] },
                unit: { type: ['string', 'null'] },
                preparation: { type: ['string', 'null'] },
                optional: { type: 'boolean' },
                note: { type: ['string', 'null'] },
                category: { type: 'string' },
                display_order: { type: 'integer' },
                source_recipe_id: { type: ['string', 'null'] },
            },
        },
        week: {
            type: 'object',
            required: ['week_number', 'name', 'components', 'prep_steps', 'days'],
            properties: {
                week_number: { type: 'integer', minimum: 1 },
                name: { type: 'string' },
                theme: { type: 'string' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
                components: {
                    type: 'array',
                    items: { $ref: '#/definitions/component' },
                },
                prep_steps: {
                    type: 'array',
                    items: { $ref: '#/definitions/prepStep' },
                },
                days: {
                    type: 'array',
                    items: { $ref: '#/definitions/day' },
                },
            },
        },
        component: {
            type: 'object',
            required: ['recipe_id', 'component_type'],
            properties: {
                recipe_id: { type: 'string' },
                component_type: { type: 'string' },
            },
        },
        prepStep: {
            type: 'object',
            required: ['step_number', 'time_minutes', 'description'],
            properties: {
                step_number: { type: 'integer' },
                time_minutes: { type: 'integer' },
                description: { type: 'string' },
                recipe_id: { type: ['string', 'null'] },
            },
        },
        day: {
            type: 'object',
            required: ['day_number', 'meals'],
            properties: {
                day_number: { type: 'integer' },
                date: { type: 'string' },
                day_of_week: { type: 'string' },
                meals: {
                    type: 'array',
                    items: { $ref: '#/definitions/meal' },
                },
            },
        },
        meal: {
            type: 'object',
            required: ['meal_type', 'recipe_name', 'display_order'],
            properties: {
                meal_type: { type: 'string' },
                recipe_id: { type: ['string', 'null'] },
                recipe_name: { type: 'string' },
                display_order: { type: 'integer' },
            },
        },
    },
};
export function validateMealplanExport(data) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(mealplanExportSchema);
    const valid = validate(data);
    const errors = [];
    const warnings = [];
    if (!valid && validate.errors) {
        for (const err of validate.errors) {
            errors.push(`${err.instancePath || '/'}: ${String(err.message)}`);
        }
    }
    // Additional semantic validation
    if (valid) {
        const export_ = data;
        // Check for duplicate recipe IDs
        const recipeIds = new Set();
        for (const recipe of export_.recipes) {
            if (recipeIds.has(recipe.id)) {
                errors.push(`Duplicate recipe ID: ${recipe.id}`);
            }
            recipeIds.add(recipe.id);
        }
        // Check that all referenced recipes exist
        for (const week of export_.weeks) {
            for (const component of week.components) {
                if (!recipeIds.has(component.recipe_id)) {
                    errors.push(`Week ${String(week.week_number)}: Component references missing recipe "${component.recipe_id}"`);
                }
            }
            for (const step of week.prep_steps) {
                if (step.recipe_id && !recipeIds.has(step.recipe_id)) {
                    warnings.push(`Week ${String(week.week_number)}: Prep step references missing recipe "${step.recipe_id}"`);
                }
            }
            for (const day of week.days) {
                for (const meal of day.meals) {
                    if (meal.recipe_id && !recipeIds.has(meal.recipe_id)) {
                        warnings.push(`Week ${String(week.week_number)}, Day ${String(day.day_number)}: Meal references missing recipe "${meal.recipe_id}"`);
                    }
                }
            }
        }
        // Check for recipes without servings
        for (const recipe of export_.recipes) {
            if (!recipe.servings) {
                warnings.push(`Recipe "${recipe.id}" is missing servings`);
            }
        }
    }
    // Calculate stats
    let stats;
    if (valid || errors.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const export_ = data;
        stats = {
            recipeCount: export_.recipes.length,
            weekCount: export_.weeks.length,
            prepStepCount: export_.weeks.reduce((sum, w) => sum + w.prep_steps.length, 0),
        };
    }
    return {
        valid: valid && errors.length === 0,
        errors,
        warnings,
        stats,
    };
}
//# sourceMappingURL=schema.js.map