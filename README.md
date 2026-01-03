# opencode-dotenv

OpenCode plugin to load `.env` files at startup.

## Features

- Load multiple `.env` files in order via config file
- Load `.env` from current working directory (optional)
- Override existing environment variables (later files override earlier ones)
- TUI notifications via console.log
- Fallback logging to `/tmp/opencode-dotenv.log`
- Prevents double loading with load guard
- JSONC config file format (supports comments)

## Installation

Add to your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:./plugins/opencode-dotenv"]
}
```

## Configuration

Create `opencode-dotenv.jsonc` in one of these locations:

1. `~/.config/opencode/opencode/opencode-dotenv.jsonc` (recommended)
2. `./opencode-dotenv.jsonc` in current working directory

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
  "load_cwd_env": true
}
```

**Fields:**
- `files` (array, required): List of `.env` file paths to load in order. Later files override earlier ones.
- `load_cwd_env` (boolean, optional): Whether to load `.env` from the directory where OpenCode is opened. Defaults to `true`.

**Notes:**
- Use `~` for home directory (automatically expanded)
- Paths are expanded before loading
- If no config file exists, only loads `./.env` from cwd (if present)

### Load Order

1. Files listed in `config.files` array (in order, later files override earlier ones)
2. `.env` from current working directory (if `load_cwd_env: true`)

This ensures project-specific env vars have the highest precedence.

## Usage Examples

### Load global and project-specific .env files

Config (`~/.config/opencode/opencode-dotenv.jsonc`):

```jsonc
{
  "files": [
    "~/.config/opencode/.env"
  ],
  "load_cwd_env": true
}
```

Result:
1. Loads `~/.config/opencode/.env`
2. Loads `./.env` from cwd (overrides any conflicts)

### Load multiple global files without cwd .env

Config (`~/.config/opencode/opencode-dotenv.jsonc`):

```jsonc
{
  "files": [
    "~/.config/opencode/.env",
    "~/a/.env"
  ],
  "load_cwd_env": false
}
```

Result:
1. Loads `~/.config/opencode/.env`
2. Loads `~/a/.env` (overrides conflicts from first file)
3. Skips cwd `.env`

### Example .env files

`~/.config/opencode/.env`:

```bash
# OpenCode Dotenv Configuration
OPENCODE_API_KEY=your_api_key_here
OPENCODE_DEBUG=true
OPENCODE_MAX_TOKENS=100000
```

`./.env` (project-specific):

```bash
# Project-specific overrides
OPENCODE_DEBUG=false
PROJECT_API_KEY=project_specific_key
```

Result: `OPENCODE_DEBUG` will be `false` (from cwd), `OPENCODE_API_KEY` from global, `PROJECT_API_KEY` from cwd.

## Development

### Plugin structure

```
ai/plugins/opencode-dotenv/
├── package.json
└── src/
    └── index.ts
```

### Future

Move to separate repository and publish to npm:

```bash
npm publish
```

Then use as:

```jsonc
{
  "plugin": ["opencode-dotenv"]
}
```

## License

MIT
