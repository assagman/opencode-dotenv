import type { Plugin } from "@opencode-ai/plugin"
import { homedir } from "node:os"
import { parse } from "jsonc-parser"

const PLUGIN_NAME = "opencode-dotenv"
const LOG_FILE = "/tmp/opencode-dotenv.log"
const LOAD_GUARD = "__opencodeDotenvLoaded"

interface DotEnvConfig {
  files: string[]
  load_cwd_env?: boolean
  logging?: {
    enabled?: boolean
  }
}

function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const match = trimmed.match(/^export\s+([^=]+)=(.*)$/)
    const key = match ? match[1] : trimmed.split("=")[0]
    const value = match ? match[2] : trimmed.substring(key.length + 1)

    if (key) {
      let parsedValue = value.trim()
      if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
          (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
        parsedValue = parsedValue.slice(1, -1)
      }
      result[key.trim()] = parsedValue
    }
  }

  return result
}

function expandPath(path: string): string {
  return path.replace(/^~/, homedir())
}

let loggingEnabled = true

function logToFile(message: string): void {
  if (!loggingEnabled) return
  try {
    const timestamp = new Date().toISOString()
    Bun.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`)
  } catch (e) {
    // Silent fail
  }
}

async function loadConfig(): Promise<DotEnvConfig> {
  const configPaths = [
    `${homedir()}/.config/opencode/opencode-dotenv.jsonc`,
    `${process.cwd()}/opencode-dotenv.jsonc`
  ]

  for (const configPath of configPaths) {
    try {
      const file = Bun.file(configPath)
      if (!(await file.exists())) continue

      const content = await file.text()
      const config = parse(content, [], { allowTrailingComma: true }) as DotEnvConfig

      // Apply logging setting from config
      loggingEnabled = config.logging?.enabled !== false
      return config
    } catch (e) {
      logToFile(`Failed to load config: ${e}`)
    }
  }

  return { files: [], load_cwd_env: true }
}

async function loadDotenvFile(filePath: string): Promise<{ count: number; success: boolean }> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      logToFile(`File not found: ${filePath}`)
      return { count: 0, success: false }
    }

    const content = await file.text()
    const envVars = parseDotenv(content)

    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value
    }

    return { count: Object.keys(envVars).length, success: true }
  } catch (error) {
    logToFile(`Failed to load ${filePath}: ${error}`)
    return { count: 0, success: false }
  }
}

export const DotEnvPlugin: Plugin = async (ctx) => {
  if ((globalThis as any)[LOAD_GUARD]) {
    return {}
  }
  (globalThis as any)[LOAD_GUARD] = true

  logToFile("Plugin started")

  const config = await loadConfig()
  logToFile(`Config loaded: ${config.files.length} files, load_cwd_env=${config.load_cwd_env}, logging=${loggingEnabled}`)

  let totalFiles = 0
  let totalVars = 0

  for (const rawPath of config.files) {
    const filePath = expandPath(rawPath)
    logToFile(`Loading: ${filePath}`)
    const result = await loadDotenvFile(filePath)
    if (result.success) {
      totalFiles++
      totalVars += result.count
      logToFile(`Loaded ${result.count} vars`)
    }
  }

  if (config.load_cwd_env !== false) {
    const cwdEnvPath = `${process.cwd()}/.env`
    logToFile(`Loading cwd: ${cwdEnvPath}`)
    const result = await loadDotenvFile(cwdEnvPath)
    if (result.success) {
      totalFiles++
      totalVars += result.count
      logToFile(`Loaded ${result.count} vars from cwd`)
    }
  }

  logToFile(`Plugin finished: ${totalFiles} files, ${totalVars} vars`)

  return {}
}

export default DotEnvPlugin
