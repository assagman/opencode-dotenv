import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { DotEnvPlugin, parseDotenv, parseValue, expandPath, isValidEnvKey } from "./index"
import { tmpdir } from "node:os"
import { mkdirSync } from "node:fs"

const LOAD_GUARD = "__opencodeDotenvLoaded"

function makeTempDir(): string {
  const path = `${tmpdir()}/opencode-test-${Date.now()}-${Math.random()}`
  mkdirSync(path, { recursive: true })
  return path
}

describe("parseDotenv", () => {
  it("parses simple key=value pairs", () => {
    const result = parseDotenv("KEY=value\nANOTHER=test")
    expect(result).toEqual({ KEY: "value", ANOTHER: "test" })
  })

  it("handles export prefix", () => {
    const result = parseDotenv("export KEY=value\nexport ANOTHER=test")
    expect(result).toEqual({ KEY: "value", ANOTHER: "test" })
  })

  it("skips comments and empty lines", () => {
    const result = parseDotenv("# comment\nKEY=value\n\n# another comment\nKEY2=value2")
    expect(result).toEqual({ KEY: "value", KEY2: "value2" })
  })

  it("handles double-quoted values with escape sequences", () => {
    const result = parseDotenv('KEY="hello\\nworld"')
    expect(result.KEY).toBe("hello\nworld")
  })

  it("handles single-quoted values literally", () => {
    const result = parseDotenv("KEY='hello\\nworld'")
    expect(result.KEY).toBe("hello\\nworld")
  })

  it("handles inline comments in unquoted values", () => {
    const result = parseDotenv("KEY=value # this is a comment")
    expect(result.KEY).toBe("value")
  })

  it("handles backslash continuation", () => {
    const result = parseDotenv("KEY=hello\\\nworld")
    expect(result.KEY).toBe("helloworld")
  })

  it("rejects invalid key names", () => {
    const result = parseDotenv("VALID_KEY=yes\n123INVALID=no\nALSO-INVALID=no")
    expect(result).toEqual({ VALID_KEY: "yes" })
  })

  it("handles escaped quotes in double-quoted strings", () => {
    const result = parseDotenv('KEY="say \\"hello\\""')
    expect(result.KEY).toBe('say "hello"')
  })

  it("handles values with equals signs", () => {
    const result = parseDotenv("KEY=value=with=equals")
    expect(result.KEY).toBe("value=with=equals")
  })

  it("handles empty values", () => {
    const result = parseDotenv("KEY=")
    expect(result.KEY).toBe("")
  })

  it("returns empty object for non-string input", () => {
    expect(parseDotenv(undefined as unknown as string)).toEqual({})
    expect(parseDotenv(null as unknown as string)).toEqual({})
    expect(parseDotenv(123 as unknown as string)).toEqual({})
    expect(parseDotenv({} as unknown as string)).toEqual({})
    expect(parseDotenv([] as unknown as string)).toEqual({})
  })

  it("returns empty object for empty string", () => {
    expect(parseDotenv("")).toEqual({})
  })

  it("returns empty object for whitespace only", () => {
    expect(parseDotenv("   \n\t\n   ")).toEqual({})
  })

  it("returns empty object for comments only", () => {
    expect(parseDotenv("# comment\n# another")).toEqual({})
  })

  it("skips lines without equals sign", () => {
    const result = parseDotenv("NOEQUALS\nKEY=value\nANOTHERNOEQUALS")
    expect(result).toEqual({ KEY: "value" })
  })

  it("skips lines with only equals sign", () => {
    const result = parseDotenv("=\nKEY=value\n=value")
    expect(result).toEqual({ KEY: "value" })
  })

  it("trims whitespace around keys", () => {
    const result = parseDotenv("  KEY  =value")
    expect(result).toEqual({ KEY: "value" })
  })

  it("keeps trailing backslash when no continuation line exists", () => {
    const result = parseDotenv("KEY=value\\")
    expect(result.KEY).toBe("value\\")
  })

  it("handles multiple continuations", () => {
    const result = parseDotenv("KEY=a\\\nb\\\nc")
    expect(result.KEY).toBe("abc")
  })

  it("handles Windows line endings", () => {
    const result = parseDotenv("KEY=value\r\nKEY2=value2\r\n")
    expect(result.KEY).toBe("value")
    expect(result.KEY2).toBe("value2")
  })

  it("handles mixed export and non-export", () => {
    const result = parseDotenv("KEY1=a\nexport KEY2=b\nKEY3=c")
    expect(result).toEqual({ KEY1: "a", KEY2: "b", KEY3: "c" })
  })

  it("handles all escape sequences in double quotes", () => {
    const result = parseDotenv('KEY="\\n\\r\\t\\"\\\\"')
    expect(result.KEY).toBe('\n\r\t"\\')
  })

  it("handles empty quoted strings", () => {
    expect(parseDotenv('KEY=""').KEY).toBe("")
    expect(parseDotenv("KEY=''").KEY).toBe("")
  })

  it("handles comment character inside double quotes", () => {
    const result = parseDotenv('KEY="value # not a comment"')
    expect(result.KEY).toBe("value # not a comment")
  })

  it("handles comment character inside single quotes", () => {
    const result = parseDotenv("KEY='value # not a comment'")
    expect(result.KEY).toBe("value # not a comment")
  })

  it("strips inline comment after double quoted value", () => {
    const result = parseDotenv('KEY="12" # inline comment')
    expect(result.KEY).toBe("12")
  })

  it("strips inline comment after single quoted value", () => {
    const result = parseDotenv("KEY='12' # inline comment")
    expect(result.KEY).toBe("12")
  })

  it("handles unclosed double quote", () => {
    const result = parseDotenv('KEY="unclosed')
    expect(result.KEY).toBe('"unclosed')
  })

  it("handles unclosed single quote", () => {
    const result = parseDotenv("KEY='unclosed")
    expect(result.KEY).toBe("'unclosed")
  })

  it("handles export with extra spaces", () => {
    const result = parseDotenv("export   KEY=value")
    expect(result).toEqual({ KEY: "value" })
  })

  it("later values override earlier ones", () => {
    const result = parseDotenv("KEY=first\nKEY=second")
    expect(result.KEY).toBe("second")
  })

  it("handles unicode in values", () => {
    const result = parseDotenv("KEY=こんにちは\nKEY2=🎉")
    expect(result.KEY).toBe("こんにちは")
    expect(result.KEY2).toBe("🎉")
  })

  it("handles tabs in values", () => {
    const result = parseDotenv("KEY=hello\tworld")
    expect(result.KEY).toBe("hello\tworld")
  })

  it("handles blank lines between variables", () => {
    const result = parseDotenv("A=1\n\nB=2\nC=3")
    expect(result).toEqual({ A: "1", B: "2", C: "3" })
  })

  it("handles multiple consecutive blank lines", () => {
    const result = parseDotenv("A=1\n\n\n\nB=2")
    expect(result).toEqual({ A: "1", B: "2" })
  })
})

describe("parseValue", () => {
  it("trims unquoted values", () => {
    expect(parseValue("  value  ")).toBe("value")
  })

  it("removes double quotes", () => {
    expect(parseValue('"hello world"')).toBe("hello world")
  })

  it("removes single quotes", () => {
    expect(parseValue("'hello world'")).toBe("hello world")
  })

  it("handles escape sequences in double quotes", () => {
    expect(parseValue('"line1\\nline2"')).toBe("line1\nline2")
    expect(parseValue('"tab\\there"')).toBe("tab\there")
    expect(parseValue('"back\\\\slash"')).toBe("back\\slash")
  })

  it("preserves escape sequences in single quotes", () => {
    expect(parseValue("'line1\\nline2'")).toBe("line1\\nline2")
  })

  it("strips inline comments from unquoted values", () => {
    expect(parseValue("value # comment")).toBe("value")
  })

  it("returns empty string for non-string input", () => {
    expect(parseValue(undefined as unknown as string)).toBe("")
    expect(parseValue(null as unknown as string)).toBe("")
    expect(parseValue(123 as unknown as string)).toBe("")
    expect(parseValue({} as unknown as string)).toBe("")
  })

  it("returns original value for unclosed double quote", () => {
    expect(parseValue('"unclosed')).toBe('"unclosed')
  })

  it("returns original value for unclosed single quote", () => {
    expect(parseValue("'unclosed")).toBe("'unclosed")
  })

  it("handles empty string", () => {
    expect(parseValue("")).toBe("")
  })

  it("handles whitespace only", () => {
    expect(parseValue("   ")).toBe("")
  })

  it("handles empty double quoted string", () => {
    expect(parseValue('""')).toBe("")
  })

  it("handles empty single quoted string", () => {
    expect(parseValue("''")).toBe("")
  })

  it("handles escaped backslash at end of double quoted string", () => {
    expect(parseValue('"end\\\\"')).toBe("end\\")
  })

  it("handles all escape sequences", () => {
    expect(parseValue('"\\r"')).toBe("\r")
    expect(parseValue('"\\t"')).toBe("\t")
    expect(parseValue('"\\\\"')).toBe("\\")
  })

  it("handles value with only quote character", () => {
    expect(parseValue('"')).toBe('"')
    expect(parseValue("'")).toBe("'")
  })

  it("handles multiple spaces before comment", () => {
    expect(parseValue("value    # comment")).toBe("value")
  })

  it("does not strip # without leading space", () => {
    expect(parseValue("value#notcomment")).toBe("value#notcomment")
  })
})

describe("isValidEnvKey", () => {
  it("accepts valid keys", () => {
    expect(isValidEnvKey("VALID")).toBe(true)
    expect(isValidEnvKey("_UNDERSCORE")).toBe(true)
    expect(isValidEnvKey("WITH_123")).toBe(true)
    expect(isValidEnvKey("lowercase")).toBe(true)
    expect(isValidEnvKey("MixedCase")).toBe(true)
  })

  it("rejects invalid keys", () => {
    expect(isValidEnvKey("123START")).toBe(false)
    expect(isValidEnvKey("HAS-DASH")).toBe(false)
    expect(isValidEnvKey("HAS SPACE")).toBe(false)
    expect(isValidEnvKey("")).toBe(false)
    expect(isValidEnvKey("has.dot")).toBe(false)
  })

  it("accepts single character keys", () => {
    expect(isValidEnvKey("A")).toBe(true)
    expect(isValidEnvKey("_")).toBe(true)
  })

  it("rejects special characters", () => {
    expect(isValidEnvKey("KEY!")).toBe(false)
    expect(isValidEnvKey("KEY@VALUE")).toBe(false)
    expect(isValidEnvKey("KEY$")).toBe(false)
    expect(isValidEnvKey("KEY=")).toBe(false)
  })
})

describe("expandPath", () => {
  it("expands ~ to home directory", () => {
    const home = process.env.HOME!
    const result = expandPath("~/.config/test")
    expect(result).toBe(`${home}/.config/test`)
  })

  it("rejects paths outside home and cwd", () => {
    const result = expandPath("/etc/passwd")
    expect(result).toBeNull()
  })

  it("accepts paths within home directory", () => {
    const home = process.env.HOME!
    const result = expandPath(`${home}/some/path`)
    expect(result).toBe(`${home}/some/path`)
  })

  it("accepts paths within current working directory", () => {
    const cwd = process.cwd()
    const result = expandPath(`${cwd}/subdir/file`)
    expect(result).toBe(`${cwd}/subdir/file`)
  })

  it("rejects path traversal attempts", () => {
    const result = expandPath("~/../../../etc/passwd")
    expect(result).toBeNull()
  })

  it("returns null for non-string input", () => {
    expect(expandPath(undefined as unknown as string)).toBeNull()
    expect(expandPath(null as unknown as string)).toBeNull()
    expect(expandPath(123 as unknown as string)).toBeNull()
    expect(expandPath({} as unknown as string)).toBeNull()
  })

  it("handles tilde only", () => {
    const home = process.env.HOME!
    expect(expandPath("~")).toBe(home)
  })

  it("handles relative paths within cwd", () => {
    const cwd = process.cwd()
    const result = expandPath("./subdir")
    expect(result).toBe(`${cwd}/subdir`)
  })

  it("rejects paths with double dot traversal", () => {
    expect(expandPath("/tmp/../etc/passwd")).toBeNull()
  })

  it("normalizes redundant slashes", () => {
    const home = process.env.HOME!
    const result = expandPath(`${home}//subdir///file`)
    expect(result).toBe(`${home}/subdir/file`)
  })
})

describe("DotEnvPlugin", () => {
  beforeEach(() => {
    delete process.env.TEST_VAR
    delete process.env.PREFIXED_TEST_VAR
    delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
  })

  afterEach(() => {
    delete process.env.TEST_VAR
    delete process.env.PREFIXED_TEST_VAR
    delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
  })

  it("loads .env from cwd by default", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempDir = makeTempDir()
      const tempHome = makeTempDir()

      process.chdir(tempDir)
      process.env.HOME = tempHome

      await Bun.write(`${tempDir}/.env`, "TEST_VAR=should_be_loaded")

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("should_be_loaded")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("respects load_cwd_env=false from global config", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      mkdirSync(`${tempHome}/.config/opencode`, { recursive: true })
      await Bun.write(
        `${tempHome}/.config/opencode/opencode-dotenv.jsonc`,
        JSON.stringify({ files: [], load_cwd_env: false })
      )

      process.chdir(tempDir)
      await Bun.write(`${tempDir}/.env`, "TEST_VAR=should_not_load")

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBeUndefined()
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("applies prefix to loaded variables", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      mkdirSync(`${tempHome}/.config/opencode`, { recursive: true })
      await Bun.write(
        `${tempHome}/.config/opencode/opencode-dotenv.jsonc`,
        JSON.stringify({ files: [], load_cwd_env: true, prefix: "PREFIXED_" })
      )

      process.chdir(tempDir)
      await Bun.write(`${tempDir}/.env`, "TEST_VAR=prefixed_value")

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBeUndefined()
      expect(process.env.PREFIXED_TEST_VAR).toBe("prefixed_value")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("prevents double loading via guard", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempDir = makeTempDir()
      const tempHome = makeTempDir()

      process.chdir(tempDir)
      process.env.HOME = tempHome

      await Bun.write(`${tempDir}/.env`, "TEST_VAR=first_load")

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("first_load")

      await Bun.write(`${tempDir}/.env`, "TEST_VAR=second_load")
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("first_load")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("loads files from config in order", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      await Bun.write(`${envDir}/.env.first`, "TEST_VAR=first")
      await Bun.write(`${envDir}/.env.second`, "TEST_VAR=second")
      await Bun.write(
        `${envDir}/opencode-dotenv.jsonc`,
        JSON.stringify({
          files: ["~/.config/opencode/.env.first", "~/.config/opencode/.env.second"],
          load_cwd_env: false,
        })
      )

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("second")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("rejects paths outside allowed directories (security)", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      await Bun.write(
        `${envDir}/opencode-dotenv.jsonc`,
        JSON.stringify({
          files: ["/etc/passwd", "/tmp/../etc/shadow"],
          load_cwd_env: false,
        })
      )

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBeUndefined()
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles malformed config file gracefully", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      await Bun.write(`${envDir}/opencode-dotenv.jsonc`, "{ invalid json }")
      await Bun.write(`${tempDir}/.env`, "TEST_VAR=from_cwd")

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("from_cwd")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles non-existent file in config gracefully", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      await Bun.write(
        `${envDir}/opencode-dotenv.jsonc`,
        JSON.stringify({
          files: ["~/.config/opencode/.env.nonexistent"],
          load_cwd_env: false,
        })
      )

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBeUndefined()
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles config with logging disabled", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      await Bun.write(
        `${envDir}/opencode-dotenv.jsonc`,
        JSON.stringify({
          files: [],
          load_cwd_env: true,
          logging: { enabled: false },
        })
      )

      await Bun.write(`${tempDir}/.env`, "TEST_VAR=logged")

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("logged")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles cwd .env file not existing", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome
      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.NONEXISTENT_VAR).toBeUndefined()
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles unreadable config file gracefully", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const configDir = `${tempHome}/.config/opencode`
      mkdirSync(configDir, { recursive: true })
      mkdirSync(`${configDir}/opencode-dotenv.jsonc`)

      await Bun.write(`${tempDir}/.env`, "TEST_VAR=fallback")
      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.TEST_VAR).toBe("fallback")
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })

  it("handles unreadable .env file in config gracefully", async () => {
    const originalCwd = process.cwd()
    const originalHome = process.env.HOME

    try {
      const tempHome = makeTempDir()
      const tempDir = makeTempDir()

      process.env.HOME = tempHome

      const envDir = `${tempHome}/.config/opencode`
      mkdirSync(envDir, { recursive: true })

      mkdirSync(`${envDir}/.env.dir`)

      await Bun.write(
        `${envDir}/opencode-dotenv.jsonc`,
        JSON.stringify({
          files: [`${envDir}/.env.dir`],
          load_cwd_env: false,
        })
      )

      process.chdir(tempDir)

      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
      await DotEnvPlugin({})

      expect(process.env.UNREADABLE_VAR).toBeUndefined()
    } finally {
      process.chdir(originalCwd)
      process.env.HOME = originalHome
      delete (globalThis as Record<string, unknown>)[LOAD_GUARD]
    }
  })
})
