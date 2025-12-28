/**
 * Tests for .mealplan schema validation
 */

import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// Load the schema
const schemaPath = join(process.cwd(), 'schemas/mealplan.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as object;

// Setup AJV validator
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('Mealplan Schema', () => {
  describe('valid mealplans', () => {
    it('validates minimal mealplan', () => {
      const mealplan = {
        id: 'week-1',
        week_number: 1,
        year: 2026,
        days: [
          {
            day: 1,
            meals: {
              breakfast: { recipe: 'components/breakfast/oats.cook' },
              lunch: null,
              dinner: { recipe: 'meals/bowl.cook' },
            },
          },
        ],
      };

      const valid = validate(mealplan);
      expect(valid).toBe(true);
    });

    it('validates full mealplan with all fields', () => {
      const mealplan = {
        $schema: '../schemas/mealplan.schema.json',
        id: 'week-1',
        week_number: 1,
        year: 2026,
        name: 'Week 1: Mediterranean + Mexican',
        theme: 'Mediterranean + Mexican',
        start_date: '2026-01-01',
        end_date: '2026-01-07',
        prep_time_total: 150,
        components: {
          grains: [
            'components/grains/cilantro-lime-rice.cook',
            'components/grains/lemon-herb-quinoa.cook',
          ],
          proteins: ['components/proteins/chickpeas.cook'],
          sauces: ['components/sauces/tzatziki.cook'],
        },
        days: [
          {
            day: 1,
            date: '2026-01-01',
            day_name: 'Thursday',
            is_prep_day: true,
            meals: {
              breakfast: {
                recipe: 'meals/smoothie.cook',
                note: 'Blend while prepping',
              },
              lunch: {
                description: 'Prep-Day Avocado Toast',
                note: 'Eat while things are in the oven',
              },
              dinner: { recipe: 'meals/bowls/mediterranean-grain-bowl.cook' },
              snacks: [{ recipe: 'meals/hummus-and-veg.cook' }],
            },
          },
        ],
        prep_timeline: [
          {
            time: '0:00',
            task: 'Start quinoa',
            recipe: 'components/grains/lemon-herb-quinoa.cook',
            duration: 15,
          },
          {
            time: '0:05',
            task: 'Start lentils',
            duration: 25,
            note: 'Watch for boiling over',
          },
        ],
        grocery_additions: {
          produce: [
            { name: 'avocados', amount: 5, note: 'For tacos, bowls' },
            { name: 'limes', amount: 6 },
          ],
        },
      };

      const valid = validate(mealplan);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    it('validates real week-1.mealplan file', () => {
      const mealplanPath = join(process.cwd(), 'recipes/plans/week-1.mealplan');
      const content = readFileSync(mealplanPath, 'utf-8');
      const mealplan = parseYaml(content) as object;

      const valid = validate(mealplan);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });
  });

  describe('invalid mealplans', () => {
    it('rejects missing required fields', () => {
      const mealplan = {
        id: 'week-1',
        // Missing week_number, year, days
      };

      const valid = validate(mealplan);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.keyword === 'required')).toBe(true);
    });

    it('rejects invalid week number', () => {
      const mealplan = {
        id: 'week-1',
        week_number: 54, // Invalid: max is 53
        year: 2026,
        days: [{ day: 1, meals: {} }],
      };

      const valid = validate(mealplan);
      expect(valid).toBe(false);
    });

    it('rejects invalid recipe path', () => {
      const mealplan = {
        id: 'week-1',
        week_number: 1,
        year: 2026,
        days: [
          {
            day: 1,
            meals: {
              breakfast: { recipe: 'not-a-cook-file.txt' }, // Should end in .cook
            },
          },
        ],
      };

      const valid = validate(mealplan);
      expect(valid).toBe(false);
    });

    it('rejects invalid day number', () => {
      const mealplan = {
        id: 'week-1',
        week_number: 1,
        year: 2026,
        days: [
          {
            day: 8, // Invalid: max is 7
            meals: {},
          },
        ],
      };

      const valid = validate(mealplan);
      expect(valid).toBe(false);
    });

    it('rejects invalid time format in prep timeline', () => {
      const mealplan = {
        id: 'week-1',
        week_number: 1,
        year: 2026,
        days: [{ day: 1, meals: {} }],
        prep_timeline: [
          {
            time: '90 minutes', // Invalid format
            task: 'Do something',
          },
        ],
      };

      const valid = validate(mealplan);
      expect(valid).toBe(false);
    });
  });
});
