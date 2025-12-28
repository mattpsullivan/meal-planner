# ADR 004: Centralized Logging and Error Handling

## Status

Accepted

## Date

2025-12-28

## Context

During debugging of the blank page issue (caused by wa-sqlite concurrency problems), we identified several issues with the existing error handling approach:

### Problems Identified

1. **Scattered console.log statements**: Logs were inconsistent and hard to correlate
2. **No timestamps**: Difficult to understand timing/sequencing of events
3. **No log levels**: Could not filter noise from important messages
4. **No runtime control**: Could not enable/disable logging without code changes
5. **No log retention**: Logs were lost on console clear
6. **Inconsistent error formatting**: Errors logged differently across modules

### Debugging Pain Points

The blank page bug required multiple debugging sessions because:
- Logs didn't have timestamps to correlate concurrent operations
- No way to see the sequence of database operations
- Couldn't easily share logs for analysis
- Had to add/remove logging statements to diagnose issues

## Decision

Implement a centralized logging utility (`src/lib/logger.ts`) with:

### Features

1. **Timestamped logs**: ISO format timestamps on all messages
2. **Context tags**: Each log includes module context (e.g., `[db]`, `[migrations]`)
3. **Log levels**: debug, info, warn, error with configurable minimum level
4. **Runtime control**: Enable/disable via browser console
5. **Log buffer**: Circular buffer stores last 200 entries
6. **Export capability**: Export logs as JSON for debugging

### API Design

```typescript
// Logging
logger.debug('db', 'Query executed', { rows: 5 });
logger.info('migrations', 'Migration 1 applied');
logger.warn('seed', 'Duplicate entry skipped');
logger.error('db', 'Query failed', error, { sql: '...' });

// Runtime control (in browser console)
window.__appLogger.disable();           // Stop console output
window.__appLogger.enable();            // Resume console output
window.__appLogger.setLevel('debug');   // Show all logs
window.__appLogger.setLevel('error');   // Only errors
window.__appLogger.getRecentLogs();     // Get buffered logs
window.__appLogger.exportLogs();        // Export as JSON
window.__appLogger.summary();           // Show buffer stats
```

### Log Output Format

```
[2025-12-28T19:45:23.456Z] [db] Database opened successfully {dbName: "meal-prep.db", totalTimeMs: 145}
[2025-12-28T19:45:23.460Z] [migrations] Starting migrations...
[2025-12-28T19:45:23.465Z] [migrations] Current schema version: 0, available migrations: 1
[2025-12-28T19:45:23.500Z] [migrations] Migration 1 completed successfully {durationMs: 35}
```

### Default Configuration

- Console output: **enabled**
- Minimum level: **info** (debug logs buffered but not shown)
- Buffer size: **200 entries**
- Errors: **always shown** regardless of settings

## Implementation

### Modules Updated

| Module | Context Tag | Key Logs |
|--------|-------------|----------|
| `src/db/index.ts` | `db` | Query execution, mutex queue, timing |
| `src/db/migrations.ts` | `migrations` | Schema version, table creation, transactions |
| `src/db/seed.ts` | `seed` | Seed progress, recipe/week counts |
| `src/hooks/useDatabase.tsx` | `useDatabase` | Init calls, promise reuse, state changes |

### Error Handling Pattern

```typescript
try {
  await db.run(statement);
} catch (err) {
  logger.error(LOG_CTX, `Statement failed`, err, {
    sqlPreview: statement.substring(0, 100),
  });
  throw err;
}
```

## Consequences

### Positive

- **Faster debugging**: Timestamps and context make log analysis easier
- **Runtime flexibility**: Can enable debug logs without rebuilding
- **Log preservation**: Buffer survives console clear
- **Shareability**: Export logs for collaborative debugging
- **Consistent format**: All modules follow same pattern

### Negative

- **Small performance overhead**: Logging adds minimal CPU/memory
- **Bundle size**: ~2KB additional code
- **Learning curve**: Team needs to use new logging API

### Production Considerations

For production deployments, consider:
1. Setting default level to `warn` or `error`
2. Integrating with error reporting service (Sentry, etc.)
3. Adding user ID/session context for support debugging

## Files

- `src/lib/logger.ts` - Logger implementation
- `src/db/index.ts` - Database logging
- `src/db/migrations.ts` - Migration logging
- `src/db/seed.ts` - Seed logging
- `src/hooks/useDatabase.tsx` - Init flow logging

## References

- [Structured Logging Best Practices](https://www.loggly.com/use-cases/6-best-practices-for-structured-logging/)
- [Debug NPM Package](https://www.npmjs.com/package/debug) - Inspiration for runtime control
