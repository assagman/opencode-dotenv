# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-01-15



### Added
- CI workflow with tests and Codecov coverage
- Automated release PR workflow
- Automated publish workflow on PR merge (npm OIDC)
- Makefile workflow helpers (`wf-release`, `wf-ci`, etc.)
- Repository metadata in `package.json`

### Changed
- Updated `RELEASE.md` with automated release process documentation

## [0.5.1] - 2026-01-08

### Added
- New `docs/ARCHITECTURE.md` with comprehensive startup sequence diagrams
- Prominent limitation warning at top of README

### Fixed
- README: config file name corrected to `dotenv.jsonc` (was `opencode-dotenv.jsonc`)
- README: config search order corrected to local-first, then global
- README: log file path corrected to `~/.local/share/opencode/dotenv.log`
- README: logging default corrected to disabled (was incorrectly stated as enabled)

### Changed
- AGENTS.md: added critical architectural limitation section
- AGENTS.md: updated code organization to reflect current structure

## [0.5.0] - 2026-01-08

### Changed
- **BREAKING**: Restructured exports to fix OpenCode plugin compatibility
  - Only `DotEnvPlugin` is now exported (named + default)
  - Internal utilities (`parseDotenv`, `resetPlugin`, etc.) moved to internal module
- Reorganized project structure to match opencode-toolbox patterns
- Moved tests from `src/*.test.ts` to `test/unit/` and `test/integration/`
- Added strict TypeScript configuration (`tsconfig.json`)

### Added
- New `src/plugin.ts` with all plugin implementation
- New `src/test-utils.ts` for internal test utilities
- New `src/profiler/` module for performance tracking
- Type exports: `DotEnvConfig`, `PerformanceReport`, `FileLoadMetrics`
- `RELEASE.md` with release process documentation
- `BENCHMARK.md` with performance documentation
- `AGENTS.md` for AI agent guidance

### Fixed
- OpenCode plugin loader compatibility issue
  - Resolved `TypeError: fn3 is not a function` error
  - Resolved `TypeError: hook.config is not a function` error
- Clean exports prevent OpenCode from treating utilities as hooks

## [0.4.1] - 2026-01-05

### Fixed
- Handle non-string content in config parser to prevent crash

## [0.4.0] - 2026-01-05

### Added
- Comprehensive dotenv parsing with full test coverage
- Support for quoted values (single and double quotes)
- Support for inline comments
- Support for multiline values

## [0.3.8] - 2026-01-05

### Fixed
- Revert explicit hooks to avoid trace trap crash on OpenCode startup

## [0.3.7] - 2026-01-05

### Added
- Explicit empty hooks structure for OpenCode compatibility

## [0.3.6] - 2026-01-05

### Changed
- Prepare for release with OpenCode plugin compatibility fixes

## [0.3.5] - 2026-01-05

### Fixed
- Accept `PluginInput` parameter in plugin signature for OpenCode compatibility

## [0.3.4] - 2026-01-05

### Fixed
- Handle non-string input in `parseValue` function
- Add comprehensive tests for edge cases

## [0.3.3] - 2026-01-05

### Fixed
- Handle non-string input in `parseDotenv` to prevent runtime errors

## [0.3.2] - 2026-01-05

### Fixed
- Handle non-string input in `expandPath` to prevent runtime crash

## [0.3.1] - 2026-01-05

### Fixed
- Correct package URL in package.json

## [0.3.0] - 2026-01-05

### Added
- Improved error handling throughout the plugin
- Better documentation

### Changed
- More robust config file parsing

## [0.2.0] - 2026-01-04

### Added
- First public release
- Load `.env` files from configured paths
- Support for `~` home directory expansion
- JSONC config file support (`dotenv.jsonc`)
- Optional logging to file

## [0.1.1] - 2026-01-04

### Changed
- Prepare package for npm publish
- Add npm metadata

## [0.1.0] - 2026-01-03

### Added
- Initial implementation
- Basic dotenv file loading
- Plugin structure for OpenCode
