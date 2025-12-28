# ADR-007: Meal Plan Import/Export System

**Status:** Accepted
**Date:** 2025-12-29

## Context

The Vegan Meal Prep app currently loads all meal plan data at build time:

```
Build Time:
  recipes/*.cook + recipes/plans/*.mealplan
          ↓
  scripts/generate-seed-from-cooklang.ts
          ↓
  src/data/seed.json (bundled into app)
          ↓
  Database seeded on first app load
```

This means adding new meal plans requires:
1. Creating/editing `.cook` and `.mealplan` files
2. Running the import script to regenerate `seed.json`
3. Rebuilding and redeploying the app
4. Users clearing their local database to re-seed

**Problems with current approach:**
- **No runtime updates**: Users can't add new meal plans without app rebuild
- **No sharing**: Users can't share custom meal plans with each other
- **No customization**: Can't save modified versions of existing plans
- **Version lock-in**: App is tied to bundled content version

**Requirements for import/export:**
1. Import new meal plans at runtime (no rebuild needed)
2. Export meal plans for sharing/backup
3. Preserve recipe references and dependencies
4. Handle conflicts with existing data gracefully
5. Validate data integrity before import

---

## Options Considered

### Option A: Cooklang Import in Browser

Parse `.cook` and `.mealplan` files directly in the browser using the `@cooklang/cooklang` WASM parser.

**Implementation:**
- User uploads a ZIP containing `.cook` files and a `.mealplan` file
- Browser parses Cooklang files using existing WASM parser
- Parsed data inserted into SQLite database

**Pros:**
| Benefit | Description |
|---------|-------------|
| Native format | Uses same format as source files |
| No conversion step | Authors can share raw files directly |
| Familiar to contributors | Same format used in development |

**Cons:**
| Drawback | Description |
|----------|-------------|
| Complex parsing | Must resolve file references, handle relative paths |
| Large bundles | ZIP handling + multi-file parsing in browser |
| Error-prone | Path resolution, missing files, circular refs |
| No metadata | Can't include export metadata (version, source) |
| Platform limits | File system access varies by browser/platform |

**Complexity:** High
**Risk:** Medium-High (file path resolution is fragile)

---

### Option B: JSON Export Format (Recommended)

Define a self-contained JSON format that includes all recipes and week data needed for import.

**Implementation:**
- CLI tool converts `.cook` + `.mealplan` → single JSON file
- JSON includes resolved recipes, ingredients, weeks, prep steps
- Browser imports JSON directly into database
- Export from app generates same JSON format

**Pros:**
| Benefit | Description |
|---------|-------------|
| Self-contained | Single file with all dependencies resolved |
| Simple import | No file path resolution, no parsing needed |
| Validated | JSON Schema validation before import |
| Metadata | Version, export date, source tracking |
| Portable | Works anywhere JSON is supported |
| Round-trip | Export from app, import elsewhere |

**Cons:**
| Drawback | Description |
|----------|-------------|
| Conversion step | Authors must run CLI tool to export |
| Larger files | JSON more verbose than Cooklang |
| Not human-editable | Users can't easily modify exported JSON |

**Complexity:** Low-Medium
**Risk:** Low

---

### Option C: SQLite Database File Import

Export/import the entire SQLite database file.

**Implementation:**
- Export: Download `.sqlite` file from OPFS
- Import: Replace OPFS database with uploaded file
- Merge: Complex logic to combine databases

**Pros:**
| Benefit | Description |
|---------|-------------|
| Complete backup | Full database state preserved |
| No conversion | Direct file copy |
| Fast | No parsing or transformation |

**Cons:**
| Drawback | Description |
|----------|-------------|
| All-or-nothing | Can't import just one week |
| Schema coupling | Must match exact schema version |
| No merge | Replace only, can't add to existing data |
| Large files | Full database larger than selective export |
| User data loss | Replaces checked grocery items, preferences |
| OPFS complexity | Browser storage access varies |

**Complexity:** Medium
**Risk:** High (data loss potential, schema versioning)

---

### Option D: Cloud Sync / API Backend

Store meal plans in a cloud database, sync across devices.

**Implementation:**
- Backend API for meal plan storage
- User accounts for ownership
- Real-time sync between devices
- Share via links/codes

**Pros:**
| Benefit | Description |
|---------|-------------|
| Multi-device | Same data everywhere |
| Easy sharing | Links instead of files |
| Collaboration | Multiple editors |
| Version history | Track changes over time |

**Cons:**
| Drawback | Description |
|----------|-------------|
| Infrastructure | Requires server, database, hosting |
| Cost | Ongoing operational expenses |
| Complexity | Auth, sync, conflict resolution |
| Offline issues | Depends on connectivity |
| Privacy | User data stored externally |
| Scope creep | Far beyond current app architecture |

**Complexity:** Very High
**Risk:** High (operational overhead, architectural change)

---

### Option E: URL-Based Import

Import from a URL pointing to a JSON file.

**Implementation:**
- User pastes URL to hosted JSON file
- App fetches and imports directly
- Authors host files on GitHub, personal sites, etc.

**Pros:**
| Benefit | Description |
|---------|-------------|
| Easy sharing | Just share a link |
| No file handling | Browser fetches directly |
| Updateable | Author can update hosted file |

**Cons:**
| Drawback | Description |
|----------|-------------|
| CORS issues | Cross-origin restrictions |
| Hosting required | Authors need somewhere to host |
| Security | Trusting external URLs |
| Availability | Link rot, files deleted |

**Complexity:** Low (but builds on Option B)
**Risk:** Medium (external dependencies)

---

## Comparison Matrix

| Criterion | A: Cooklang | B: JSON | C: SQLite | D: Cloud | E: URL |
|-----------|-------------|---------|-----------|----------|--------|
| Implementation effort | High | Low | Medium | Very High | Low* |
| User experience | Medium | Good | Poor | Excellent | Good |
| Offline support | Yes | Yes | Yes | Partial | No |
| Selective import | Yes | Yes | No | Yes | Yes |
| Merge capability | Yes | Yes | No | Yes | Yes |
| Self-contained | No | Yes | Yes | N/A | Yes |
| Validation | Hard | Easy | N/A | Easy | Easy |
| Round-trip export | Complex | Simple | Simple | Simple | Simple |
| Infrastructure needs | None | None | None | High | None |

*URL import builds on JSON format (Option B)

---

## Decision

**Adopt Option B: JSON Export Format** with future extension to Option E (URL import).

### Rationale

1. **Simplest viable solution**: JSON import requires minimal new code
   - Reuse existing database insertion logic from `seed.ts`
   - Standard `JSON.parse()` + validation
   - No new parsers or file handling

2. **Self-contained exports**: Single file includes everything needed
   - All recipes with ingredients and instructions
   - Week structure with days and meals
   - Prep timeline with recipe links
   - No external dependencies to resolve

3. **Validation before import**: JSON Schema ensures data integrity
   - Catch errors before database changes
   - Clear error messages for invalid data
   - Version field for format compatibility

4. **Round-trip capability**: Export from app enables sharing
   - Users can export their data
   - Share customized meal plans
   - Backup before updates

5. **Foundation for future features**: JSON format enables:
   - URL import (Option E) as simple extension
   - Partial import (select which weeks)
   - Merge strategies (skip/replace conflicts)

6. **Aligns with existing architecture**:
   - Similar to current `seed.json` structure
   - Reuses database insertion patterns
   - No architectural changes needed

### What We're NOT Doing

- **Not parsing Cooklang in browser**: Too complex for user-facing import
- **Not replacing database files**: Too risky for user data
- **Not building cloud sync**: Out of scope, adds operational burden
- **Not requiring internet**: Offline-first remains a priority

---

## Implementation

### Export Format: `mealplan-export.json`

```typescript
interface MealplanExport {
  // Format version for compatibility
  version: 1;

  // Export metadata
  exported_at: string;  // ISO timestamp
  source?: string;      // e.g., "Veganuary 2026 Week 6"

  // All recipes needed for this export
  recipes: ExportRecipe[];

  // Week definitions
  weeks: ExportWeek[];
}
```

Full schema defined in `docs/design/MEALPLAN-IMPORT.md`.

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Export CLI | `scripts/export-mealplan.ts` | Convert .cook/.mealplan → JSON |
| Import API | `src/api/data.ts` | `importMealplan()` function |
| Import UI | `src/components/import/` | File picker, preview, confirmation |
| Export UI | Week page action | Download button |

### Conflict Handling

When imported data conflicts with existing data:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `skip` | Keep existing, ignore import | Safe default |
| `replace` | Overwrite with imported | Update existing |
| `error` | Abort if any conflict | Strict mode |

### Implementation Phases

1. **Phase 1: Export CLI** - Convert .cook/.mealplan to JSON
2. **Phase 2: Import API** - Database insertion with conflict handling
3. **Phase 3: Import UI** - File picker and confirmation flow
4. **Phase 4: Export UI** - Download weeks from app (optional)

---

## CLI Distribution

The CLI tool for converting Cooklang files to JSON must be easily accessible to content authors without requiring npm package publication.

### Distribution Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Root-level bin** | Add `bin` to root package.json | Simple, single repo | Exposes internal scripts |
| **B: Subdirectory package** | Separate package in `packages/cli/` | Clean separation | Complex monorepo setup |
| **C: Separate repo** | Dedicated CLI repository | Independent versioning | Maintenance burden |

### Selected: Option A - Root-Level Bin

Add a `bin` field to the root `package.json` pointing to the CLI entry point:

```json
{
  "name": "vegan-meal-prep",
  "bin": {
    "vmp": "./packages/cli/bin/vmp.js"
  }
}
```

**Rationale:**

1. **Zero-publish workflow**: Install directly from GitHub without npm publishing
2. **Single source of truth**: CLI lives with the app it supports
3. **Immediate availability**: Changes are available as soon as pushed
4. **Simple maintenance**: No package versioning or release process

### Installation & Usage

Users can run the CLI directly via npx from GitHub:

```bash
# Export a meal plan to JSON
npx github:username/vegan-meal-prep export recipes/plans/week-6.mealplan -o week-6.json

# Validate a JSON export file
npx github:username/vegan-meal-prep validate week-6.json

# Show help
npx github:username/vegan-meal-prep --help
```

Or install globally for repeated use:

```bash
npm install -g github:username/vegan-meal-prep
vmp export recipes/plans/week-6.mealplan -o week-6.json
```

### CLI Structure

```
packages/cli/
├── bin/
│   └── vmp.js           # Entry point (shebang, imports main)
├── dist/                # Pre-built JavaScript (committed to repo)
├── src/
│   ├── index.ts         # Main CLI logic
│   ├── commands/
│   │   ├── export.ts    # Export command implementation
│   │   └── validate.ts  # Validate command implementation
│   └── lib/
│       ├── types.ts     # Shared TypeScript types
│       ├── cooklang.ts  # Cooklang parsing utilities
│       ├── mealplan.ts  # Mealplan parsing utilities
│       └── schema.ts    # JSON Schema validation
├── package.json         # CLI-specific dependencies
└── tsconfig.json        # CLI TypeScript config
```

### Build Strategy

**Decision: Pre-build and commit the CLI dist folder**

When installing packages from GitHub, npm does not run TypeScript compilation. We considered two approaches:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Build on install** | Use `prepare` script to compile | Always fresh build | Requires TypeScript as dependency, slow install, complex |
| **Pre-built dist** | Commit compiled JS to repo | Fast install, no build deps | Must remember to rebuild before push |

**Selected: Pre-built dist**

The `packages/cli/dist/` folder is:
- Compiled from TypeScript source in `packages/cli/src/`
- Committed to the repository (excluded from root `.gitignore`)
- Included in npm package via `files` field in root `package.json`

**Rationale:**
1. **Zero install-time build**: Users don't need TypeScript toolchain
2. **Fast installation**: No compilation step, just file copy
3. **Minimal dependencies**: Only runtime deps shipped (commander, ajv, yaml, @cooklang/cooklang)
4. **Small package size**: ~20KB total vs megabytes with dev dependencies

**Trade-off:** Developers must run `pnpm cli:build` before committing CLI changes.

### Package Configuration

The root `package.json` configures npm/npx installation:

```json
{
  "bin": {
    "vmp": "./packages/cli/bin/vmp.js"
  },
  "files": [
    "packages/cli/bin",
    "packages/cli/dist",
    "packages/cli/package.json"
  ],
  "dependencies": {
    "@cooklang/cooklang": "...",
    "ajv": "...",
    "ajv-formats": "...",
    "commander": "...",
    "yaml": "..."
  }
}
```

This ensures:
- Only CLI files are included in the npm package (~20KB)
- CLI dependencies are installed when installing from GitHub
- The `vmp` command is available after installation

---

## Consequences

### Positive

- **Users can add content**: Import new meal plans without app rebuild
- **Sharing enabled**: Export JSON files to share with others
- **Backup capability**: Export personal data for safekeeping
- **Validation**: Errors caught before import, not during use
- **Offline support**: No internet required for import/export
- **Simple implementation**: Builds on existing patterns
- **Zero-friction CLI**: Run via npx without installation or npm account
- **GitHub-first distribution**: No npm publishing or registry management

### Negative

- **CLI required for authoring**: Can't import raw .cook files
- **Larger exports**: JSON more verbose than Cooklang source
- **No live sync**: Manual export/import process
- **Version management**: Must handle format version mismatches
- **Node.js required**: CLI users must have Node.js installed

### Neutral

- **Two-step authoring**: Write Cooklang → export JSON → share
- **File-based sharing**: Users manage their own files (no central repo)

---

## Future Extensions

Once JSON import is working, these become straightforward:

| Extension | Effort | Description |
|-----------|--------|-------------|
| URL import | Low | Fetch JSON from URL instead of file |
| Partial import | Low | Select which weeks/recipes to import |
| Browser Cooklang | Medium | Parse .cook in browser (skip CLI) |
| Share codes | Medium | Short codes that resolve to URLs |
| Cloud backup | High | Optional sync to user's cloud storage |

---

## References

- [ADR-006: Recipe Serialization Format](./006-recipe-serialization-format.md) - Cooklang adoption decision
- [Meal Plan Import Design](../design/MEALPLAN-IMPORT.md) - Detailed implementation spec
- [CLI User Guide](../CLI-USAGE.md) - End-user documentation for the CLI tool
- [JSON Schema](https://json-schema.org/) - Validation standard
