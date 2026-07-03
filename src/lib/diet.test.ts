// Tests for diet classification helpers

import { describe, it, expect } from 'vitest';
import { combineDiets, dietFromCategory, isDiet, DIETS, DIET_LABELS } from './diet';

describe('dietFromCategory', () => {
  it('maps animal categories to the minimum diet that can eat them', () => {
    expect(dietFromCategory('meat-poultry')).toBe('omnivore');
    expect(dietFromCategory('seafood')).toBe('pescatarian');
    expect(dietFromCategory('dairy-eggs')).toBe('vegetarian');
  });

  it('defaults plant / unknown categories to vegan', () => {
    expect(dietFromCategory('produce')).toBe('vegan');
    expect(dietFromCategory('legumes')).toBe('vegan');
    expect(dietFromCategory('other')).toBe('vegan');
    expect(dietFromCategory('not-a-real-category')).toBe('vegan');
  });
});

describe('combineDiets', () => {
  it('returns vegan for an empty ingredient list', () => {
    expect(combineDiets([])).toBe('vegan');
  });

  it('returns the broadest (most animal-inclusive) diet', () => {
    expect(combineDiets(['vegan', 'vegan'])).toBe('vegan');
    expect(combineDiets(['vegan', 'vegetarian'])).toBe('vegetarian');
    expect(combineDiets(['vegetarian', 'pescatarian'])).toBe('pescatarian');
    expect(combineDiets(['pescatarian', 'omnivore', 'vegan'])).toBe('omnivore');
  });
});

describe('isDiet', () => {
  it('recognizes canonical diet names', () => {
    for (const diet of DIETS) {
      expect(isDiet(diet)).toBe(true);
    }
  });

  it('rejects non-diet strings', () => {
    expect(isDiet('gluten-free')).toBe(false);
    expect(isDiet('soy-free')).toBe(false);
    expect(isDiet('')).toBe(false);
  });
});

describe('DIET_LABELS', () => {
  it('has a label for every diet', () => {
    for (const diet of DIETS) {
      expect(DIET_LABELS[diet]).toBeTruthy();
    }
  });
});
