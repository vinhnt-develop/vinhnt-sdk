import { describe, expect, it } from "vitest";
import { DEFAULT_PROMPT } from "../src/system-context/prompts/default.js";
import { ANTHROPIC_PROMPT } from "../src/system-context/prompts/anthropic.js";
import { OPENAI_PROMPT } from "../src/system-context/prompts/openai.js";
import { GEMINI_PROMPT } from "../src/system-context/prompts/gemini.js";
import { DEEPSEEK_PROMPT } from "../src/system-context/prompts/deepseek.js";

const PROMPTS: Array<[string, string]> = [
  ["default", DEFAULT_PROMPT],
  ["anthropic", ANTHROPIC_PROMPT],
  ["openai", OPENAI_PROMPT],
  ["gemini", GEMINI_PROMPT],
  ["deepseek", DEEPSEEK_PROMPT],
];

describe("P0'-2 prompts mandate file tools", () => {
  for (const [name, prompt] of PROMPTS) {
    it(`${name}: contains write_file mandate`, () => {
      expect(prompt).toContain("write_file");
      expect(prompt).toMatch(/File operations \(MANDATORY\)/);
    });

    it(`${name}: does not ban writing files`, () => {
      expect(prompt).not.toContain("NEVER write new files");
      expect(prompt).not.toContain("NEVER write files");
    });

    it(`${name}: speaks about chat/UI not CLI`, () => {
      expect(prompt).not.toContain("command line interface");
      expect(prompt).toMatch(/chat\/UI interface|chat interface/i);
    });

    it(`${name}: forbids pasting full file content as substitute`, () => {
      expect(prompt).toMatch(/NEVER output file contents only in chat|do not repeat the file body/i);
    });
  }
});
