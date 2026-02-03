# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make install    # Install dependencies (pnpm)
make dev        # Run in development mode (tsx)
make build      # Build single-file bundle (esbuild → dist/index.js)
make build-prod # Build for production (LOG_LEVEL=error baked in)
make typecheck  # Type check only
make clean      # Remove dist/ and node_modules/
```

Always run `make typecheck build` after changes to verify types and build succeed.

## Code Style

- **MANDATORY**: Use `spawn`/`spawnSync` instead of `exec`/`execSync` for executing external commands (safer, avoids shell injection)
- **MANDATORY**: Use operation factories (`createSetModel`, `createSetApiKey`, etc.) with `runOperations()` instead of calling `setModel()`, `setApiKey()` directly

## Architecture

This is a CLI tool for configuring OpenClaw (Linux). TypeScript source compiles to a single ESM bundle via esbuild.

### App Lifecycle (`src/index.ts`)

- `init()` → Create `AppContext` with AbortController
- `run(ctx)` → Main flow (language selection → openclaw check → config loop)
- `shutdown(ctx, reason)` → Cleanup and exit
- Signal handlers for SIGINT/SIGTERM with graceful shutdown

### Operations Module (`src/operations/`)

Encapsulates atomic config operations with automatic gateway restart. See [docs/spec-config-flow.md](docs/spec-config-flow.md) for full specification.

**Usage pattern:**
```typescript
import { runOperations, createSetProviderConfig, createSetApiKey, createSetModel } from "@/operations";

// Use factories to create operations, then execute with runner
await runOperations(ctx, [
  createSetProviderConfig(provider, baseUrl),
  createSetApiKey(provider, apiKey),
  createSetModel(modelKey),
]); // runner auto-appends triggerGatewayRestart
```

### Menu System (`src/utils/menu.ts`)

Generic menu engine with `runMenu()`. Supports loop mode and action callbacks.

```typescript
await runMenu<T>({
  message: t("select_action"),
  loop: true,              // Keep showing menu until MENU_EXIT or ESC
  context: ctx,            // Shared MenuContext passed to actions
  items: [
    { label: "...", value: "add", action: async (ctx) => { ... } },
    { label: "Exit", value: MENU_EXIT },
  ],
});
```

### ESC-Cancellable Prompts (`src/utils/prompt.ts`)

Wrappers around `@inquirer/prompts` that support ESC key cancellation:
- `escSelect()`, `escInput()`, `escPassword()`
- Throws `PromptCancelledError` on ESC, check with `isPromptCancelled(err)`

### Key Modules

- **`src/utils/`** - Utilities barrel export
  - `logger.ts` - `createLogger(name)` with level filtering via `LOG_LEVEL` env
  - `system.ts` - `which()` for executable lookup
  - `openclaw.ts` - OpenClaw config management (models, providers, API keys)
  - `ora` - Spinner for process status
  - `chalk` - Text styling/colors
  - `symbols` - Result feedback icons (✔ ✖ ⚠ ℹ)

- **`src/i18n/`** - Internationalization
  - `t(key, params?)` for translations with `{placeholder}` support
  - `setLocale()` / `detectLocale()` for language switching
  - Add keys to both `en.json` and `zh_CN.json` (types auto-inferred)

### Documentation (`docs/`)

Document naming conventions:

| Prefix | Purpose | Access |
|--------|---------|--------|
| `spec-*.md` | Design specifications | Read-only |
| `ref-*.md` | External reference materials | Read-only |
| `track-*.md` | Code implementation tracking | **Sync from code** - update when related code changes |

Current documents:
- `spec-config-flow.md` - Operations Module and Menu Context architecture

### Path Alias

Use `@/*` for imports from `src/`:
```typescript
import { createLogger } from "@/utils";
import { t } from "@/i18n";
```

Configured in both `tsconfig.json` (for IDE/typecheck) and `scripts/build.ts` (for esbuild).
