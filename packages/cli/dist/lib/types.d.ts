/**
 * Types for the CLI tool and export format
 */
export interface ExportIngredient {
    name: string;
    quantity: number | null;
    unit: string | null;
    preparation: string | null;
    optional: boolean;
    note: string | null;
    category: string;
    display_order: number;
    source_recipe_id?: string | null;
}
export interface ExportRecipe {
    id: string;
    name: string;
    description: string | null;
    servings: number;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    yield_amount: string | null;
    yield_unit: string | null;
    storage_days: number | null;
    storage_instructions: string | null;
    ingredients: ExportIngredient[];
    instructions: string[];
    tags: string[];
    meal_types: string[];
    recipe_type: 'component' | 'meal' | 'standalone';
}
export interface ExportComponent {
    recipe_id: string;
    component_type: string;
}
export interface ExportPrepStep {
    step_number: number;
    time_minutes: number;
    description: string;
    recipe_id?: string | null;
}
export interface ExportMeal {
    meal_type: string;
    recipe_id: string | null;
    recipe_name: string;
    display_order: number;
}
export interface ExportDay {
    day_number: number;
    date: string;
    day_of_week: string;
    meals: ExportMeal[];
}
export interface ExportWeek {
    week_number: number;
    name: string;
    theme: string;
    start_date: string;
    end_date: string;
    components: ExportComponent[];
    prep_steps: ExportPrepStep[];
    days: ExportDay[];
}
export interface MealplanExport {
    version: 1;
    exported_at: string;
    source?: string;
    recipes: ExportRecipe[];
    weeks: ExportWeek[];
}
export interface MealEntry {
    recipe?: string;
    description?: string;
    note?: string;
}
export interface MealplanDay {
    day: number;
    date?: string;
    day_name?: string;
    is_prep_day?: boolean;
    meals: {
        breakfast?: MealEntry | null;
        lunch?: MealEntry | null;
        dinner?: MealEntry | null;
        snacks?: MealEntry[];
    };
}
export interface MealplanPrepStep {
    time: string;
    task: string;
    recipe?: string;
    duration?: number;
    note?: string;
}
export interface Mealplan {
    id: string;
    week_number: number;
    year: number;
    name?: string;
    theme?: string;
    start_date?: string;
    end_date?: string;
    prep_time_total?: number;
    components?: Record<string, string[]>;
    days: MealplanDay[];
    prep_timeline?: MealplanPrepStep[];
}
export interface CooklangQuantityFraction {
    whole?: number;
    num?: number;
    den?: number;
    err?: number;
}
export interface CooklangQuantity {
    value?: {
        value?: {
            value?: number | CooklangQuantityFraction;
        };
    };
    unit?: string;
}
export interface CooklangIngredient {
    name: string;
    quantity?: CooklangQuantity;
    reference?: {
        components?: string[];
    } | null;
    modifiers?: string;
}
export interface CooklangStepItem {
    type: string;
    value?: string;
    index?: number;
}
export interface CooklangStep {
    type: string;
    value?: {
        items?: CooklangStepItem[];
        number?: number;
    };
}
export interface CooklangSection {
    name?: string | null;
    content?: CooklangStep[];
}
export interface CooklangResult {
    metadata: {
        title?: string;
        tags?: string | string[];
        servings?: number;
        cuisine?: string;
        custom?: Record<string, string>;
    };
    recipe: {
        ingredients: CooklangIngredient[];
        sections: CooklangSection[];
        cookware?: CooklangCookware[];
        timers?: CooklangTimer[];
    };
}
export interface CooklangCookware {
    name?: string | null;
}
export interface CooklangTimer {
    name?: string | null;
    quantity?: CooklangQuantity & {
        unit?: string | null;
    };
}
//# sourceMappingURL=types.d.ts.map