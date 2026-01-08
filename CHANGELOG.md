# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.4.1] - Previous

- Bug fixes and improvements

## [0.4.0] - Previous

- Initial profiler support

## [0.3.0] - Previous

- Added comprehensive dotenv parsing

## [0.2.0] - Previous

- First public release

## [0.1.0] - Previous

- Initial implementation
