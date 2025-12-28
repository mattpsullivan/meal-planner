// Vitest test setup
// This file runs before each test file

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test to prevent memory leaks
afterEach(() => {
  cleanup();
});
