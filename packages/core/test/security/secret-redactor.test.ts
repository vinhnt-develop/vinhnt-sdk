import { describe, it, expect } from "vitest";
import { redactSecrets, detectSecrets, createRedactingLogger } from "@vinhnt-sdk/security";

describe("SecretRedactor", () => {
  describe("redactSecrets", () => {
    it("TC01_redacts_openai_key", () => {
      const input = "API key: sk-1234567890abcdef1234567890abcdef";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:openai-key]");
      expect(result).not.toContain("sk-1234");
    });

    it("TC02_redacts_anthropic_key", () => {
      const input = "Key: sk-ant-1234567890abcdef1234567890abcdef";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:anthropic-key]");
    });

    it("TC03_redacts_google_ai_key", () => {
      const input = "Key: AIzaSyA1234567890abcdefghijklmnopqrstuv";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:google-ai-key]");
    });

    it("TC04_redacts_bearer_token", () => {
      const input = "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456";
      const result = redactSecrets(input);
      expect(result).toContain("Bearer [REDACTED:token]");
    });

    it("TC05_redacts_github_token", () => {
      const input = "Token: ghp_abcdefghijklmnopqrstuvwxyz1234567890";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:github-token]");
    });

    it("TC06_redacts_private_key", () => {
      const input = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:private-key]");
    });

    it("TC07_preserves_clean_text", () => {
      const input = "This is normal text without any secrets";
      expect(redactSecrets(input)).toBe(input);
    });

    it("TC08_handles_empty_input", () => {
      expect(redactSecrets("")).toBe("");
      expect(redactSecrets(null as unknown as string)).toBe("");
    });

    it("TC09_redacts_multiple_secrets", () => {
      const input = "OpenAI: sk-1234567890abcdef1234567890abcdef and GitHub: ghp_abcdefghijklmnopqrstuvwxyz1234567890";
      const result = redactSecrets(input);
      expect(result).toContain("[REDACTED:openai-key]");
      expect(result).toContain("[REDACTED:github-token]");
    });
  });

  describe("detectSecrets", () => {
    it("TC01_detects_openai_key", () => {
      const input = "Key: sk-1234567890abcdef1234567890abcdef";
      const found = detectSecrets(input);
      expect(found).toContain("openai-key");
    });

    it("TC02_returns_empty_for_clean_text", () => {
      const input = "No secrets here";
      const found = detectSecrets(input);
      expect(found).toHaveLength(0);
    });

    it("TC03_detects_multiple_secret_types", () => {
      const input = "OpenAI: sk-1234567890abcdef1234567890abcdef and GitHub: ghp_abcdefghijklmnopqrstuvwxyz1234567890";
      const found = detectSecrets(input);
      expect(found.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("createRedactingLogger", () => {
    it("TC01_wraps_logger_and_redacts", () => {
      const logs: string[] = [];
      const mockLog = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };
      const redactingLogger = createRedactingLogger(mockLog);

      redactingLogger("API key: sk-1234567890abcdef1234567890abcdef");

      expect(logs.length).toBe(1);
      expect(logs[0]).not.toContain("sk-1234");
      expect(logs[0]).toContain("[REDACTED:openai-key]");
    });

    it("TC02_preserves_clean_logs", () => {
      const logs: string[] = [];
      const mockLog = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };
      const redactingLogger = createRedactingLogger(mockLog);

      redactingLogger("Normal log message");

      expect(logs[0]).toBe("Normal log message");
    });
  });
});
