# ADR 002: Testing Framework Selection

## Status

Accepted

## Date

2025-12-28

## Context

We need a comprehensive testing strategy for the Vegan Meal Prep application. The app is built with:
- React 19
- Vite 7
- TypeScript 5.7 (strict mode)
- wa-sqlite (WASM)

Key requirements:
- Fast feedback loops during development
- TypeScript support without additional configuration
- Component testing with React Testing Library
- End-to-end browser testing
- ESM module support

## Decision

We will use a three-tier testing stack:

1. **Vitest** for unit and integration tests
2. **React Testing Library** for component testing
3. **Playwright** for end-to-end tests

### Why Vitest over Jest?

| Criterion | Vitest | Jest |
|-----------|--------|------|
| Vite integration | Native (shares config) | Requires vite-jest |
| TypeScript | Zero-config | Requires ts-jest |
| ESM support | Native | Limited, needs config |
| Watch mode speed | 4-20x faster (HMR) | Slower |
| API compatibility | Jest-compatible | Original |

Vitest is the clear choice for Vite-based projects in 2025. It shares the same configuration as our build tool, eliminating duplicate setup and ensuring consistent behavior.

### Why Playwright over Cypress?

| Criterion | Playwright | Cypress |
|-----------|------------|---------|
| Cross-browser | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit |
| Auto-waiting | Built-in, reliable | Built-in |
| Network mocking | Native | Native |
| Component testing | Experimental | Stable |
| Speed | Generally faster | Slower |
| Industry adoption | #1 in 2025 | Declining |

Playwright has become the industry standard for E2E testing in 2025, surpassing Selenium and Cypress in adoption.

## Consequences

### Positive

- **Developer experience**: Fast tests with HMR-based watch mode
- **Maintenance**: Single config file for build and test
- **Reliability**: Auto-waiting in Playwright reduces flaky tests
- **Future-proof**: Both tools are actively maintained and industry-standard

### Negative

- **Learning curve**: Team members familiar with Jest may need adjustment (minimal due to API compatibility)
- **WASM testing**: wa-sqlite may require special handling in unit tests

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| WASM not working in jsdom | Mock database layer in component tests |
| Playwright browser install | Cache in CI, use `--project=chromium` for speed |

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest vs Vitest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
