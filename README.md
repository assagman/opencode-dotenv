# opencode-dotenv

OpenCode plugin to load `.env` files at startup.

## Setup

Add to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-dotenv"]
}
```

## Config

Create `~/.config/opencode/opencode-dotenv.jsonc`:

```jsonc
{
  "files": ["~/.config/opencode/.env"],
  "load_cwd_env": true,
  "prefix": "", // or "MYAPP_"
  "logging": { "enabled": true }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `files` | `[]` | `.env` files to load (later overrides earlier) |
| `load_cwd_env` | `true` | Load `.env` from cwd |
| `prefix` | `""` | Prefix for all variable names |
| `logging.enabled` | `true` | Log to `/tmp/opencode-dotenv.log` |

## .env Format

```bash
KEY=value
export EXPORTED=value
QUOTED="with spaces"
SINGLE='literal'
MULTILINE=first\
second
INLINE=value # comment stripped
ESCAPES="line1\nline2\ttab"
```

## Security

- Paths restricted to `$HOME` or cwd
- Path traversal rejected
- Keys validated: `^[a-zA-Z_][a-zA-Z0-9_]*$`

## Debug

```bash
tail -f /tmp/opencode-dotenv.log
```

## License

MIT
