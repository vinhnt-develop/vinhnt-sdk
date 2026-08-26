import { describe, it, expect } from "vitest";
import { uriFromPath, pathFromUri } from "../src/file-sync.js";

describe("uriFromPath", () => {
  it("converts Unix path", () => {
    expect(uriFromPath("/home/user/file.ts")).toBe("file:///home/user/file.ts");
  });

  it("converts Windows path", () => {
    expect(uriFromPath("C:\\Users\\me\\file.ts")).toBe("file:///C:/Users/me/file.ts");
  });

  it("converts relative path", () => {
    expect(uriFromPath("src/file.ts")).toBe("file:///src/file.ts");
  });
});

describe("pathFromUri", () => {
  it("converts Unix file URI", () => {
    expect(pathFromUri("file:///home/user/file.ts")).toBe("/home/user/file.ts");
  });

  it("converts Windows file URI", () => {
    expect(pathFromUri("file:///C:/Users/me/file.ts")).toBe("C:/Users/me/file.ts");
  });

  it("handles encoded characters", () => {
    expect(pathFromUri("file:///home/user/file%20name.ts")).toBe("/home/user/file name.ts");
  });
});
