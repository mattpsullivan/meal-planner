// Test utilities for React and TanStack Query
// Provides wrappers and helpers for testing components and hooks

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Create a fresh QueryClient for each test to ensure isolation
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster failures
        retry: false,
        // No stale time to ensure fresh data
        staleTime: 0,
        // Disable garbage collection during tests
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component for testing hooks that need QueryClient
interface WrapperProps {
  children: ReactNode;
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Helper to wait for queries to settle (useful in some test scenarios)
export function waitForQueries(queryClient: QueryClient) {
  queryClient.getQueryCache().onFocus();
}
