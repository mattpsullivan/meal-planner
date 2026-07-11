# Meal Planner CLI

A command-line tool for converting Cooklang recipes and meal plans to importable JSON format.

## Prerequisites

- **Node.js 18+** - Required for running the CLI
- **pnpm** (optional) - For local development

## Installation

### Run Directly with npx (Recommended)

No installation required. Run directly from GitHub:

```bash
npx github:username/meal-planner <command> [options]
```

Replace `username` with the actual GitHub username or organization.

### Global Installation

For frequent use, install globally:

```bash
npm install -g github:username/meal-planner
```

Then run commands with:

```bash
mp <command> [options]
```

### Local Development

If you've cloned the repository:

```bash
cd meal-planner
pnpm install
pnpm cli <command> [options]
```

### For Contributors

If you modify the CLI source code (`packages/cli/src/`), rebuild before committing:

```bash
pnpm cli:build
```

The compiled JavaScript in `packages/cli/dist/` must be committed to the repository for GitHub installation to work.

## Commands

### `export` - Convert Meal Plans to JSON

Convert a `.mealplan` file and its referenced `.cook` recipes to a self-contained JSON file.

**Syntax:**

```bash
mp export <mealplan-file> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<mealplan-file>` | Path to the `.mealplan` YAML file |

**Options:**

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file path (default: stdout) |
| `-r, --recipes <dir>` | Base directory for recipe files (default: auto-detect) |
| `--pretty` | Pretty-print JSON output |
| `-h, --help` | Show help |

**Examples:**

```bash
# Export Week 6 to a JSON file
mp export recipes/plans/week-6.mealplan -o week-6.json

# Export with pretty-printed output
mp export recipes/plans/week-6.mealplan --pretty -o week-6.json

# Export to stdout (pipe to another command)
mp export recipes/plans/week-6.mealplan | jq '.recipes | length'
```

### `validate` - Validate Export Files

Validate a JSON export file against the schema before importing.

**Syntax:**

```bash
mp validate <json-file> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<json-file>` | Path to the JSON export file to validate |

**Options:**

| Option | Description |
|--------|-------------|
| `--strict` | Fail on warnings (missing optional fields) |
| `-h, --help` | Show help |

**Examples:**

```bash
# Validate an export file
mp validate week-6.json

# Strict validation (treat warnings as errors)
mp validate week-6.json --strict
```

**Exit Codes:**

| Code | Meaning |
|------|---------|
| `0` | Valid - file passes all checks |
| `1` | Invalid - schema validation failed |
| `2` | Error - file not found or not readable |

### `--help` - Show Help

```bash
mp --help
mp export --help
mp validate --help
```

### `--version` - Show Version

```bash
mp --version
```

## Workflow: Creating Shareable Meal Plans

### 1. Write Your Recipes in Cooklang

Create `.cook` files for your recipes in the appropriate directories:

```
my-meal-plan/
├── components/
│   ├── grains/
│   │   └── jasmine-rice.cook
│   └── proteins/
│       └── marinated-tofu.cook
├── meals/
│   └── tofu-rice-bowl.cook
└── plans/
    └── my-week.mealplan
```

**Example `jasmine-rice.cook`:**

```cooklang
>> servings: 4
>> time: 25 min
>> tags: grain, base

Rinse @jasmine rice{2%cups} until water runs clear.

Combine rice with @water{2.5%cups} in a pot. Bring to boil.

Reduce heat to low, cover, and simmer for ~{18%minutes}.

Remove from heat and let rest ~{5%minutes}. Fluff with fork.
```

**Example `my-week.mealplan`:**

```yaml
week: 6
name: "My Custom Week"
description: "A week of homemade bowls"

components:
  - path: components/grains/jasmine-rice.cook
  - path: components/proteins/marinated-tofu.cook

meals:
  - path: meals/tofu-rice-bowl.cook

days:
  monday:
    dinner:
      recipe: meals/tofu-rice-bowl.cook
      servings: 2

prep_timeline:
  - time: "0:00"
    task: "Start rice"
    recipe: components/grains/jasmine-rice.cook
  - time: "0:05"
    task: "Prepare tofu"
    recipe: components/proteins/marinated-tofu.cook
```

### 2. Export to JSON

Convert your meal plan to the importable JSON format:

```bash
mp export plans/my-week.mealplan -o my-week.json --pretty
```

### 3. Validate the Export

Ensure the export file is valid:

```bash
mp validate my-week.json
```

Expected output:

```
✓ Valid: my-week.json
  - 2 recipes
  - 1 week
  - 5 prep steps
```

### 4. Share the JSON File

The generated JSON file is self-contained and can be:

- Shared via email, file transfer, or cloud storage
- Hosted on GitHub or a personal website
- Imported directly into the Meal Planner app

## JSON Export Format

The exported JSON follows this structure:

```json
{
  "version": 1,
  "exported_at": "2025-12-29T10:30:00Z",
  "source": "My Custom Week",
  "recipes": [
    {
      "id": "jasmine-rice",
      "name": "Jasmine Rice",
      "type": "component",
      "servings": 4,
      "time_minutes": 25,
      "tags": ["grain", "base"],
      "ingredients": [...],
      "instructions": [...]
    }
  ],
  "weeks": [
    {
      "week_number": 6,
      "name": "My Custom Week",
      "days": [...],
      "prep_steps": [...]
    }
  ]
}
```

See [MEALPLAN-IMPORT.md](./design/MEALPLAN-IMPORT.md) for the complete schema specification.

## Troubleshooting

### "Recipe not found" Error

```
Error: Recipe not found: components/proteins/tempeh.cook
```

**Solution:** Ensure the recipe file exists at the path specified in your `.mealplan` file. Paths are relative to the recipes directory.

### "Invalid mealplan" Error

```
Error: Invalid mealplan format at line 15
```

**Solution:** Check your `.mealplan` file for YAML syntax errors. Common issues:
- Incorrect indentation (YAML uses spaces, not tabs)
- Missing colons after keys
- Unquoted strings with special characters

### "Missing required field" Warning

```
Warning: Recipe 'tofu-bowl' missing required field 'servings'
```

**Solution:** Add the missing metadata to your `.cook` file using the `>>` prefix:

```cooklang
>> servings: 4
```

### npx Cache Issues

If you're getting an old version after updates:

```bash
npx --yes github:username/meal-planner@latest <command>
```

Or clear the npx cache:

```bash
rm -rf ~/.npm/_npx
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VMP_RECIPES_DIR` | Base directory for recipe files | Auto-detect |
| `VMP_OUTPUT_FORMAT` | Default output format (`json`, `pretty`) | `json` |
| `NO_COLOR` | Disable colored output | (unset) |

## See Also

- [ADR-007: Meal Plan Import/Export System](./adr/007-mealplan-import-export.md) - Design decisions
- [Cooklang Guide](./COOKLANG-GUIDE.md) - Recipe format reference
- [Meal Plan Import Design](./design/MEALPLAN-IMPORT.md) - Technical specification
