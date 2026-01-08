# opencode-dotenv

OpenCode plugin to load `.env` files at startup.

## Features
 
- Load multiple `.env` files in order via config file
- Load `.env` from current working directory (optional)
- Override existing environment variables (later files override earlier ones)
- Configurable logging to `/tmp/opencode-dotenv.log` (enabled by default)
- Prevents double loading with load guard
- JSONC config file format (supports comments and trailing commas)
- **Requires Bun runtime**
 
## Limitations

**Important:** This plugin loads AFTER OpenCode configuration is already parsed. Therefore:

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

Create `opencode-dotenv.jsonc` in one of these locations:

1. `~/.config/opencode/opencode-dotenv.jsonc` (recommended, global config)
2. `./opencode-dotenv.jsonc` in current working directory (project-specific)

**Note:** Config files are loaded in the order above; the first found file is used.

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
    "enabled": true
  }
}
```

**Fields:**
- `files` (array, optional): List of `.env` file paths to load in order. Later files override earlier ones.
- `load_cwd_env` (boolean, optional): Whether to load `.env` from the directory where OpenCode is opened. Defaults to `true`.
- `logging.enabled` (boolean, optional): Enable/disable logging to `/tmp/opencode-dotenv.log`. Defaults to `true`.

**Notes:**
- Use `~` for home directory (automatically expanded)
- Paths are expanded before loading
- If no config file exists, only loads `./.env` from cwd (if present)
- Logging writes to `/tmp/opencode-dotenv.log` for debugging

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
  "load_cwd_env": true,
  "logging": {
    "enabled": true
  }
}
```

Result:
1. Loads `~/.config/opencode/.env`
2. Loads `./.env` from cwd (overrides any conflicts)
3. Logs all activity to `/tmp/opencode-dotenv.log`

### Load multiple global files without cwd .env

Config (`~/.config/opencode/opencode-dotenv.jsonc`):

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
 OPENCODE_API_KEY=your_api_key_here
 OPENCODE_DEBUG=true
 OPENCODE_MAX_TOKENS=100000
```

**Note:** This plugin cannot inject these variables into OpenCode's configuration loading process. To use `OPENCODE_API_KEY` in `opencode.jsonc`, set it in your shell profile (`~/.zshrc`, `~/.bashrc`) before starting OpenCode.

`./.env` (project-specific):
```bash
# Project-specific overrides
OPENCODE_DEBUG=false
PROJECT_API_KEY=project_specific_key
```

Result: `OPENCODE_DEBUG` will be `false` (from cwd), `OPENCODE_API_KEY` from global, `PROJECT_API_KEY` from cwd.

### Logging

View plugin activity logs:

```bash
tail -f /tmp/opencode-dotenv.log
```

Disable logging in config:

```jsonc
{
  "files": ["~/.config/opencode/.env"],
  "logging": {
    "enabled": false
  }
}
```

## Development

### Plugin structure

```
opencode-dotenv/
├── package.json
├── src/
│   └── index.ts
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
