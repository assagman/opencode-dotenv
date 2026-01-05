# AGENTS.md

OpenCode plugin that loads `.env` files at startup.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun test` | Run tests |
| `bun run build` | Build to `dist/` |

## Architecture

Single-file plugin (`src/index.ts`) with:
- `parseDotenv()` - Parse .env file content
- `expandPath()` - Resolve and validate file paths
- `loadConfig()` - Load plugin config from `~/.config/opencode/opencode-dotenv.jsonc`
- `DotEnvPlugin` - Main plugin export

## Code Style

- TypeScript strict mode
- No semicolons
- Double quotes for strings
- Functional patterns preferred
- Minimal dependencies

## Testing

Tests live in `src/index.test.ts`. Run with `bun test`.

Coverage expectations:
- All exported functions must have tests
- Edge cases: empty input, invalid input, malformed data
- Security: path traversal, invalid keys

When fixing bugs:
1. Add failing test first
2. Fix the bug
3. Verify test passes

## Security

Critical security constraints:
- Paths restricted to `$HOME` or `cwd` only
- Path traversal attempts must be rejected
- Env keys validated against `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Never trust user config input - validate everything

## Release Flow

```bash
# 1. Bump version in package.json
# 2. Commit and push
git add -A && git commit -m "fix: description"
git push

# 3. Create signed tag
git tag -s -m "Release vX.Y.Z" vX.Y.Z

# 4. Push tag
git push --follow-tags

# 5. Publish to npm (requires OTP)
npm publish --otp=<code>
```

## PR Guidelines

- Title: `type: description` (e.g., `fix: handle non-string input`)
- Run `bun test` before committing
- Run `bun run build` to verify compilation
- Keep changes minimal and focused
