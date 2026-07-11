# Testing Architecture

This document describes the testing framework setup and best practices for the Meal Planner application.

## Overview

The project uses a three-tier testing strategy:

| Layer | Framework | Purpose | Location |
|-------|-----------|---------|----------|
| **Unit** | Vitest | Functions, utilities, hooks | `src/**/*.test.ts` |
| **Component** | Vitest + React Testing Library | React components | `src/**/*.test.tsx` |
| **E2E** | Playwright | Full browser testing | `e2e/*.spec.ts` |

## Quick Start

```bash
# Run unit/component tests in watch mode
pnpm test

# Run all unit/component tests once
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Framework Choices

### Why Vitest over Jest?

1. **Native Vite integration** - Shares `vite.config.ts`, no duplicate config
2. **Zero-config TypeScript** - Works out of the box, no `ts-jest` needed
3. **4-20x faster** in watch mode due to HMR-based test reloading
4. **ESM native** - Matches project's `"type": "module"`
5. **Jest-compatible API** - Easy migration from Jest projects

### Why Playwright for E2E?

1. **Industry-leading** - Surpassed Selenium in 2025 GitHub usage
2. **Auto-waiting** - Built-in element waiting reduces flaky tests
3. **Cross-browser** - Chromium, Firefox, WebKit support
4. **Trace viewer** - Powerful debugging with screenshots and network logs
5. **Network mocking** - Test without live backend dependencies

## Configuration Files

- `vitest.config.ts` - Vitest configuration (merges with vite.config.ts)
- `playwright.config.ts` - Playwright E2E configuration
- `src/test/setup.ts` - Global test setup (jest-dom matchers, cleanup)

## Writing Tests

### Unit Tests

```typescript
// src/utils/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate('2026-01-01')).toBe('January 1, 2026');
  });
});
```

### Component Tests

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('displays homepage content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Meal Planner' })).toBeVisible();
});
```

## Best Practices

### General

- **Test behavior, not implementation** - Focus on what users see/do
- **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
- **Isolate tests** - Each test should be independent
- **Descriptive names** - Test names should explain expected behavior

### React Testing Library

- Use `screen` for queries (not destructuring from `render`)
- Use `userEvent` over `fireEvent` for realistic interactions
- Avoid testing internal state - test rendered output
- Use `findBy*` for async elements, `getBy*` for sync

### Playwright

- Use `page.getByRole()` for accessibility-friendly selectors
- Rely on auto-waiting instead of explicit waits
- Use `expect().toBeVisible()` over `expect().toHaveCount()`
- Mock network requests for predictable tests

## Directory Structure

```
/workspace
├── src/
│   ├── components/
│   │   └── Button/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx    # Component test
│   ├── hooks/
│   │   └── useWeeks.test.ts       # Hook test
│   ├── db/
│   │   └── migrations.test.ts     # Unit test
│   └── test/
│       └── setup.ts               # Global setup
├── e2e/
│   ├── homepage.spec.ts           # E2E test
│   └── week-navigation.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

## Testing TanStack Query Hooks

The project uses TanStack Query for data fetching. Here's how to test hooks that use `useQuery` and `useMutation`.

### Test Utilities

Use the test utilities in `src/test/testUtils.tsx`:

```typescript
import { createWrapper, createTestQueryClient } from '@/test/testUtils';
```

### Testing Query Hooks

```typescript
// src/hooks/useWeeks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeks } from './useWeeks';
import { createWrapper } from '@/test/testUtils';
import * as weeksApi from '@/api/weeks';

// Mock the database hook (required for hooks that check isReady)
vi.mock('./useDatabase', () => ({
  useDatabase: () => ({ isReady: true, error: null }),
}));

// Mock the API module
vi.mock('@/api/weeks');

describe('useWeeks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    vi.mocked(weeksApi.getAllWeeks).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useWeeks(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns data on success', async () => {
    const mockData = [{ id: 1, name: 'Week 1' }];
    vi.mocked(weeksApi.getAllWeeks).mockResolvedValue(mockData);

    const { result } = renderHook(() => useWeeks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('returns error on failure', async () => {
    const error = new Error('Failed');
    vi.mocked(weeksApi.getAllWeeks).mockRejectedValue(error);

    const { result } = renderHook(() => useWeeks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
```

### Testing Mutation Hooks

For hooks with mutations (like `useGroceryList`), test optimistic updates:

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/testUtils';

describe('mutation with optimistic update', () => {
  it('applies optimistic update immediately', async () => {
    const queryClient = createTestQueryClient();

    // Pre-populate cache
    queryClient.setQueryData(['groceryLists', { weekId: 1 }], {
      id: 1,
      items: [{ id: 1, name: 'Tofu', checked: false }],
    });

    // Test the optimistic update logic
    // ...
  });
});
```

### Query Key Testing

Test that query keys are correctly structured:

```typescript
import { queryKeys } from '@/lib/queryClient';

describe('query keys', () => {
  it('uses correct structure', () => {
    expect(queryKeys.weeks).toEqual(['weeks']);
    expect(queryKeys.week(1)).toEqual(['weeks', 1]);
    expect(queryKeys.weekByNumber(5, 2026)).toEqual(['weeks', { weekNumber: 5, year: 2026 }]);
  });
});
```

### Best Practices for TanStack Query Tests

1. **Create fresh QueryClient per test** - Use `createWrapper()` which creates isolated clients
2. **Mock the database hook** - Return `{ isReady: true }` to enable queries
3. **Use `waitFor` for async assertions** - Wait for `isSuccess` or `isError` states
4. **Test disabled states** - Verify queries don't run when `enabled: false`
5. **Mock at the API layer** - Mock `@/api/*` functions, not TanStack Query internals
6. **Test error states** - Verify error handling with `mockRejectedValue`

## Coverage

Run `pnpm test:coverage` to generate coverage reports:

- **Text** - Console output
- **HTML** - `coverage/` directory (open `index.html`)
- **JSON** - For CI integration

Target coverage thresholds (recommended):
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## CI Integration

Example GitHub Actions workflow:

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'pnpm'
    - run: pnpm install
    - run: pnpm test:run
    - run: pnpm exec playwright install chromium
    - run: pnpm test:e2e
```
