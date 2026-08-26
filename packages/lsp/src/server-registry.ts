import type { LspServerDefinition } from "./types.js";

/**
 * Default LSP servers — convenience only.
 * Users extend by calling `registry.register({ id: "my-server", ... })`
 */
export const DEFAULT_LSP_SERVERS: LspServerDefinition[] = [
  // ── TypeScript / JavaScript ──
  {
    id: "typescript",
    name: "TypeScript",
    languageId: "typescript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    command: "typescript-language-server",
    args: ["--stdio"],
    rootFiles: ["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock", "deno.json", "deno.jsonc"],
    autoInstall: "npm install -g typescript-language-server",
  },
  {
    id: "javascript",
    name: "JavaScript",
    languageId: "javascript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    command: "typescript-language-server",
    args: ["--stdio"],
    rootFiles: ["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"],
    autoInstall: "npm install -g typescript-language-server",
  },

  // ── Python ──
  {
    id: "pyright",
    name: "Pyright",
    languageId: "python",
    extensions: [".py", ".pyi"],
    command: "pyright-langserver",
    args: ["--stdio"],
    rootFiles: ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile", "pyrightconfig.json"],
    autoInstall: "npm install -g pyright",
  },

  // ── Rust ──
  {
    id: "rust",
    name: "Rust Analyzer",
    languageId: "rust",
    extensions: [".rs"],
    command: "rust-analyzer",
    args: [],
    rootFiles: ["Cargo.toml"],
  },

  // ── Go ──
  {
    id: "gopls",
    name: "gopls",
    languageId: "go",
    extensions: [".go"],
    command: "gopls",
    args: [],
    rootFiles: ["go.mod", "go.sum", "go.work"],
    autoInstall: "go install golang.org/x/tools/gopls@latest",
  },

  // ── C / C++ ──
  {
    id: "clangd",
    name: "Clangd",
    languageId: "cpp",
    extensions: [".c", ".cpp", ".cxx", ".h", ".hpp", ".hxx"],
    command: "clangd",
    args: [],
    rootFiles: ["compile_commands.json", "CMakeLists.txt", "Makefile"],
  },

  // ── Java ──
  {
    id: "java",
    name: "Java",
    languageId: "java",
    extensions: [".java"],
    command: "jdtls",
    args: [],
    rootFiles: ["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle"],
  },

  // ── Lua ──
  {
    id: "lua",
    name: "Lua Language Server",
    languageId: "lua",
    extensions: [".lua"],
    command: "lua-language-server",
    args: [],
    rootFiles: [".luarc.json", ".luarc.jsonc", "selene.toml"],
  },

  // ── Ruby ──
  {
    id: "ruby",
    name: "Ruby LSP",
    languageId: "ruby",
    extensions: [".rb", ".rake", ".gemspec"],
    command: "ruby-lsp",
    args: [],
    rootFiles: ["Gemfile", "gems.rb"],
  },

  // ── PHP ──
  {
    id: "php",
    name: "PHP Intelephense",
    languageId: "php",
    extensions: [".php"],
    command: "intelephense",
    args: ["--stdio"],
    rootFiles: ["composer.json"],
  },

  // ── Zig ──
  {
    id: "zig",
    name: "Zig LSP (zls)",
    languageId: "zig",
    extensions: [".zig", ".zon"],
    command: "zls",
    args: [],
    rootFiles: ["build.zig", "build.zig.zon"],
  },

  // ── Svelte ──
  {
    id: "svelte",
    name: "Svelte Language Server",
    languageId: "svelte",
    extensions: [".svelte"],
    command: "svelteserver",
    args: ["--stdio"],
    rootFiles: ["package.json", "svelte.config.js", "svelte.config.cjs"],
  },

  // ── Vue ──
  {
    id: "vue",
    name: "Vue Language Server",
    languageId: "vue",
    extensions: [".vue"],
    command: "vue-language-server",
    args: ["--stdio"],
    rootFiles: ["package.json"],
  },

  // ── Prisma ──
  {
    id: "prisma",
    name: "Prisma Language Server",
    languageId: "prisma",
    extensions: [".prisma"],
    command: "prisma-language-server",
    args: ["--stdio"],
    rootFiles: ["prisma/schema.prisma", "package.json"],
  },

  // ── Docker ──
  {
    id: "docker",
    name: "Docker LSP",
    languageId: "dockerfile",
    extensions: [".dockerfile", "Dockerfile"],
    command: "docker-langserver",
    args: ["--stdio"],
    rootFiles: ["Dockerfile", ".dockerignore"],
  },

  // ── YAML ──
  {
    id: "yaml",
    name: "YAML Language Server",
    languageId: "yaml",
    extensions: [".yaml", ".yml"],
    command: "yaml-language-server",
    args: ["--stdio"],
    rootFiles: [".yamllint"],
  },

  // ── TOML ──
  {
    id: "toml",
    name: "TAOS LSP (TOML)",
    languageId: "toml",
    extensions: [".toml"],
    command: "taplo",
    args: ["lsp", "--stdio"],
    rootFiles: ["Cargo.toml", "pyproject.toml"],
  },

  // ── CSS / SCSS / Tailwind ──
  {
    id: "css",
    name: "CSS Language Server",
    languageId: "css",
    extensions: [".css", ".scss", ".less"],
    command: "vscode-css-language-server",
    args: ["--stdio"],
    rootFiles: ["package.json"],
  },

  // ── Dart ──
  {
    id: "dart",
    name: "Dart Analysis Server",
    languageId: "dart",
    extensions: [".dart"],
    command: "dart",
    args: ["language-server", "--protocol=lsp"],
    rootFiles: ["pubspec.yaml", "pubspec.lock"],
  },

  // ── Kotlin ──
  {
    id: "kotlin",
    name: "Kotlin Language Server",
    languageId: "kotlin",
    extensions: [".kt", ".kts"],
    command: "kotlin-language-server",
    args: [],
    rootFiles: ["build.gradle.kts", "build.gradle", "pom.xml"],
  },

  // ── Swift ──
  {
    id: "swift",
    name: "Swift SourceKit-LSP",
    languageId: "swift",
    extensions: [".swift"],
    command: "sourcekit-lsp",
    args: [],
    rootFiles: ["Package.swift", ".swiftpm"],
  },

  // ── Haskell ──
  {
    id: "haskell",
    name: "Haskell Language Server",
    languageId: "haskell",
    extensions: [".hs", ".lhs"],
    command: "haskell-language-server-wrapper",
    args: [],
    rootFiles: ["stack.yaml", "*.cabal", "package.yaml"],
    isExperimental: true,
  },

  // ── Elixir ──
  {
    id: "elixir",
    name: "Elixir LS",
    languageId: "elixir",
    extensions: [".ex", ".exs"],
    command: "elixir-ls",
    args: [],
    rootFiles: ["mix.exs"],
  },

  // ── Scala ──
  {
    id: "scala",
    name: "Metals (Scala)",
    languageId: "scala",
    extensions: [".scala", ".sc"],
    command: "metals",
    args: [],
    rootFiles: ["build.sbt", "build.sc", "pom.xml"],
  },
];

/**
 * Registry for LSP servers.
 * Users register new servers via `register()` instead of hardcoding.
 */
export class LspServerRegistry {
  private servers: LspServerDefinition[];

  constructor(defaultServers?: LspServerDefinition[]) {
    this.servers = defaultServers ? [...defaultServers] : [...DEFAULT_LSP_SERVERS];
  }

  /**
   * Register a new LSP server definition.
   */
  register(definition: LspServerDefinition): void {
    this.servers.push(definition);
  }

  /**
   * Register multiple LSP server definitions.
   */
  registerAll(definitions: LspServerDefinition[]): void {
    this.servers.push(...definitions);
  }

  /**
   * Find a server by file extension.
   */
  findByExtension(ext: string): LspServerDefinition | undefined {
    return this.servers.find((s) => s.extensions.includes(ext));
  }

  /**
   * Find a server by ID.
   */
  findById(id: string): LspServerDefinition | undefined {
    return this.servers.find((s) => s.id === id);
  }

  /**
   * Get language ID for a file extension.
   */
  getLanguageId(ext: string): string {
    return this.findByExtension(ext)?.languageId ?? "plaintext";
  }

  /**
   * List all registered servers.
   */
  list(): LspServerDefinition[] {
    return [...this.servers];
  }
}

/**
 * @deprecated Use LspServerRegistry with DEFAULT_LSP_SERVERS instead.
 * Kept for backward compatibility.
 */
export const BUILTIN_SERVERS = DEFAULT_LSP_SERVERS;

/** Cached default registry for deprecated convenience functions. */
const defaultRegistry = new LspServerRegistry(DEFAULT_LSP_SERVERS);

/**
 * @deprecated Use LspServerRegistry instead.
 * Kept for backward compatibility.
 */
export function findServerByExtension(ext: string): LspServerDefinition | undefined {
  return defaultRegistry.findByExtension(ext);
}

/**
 * @deprecated Use LspServerRegistry instead.
 * Kept for backward compatibility.
 */
export function findServerById(id: string): LspServerDefinition | undefined {
  return defaultRegistry.findById(id);
}

/**
 * @deprecated Use LspServerRegistry instead.
 * Kept for backward compatibility.
 */
export function getLanguageId(ext: string): string {
  return defaultRegistry.getLanguageId(ext);
}
