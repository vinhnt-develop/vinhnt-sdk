import { describe, it, expect } from "vitest";
import { credentialRef, KNOWN_CREDENTIAL_SOURCES } from "../src/credentials.js";

describe("credentialRef", () => {
  it("creates a branded CredentialRef from a string", () => {
    const ref = credentialRef("DEEPSEEK_API_KEY");
    expect(ref).toBe("DEEPSEEK_API_KEY");
  });

  it("preserves the original string value", () => {
    const ref = credentialRef("MY_API_KEY_123");
    expect(ref).toBe("MY_API_KEY_123");
  });
});

describe("KNOWN_CREDENTIAL_SOURCES", () => {
  it("contains the 4 standard sources", () => {
    expect(KNOWN_CREDENTIAL_SOURCES).toEqual(["env", "managed", "project-env", "user-env"]);
  });

  it("is a tuple type (not extensible)", () => {
    expect(KNOWN_CREDENTIAL_SOURCES).toHaveLength(4);
  });
});
