/**
 * ARITY dictionary: maps command prefixes to their "human-understandable" token count.
 *
 * When a user runs a command like "npm install express --save", the arity tells us
 * that the meaningful prefix is ["npm", "install"] (arity 2). This enables:
 * - Cleaner permission prompts ("Allow npm install?")
 * - Smarter "always allow" patterns ("npm install *" matches any npm install variant)
 */
const ARITY: Record<string, number> = {
  // Single-arity commands
  cat: 1, cd: 1, chmod: 1, chown: 1, cp: 1, echo: 1, env: 1,
  export: 1, git: 2, "git config": 3, "git remote": 3, "git stash": 3, grep: 1, kill: 1, killall: 1, ln: 1, ls: 1,
  mkdir: 1, mv: 1, ps: 1, pwd: 1, rm: 1, rmdir: 1, sleep: 1,
  source: 1, tail: 1, touch: 1, unset: 1, which: 1,

  // Cloud / infrastructure
  aws: 3, az: 3, gcloud: 3, gh: 3, doctl: 3, eksctl: 2,
  "eksctl create": 3, cdk: 2, cf: 2, heroku: 2, vercel: 2,
  pulumi: 2, "pulumi stack": 3, terraform: 2,
  "terraform workspace": 3, vault: 2, "vault auth": 3,
  "vault kv": 3, consul: 2, "consul kv": 3, nomad: 2,
  serverless: 2, sls: 2, sst: 2, flyctl: 2, sfdx: 3,

  // Containers / orchestration
  docker: 2, "docker builder": 3, "docker compose": 3,
  "docker container": 3, "docker image": 3, "docker network": 3,
  "docker volume": 3, podman: 2, "podman container": 3,
  "podman image": 3, kubectl: 2, "kubectl kustomize": 3,
  "kubectl rollout": 3, kustomize: 2, helm: 2,
  minikube: 2, kind: 2, "kind create": 3, crictl: 2,
  skaffold: 2, compose: 2,

  // Languages / runtimes
  node: 2, python: 2, python3: 2, ruby: 2, rake: 2,
  go: 2, cargo: 2, "cargo add": 3, "cargo run": 3,
  rustup: 2, dotnet: 2, mvn: 2, gradle: 2, swift: 2,
  deno: 2, "deno task": 3, bun: 2, "bun run": 3, "bun x": 3,

  // JavaScript / Node ecosystem
  npm: 2, "npm exec": 3, "npm init": 3, "npm run": 3,
  "npm view": 3, npx: 2, yarn: 2, "yarn dlx": 3, "yarn run": 3,
  pnpm: 2, "pnpm dlx": 3, "pnpm exec": 3, "pnpm run": 3,
  nvm: 2, volta: 2, ng: 2, nx: 2, turbo: 2,

  // Python
  pip: 2, pip3: 2, pipenv: 2, poetry: 2, pyenv: 2,

  // PHP
  composer: 2, wp: 2,

  // Databases
  psql: 2, mysql: 2, mongosh: 2, "redis-cli": 2,
  sqlite3: 2, pg_dump: 2, pg_restore: 2,

  // Build tools
  make: 2, cmake: 2, bazel: 2, meson: 2,

  // System / network
  systemctl: 2, journalctl: 2, ufw: 2, ip: 2, "ip addr": 3,
  "ip link": 3, "ip netns": 3, "ip route": 3, tmux: 2,
  screen: 2, openssl: 2, "openssl req": 3, "openssl x509": 3,

  // Firestore / GCP
  firebase: 2, gsutil: 2, bq: 2,

  // Misc
  brew: 2, "brew bundle": 3, "brew services": 3, mc: 2,
  "mc admin": 3, vagrant: 2, packer: 2, sdkmanager: 2,
  adb: 2, fastlane: 2, cocoapods: 2,
};

/**
 * Extract the "human-understandable command prefix" from shell tokens.
 *
 * Examples:
 *   prefix(["npm", "install", "express", "--save"]) → ["npm", "install"]
 *   prefix(["git", "checkout", "main"])             → ["git", "checkout"]
 *   prefix(["docker", "compose", "up", "-d"])       → ["docker", "compose", "up"]
 *   prefix(["cat", "file.txt"])                     → ["cat"]
 *   prefix([])                                      → []
 */
export function prefix(tokens: string[]): string[] {
  for (let len = tokens.length; len > 0; len--) {
    const key = tokens.slice(0, len).join(" ");
    const arity = ARITY[key];
    if (arity !== undefined) return tokens.slice(0, arity);
  }
  if (tokens.length === 0) return [];
  return tokens.slice(0, 1);
}

/**
 * Convert a shell command string into a permission save pattern.
 * The pattern with trailing " *" allows exact-match or prefix-match in saved rules.
 *
 * Examples:
 *   commandPattern("npm install express --save") → "npm install *"
 *   commandPattern("git checkout main")         → "git checkout *"
 *   commandPattern("cat file.txt")              → "cat *"
 */
export function commandPattern(command: string): string {
  const tokens = command.trim().split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === "")) return "*";
  return prefix(tokens).join(" ") + " *";
}