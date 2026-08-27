#!/usr/bin/env node
// generate-api-docs.mjs
// Reads packages/*/src/index.ts and generates api-data.js using ts-morph
// Usage: node scripts/generate-api-docs.mjs

import { Project, Node } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACKAGES_DIR = path.join(ROOT, "packages");
const OUTPUT = path.join(ROOT, "docs", "api-reference", "api-data.js");

// Package metadata
const PKG_META = {
  "core":                    { icon: "C",   tag: "Core",      desc: "Core agent kernel - lifecycle, tool execution, permissions, LLM interactions." },
  "plugin":                  { icon: "P",   tag: "Core",      desc: "Plugin system with definePlugin, lifecycle hooks, and registry." },
  "provider-openai-compatible": { icon: "O",  tag: "Core",   desc: "OpenAI-compatible provider with streaming, retry, presets for DeepSeek, Anthropic, Ollama." },
  "step-executor":           { icon: "S",   tag: "Core",      desc: "Step execution: tool lifecycle, timeouts, permission gating, doom-loop, circuit breaker." },
  "session":                 { icon: "Se",  tag: "Core",      desc: "Session persistence, conversation compaction, title generation." },
  "event":                   { icon: "E",   tag: "Core",      desc: "Event bus, definitions, migration, global event system." },
  "permission":              { icon: "Per", tag: "Core",      desc: "Permission management, approval stores, access control." },
  "schema":                  { icon: "Sc",  tag: "Core",      desc: "Type definitions, error classes, wire-format schemas." },
  "knowledge":               { icon: "K",   tag: "Extension",  desc: "Bounded memory store and context compression." },
  "security":                { icon: "Sec", tag: "Extension",  desc: "Secret detection and redaction utilities." },
  "config":                  { icon: "Co",  tag: "Core",      desc: "Configuration layer - credential references, settings, env resolution." },
  "llm":                     { icon: "L",   tag: "Core",      desc: "LLM adapter abstraction, registry, retry, token metering, model caller." },
  "guard":                   { icon: "G",   tag: "Core",      desc: "Guard plugins - circuit breaker, loop detection, tool timeout." },
  "sandbox":                 { icon: "Sa",  tag: "Core",      desc: "Sandbox execution - process isolation, command parsing, timeout." },
  "lsp":                     { icon: "Lv",  tag: "Extension",  desc: "Language Server Protocol integration for code intelligence." },
  "mcp":                     { icon: "Mc",  tag: "Extension",  desc: "Model Context Protocol client/server for tool integration." },
  "trace":                   { icon: "Tr",  tag: "Extension",  desc: "Observability - OpenTelemetry spans, timeline, telemetry." },
  "tools":                   { icon: "T",   tag: "Core",      desc: "Built-in tools: file, shell, git, web, search, registries." },
};

// ── Helpers ──

function getJSDoc(node) {
  if (!node.getJsDocs) return "";
  const docs = node.getJsDocs();
  if (!docs.length) return "";
  return docs.map(d => d.getCommentText() || "").join("\n").trim();
}

function truncate(str, max = 120) {
  if (!str) return "void";
  // Clean up import() type paths
  str = str.replace(/import\(".*?"\)\./g, "");
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

// ── Extract declarations ──

function extractClass(decl) {
  const name = decl.getName() || "Anonymous";
  const methods = [];

  // Constructor
  const ctor = decl.getConstructors()[0];
  if (ctor) {
    const params = ctor.getParameters().map(p => ({
      n: p.getName(),
      t: truncate(p.getType().getText()),
      r: !p.isOptional(),
      d: truncate(p.getType().getText()),
    }));
    methods.push({
      sig: `constructor(${params.map(p => `${p.n}: ${p.t}`).join(", ")})`,
      desc: "Create instance.",
      params,
    });
  }

  // Methods
  for (const method of decl.getMethods()) {
    const params = method.getParameters().map(p => ({
      n: p.getName(),
      t: truncate(p.getType().getText()),
      r: !p.isOptional(),
      d: truncate(p.getType().getText()),
    }));
    const ret = truncate(method.getReturnType().getText());
    methods.push({
      sig: `${method.getName()}(${params.map(p => `${p.n}: ${p.t}`).join(", ")}): ${ret}`,
      desc: getJSDoc(method),
      params,
      ret,
    });
  }

  // Properties
  for (const prop of decl.getProperties()) {
    methods.push({
      sig: `${prop.getName()}: ${truncate(prop.getType().getText())}`,
      desc: getJSDoc(prop) || prop.getName(),
      params: [],
    });
  }

  // Get accessors
  for (const accessor of decl.getGetAccessors()) {
    methods.push({
      sig: `get ${accessor.getName()}(): ${truncate(accessor.getReturnType().getText())}`,
      desc: getJSDoc(accessor),
      params: [],
    });
  }

  return { type: "class", name, desc: getJSDoc(decl) || name, methods };
}

function extractInterface(decl) {
  const name = decl.getName() || "Anonymous";
  const methods = [];
  const props = [];
  const seenProps = new Set();

  // Get inherited properties from base types
  const baseTypes = decl.getBaseTypes();
  for (const baseType of baseTypes) {
    const baseDecl = baseType.getSymbol()?.getDeclarations()?.[0];
    if (baseDecl && Node.isInterfaceDeclaration(baseDecl)) {
      for (const prop of baseDecl.getProperties()) {
        const propName = prop.getName();
        if (!seenProps.has(propName)) {
          seenProps.add(propName);
          props.push({
            name: propName,
            type: truncate(prop.getType().getText()),
            required: !prop.hasQuestionToken(),
            desc: getJSDoc(prop),
            inherited: baseDecl.getName(),
          });
        }
      }
    }
  }

  // Get own methods
  for (const method of decl.getMethods()) {
    const params = method.getParameters().map(p => ({
      n: p.getName(),
      t: truncate(p.getType().getText()),
      r: !p.isOptional(),
      d: truncate(p.getType().getText()),
    }));
    const ret = truncate(method.getReturnType().getText());
    methods.push({
      sig: `${method.getName()}(${params.map(p => `${p.n}: ${p.t}`).join(", ")}): ${ret}`,
      desc: getJSDoc(method),
      params,
      ret,
    });
  }

  // Get own properties
  for (const prop of decl.getProperties()) {
    const propName = prop.getName();
    if (!seenProps.has(propName)) {
      seenProps.add(propName);
      props.push({
        name: propName,
        type: truncate(prop.getType().getText()),
        required: !prop.hasQuestionToken(),
        desc: getJSDoc(prop),
      });
    }
  }

  return { type: "type", name, desc: getJSDoc(decl) || name, methods, props };
}

function extractFunction(decl) {
  const name = decl.getName() || "Anonymous";
  const params = decl.getParameters().map(p => ({
    n: p.getName(),
    t: truncate(p.getType().getText()),
    r: !p.isOptional(),
    d: truncate(p.getType().getText()),
  }));
  const ret = truncate(decl.getReturnType().getText());
  const desc = getJSDoc(decl) || name;

  // Extract @example from JSDoc
  const docs = decl.getJsDocs();
  let example;
  if (docs.length) {
    const tag = docs[0].getTags().find(t => t.getTagName() === "example");
    if (tag) {
      const comment = tag.getCommentText() || "";
      example = comment.trim();
    }
  }

  return {
    type: "function",
    name,
    desc,
    methods: [{
      sig: `${name}(${params.map(p => `${p.n}: ${p.t}`).join(", ")}): ${ret}`,
      desc,
      params,
      ret,
    }],
    example,
  };
}

function extractConst(decl) {
  const name = decl.getName() || "Anonymous";
  return {
    type: "const",
    name,
    desc: getJSDoc(decl) || name,
    methods: [],
  };
}

function extractTypeAlias(decl) {
  const name = decl.getName() || "Anonymous";
  const typeStr = truncate(decl.getType().getText(), 100);
  const desc = getJSDoc(decl) || name;

  return {
    type: "type",
    name,
    desc,
    methods: [{
      sig: `type ${name} = ${typeStr}`,
      desc,
      params: [],
    }],
  };
}

function extractEnum(decl) {
  const name = decl.getName() || "Anonymous";
  const methods = [];

  for (const member of decl.getMembers()) {
    const value = member.getValue();
    methods.push({
      sig: `${member.getName()}${value !== undefined ? ` = ${JSON.stringify(value)}` : ""}`,
      desc: getJSDoc(member) || member.getName(),
      params: [],
    });
  }

  return {
    type: "type",
    name,
    desc: getJSDoc(decl) || name,
    methods,
  };
}

// ── Process package ──

function processPackage(pkgDir) {
  const pkgName = path.basename(pkgDir);
  const indexFile = path.join(pkgDir, "src", "index.ts");

  if (!fs.existsSync(indexFile)) {
    console.log(`  SKIP: ${indexFile} not found`);
    return null;
  }

  console.log(`Processing: ${pkgName}`);

  const project = new Project({
    tsConfigFilePath: path.join(pkgDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(indexFile);
  const exports = sourceFile.getExportedDeclarations();
  const result = [];

  for (const [name, declarations] of exports) {
    for (const decl of declarations) {
      let info = null;

      if (Node.isClassDeclaration(decl)) {
        info = extractClass(decl);
      } else if (Node.isInterfaceDeclaration(decl)) {
        info = extractInterface(decl);
      } else if (Node.isFunctionDeclaration(decl)) {
        info = extractFunction(decl);
      } else if (Node.isVariableDeclaration(decl)) {
        info = extractConst(decl);
      } else if (Node.isTypeAliasDeclaration(decl)) {
        info = extractTypeAlias(decl);
      } else if (Node.isEnumDeclaration(decl)) {
        info = extractEnum(decl);
      }

      if (info && (info.methods.length > 0 || (info.props && info.props.length > 0))) {
        result.push(info);
        break; // Only first declaration per export
      }
    }
  }

  if (result.length === 0) {
    console.log(`  SKIP: no exports extracted`);
    return null;
  }

  const meta = PKG_META[pkgName] || { icon: pkgName[0].toUpperCase(), tag: "Core", desc: pkgName };

  // Get dependencies from package.json
  let deps = [];
  const pkgJson = path.join(pkgDir, "package.json");
  if (fs.existsSync(pkgJson)) {
    const json = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
    const allDeps = { ...json.dependencies, ...json.peerDependencies };
    deps = Object.keys(allDeps || {})
      .filter(d => d.startsWith("@vinhnt-sdk/"))
      .map(d => d.replace("@vinhnt-sdk/", ""));
  }

  const methodCount = result.reduce((s, e) => s + e.methods.length, 0);
  console.log(`  ${result.length} exports, ${methodCount} methods`);

  return {
    id: pkgName,
    name: `@vinhnt-sdk/${pkgName}`,
    icon: meta.icon,
    tag: meta.tag,
    desc: meta.desc,
    deps,
    exports: result,
  };
}

// ── Run ──

console.log("Generating API docs from TypeScript source...\n");

const packages = fs.readdirSync(PACKAGES_DIR)
  .filter(d => fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory())
  .map(d => processPackage(path.join(PACKAGES_DIR, d)))
  .filter(Boolean);

packages.sort((a, b) => {
  const tagOrder = { Core: 0, Extension: 1 };
  return (tagOrder[a.tag] || 2) - (tagOrder[b.tag] || 2) || a.name.localeCompare(b.name);
});

let output = "// Auto-generated from TypeScript source — DO NOT EDIT\n";
output += "// Run: node scripts/generate-api-docs.mjs\n\n";
output += "window.PKG = [\n";

for (const pkg of packages) {
  output += JSON.stringify(pkg, null, 2) + ",\n";
}

output += "];\n";

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, output);

console.log(`\nDone! Generated ${packages.length} packages:`);
for (const pkg of packages) {
  const methodCount = pkg.exports.reduce((s, e) => s + e.methods.length, 0);
  console.log(`  ${pkg.name}: ${pkg.exports.length} exports, ${methodCount} methods`);
}
console.log(`\nOutput: ${OUTPUT}`);
