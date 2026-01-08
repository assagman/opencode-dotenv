import { test, expect, describe } from "bun:test";
import { parseDotenv } from "../../src/test-utils";

describe("parseDotenv", () => {
  describe("empty and whitespace handling", () => {
    test("handles empty string", () => {
      const result = parseDotenv("");
      expect(result).toEqual({});
    });

    test("handles multiple empty lines", () => {
      const result = parseDotenv("\n\n\n");
      expect(result).toEqual({});
    });

    test("handles line with just spaces", () => {
      const result = parseDotenv("   \n\n\t\t\n");
      expect(result).toEqual({});
    });

    test("handles trailing spaces on values", () => {
      const result = parseDotenv("KEY=value   ");
      expect(result.KEY).toBe("value");
    });

    test("handles leading spaces on lines", () => {
      const result = parseDotenv("  KEY=value");
      expect(result.KEY).toBe("value");
    });

    test("handles tabs around key", () => {
      const result = parseDotenv("\tKEY=value");
      expect(result.KEY).toBe("value");
    });
  });

  describe("comment handling", () => {
    test("skips comment lines", () => {
      const result = parseDotenv("# This is a comment");
      expect(result).toEqual({});
    });

    test("skips multiple comment lines", () => {
      const result = parseDotenv("# comment 1\n# comment 2\n# comment 3");
      expect(result).toEqual({});
    });

    test("handles comments after values", () => {
      const result = parseDotenv("KEY=value # this is a comment");
      expect(result.KEY).toBe("value");
    });

    test("handles line with only comment marker", () => {
      const result = parseDotenv("#");
      expect(result).toEqual({});
    });

    test("handles empty lines between variables", () => {
      const result = parseDotenv("KEY1=value1\n\n\nKEY2=value2");
      expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });

    test("handles comments between variables", () => {
      const result = parseDotenv("KEY1=value1\n# comment\nKEY2=value2");
      expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });

    test("handles mixed empty lines and comments", () => {
      const result = parseDotenv(
        "KEY1=value1\n\n# comment\n\nKEY2=value2\n# another comment\n\n"
      );
      expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });
  });

  describe("variable parsing", () => {
    test("handles variables without export keyword", () => {
      const result = parseDotenv("KEY=value");
      expect(result.KEY).toBe("value");
    });

    test("handles variables with export keyword", () => {
      const result = parseDotenv("export KEY=value");
      expect(result.KEY).toBe("value");
    });

    test("handles multiple variables", () => {
      const result = parseDotenv("KEY1=value1\nKEY2=value2\nKEY3=value3");
      expect(result).toEqual({
        KEY1: "value1",
        KEY2: "value2",
        KEY3: "value3",
      });
    });

    test("handles key with numbers", () => {
      const result = parseDotenv("KEY123=value");
      expect(result.KEY123).toBe("value");
    });

    test("handles key with underscores", () => {
      const result = parseDotenv("KEY_NAME=value");
      expect(result.KEY_NAME).toBe("value");
    });
  });

  describe("quote handling", () => {
    test("handles double quoted values", () => {
      const result = parseDotenv('KEY="value with spaces"');
      expect(result.KEY).toBe("value with spaces");
    });

    test("handles single quoted values", () => {
      const result = parseDotenv("KEY='value with spaces'");
      expect(result.KEY).toBe("value with spaces");
    });

    test("handles unquoted values", () => {
      const result = parseDotenv("KEY=value");
      expect(result.KEY).toBe("value");
    });

    test("handles empty string value", () => {
      const result = parseDotenv('KEY=""');
      expect(result.KEY).toBe("");
    });

    test("handles empty single quoted value", () => {
      const result = parseDotenv("KEY=''");
      expect(result.KEY).toBe("");
    });
  });

  describe("special characters", () => {
    test("handles value with equals sign", () => {
      const result = parseDotenv('KEY="value=with=equals"');
      expect(result.KEY).toBe("value=with=equals");
    });

    test("handles value with special characters", () => {
      const result = parseDotenv('KEY="value-with_special.chars@symbol#"');
      expect(result.KEY).toBe("value-with_special.chars@symbol#");
    });

    test("handles value with underscores", () => {
      const result = parseDotenv("KEY=value_with_underscores");
      expect(result.KEY).toBe("value_with_underscores");
    });
  });

  describe("complex scenarios", () => {
    test("handles complex mixed scenario", () => {
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

`;

      const result = parseDotenv(content);

      expect(result).toEqual({
        DB_HOST: "localhost",
        DB_PORT: "5432",
        APP_NAME: "MyApp",
        APP_ENV: "production",
        DEBUG: "true",
        LOG_LEVEL: "info",
      });
    });
  });

  describe("type safety", () => {
    test("handles non-string content - null", () => {
      const result = parseDotenv(null as any);
      expect(result).toEqual({});
    });

    test("handles non-string content - undefined", () => {
      const result = parseDotenv(undefined as any);
      expect(result).toEqual({});
    });

    test("handles non-string content - number", () => {
      const result = parseDotenv(123 as any);
      expect(result).toEqual({});
    });

    test("handles non-string content - object", () => {
      const result = parseDotenv({} as any);
      expect(result).toEqual({});
    });
  });
});
