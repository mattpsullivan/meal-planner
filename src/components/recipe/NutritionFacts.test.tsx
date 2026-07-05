// Tests for the nutrition display components.
// Run with: pnpm test:run src/components/recipe/NutritionFacts.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NutritionInline, NutritionFacts, NutritionTotals } from './NutritionFacts';
import type { NutritionSummary } from '@/lib/nutrition/types';

function summary(kcal: number, p: number, c: number, f: number, coverage = 1): NutritionSummary {
  const m = { kcal, protein_g: p, carb_g: c, fat_g: f };
  return { per_serving: m, total: m, total_grams: 100, servings: 1, coverage };
}

describe('NutritionInline', () => {
  it('shows calories and macros when data is present', () => {
    render(<NutritionInline nutrition={summary(580, 33, 61, 23)} />);
    expect(screen.getByText(/580 kcal/)).toBeTruthy();
    expect(screen.getByText(/33P\/61C\/23F/)).toBeTruthy();
  });

  it('renders nothing without data or with zero calories', () => {
    const { container: a } = render(<NutritionInline nutrition={undefined} />);
    expect(a.firstChild).toBeNull();
    const { container: b } = render(<NutritionInline nutrition={summary(0, 0, 0, 0, 0)} />);
    expect(b.firstChild).toBeNull();
  });
});

describe('NutritionFacts', () => {
  it('renders a per-serving panel', () => {
    render(<NutritionFacts nutrition={summary(580, 33, 61, 23)} />);
    expect(screen.getByText(/Nutrition/)).toBeTruthy();
    expect(screen.getByText('580')).toBeTruthy();
    expect(screen.getByText('Protein')).toBeTruthy();
  });

  it('flags estimated data when coverage is below 1', () => {
    render(<NutritionFacts nutrition={summary(400, 20, 30, 10, 0.5)} />);
    expect(screen.getByText(/Estimated/)).toBeTruthy();
    expect(screen.getByText(/50% of ingredients/)).toBeTruthy();
  });

  it('renders nothing without data', () => {
    const { container } = render(<NutritionFacts nutrition={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('NutritionTotals', () => {
  it('sums per-serving nutrition across meals', () => {
    render(
      <NutritionTotals
        items={[summary(500, 30, 50, 20), summary(400, 20, 40, 15)]}
        label="Monday total"
      />
    );
    expect(screen.getByText('900')).toBeTruthy(); // 500 + 400 kcal
    expect(screen.getByText(/Monday total/)).toBeTruthy();
  });

  it('ignores meals without data and notes the partial count', () => {
    render(<NutritionTotals items={[summary(500, 30, 50, 20), undefined]} label="Day total" />);
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText(/Counts the 1 meal/)).toBeTruthy();
  });

  it('renders nothing when no meal has data', () => {
    const { container } = render(
      <NutritionTotals items={[undefined, undefined]} label="Day total" />
    );
    expect(container.firstChild).toBeNull();
  });
});
