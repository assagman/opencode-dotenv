// OpenCode DotEnv Plugin - Load .env files at startup
// Provides environment variable loading for OpenCode

export { DotEnvPlugin, DotEnvPlugin as default } from "./plugin";

// Re-export types for consumers
export type { DotEnvConfig } from "./plugin";
export type { PerformanceReport, FileLoadMetrics } from "./profiler";
