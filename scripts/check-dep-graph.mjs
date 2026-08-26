import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");

const dirs = readdirSync(packagesDir, { withFileTypes: true }).filter((d) => d.isDirectory());

const pkgs = new Map();
for (const d of dirs) {
  const file = join(packagesDir, d.name, "package.json");
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  pkgs.set(json.name, { dir: d.name, json });
}

const isWorkspace = (name) => pkgs.has(name) && name.startsWith("@vinhnt-sdk/");

const graph = new Map();
const edges = [];
for (const [name, { json }] of pkgs) {
  const deps = new Set();
  for (const field of ["dependencies", "peerDependencies"]) {
    for (const dep of Object.keys(json[field] ?? {})) {
      if (!isWorkspace(dep)) continue;
      deps.add(dep);
      edges.push(`${name} -> ${dep}`);
    }
  }
  graph.set(name, deps);
}

for (const [name, { json }] of pkgs) {
  if (json.name === name && json.name in (graph.get(name) ?? {})) {
    console.error(`SELF DEPENDENCY: ${name} depends on itself`);
    process.exit(1);
  }
}

for (const [name, { json }] of pkgs) {
  for (const field of ["peerDependencies"]) {
    for (const [dep, spec] of Object.entries(json[field] ?? {})) {
      if (isWorkspace(dep) && spec !== "workspace:*") {
        console.error(`PEER SPEC: ${name} peerDep ${dep} uses "${spec}" — must be "workspace:*"`);
        process.exit(1);
      }
    }
  }
}

const WHITE = 0;
const GRAY = 1;
const BLACK = 2;
const state = new Map();
const stack = [];
const cycles = [];

function dfs(node) {
  state.set(node, GRAY);
  stack.push(node);
  for (const next of graph.get(node) ?? []) {
    const s = state.get(next) ?? WHITE;
    if (s === WHITE) {
      dfs(next);
    } else if (s === GRAY) {
      const idx = stack.indexOf(next);
      cycles.push([...stack.slice(idx), next]);
    }
  }
  stack.pop();
  state.set(node, BLACK);
}

for (const node of graph.keys()) {
  if ((state.get(node) ?? WHITE) === WHITE) dfs(node);
}

if (cycles.length > 0) {
  console.error(`FAIL: ${cycles.length} dependency cycle(s) detected`);
  for (const cycle of cycles) {
    console.error(`  ${cycle.join(" -> ")}`);
  }
  process.exit(1);
}

console.log(`OK: workspace dependency graph is acyclic (${graph.size} packages, ${edges.length} edges)`);
