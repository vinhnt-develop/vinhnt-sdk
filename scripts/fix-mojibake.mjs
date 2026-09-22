import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const PKGS = join(import.meta.dirname, "..", "packages");

const BAD = [
  // Double-encoded dash/quote ending with U+009D
  [/\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d/g, "-"],
  [/\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac"/g, "-"],
  // Single mojibake em-dash / curly quotes
  [/\u00e2\u20ac\u2014/g, "-"],
  [/\u00e2\u20ac"/g, "-"],
  [/\u00e2\u20ac\u201c/g, '"'],
  [/\u00e2\u20ac\u201d/g, '"'],
];

let total = 0;
for (const dir of readdirSync(PKGS)) {
  const p = join(PKGS, dir, "package.json");
  try {
    let raw = readFileSync(p, "utf8");
    const before = raw;
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const [re, to] of BAD) raw = raw.replace(re, to);
    if (raw !== before) {
      const obj = JSON.parse(raw);
      writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
      total++;
      const chk = readFileSync(p, "utf8");
      const still = /Ã¢|â€|﻿/.test(chk);
      console.log(still ? "STILL_BAD" : "OK", dir, "|", obj.description ?? "(no desc)");
    }
  } catch (e) {
    console.error("ERR", dir, e.message);
  }
}
console.log("fixed", total);
