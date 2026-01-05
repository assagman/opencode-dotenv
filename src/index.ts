import type { Plugin } from "@opencode-ai/plugin"
import { parse } from "jsonc-parser"
import { resolve, normalize } from "node:path"
import { homedir as osHomedir } from "node:os"

const LOG_FILE = "/tmp/opencode-dotenv.log"
const LOAD_GUARD = "__opencodeDotenvLoaded"
const VALID_ENV_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function getHomeDir(): string {
  return process.env.HOME ?? osHomedir()
}

interface DotEnvConfig {
  files: string[]
  load_cwd_env?: boolean
  prefix?: string
  logging?: {
    enabled?: boolean
  }
}

function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (typeof content !== "string") return result
  const lines = content.split("\n")
  let i = 0

  while (i < lines.length) {
    let line = lines[i].trim()
    i++

    if (!line || line.startsWith("#")) continue

    while (line.endsWith("\\") && i < lines.length) {
      line = line.slice(0, -1) + lines[i]
      i++
    }

    const exportMatch = line.match(/^export\s+(.*)$/)
    if (exportMatch) {
      line = exportMatch[1]
    }

    const eqIndex = line.indexOf("=")
    if (eqIndex === -1) continue

    const key = line.substring(0, eqIndex).trim()
    const value = parseValue(line.substring(eqIndex + 1))

    if (key && isValidEnvKey(key)) {
      result[key] = value
    }
  }

  return result
}

function parseValue(raw: string): string {
  if (typeof raw !== "string") return ""
  let value = raw.trim()

  if (value.startsWith('"')) {
    const endQuote = findClosingQuote(value, '"')
    if (endQuote !== -1) {
      value = value.substring(1, endQuote)
      return value
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    }
    return value
  }

  if (value.startsWith("'")) {
    const endQuote = findClosingQuote(value, "'")
    if (endQuote !== -1) {
      return value.substring(1, endQuote)
    }
    return value
  }

  const inlineCommentIndex = value.indexOf(" #")
  if (inlineCommentIndex !== -1) {
    value = value.substring(0, inlineCommentIndex)
  }

  return value.trim()
}

function findClosingQuote(str: string, quote: string): number {
  let i = 1
  while (i < str.length) {
    if (str[i] === "\\" && i + 1 < str.length) {
      i += 2
      continue
    }
    if (str[i] === quote) {
      return i
    }
    i++
  }
  return -1
}

function isValidEnvKey(key: string): boolean {
  return VALID_ENV_KEY.test(key)
}

function expandPath(rawPath: string): string | null {
  if (typeof rawPath !== "string") {
    return null
  }
  const home = getHomeDir()
  const expanded = rawPath.replace(/^~/, home)
  const resolved = resolve(expanded)
  const normalized = normalize(resolved)

  const cwd = process.cwd()

  const isWithinAllowedDirectory =
    normalized.startsWith(home) || normalized.startsWith(cwd)

  return isWithinAllowedDirectory ? normalized : null
}

let loggingEnabled = true
let logBuffer: string[] = []
let flushScheduled = false

function logToFile(message: string): void {
  if (!loggingEnabled) return

  const timestamp = new Date().toISOString()
  logBuffer.push(`[${timestamp}] ${message}`)

  if (!flushScheduled) {
    flushScheduled = true
    queueMicrotask(flushLogs)
  }
}

async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) {
    flushScheduled = false
    return
  }

  const messages = logBuffer.join("\n") + "\n"
  logBuffer = []
  flushScheduled = false

  try {
    const file = Bun.file(LOG_FILE)
    const existing = (await file.exists()) ? await file.text() : ""
    await Bun.write(LOG_FILE, existing + messages)
  } catch {
    loggingEnabled = false
  }
}

async function loadConfig(): Promise<DotEnvConfig> {
  const configPath = `${getHomeDir()}/.config/opencode/opencode-dotenv.jsonc`

  try {
    const file = Bun.file(configPath)
    if (await file.exists()) {
      const content = await file.text()
      const config = parse(content, [], {
        allowTrailingComma: true,
      }) as DotEnvConfig | undefined

      if (!config || !Array.isArray(config.files)) {
        logToFile("Invalid config format, using defaults")
        return { files: [], load_cwd_env: true }
      }

      loggingEnabled = config.logging?.enabled !== false
      return config
    }
  } catch (e) {
    logToFile(`Failed to load config: ${e}`)
  }

  return { files: [], load_cwd_env: true }
}

async function loadDotenvFile(
  filePath: string,
  prefix?: string
): Promise<{ count: number; success: boolean }> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      logToFile(`File not found: ${filePath}`)
      return { count: 0, success: false }
    }

    const content = await file.text()
    const envVars = parseDotenv(content)

    for (const [key, value] of Object.entries(envVars)) {
      const envKey = prefix ? `${prefix}${key}` : key
      process.env[envKey] = value
    }

    return { count: Object.keys(envVars).length, success: true }
  } catch (error) {
    logToFile(`Failed to load ${filePath}: ${error}`)
    return { count: 0, success: false }
  }
}

export const DotEnvPlugin: Plugin = async () => {
  if ((globalThis as Record<string, unknown>)[LOAD_GUARD]) {
    return {}
  }
  (globalThis as Record<string, unknown>)[LOAD_GUARD] = true

  logToFile("Plugin started")

  const config = await loadConfig()
  logToFile(
    `Config loaded: ${config.files.length} files, load_cwd_env=${config.load_cwd_env}, prefix=${config.prefix ?? "(none)"}, logging=${loggingEnabled}`
  )

  let totalFiles = 0
  let totalVars = 0

  for (const rawPath of config.files) {
    const filePath = expandPath(rawPath)
    if (!filePath) {
      logToFile(`SECURITY: Rejected path outside allowed directories: ${rawPath}`)
      continue
    }

    logToFile(`Loading: ${filePath}`)
    const result = await loadDotenvFile(filePath, config.prefix)
    if (result.success) {
      totalFiles++
      totalVars += result.count
      logToFile(`Loaded ${result.count} vars`)
    }
  }

  if (config.load_cwd_env !== false) {
    const cwdEnvPath = `${process.cwd()}/.env`
    logToFile(`Loading cwd: ${cwdEnvPath}`)
    const result = await loadDotenvFile(cwdEnvPath, config.prefix)
    if (result.success) {
      totalFiles++
      totalVars += result.count
      logToFile(`Loaded ${result.count} vars from cwd`)
    }
  }

  logToFile(`Plugin finished: ${totalFiles} files, ${totalVars} vars`)

  await flushLogs()

  return {}
}

export default DotEnvPlugin

export { parseDotenv, parseValue, expandPath, isValidEnvKey }
