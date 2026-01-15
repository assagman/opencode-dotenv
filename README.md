# opencode-dotenv

[![npm version](https://badge.fury.io/js/opencode-dotenv.svg)](https://www.npmjs.com/package/opencode-dotenv)
[![npm downloads](https://img.shields.io/npm/dm/opencode-dotenv)](https://www.npmjs.com/package/opencode-dotenv)
[![license](https://img.shields.io/npm/l/opencode-dotenv)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Build Status](https://github.com/assagman/opencode-dotenv/actions/workflows/ci.yml/badge.svg)](https://github.com/assagman/opencode-dotenv/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/assagman/opencode-dotenv/branch/main/graph/badge.svg)](https://codecov.io/gh/assagman/opencode-dotenv)

OpenCode plugin to load `.env` files at startup.

> **Important Limitation**
> 
> This plugin **cannot** set environment variables for use in OpenCode's config file (`opencode.jsonc`). The plugin loads *after* OpenCode parses its configuration, so `{env:VARNAME}` references in config are resolved before this plugin runs.
> 
> **Use this plugin for:** Managing environment variables available during chat sessions, tool executions, and bash commands.
> 
> **Do not use this plugin for:** Setting API keys or other config values referenced via `{env:VAR}` syntax in `opencode.jsonc`. For those, set variables in your shell profile (`~/.zshrc`, `~/.bashrc`) before starting OpenCode.
> 
> See [Architecture](docs/ARCHITECTURE.md) for details on the OpenCode startup sequence.

## Features
 
- Load multiple `.env` files in order via config file
- Load `.env` from current working directory (optional)
- Override existing environment variables (later files override earlier ones)
- Configurable logging to `~/.local/share/opencode/dotenv.log` (disabled by default)
- Prevents double loading with load guard
- JSONC config file format (supports comments and trailing commas)
- **Requires Bun runtime**

## Limitations

1. **Cannot modify existing OpenCode config** - Variables loaded by this plugin cannot be referenced in `opencode.jsonc` using `{env:VAR}` syntax. OpenCode reads its config before plugins initialize.

2. **Only affects subsequent operations** - Loaded environment variables are only available to new chat sessions, tool calls, and operations that occur AFTER plugin initialization.

3. **No config reload capability** - Changing `.env` files while OpenCode is running will NOT trigger config re-parsing. To apply changes, restart OpenCode.
  
**Recommended approach:** Set environment variables in your shell profile (`.zshrc`, `.bashrc`) before starting OpenCode.
 
## Installation

Add to your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:./plugins/opencode-dotenv"]
}
```

After publishing to npm, you can use:

```jsonc
{
  "plugin": ["opencode-dotenv"]
}
```

## Configuration

Create `dotenv.jsonc` in one of these locations (searched in order, first found wins):

1. `./dotenv.jsonc` in current working directory (project-specific)
2. `~/.config/opencode/dotenv.jsonc` (global config)

**Note:** Only the first found config file is used; configs are not merged.

### Config Schema

Config file uses **JSONC format** (JSON with Comments), which supports:
- `//` single-line comments
- `/* */` multi-line comments
- Trailing commas
- Trailing spaces

```jsonc
{
  "files": [
    "~/.config/opencode/.env",
    "~/a/.env"
  ],
  "load_cwd_env": true,
  "logging": {
    "enabled": false
  }
}
```

**Fields:**
- `files` (array, optional): List of `.env` file paths to load in order. Later files override earlier ones.
- `load_cwd_env` (boolean, optional): Whether to load `.env` from the directory where OpenCode is opened. Defaults to `true`.
- `logging.enabled` (boolean, optional): Enable/disable logging to `~/.local/share/opencode/dotenv.log`. Defaults to `false`.

**Notes:**
- Use `~` for home directory (automatically expanded)
- Paths are expanded before loading
- If no config file exists, only loads `./.env` from cwd (if present)
- Logging writes to `~/.local/share/opencode/dotenv.log` for debugging

### Load Order

1. Files listed in `config.files` array (in order, later files override earlier ones)
2. `.env` from current working directory (if `load_cwd_env: true`)

This ensures project-specific env vars have the highest precedence.

## Usage Examples

### Load global and project-specific .env files

Config (`~/.config/opencode/dotenv.jsonc`):

```jsonc
{
  "files": [
    "~/.config/opencode/.env"
  ],
  "load_cwd_env": true,
  "logging": {
    "enabled": true
  }
}
```

Result:
1. Loads `~/.config/opencode/.env`
2. Loads `./.env` from cwd (overrides any conflicts)
3. Logs all activity to `~/.local/share/opencode/dotenv.log`

### Load multiple global files without cwd .env

Config (`~/.config/opencode/dotenv.jsonc`):

```jsonc
{
  "files": [
    "~/.config/opencode/.env",
    "~/a/.env"
  ],
  "load_cwd_env": false,
  "logging": {
    "enabled": false
  }
}
```

Result:
1. Loads `~/.config/opencode/.env`
2. Loads `~/a/.env` (overrides conflicts from first file)
3. Skips cwd `.env`
4. No logging output

### Example .env files
 
`~/.config/opencode/.env`:
 
```bash
# OpenCode Dotenv Configuration
OPENCODE_DEBUG=true
OPENCODE_MAX_TOKENS=100000
MY_PROJECT_KEY=secret123
```

**Note:** This plugin cannot inject variables into OpenCode's configuration loading process. To set `ANTHROPIC_API_KEY` or other provider API keys, set them in your shell profile (`~/.zshrc`, `~/.bashrc`) before starting OpenCode.

`./.env` (project-specific):
```bash
# Project-specific overrides
OPENCODE_DEBUG=false
PROJECT_API_KEY=project_specific_key
```

Result: `OPENCODE_DEBUG` will be `false` (from cwd), `MY_PROJECT_KEY` from global, `PROJECT_API_KEY` from cwd.

### Logging

View plugin activity logs:

```bash
tail -f ~/.local/share/opencode/dotenv.log
```

Enable logging in config:

```jsonc
{
  "files": ["~/.config/opencode/.env"],
  "logging": {
    "enabled": true
  }
}
```

## Development

### Plugin structure

```
opencode-dotenv/
├── package.json
├── src/
│   ├── index.ts
│   └── plugin.ts
├── docs/
│   └── ARCHITECTURE.md
└── dist/
    └── index.js  (built)
```

### Build

```bash
bun run build
```

### Publish

```bash
npm publish
```

## License

MIT
