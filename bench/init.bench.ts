/**
 * Initialization Performance Benchmarks
 * Tests cold start, config loading, and file loading performance
 */

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DotEnvPlugin } from "../src/index";
import { resetPlugin, getPerformanceReport } from "../src/test-utils";
import { runBenchmarks } from "./utils";

const CONFIG_NAME = "dotenv.jsonc";

async function main() {
  console.log("\n===========================================");
  console.log("  opencode-dotenv Initialization Benchmarks");
  console.log("===========================================\n");

  // Cold start benchmarks
  console.log("\n## Cold Start Performance\n");

  await runBenchmarks(
    [
      {
        name: "No config (default)",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-no-config-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
      {
        name: "Single .env file (3 vars)",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-single-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          writeFileSync(join(testDir, ".env"), "VAR1=value1\nVAR2=value2\nVAR3=value3\n");
          writeFileSync(
            join(testDir, CONFIG_NAME),
            JSON.stringify({ files: [join(testDir, ".env")], load_cwd_env: false })
          );
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
      {
        name: "5 .env files (10 vars total)",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-multiple-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          const envFiles = [];
          for (let i = 1; i <= 5; i++) {
            const envFile = join(testDir, `.env.${i}`);
            writeFileSync(envFile, `FILE${i}_VAR1=value1\nFILE${i}_VAR2=value2\n`);
            envFiles.push(envFile);
          }
          writeFileSync(
            join(testDir, CONFIG_NAME),
            JSON.stringify({ files: envFiles, load_cwd_env: false })
          );
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
      {
        name: "Large .env file (100 vars)",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-large-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          const envLines = [];
          for (let i = 1; i <= 100; i++) {
            envLines.push(`VAR${i}=value_${i}_with_some_longer_text_to_simulate_real_data`);
          }
          writeFileSync(join(testDir, ".env"), envLines.join("\n") + "\n");
          writeFileSync(
            join(testDir, CONFIG_NAME),
            JSON.stringify({ files: [join(testDir, ".env")], load_cwd_env: false })
          );
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
    ],
    { warmup: 5, iterations: 50 }
  );

  // Logging overhead benchmark
  console.log("\n## Logging Overhead\n");

  await runBenchmarks(
    [
      {
        name: "Without logging",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-no-log-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          writeFileSync(join(testDir, ".env"), "VAR1=value1\n");
          writeFileSync(
            join(testDir, CONFIG_NAME),
            JSON.stringify({ files: [join(testDir, ".env")], load_cwd_env: false })
          );
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
      {
        name: "With logging enabled",
        fn: async () => {
          const testDir = join(tmpdir(), `bench-log-${Date.now()}-${Math.random()}`);
          mkdirSync(testDir, { recursive: true });
          writeFileSync(join(testDir, ".env"), "VAR1=value1\n");
          writeFileSync(
            join(testDir, CONFIG_NAME),
            JSON.stringify({
              files: [join(testDir, ".env")],
              load_cwd_env: false,
              logging: { enabled: true },
            })
          );
          const originalCwd = process.cwd();
          try {
            process.chdir(testDir);
            resetPlugin();
            await DotEnvPlugin({} as any);
          } finally {
            process.chdir(originalCwd);
            rmSync(testDir, { recursive: true, force: true });
          }
        },
      },
    ],
    { warmup: 5, iterations: 50 }
  );

  // Load guard benchmark
  console.log("\n## Load Guard Performance\n");

  const guardTestDir = join(tmpdir(), `bench-guard-${Date.now()}`);
  mkdirSync(guardTestDir, { recursive: true });
  writeFileSync(join(guardTestDir, ".env"), "VAR1=value1\n");
  writeFileSync(
    join(guardTestDir, CONFIG_NAME),
    JSON.stringify({ files: [join(guardTestDir, ".env")], load_cwd_env: false })
  );
  const originalCwd = process.cwd();

  try {
    process.chdir(guardTestDir);
    resetPlugin();
    await DotEnvPlugin({} as any); // First call

    await runBenchmarks(
      [
        {
          name: "Subsequent calls (load guard)",
          fn: async () => {
            await DotEnvPlugin({} as any);
          },
        },
      ],
      { warmup: 10, iterations: 1000 }
    );
  } finally {
    process.chdir(originalCwd);
    rmSync(guardTestDir, { recursive: true, force: true });
  }

  // Print final profiler report
  console.log("\n## Final Profiler Report\n");
  const report = getPerformanceReport();
  console.log(JSON.stringify(report, null, 2));

  console.log("\n===========================================");
  console.log("  Benchmarks complete!");
  console.log("===========================================\n");
}

main().catch(console.error);
