# Meal Planner

A web application for planning, shopping, prepping and cooking household meals - plant-forward omnivore, with vegan recipes as a filterable subset.

## Features

- **Planning** - Browse and select weekly meal plans
- **Shopping** - Generate and manage grocery lists
- **Prep** - Follow step-by-step meal prep guides with timers
- **Cooking** - Access recipes with ingredient scaling and substitutions

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# Opens at http://localhost:5173 (inside container)
# Host port shown at container startup

# Build for production
pnpm build

# Preview production build
pnpm preview
# Opens at http://localhost:4173
```

## Development Environment

This project uses a devcontainer for consistent development with Claude CLI integration.

### Prerequisites

- Docker installed and running
- VSCode with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Claude CLI authenticated on host (`~/.claude/.credentials.json`)

### Getting Started

**VSCode (Recommended):**

1. Open this folder in VSCode
2. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
3. Wait for container to build
4. Run `pnpm dev` to start the development server
5. VS Code automatically forwards ports - check the port displayed at container startup

**Console Only (with auto port detection):**

```bash
./start-dev.sh

# Inside container:
pnpm install
pnpm dev
```

The startup script auto-detects available ports and displays them. Check `.devcontainer/.current-ports` for the configured ports.

**Manual start (default ports):**

```bash
cd .devcontainer
docker compose up -d --build
docker compose exec dev bash
```

### Rebuilding the Container

If you need to rebuild (e.g., after docker-compose.yml changes):

```bash
# From host machine (outside container):
cd .devcontainer
docker compose down
docker compose up -d --build
docker compose exec dev bash
```

Or in VS Code: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

## Project Structure

```
meal-planner/
├── src/                    # Application source code
├── packages/cli/           # CLI tool for exporting meal plans
│   ├── bin/                # CLI entry point
│   ├── dist/               # Compiled JavaScript (committed)
│   └── src/                # TypeScript source
├── recipes/                # Cooklang recipe files
│   ├── components/         # Batch prep items (grains, proteins, sauces, etc.)
│   ├── meals/              # Assembly recipes (bowls, tacos, wraps, etc.)
│   ├── plans/              # Weekly meal plans (.mealplan YAML)
│   └── schemas/            # JSON Schema for validation
├── scripts/                # Build and import scripts
│   └── generate-seed-from-cooklang.ts  # Cooklang → seed.json import
├── content/                # Original meal plan data (reference)
├── docs/                   # Project documentation
│   ├── CLI-USAGE.md        # CLI tool documentation
│   ├── COOKLANG-GUIDE.md   # Recipe format guide
│   └── adr/                # Architecture Decision Records
├── e2e/                    # Playwright end-to-end tests
├── .devcontainer/          # Docker dev environment
└── [config files]          # TypeScript, ESLint, Prettier
```

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode)
- **Package Manager:** pnpm
- **Linting:** ESLint 9 (flat config)
- **Formatting:** Prettier

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start development server (port 5173) |
| `pnpm build`        | Build for production                 |
| `pnpm preview`      | Preview production build (port 4173) |
| `pnpm test:run`     | Run unit tests (Vitest)              |
| `pnpm test`         | Run unit tests in watch mode         |
| `pnpm test:e2e`     | Run e2e tests (Playwright)           |
| `pnpm typecheck`    | Type check without emitting          |
| `pnpm lint`         | Run ESLint                           |
| `pnpm lint:fix`     | Fix auto-fixable lint issues         |
| `pnpm format`       | Format code with Prettier            |
| `pnpm format:check` | Check formatting                     |
| `pnpm cli`          | Run CLI tool locally                 |
| `pnpm cli:build`    | Rebuild CLI after source changes     |
| `pnpm build:all`    | Build CLI + app                      |
| `pnpm check`        | Run typecheck + lint + unit tests    |
| `pnpm check:all`    | Build CLI + run all checks           |

## Deployment

This app deploys to GitHub Pages automatically via GitHub Actions when you push to `main`.

### Setup GitHub Pages

1. Go to your repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions"
3. Push to `main` to trigger deployment

The app will be available at `https://[username].github.io/meal-planner/`

### Manual Deployment

```bash
# Build for GitHub Pages
VITE_BASE_PATH=/meal-planner/ pnpm build

# Output is in dist/
```

## CLI Tool

The `mp` CLI exports Cooklang meal plans to shareable JSON format.

**Install from GitHub:**

```bash
# Run directly (no install needed)
npx github:[your-username]/meal-planner export recipes/plans/week-1.mealplan -o week-1.json

# Or install globally
npm install -g github:[your-username]/meal-planner
mp export recipes/plans/week-1.mealplan -o week-1.json
```

**Commands:**

| Command    | Description                             |
| ---------- | --------------------------------------- |
| `export`   | Convert .mealplan + .cook files to JSON |
| `validate` | Validate a JSON export file             |

See [CLI-USAGE.md](docs/CLI-USAGE.md) for full documentation.

## Content

This app is built around a 31-day vegan meal plan (Veganuary 2026):

- **Recipes:** 104 total (68 components, 36 meals)
- **Dietary:** 100% plant-based, soy-free
- **Style:** Heavy weekend prep, quick weekday assembly
- **Cuisines:** Mediterranean, Mexican, Indian, Thai, Middle Eastern, Italian, American

Recipes are stored in [Cooklang](https://cooklang.org/) format in `recipes/`. See [ADR-006](docs/adr/006-recipe-serialization-format.md) for format details.

## License

MIT
