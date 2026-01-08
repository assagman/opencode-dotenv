// OpenCode DotEnv Plugin - Load .env files at startup
// Parses environment files and makes variables available to OpenCode

import type { Plugin } from "@opencode-ai/plugin";
import { homedir } from "node:os";
import { appendFile, mkdir } from "node:fs/promises";
import { parse } from "jsonc-parser";
import { globalProfiler } from "./profiler";

const CONFIG_NAME = "dotenv.jsonc";
const LOG_DIR = `${homedir()}/.local/share/opencode`;
const LOG_FILE = `${LOG_DIR}/dotenv.log`;
const LOAD_GUARD = "__opencodeDotenvLoaded";

/**
 * Configuration for the dotenv plugin
 */
export interface DotEnvConfig {
  files: string[];
  load_cwd_env?: boolean;
  logging?: {
    enabled?: boolean;
  };
}

/**
 * Check if running in test environment
 */
const isTestEnv = process.env.NODE_ENV === "test" || !!process.env.BUN_TEST;

let loggingEnabled = false;

/**
 * Safe logging helper - writes to ~/.local/share/opencode/dotenv.log
 * Never blocks or throws. Skips logging in test environment.
 */
function log(message: string): void {
  if (!loggingEnabled || isTestEnv) return;

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  // Fire and forget - never block
  mkdir(LOG_DIR, { recursive: true })
    .then(() => appendFile(LOG_FILE, line))
    .catch(() => {
      // Ignore errors - never block
    });
}

/**
 * Parse .env file content into key-value pairs
 * Handles comments, quotes, export statements, and inline comments
 */
export function parseDotenv(content: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (typeof content !== "string") return result;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^export\s+([^=]+)=(.*)$/);
    const key = match ? match[1] : trimmed.split("=")[0];
    if (!key) continue;
    
    const value = match ? match[2] : trimmed.substring(key.length + 1);
    if (value === undefined) continue;

    let parsedValue = value.trim();

    if (!parsedValue.startsWith('"') && !parsedValue.startsWith("'")) {
      const inlineCommentIndex = parsedValue.indexOf(" #");
      if (inlineCommentIndex !== -1) {
        parsedValue = parsedValue.substring(0, inlineCommentIndex).trim();
      }
    }

    if (
      (parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
      (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
    ) {
      parsedValue = parsedValue.slice(1, -1);
    }
    result[key.trim()] = parsedValue;
  }

  return result;
}

/**
 * Expand ~ to home directory in paths
 */
function expandPath(path: string): string {
  return path.replace(/^~/, homedir());
}

/**
 * Load configuration from dotenv.jsonc
 * Searches local directory first, then global config
 */
async function loadConfig(): Promise<{
  config: DotEnvConfig;
  path: string | null;
}> {
  const timer = globalProfiler.startTimer("config.load");

  const configPaths = [
    `${process.cwd()}/${CONFIG_NAME}`,
    `${homedir()}/.config/opencode/${CONFIG_NAME}`,
  ];

  for (const configPath of configPaths) {
    try {
      const file = Bun.file(configPath);
      const content = await file.text();

      if (!content || typeof content !== "string") {
        continue;
      }

      const config = parse(content, [], {
        allowTrailingComma: true,
      }) as DotEnvConfig;

      if (config && typeof config === "object" && Array.isArray(config.files)) {
        // Apply logging setting from config
        loggingEnabled = config.logging?.enabled === true;
        const duration = timer();
        globalProfiler.recordConfigLoad(duration, configPath);
        return { config, path: configPath };
      }
    } catch {
      // Try next path
    }
  }

  timer();
  return { config: { files: [], load_cwd_env: true }, path: null };
}

/**
 * Load a single .env file and set environment variables
 */
async function loadDotenvFile(
  filePath: string,
): Promise<{ count: number; success: boolean }> {
  const start = performance.now();

  try {
    const file = Bun.file(filePath);
    const content = await file.text();

    if (typeof content !== "string" || !content) {
      const duration = performance.now() - start;
      globalProfiler.recordFileLoad(
        filePath,
        duration,
        0,
        false,
        "Empty or invalid content",
      );
      log(`Invalid or empty content from ${filePath}`);
      return { count: 0, success: false };
    }

    const envVars = parseDotenv(content);
    const count = Object.keys(envVars).length;

    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }

    const duration = performance.now() - start;
    globalProfiler.recordFileLoad(filePath, duration, count, true);
    return { count, success: true };
  } catch (error) {
    const duration = performance.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    globalProfiler.recordFileLoad(filePath, duration, 0, false, errorMsg);
    log(`Failed to load ${filePath}: ${errorMsg}`);
    return { count: 0, success: false };
  }
}

/**
 * Get performance report from the profiler
 */
export function getPerformanceReport() {
  return globalProfiler.export();
}

/**
 * Reset the profiler and load guard (for testing/benchmarking)
 */
export function resetPlugin(): void {
  globalProfiler.reset();
  delete (globalThis as any)[LOAD_GUARD];
}

/**
 * OpenCode DotEnv Plugin
 * Loads environment variables from .env files at startup
 */
export const DotEnvPlugin: Plugin = async (_ctx) => {
  // Load guard - prevent double initialization
  if ((globalThis as any)[LOAD_GUARD]) {
    return {};
  }
  (globalThis as any)[LOAD_GUARD] = true;

  // Start profiling
  globalProfiler.initStart();
  log("Plugin started");

  // Load config
  const { config, path: configPath } = await loadConfig();
  log(
    `Config loaded from ${configPath || "default"}: ${config.files.length} files, load_cwd_env=${config.load_cwd_env}, logging=${loggingEnabled}`,
  );

  // Prepare all files to load
  const filesToLoad = [...config.files.map(expandPath)];
  if (config.load_cwd_env !== false) {
    filesToLoad.push(`${process.cwd()}/.env`);
  }

  // Load files in sequence to maintain order (later files override earlier ones)
  let totalFiles = 0;
  let totalVars = 0;

  for (const filePath of filesToLoad) {
    log(`Loading: ${filePath}`);
    const result = await loadDotenvFile(filePath);
    if (result.success) {
      totalFiles++;
      totalVars += result.count;
      log(`Loaded ${result.count} vars from ${filePath}`);
    }
  }

  // Complete profiling
  globalProfiler.initComplete("ready");

  const initDuration = globalProfiler.getInitDuration();
  log(
    `Plugin finished: ${totalFiles} files, ${totalVars} vars in ${initDuration?.toFixed(2)}ms`,
  );

  return {};
};
