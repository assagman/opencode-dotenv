import { test, expect } from "bun:test"
import { parseDotenv } from "../src/index"

test("parseDotenv handles empty lines", () => {
  const result = parseDotenv("")

  expect(result).toEqual({})
})

test("parseDotenv handles multiple empty lines", () => {
  const result = parseDotenv("\n\n\n")

  expect(result).toEqual({})
})

test("parseDotenv skips comment lines", () => {
  const result = parseDotenv("# This is a comment")

  expect(result).toEqual({})
})

test("parseDotenv skips multiple comment lines", () => {
  const result = parseDotenv("# comment 1\n# comment 2\n# comment 3")

  expect(result).toEqual({})
})

test("parseDotenv handles comments after values", () => {
  const result = parseDotenv("KEY=value # this is a comment")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles empty lines between variables", () => {
  const result = parseDotenv("KEY1=value1\n\n\nKEY2=value2")

  expect(result).toEqual({ KEY1: "value1", KEY2: "value2" })
})

test("parseDotenv handles comments between variables", () => {
  const result = parseDotenv("KEY1=value1\n# comment\nKEY2=value2")

  expect(result).toEqual({ KEY1: "value1", KEY2: "value2" })
})

test("parseDotenv handles mixed empty lines and comments", () => {
  const result = parseDotenv(
    "KEY1=value1\n\n# comment\n\nKEY2=value2\n# another comment\n\n"
  )

  expect(result).toEqual({ KEY1: "value1", KEY2: "value2" })
})

test("parseDotenv handles variables without export keyword", () => {
  const result = parseDotenv("KEY=value")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles variables with export keyword", () => {
  const result = parseDotenv("export KEY=value")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles double quoted values", () => {
  const result = parseDotenv('KEY="value with spaces"')

  expect(result.KEY).toBe("value with spaces")
})

test("parseDotenv handles single quoted values", () => {
  const result = parseDotenv("KEY='value with spaces'")

  expect(result.KEY).toBe("value with spaces")
})

test("parseDotenv handles unquoted values", () => {
  const result = parseDotenv("KEY=value")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles multiple variables", () => {
  const result = parseDotenv("KEY1=value1\nKEY2=value2\nKEY3=value3")

  expect(result).toEqual({
    KEY1: "value1",
    KEY2: "value2",
    KEY3: "value3",
  })
})

test("parseDotenv handles trailing spaces", () => {
  const result = parseDotenv("KEY=value   ")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles leading spaces on lines", () => {
  const result = parseDotenv("  KEY=value")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles tabs around key", () => {
  const result = parseDotenv("\tKEY=value")

  expect(result.KEY).toBe("value")
})

test("parseDotenv handles empty string value", () => {
  const result = parseDotenv('KEY=""')

  expect(result.KEY).toBe("")
})

test("parseDotenv handles empty single quoted value", () => {
  const result = parseDotenv("KEY=''")

  expect(result.KEY).toBe("")
})

test("parseDotenv handles value with equals sign", () => {
  const result = parseDotenv('KEY="value=with=equals"')

  expect(result.KEY).toBe("value=with=equals")
})

test("parseDotenv handles complex mixed scenario", () => {
  const content = `
# Database configuration
export DB_HOST=localhost
export DB_PORT=5432

# App settings
APP_NAME=MyApp
APP_ENV="production"

# Empty line above
DEBUG=true

# More settings
LOG_LEVEL=info

`

  const result = parseDotenv(content)

  expect(result).toEqual({
    DB_HOST: "localhost",
    DB_PORT: "5432",
    APP_NAME: "MyApp",
    APP_ENV: "production",
    DEBUG: "true",
    LOG_LEVEL: "info",
  })
})

test("parseDotenv handles line with just spaces", () => {
  const result = parseDotenv("   \n\n\t\t\n")

  expect(result).toEqual({})
})

test("parseDotenv handles value with special characters", () => {
  const result = parseDotenv('KEY="value-with_special.chars@symbol#"')

  expect(result.KEY).toBe("value-with_special.chars@symbol#")
})

test("parseDotenv handles value with underscores", () => {
  const result = parseDotenv("KEY=value_with_underscores")

  expect(result.KEY).toBe("value_with_underscores")
})

test("parseDotenv handles key with numbers", () => {
  const result = parseDotenv("KEY123=value")

  expect(result.KEY123).toBe("value")
})

test("parseDotenv handles key with underscores", () => {
  const result = parseDotenv("KEY_NAME=value")

  expect(result.KEY_NAME).toBe("value")
})

test("parseDotenv handles line with only comment marker", () => {
  const result = parseDotenv("#")

  expect(result).toEqual({})
})

test("parseDotenv handles non-string content", () => {
  const result1 = parseDotenv(null as any)
  const result2 = parseDotenv(undefined as any)
  const result3 = parseDotenv(123 as any)
  const result4 = parseDotenv({} as any)

  expect(result1).toEqual({})
  expect(result2).toEqual({})
  expect(result3).toEqual({})
  expect(result4).toEqual({})
})
