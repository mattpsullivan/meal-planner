/**
 * Mealplan parsing utilities
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
// =========== Parsing Utilities ===========
export function parseTimeToMinutes(time) {
    const parts = time.split(':').map((n) => parseInt(n, 10));
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    return hours * 60 + minutes;
}
export function recipePathToSlug(recipePath) {
    // Convert "components/grains/rice.cook" to "rice"
    const fileName = path.basename(recipePath, '.cook');
    return fileName;
}
export function recipePathToId(recipePath) {
    // Keep full path but without .cook extension for unique identification
    return recipePath.replace(/\.cook$/, '');
}
export function parseMealplanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Remove YAML-style comments that start with #
    const cleanContent = content
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
    return parseYaml(cleanContent);
}
function extractMealsFromDay(day, recipeSlugMap) {
    const meals = [];
    let order = 0;
    const addMeal = (mealType, entry) => {
        if (!entry)
            return;
        const recipeId = entry.recipe
            ? (recipeSlugMap.get(recipePathToId(entry.recipe)) ??
                recipePathToSlug(entry.recipe))
            : null;
        const recipeName = entry.recipe
            ? recipePathToSlug(entry.recipe).replace(/-/g, ' ')
            : (entry.description ?? '');
        meals.push({
            meal_type: mealType,
            recipe_id: recipeId,
            recipe_name: recipeName,
            display_order: order++,
        });
    };
    addMeal('breakfast', day.meals.breakfast);
    addMeal('lunch', day.meals.lunch);
    addMeal('dinner', day.meals.dinner);
    if (day.meals.snacks) {
        for (const snack of day.meals.snacks) {
            addMeal('snack', snack);
        }
    }
    return meals;
}
export function mealplanToExportWeek(mealplan, recipeSlugMap) {
    // Convert components to ExportComponent format
    const components = [];
    if (mealplan.components) {
        for (const [category, recipes] of Object.entries(mealplan.components)) {
            for (const recipePath of recipes) {
                const recipeId = recipeSlugMap.get(recipePathToId(recipePath)) ??
                    recipePathToSlug(recipePath);
                components.push({
                    recipe_id: recipeId,
                    component_type: category,
                });
            }
        }
    }
    // Convert prep timeline
    const prepSteps = (mealplan.prep_timeline ?? []).map((step, idx) => {
        // Look up recipe ID if a recipe is referenced
        let recipeId = null;
        if (step.recipe) {
            recipeId =
                recipeSlugMap.get(recipePathToId(step.recipe)) ??
                    recipePathToSlug(step.recipe);
        }
        return {
            step_number: idx,
            time_minutes: parseTimeToMinutes(step.time),
            description: step.task,
            recipe_id: recipeId,
        };
    });
    // Convert days
    const days = mealplan.days.map((day) => ({
        day_number: day.day,
        date: day.date ?? '',
        day_of_week: day.day_name ?? '',
        meals: extractMealsFromDay(day, recipeSlugMap),
    }));
    return {
        week_number: mealplan.week_number,
        name: mealplan.name ?? `Week ${String(mealplan.week_number)}`,
        theme: mealplan.theme ?? '',
        start_date: mealplan.start_date ?? '',
        end_date: mealplan.end_date ?? '',
        components,
        prep_steps: prepSteps,
        days,
    };
}
export function getReferencedRecipePaths(mealplan) {
    const paths = new Set();
    // Collect from components
    if (mealplan.components) {
        for (const recipes of Object.values(mealplan.components)) {
            for (const recipePath of recipes) {
                paths.add(recipePath);
            }
        }
    }
    // Collect from days
    for (const day of mealplan.days) {
        const meals = day.meals;
        if (meals.breakfast?.recipe)
            paths.add(meals.breakfast.recipe);
        if (meals.lunch?.recipe)
            paths.add(meals.lunch.recipe);
        if (meals.dinner?.recipe)
            paths.add(meals.dinner.recipe);
        if (meals.snacks) {
            for (const snack of meals.snacks) {
                if (snack.recipe)
                    paths.add(snack.recipe);
            }
        }
    }
    // Collect from prep timeline
    if (mealplan.prep_timeline) {
        for (const step of mealplan.prep_timeline) {
            if (step.recipe)
                paths.add(step.recipe);
        }
    }
    return paths;
}
//# sourceMappingURL=mealplan.js.map