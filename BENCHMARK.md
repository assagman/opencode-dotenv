# Performance Benchmark

This script benchmarks the opencode-dotenv plugin performance.

## Running Benchmarks

```bash
bun benchmark.ts
```

## Results Summary

Latest benchmark results (averaged over 10 iterations):

| Test Case                              | Avg Time | Notes                             |
|----------------------------------------|-----------|------------------------------------|
| No config (default)                     | ~0.12 ms  | Baseline performance           |
| Single .env file (3 vars)              | ~0.09 ms  | Typical use case              |
| 5 .env files (10 vars total)           | ~0.20 ms  | Multiple configs              |
| Large .env file (100 vars)             | ~0.25 ms  | Large projects              |
| With logging enabled                     | ~0.10 ms  | Minimal overhead              |
| Subsequent calls (load guard)          | ~0.06 ms  | Instant return               |

**Key Findings:**
- ✅ All operations complete in <0.3ms (lightning fast)
- ✅ Load guard reduces subsequent calls to ~0.06ms
- ✅ Logging adds minimal overhead (<0.02ms)
- ✅ Performance is sub-millisecond for all common use cases

## Benchmark Methodology

- Warm-up: 3 iterations (not measured)
- Measured iterations: 10 (or 100 for load guard test)
- Environment: macOS with Bun runtime
- Precision: JavaScript `performance.now()` API

## What's Being Tested

1. **No config (default)**: Plugin with no configuration files
2. **Single .env file**: One .env file with 3 variables
3. **Multiple files**: 5 .env files with 10 total variables
4. **Large file**: Single .env file with 100 variables
5. **With logging**: Same as single file but with logging enabled
6. **Load guard**: Subsequent calls after first initialization
