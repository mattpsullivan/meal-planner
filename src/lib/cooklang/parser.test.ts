/**
 * Tests for Cooklang parser integration
 * Using @cooklang/cooklang (WASM-powered official parser)
 *
 * We use STANDARD Cooklang with no custom extensions.
 * Semantic meaning (recipe type, category) is inferred from directory structure.
 *
 * API Structure:
 * parser.parse(source) returns:
 * {
 *   recipe: { ingredients, cookware, timers, sections, ... },
 *   metadata: { title, tags, servings, cuisine, ... },
 *   report: string (parsing errors/warnings)
 * }
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Parser } from '@cooklang/cooklang';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cooklang Parser', () => {
  let parser: Parser;

  beforeAll(() => {
    parser = new Parser();
  });

  describe('basic parsing', () => {
    it('parses a simple recipe', () => {
      const source = `
>> title: Simple Test

Add @salt{1%tsp} to the @water{2%cups}.
      `.trim();

      const result = parser.parse(source);

      expect(result.metadata.title).toBe('Simple Test');
      expect(result.recipe.ingredients).toHaveLength(2);
      expect(result.recipe.ingredients[0]?.name).toBe('salt');
      expect(result.recipe.ingredients[1]?.name).toBe('water');
    });

    it('extracts quantities and units', () => {
      const source = `Add @flour{2%cups} and @sugar{1/2%cup}.`;
      const result = parser.parse(source);

      expect(result.recipe.ingredients).toHaveLength(2);

      // Check flour
      const flour = result.recipe.ingredients.find((i) => i.name === 'flour');
      expect(flour).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((flour?.quantity?.value as any)?.value?.value).toBe(2);
      expect(flour?.quantity?.unit).toBe('cups');

      // Check sugar (fraction)
      const sugar = result.recipe.ingredients.find((i) => i.name === 'sugar');
      expect(sugar).toBeDefined();
      expect(sugar?.quantity?.unit).toBe('cup');
    });

    it('handles cookware', () => {
      const source = `Mix in #bowl{} and transfer to #baking pan{}.`;
      const result = parser.parse(source);

      expect(result.recipe.cookware).toHaveLength(2);
      expect(result.recipe.cookware.map((c) => c.name)).toContain('bowl');
      expect(result.recipe.cookware.map((c) => c.name)).toContain('baking pan');
    });

    it('handles timers', () => {
      const source = `Bake for ~{30%minutes} until golden.`;
      const result = parser.parse(source);

      expect(result.recipe.timers).toHaveLength(1);
      expect(result.recipe.timers[0]?.quantity?.unit).toBe('minutes');
    });
  });

  describe('metadata parsing', () => {
    it('parses standard metadata fields', () => {
      const source = `
>> title: Test Recipe
>> tags: vegan, gluten-free
>> servings: 4
>> cuisine: Mediterranean

Mix @flour{2%cups} with @water{1%cup}.
      `.trim();

      const result = parser.parse(source);

      expect(result.metadata.title).toBe('Test Recipe');
      expect(result.metadata.servings).toBe(4);
      expect(result.metadata.cuisine).toBe('Mediterranean');
    });

    it('parses storage metadata as custom fields', () => {
      const source = `
>> title: Test Recipe
>> storage_days: 5
>> storage_method: refrigerated
>> reheat: Microwave with splash of water

Mix @flour{2%cups} with @water{1%cup}.
      `.trim();

      const result = parser.parse(source);

      expect(result.metadata.title).toBe('Test Recipe');
      // Non-standard fields go to metadata.custom as strings
      expect(result.metadata.custom['storage_days']).toBe('5');
      expect(result.metadata.custom['storage_method']).toBe('refrigerated');
      expect(result.metadata.custom['reheat']).toBe('Microwave with splash of water');
    });
  });

  describe('sections', () => {
    it('parses sections (named recipe parts)', () => {
      const source = `
>> title: Multi-section Recipe

== Prep

Dice @onion{1} and mince @garlic{3%cloves}.

== Cook

Heat @oil{2%tbsp} in #pan{}.
Add vegetables and cook ~{5%minutes}.
      `.trim();

      const result = parser.parse(source);

      // Sections should be in recipe.sections
      expect(result.recipe.sections).toBeDefined();
      expect(result.recipe.sections.length).toBe(2);
      expect(result.recipe.sections[0]?.name).toBe('Prep');
      expect(result.recipe.sections[1]?.name).toBe('Cook');
    });
  });

  describe('recipe references (sub-recipes)', () => {
    it('parses recipe references with path info in reference field', () => {
      const source = `
>> title: Assembly Recipe

Add @./components/rice{1%cup} to bowl.
Top with @./components/beans{1/2%cup}.
      `.trim();

      const result = parser.parse(source);

      // Ingredients have the name stripped of path
      expect(result.recipe.ingredients).toHaveLength(2);
      expect(result.recipe.ingredients[0]?.name).toBe('rice');
      expect(result.recipe.ingredients[1]?.name).toBe('beans');

      // Path info is in the reference field
      expect(result.recipe.ingredients[0]?.reference).toBeDefined();
      expect(result.recipe.ingredients[0]?.reference?.components).toContain('components');
      expect(result.recipe.ingredients[1]?.reference?.components).toContain('components');
    });
  });
});

describe('Cooklang file parsing', () => {
  let parser: Parser;

  beforeAll(() => {
    parser = new Parser();
  });

  it('parses cilantro-lime-rice.cook', () => {
    const recipePath = join(process.cwd(), 'recipes/components/grains/cilantro-lime-rice.cook');
    const source = readFileSync(recipePath, 'utf-8');
    const result = parser.parse(source);

    // Check standard metadata
    expect(result.metadata.title).toBe('Cilantro-Lime Rice');
    expect(result.metadata.cuisine).toBe('Mexican');
    expect(result.metadata.servings).toBe(4);

    // Check storage metadata (custom fields, values are strings)
    expect(result.metadata.custom['storage_days']).toBe('5');
    expect(result.metadata.custom['storage_method']).toBe('refrigerated');

    // Check ingredients
    expect(result.recipe.ingredients.length).toBeGreaterThan(0);
    const rice = result.recipe.ingredients.find((i) => i.name.includes('rice'));
    expect(rice).toBeDefined();

    const cilantro = result.recipe.ingredients.find((i) => i.name.includes('cilantro'));
    expect(cilantro).toBeDefined();
  });

  it('parses mediterranean-grain-bowl.cook (meal with references)', () => {
    const recipePath = join(process.cwd(), 'recipes/meals/bowls/mediterranean-grain-bowl.cook');
    const source = readFileSync(recipePath, 'utf-8');
    const result = parser.parse(source);

    // Check metadata
    expect(result.metadata.title).toBe('Mediterranean Grain Bowl');
    expect(result.metadata.cuisine).toBe('Mediterranean');

    // Recipe type is NOT in metadata - it's inferred from path
    // (recipes/meals/ = meal, recipes/components/ = component)

    // Should have both component references and fresh ingredients
    expect(result.recipe.ingredients.length).toBeGreaterThan(0);

    // Check for component references (have reference field with components array)
    const componentRefs = result.recipe.ingredients.filter(
      (i) => i.reference !== null && i.reference.components.length > 0
    );
    expect(componentRefs.length).toBeGreaterThan(0);

    // Check that quinoa is a reference to components/grains
    const quinoa = result.recipe.ingredients.find((i) => i.name.includes('quinoa'));
    expect(quinoa?.reference?.components).toContain('grains');

    // Check for fresh ingredients (no reference field)
    const cucumber = result.recipe.ingredients.find((i) => i.name === 'cucumber');
    expect(cucumber).toBeDefined();
    expect(cucumber?.reference).toBeNull();

    const olives = result.recipe.ingredients.find((i) => i.name.includes('olives'));
    expect(olives).toBeDefined();
  });

  it('extracts all ingredients with quantities', () => {
    const recipePath = join(
      process.cwd(),
      'recipes/components/proteins/spiced-mediterranean-chickpeas.cook'
    );
    const source = readFileSync(recipePath, 'utf-8');
    const result = parser.parse(source);

    // Check that we have ingredients with proper structure
    const chickpeas = result.recipe.ingredients.find((i) => i.name.includes('chickpeas'));
    expect(chickpeas).toBeDefined();
    expect(chickpeas?.quantity?.value).toBeDefined();
    expect(chickpeas?.quantity?.unit).toBe('cans');
  });

  it('infers recipe type from directory path', () => {
    // This test documents how we derive recipe type from path
    const componentPath = 'recipes/components/grains/cilantro-lime-rice.cook';
    const mealPath = 'recipes/meals/bowls/mediterranean-grain-bowl.cook';

    // Component: path contains 'components/'
    expect(componentPath.includes('components/')).toBe(true);

    // Meal: path contains 'meals/'
    expect(mealPath.includes('meals/')).toBe(true);

    // Category from subdirectory
    expect(componentPath.split('/')[2]).toBe('grains');
    expect(mealPath.split('/')[2]).toBe('bowls');
  });
});
