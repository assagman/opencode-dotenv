# Plugin Architecture

## Overview

opencode-dotenv is an OpenCode plugin that loads environment variables from `.env` files at startup. It sets variables into `process.env` for use during chat sessions.

## OpenCode Startup Sequence

Understanding when this plugin executes is critical to understanding its limitations:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       OPENCODE STARTUP SEQUENCE                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  1. Read opencode.jsonc  │
                    │     (config file)        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  2. Resolve {env:VAR}    │◄─── process.env is read HERE
                    │     syntax in config     │     (BEFORE plugins load!)
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  3. Parse config         │
                    │     (providers, models)  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  4. Load plugins         │◄─── opencode-dotenv runs HERE
                    │     (from config.plugin) │     (TOO LATE for config!)
                    └────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ opencode-dotenv │   │ opencode-toolbox│   │  Other plugins  │
│                 │   │                 │   │                 │
│ Sets process.env│   │ Registers tools │   │       ...       │
└────────┬────────┘   └─────────────────┘   └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OPENCODE READY                                  │
│                                                                          │
│  Environment variables from .env files are now available to:             │
│  • Chat sessions                                                         │
│  • Tool executions (bash, etc.)                                          │
│  • Subsequent operations                                                 │
│                                                                          │
│  NOT available to:                                                       │
│  • OpenCode config {env:VAR} syntax (already resolved in step 2)         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why This Matters

### What WORKS

```jsonc
// dotenv.jsonc
{
  "files": ["~/.config/opencode/.env"]
}

// ~/.config/opencode/.env
MY_PROJECT_KEY=secret123
DEBUG_MODE=true
```

After plugin loads, chat sessions can use these:
- `$MY_PROJECT_KEY` in bash commands
- Environment-aware tools see these variables
- Scripts executed via tools have access to them

### What DOES NOT WORK

```jsonc
// opencode.jsonc - THIS WON'T WORK!
{
  "provider": {
    "anthropic": {
      "apiKey": "{env:MY_API_KEY}"  // ❌ Resolved BEFORE plugin loads!
    }
  },
  "plugin": ["opencode-dotenv"]
}

// ~/.config/opencode/.env (loaded by plugin)
MY_API_KEY=sk-ant-xxx  // ❌ Too late! Config already parsed.
```

### Correct Approach for Config Variables

Set variables in your shell profile BEFORE starting OpenCode:

```bash
# ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-xxx"
export MY_API_KEY="my-secret-key"
```

Then in `opencode.jsonc`:
```jsonc
{
  "provider": {
    "anthropic": {
      "apiKey": "{env:ANTHROPIC_API_KEY}"  // ✓ Set before OpenCode starts
    }
  }
}
```

## Plugin Initialization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLUGIN INITIALIZATION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │    Load Guard       │
                   │  Already loaded?    │
                   └──────────┬──────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Yes                           │ No
              ▼                               ▼
     ┌────────────────┐            ┌────────────────────┐
     │ Return {} early│            │ Start profiler     │
     │ (~0.01ms)      │            │                    │
     └────────────────┘            └──────────┬─────────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │ Load config        │
                                   │                    │
                                   │ 1. ./dotenv.jsonc  │
                                   │ 2. ~/.config/      │
                                   │    opencode/       │
                                   │    dotenv.jsonc    │
                                   └──────────┬─────────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │ Load .env files    │
                                   │ (sequential)       │
                                   │                    │
                                   │ config.files[] →   │
                                   │ cwd/.env →         │
                                   │                    │
                                   │ Later files        │
                                   │ override earlier   │
                                   └──────────┬─────────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │ Set process.env    │
                                   │ for each variable  │
                                   └──────────┬─────────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │ Complete profiler  │
                                   │ Return {}          │
                                   └────────────────────┘
```

## File Loading Precedence

Environment variables are loaded in this order, with later values overriding earlier ones:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VARIABLE PRECEDENCE                           │
│                    (lowest → highest)                            │
└─────────────────────────────────────────────────────────────────┘

  1. config.files[0]     ~/.config/opencode/.env     (first in array)
           │
           ▼
  2. config.files[1]     ~/projects/shared/.env      (second in array)
           │
           ▼
  3. config.files[...]   ...                         (subsequent files)
           │
           ▼
  4. cwd/.env            ./.env                      (highest priority)
     (if load_cwd_env)

Example:
  ~/.config/opencode/.env:  DEBUG=false, API_URL=prod.example.com
  ./.env:                   DEBUG=true

  Result: DEBUG=true, API_URL=prod.example.com
```

## Config File Search

The plugin searches for configuration in this order (first found wins):

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIG SEARCH ORDER                           │
└─────────────────────────────────────────────────────────────────┘

  1. ${cwd}/dotenv.jsonc          (project-specific config)
     ↓ not found
  2. ~/.config/opencode/dotenv.jsonc  (global config)
     ↓ not found
  3. Default: { files: [], load_cwd_env: true }

Note: Only the FIRST found config is used. No merging between configs.
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE METRICS                           │
└─────────────────────────────────────────────────────────────────┘

Typical initialization times (Bun runtime):

  ┌──────────────────────────┬───────────┐
  │ Operation                │ Time      │
  ├──────────────────────────┼───────────┤
  │ Load guard (2nd+ call)   │ ~0.01ms   │
  │ No config (default)      │ ~0.12ms   │
  │ Single .env (3 vars)     │ ~0.09ms   │
  │ Multiple files (10 vars) │ ~0.20ms   │
  │ Large file (100 vars)    │ ~0.25ms   │
  └──────────────────────────┴───────────┘

Key optimizations:
  • Load guard prevents redundant initialization
  • Sequential file loading maintains override order
  • Non-blocking async logging (fire-and-forget)
  • Logging disabled by default for max performance
```

## Module Structure

```
src/
├── index.ts              # Entry point, re-exports
├── plugin.ts             # Main plugin implementation
│   ├── DotEnvPlugin      # Plugin function (default export)
│   ├── parseDotenv()     # .env file parser
│   ├── loadConfig()      # Config file loader
│   └── loadDotenvFile()  # Single file loader
├── profiler/
│   ├── index.ts          # Profiler exports
│   └── profiler.ts       # Performance tracking
│       ├── Profiler      # Class for metrics collection
│       └── globalProfiler# Singleton instance
└── test-utils.ts         # Internal test helpers
```

## Integration Points

### OpenCode Plugin Interface

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const DotEnvPlugin: Plugin = async (_ctx) => {
  // Load guard check
  // Load config
  // Load .env files
  // Set process.env
  return {}  // No tools provided
}
```

### Environment Modification

```typescript
// Variables are set directly on process.env
for (const [key, value] of Object.entries(envVars)) {
  process.env[key] = value
}
```

### Performance Reporting

```typescript
import { getPerformanceReport } from "opencode-dotenv"

const report = getPerformanceReport()
// Returns: {
//   timestamp, uptime, initialization, config, files
// }
```

## Logging

When enabled (disabled by default), logs are written to:
```
~/.local/share/opencode/dotenv.log
```

Log format:
```
[2026-01-08T12:00:00.000Z] Plugin started
[2026-01-08T12:00:00.001Z] Config loaded from ~/.config/opencode/dotenv.jsonc
[2026-01-08T12:00:00.002Z] Loading: ~/.config/opencode/.env
[2026-01-08T12:00:00.003Z] Loaded 5 vars from ~/.config/opencode/.env
[2026-01-08T12:00:00.004Z] Plugin finished: 1 files, 5 vars in 0.45ms
```

Logging is:
- Disabled by default (for performance)
- Non-blocking (fire-and-forget async writes)
- Skipped in test environments
- Silent on errors (never crashes the plugin)
