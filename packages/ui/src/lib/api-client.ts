/* ═══════════════════════════════════════════════════════════════════════════
 * VNT API CATALOG — single source of truth for all UI API calls
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Status conventions (placed above each endpoint):
 *   [UI]          — has real helper + wired to a component
 *   [HELPER]      — has real helper but NOT yet called by any component
 *   [TODO: no UI] — no helper + no UI → leave as `//` comment,
 *                   uncomment + write body when wiring UI.
 *
 * How to add a new endpoint:
 *   1. Uncomment the stub below, write body using `apiFetch<T>()` (auto-attaches Bearer).
 *   2. Add response type if missing (below or import from @vinhnt-sdk/api).
 *   3. Export helper + type from `packages/ui/src/index.ts`.
 *   4. Component in `apps/dev/src` imports from `@vinhnt-sdk/ui`.
 *   5. Verify: `pnpm --filter @vinhnt-sdk/ui build` → `pnpm --filter @vinhnt-sdk/dev typecheck`
 *      → `pnpm build` (18/18). (Dev mode Vite alias @vinhnt-sdk/ui → packages/ui/src)
 *
 * Full matrix reference: docs/api-ui-matrix.md
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Infra: base URL + token + error ─────────────────────────────────── */

const API_TOKEN_KEY = "vnt-api-token";
const API_BASE_URL_KEY = "vnt-api-base-url";

const DEFAULT_API_BASE_URL = "http://localhost:3101";
// Default token is NOT baked in. The host app sets it via setDefaultApiToken()
// (e.g. from its own env) at startup; in the browser the user provides it via
// the Connects tab (localStorage). Empty means requests go without Authorization.
let DEFAULT_API_TOKEN =
  (globalThis as { __VNT_API_TOKEN__?: string }).__VNT_API_TOKEN__ ?? "";

export function setDefaultApiToken(token: string): void {
  DEFAULT_API_TOKEN = token;
  (globalThis as { __VNT_API_TOKEN__?: string }).__VNT_API_TOKEN__ = token;
}

export function getApiBaseUrl(): string {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(API_BASE_URL_KEY);
    if (stored) return stored;
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(API_BASE_URL_KEY, url);
  }
}

export function getApiToken(): string | null {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(API_TOKEN_KEY);
  }
  return null;
}

export function setApiToken(token: string | null): void {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(API_TOKEN_KEY, token);
  else localStorage.removeItem(API_TOKEN_KEY);
}

export interface ApiErrorDetail {
  error?: string;
  detail?: string;
  message?: string;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return doFetch<T>(path, init);
}

async function doFetch<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getApiToken() ?? DEFAULT_API_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiClientError(0, "Could not connect to API server");
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = (await res.json()) as ApiErrorDetail & { error?: string };
      detail = body.detail ?? body.message ?? body.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(res.status, `API ${init.method ?? "GET"} ${path} failed (${res.status})`, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Config  (2 endpoints) — mount /v1/config
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ServerConfigResponse {
  config: Record<string, unknown>;
  sources?: string[];
}

// [UI] GET /v1/config — read server config (settings-dialog + useConfigHotReload)
export function fetchServerConfig(): Promise<ServerConfigResponse> {
  return apiFetch<ServerConfigResponse>("/v1/config");
}

// [UI] PUT /v1/config — save server config (settings-dialog Save button)
export function saveServerConfig(patch: Record<string, unknown>): Promise<{ ok: boolean; path: string }> {
  return apiFetch<{ ok: boolean; path: string }>("/v1/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Sessions  (11 endpoints) — mount /v1/sessions
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ApiSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  parentSessionId?: string;
  agentId?: string;
  model?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  isActive: boolean;
}

export interface ApiSessionMessage {
  id: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCallId?: string;
  createdAt?: string;
}

// [UI] GET /v1/sessions?limit=&offset= — list sessions (sidebar, API max 100)
export function fetchSessions(limit = 100): Promise<ApiSession[]> {
  return apiFetch<ApiSession[]>(`/v1/sessions?limit=${limit}`);
}

// [UI] POST /v1/sessions {title?, parentSessionId?} — create session (sidebar "+")
export function createSession(title?: string, parentSessionId?: string): Promise<ApiSession> {
  return apiFetch<ApiSession>("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ title, parentSessionId }),
  });
}

// [UI] PATCH /v1/sessions/:id — update title/model/isActive... (sidebar Rename)
export function updateSession(id: string, updates: Record<string, unknown>): Promise<ApiSession> {
  return apiFetch<ApiSession>(`/v1/sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// [UI] DELETE /v1/sessions/:id — delete session (sidebar Delete, 204)
export function deleteSession(id: string): Promise<void> {
  return apiFetch<void>(`/v1/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// [UI] POST /v1/sessions/:id/fork {title?} — fork session (sidebar Fork)
export function forkSession(id: string, title?: string): Promise<ApiSession> {
  return apiFetch<ApiSession>(`/v1/sessions/${encodeURIComponent(id)}/fork`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

// [UI] GET /v1/sessions/:id — session detail (model, cost, tokens)
export function getSession(id: string): Promise<ApiSession> {
  return apiFetch<ApiSession>(`/v1/sessions/${encodeURIComponent(id)}`);
}

// [UI] GET /v1/sessions/:id/messages — chat history (load into useMessageStore)
export function fetchSessionMessages(id: string): Promise<ApiSessionMessage[]> {
  return apiFetch<ApiSessionMessage[]>(`/v1/sessions/${encodeURIComponent(id)}/messages`);
}

// [UI] POST /v1/sessions/:id/messages {role, content, toolCallId?} — save a message
export function addSessionMessage(
  id: string,
  role: ApiSessionMessage["role"],
  content: string,
  toolCallId?: string,
): Promise<ApiSessionMessage> {
  return apiFetch<ApiSessionMessage>(`/v1/sessions/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ role, content, toolCallId }),
  });
}

// [TODO: no UI] GET /v1/sessions/tree — server-side session tree (replaces local sidebar buildTree)
//   → response: { snapshot: SessionTreeSnapshot | null }
// export function fetchSessionTree(): Promise<{ snapshot: unknown | null }> {
//   return apiFetch<{ snapshot: unknown | null }>("/v1/sessions/tree");
// }

// [TODO: no UI] GET /v1/sessions/cursor — pagination cursor (rarely used)
// export function fetchSessionCursor(): Promise<{ cursor: unknown }> {
//   return apiFetch<{ cursor: unknown }>("/v1/sessions/cursor");
// }

// [UI] GET /v1/sessions/search?q= — search messages in sessions (sidebar search box)
//   → returns Message[] (with sessionId) → click to jump to session
export function searchSessions(q: string): Promise<ApiSessionMessage[]> {
  return apiFetch<ApiSessionMessage[]>(`/v1/sessions/search?q=${encodeURIComponent(q)}`);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Workspaces  (7 endpoints) — mount /v1/workspaces
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ApiWorkspace {
  id: string;
  root: string;
  name: string;
  addedAt: number;
  isActive: boolean;
}

// [UI] GET /v1/workspaces — list workspaces (sidebar Project)
export function fetchWorkspaces(): Promise<ApiWorkspace[]> {
  return apiFetch<{ workspaces: ApiWorkspace[] }>("/v1/workspaces").then((r) => r.workspaces ?? []);
}

// [UI] POST /v1/workspaces {root} — add workspace (sidebar "+", 409 if duplicate/not found)
export function addWorkspace(root: string): Promise<ApiWorkspace> {
  return apiFetch<ApiWorkspace>("/v1/workspaces", {
    method: "POST",
    body: JSON.stringify({ root }),
  });
}

// [UI] DELETE /v1/workspaces/:root — remove workspace (sidebar Remove)
export function removeWorkspace(root: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/v1/workspaces/${encodeURIComponent(root)}`, {
    method: "DELETE",
  });
}

// [UI] POST /v1/workspaces/:root/activate — activate workspace (sidebar Activate)
export function activateWorkspace(root: string): Promise<{ success: boolean; active: ApiWorkspace | null }> {
  return apiFetch<{ success: boolean; active: ApiWorkspace | null }>(`/v1/workspaces/${encodeURIComponent(root)}/activate`, {
    method: "POST",
  });
}

// [UI] POST /v1/workspaces/deactivate — deactivate active workspace (sidebar Deactivate)
export function deactivateWorkspace(): Promise<{ success: boolean; active: null }> {
  return apiFetch<{ success: boolean; active: null }>("/v1/workspaces/deactivate", {
    method: "POST",
  });
}

// [UI] GET /v1/workspaces/active — currently active workspace (sidebar banner)
export function getActiveWorkspace(): Promise<{ active: ApiWorkspace | null }> {
  return apiFetch<{ active: ApiWorkspace | null }>("/v1/workspaces/active");
}

// [UI] POST /v1/workspaces/detect {root} — scan child workspaces from root (sidebar Detect button)
export function detectWorkspaces(root: string): Promise<{ workspaces: ApiWorkspace[] }> {
  return apiFetch<{ workspaces: ApiWorkspace[] }>("/v1/workspaces/detect", {
    method: "POST",
    body: JSON.stringify({ root }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Models  (6 endpoints) — mount /v1/models
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ModelInfo {
  id: string;
  contextLength?: number;
  supportsTools?: boolean;
  pricing?: unknown;
  /** Raw published per-1M-token price (models.dev / provider /models). */
  cost?: ExternalModelCost | null;
}

export interface ProviderInfo {
  provider: string;
  label: string;
  type: string;
  baseUrl?: string;
  defaultModel?: string;
  configured: boolean;
  capabilities?: unknown;
  features?: string[];
  keyUrl?: string;
  docsUrl?: string;
  keyHint?: string;
  notes?: string;
  verified?: boolean;
  local?: boolean;
  gateway?: boolean;
  error?: string;
  models: ModelInfo[];
}

export interface ProviderCatalogEntry {
  id: string;
  label: string;
  type: string;
  baseUrl?: string;
  keyUrl: string;
  docsUrl?: string;
  keyHint?: string;
  notes?: string;
  verified?: boolean;
  local?: boolean;
  gateway?: boolean;
}

export interface ModelsResponse {
  defaultProvider: string;
  defaultModel: string;
  providers: ProviderInfo[];
}

// [UI] GET /v1/models — list providers + models (settings tab Models)
export function fetchModels(): Promise<ModelsResponse> {
  return apiFetch<ModelsResponse>("/v1/models");
}

// [UI] GET /v1/models/catalog — verified provider catalog (prefill in UI)
export function fetchModelCatalog(): Promise<{ catalog: ProviderCatalogEntry[] }> {
  return apiFetch<{ catalog: ProviderCatalogEntry[] }>("/v1/models/catalog");
}

// [UI] GET /v1/models/active?runId= — active model for a run
export function getActiveModel(runId: string): Promise<{ model: string }> {
  return apiFetch<{ model: string }>(`/v1/models/active?runId=${encodeURIComponent(runId)}`);
}

// [UI] GET /v1/models/:provider — provider detail
export function getModelProvider(provider: string): Promise<ProviderInfo & { provider: string }> {
  return apiFetch<ProviderInfo & { provider: string }>(`/v1/models/${encodeURIComponent(provider)}`);
}

// [UI] POST /v1/models/test {prompt, model?} — test a prompt once (Settings)
export function testModelPrompt(prompt: string, model?: string): Promise<{ output: string; model: string }> {
  return apiFetch<{ output: string; model: string }>("/v1/models/test", {
    method: "POST",
    body: JSON.stringify({ prompt, model }),
  });
}

// [UI] POST /v1/models/test {prompt, provider, model} — test a specific provider (Settings Models tab)
export function testProviderModel(provider: string, model: string | undefined, prompt: string): Promise<{ output: string; model: string }> {
  return apiFetch<{ output: string; model: string }>("/v1/models/test", {
    method: "POST",
    body: JSON.stringify({ prompt, provider, model }),
  });
}

// [UI] GET /v1/models/search?q=&provider= — search models across
//   external catalog (models.dev, no key needed) + configured providers
export interface ExternalModelCost {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheCreation?: number;
  reasoning?: number;
  monthlyRequest?: number;
}

export interface ExternalModelInfo {
  id: string;
  provider: string;
  label: string;
  contextLength?: number;
  /** Raw published per-1M-token pricing. undefined = provider publishes none
   *  (billed by usage/plan). */
  cost?: ExternalModelCost | null;
  supportsTools?: boolean;
  source: "live" | "catalog";
}

export interface ModelSearchResponse {
  query: string;
  provider: string | null;
  count: number;
  matches: ExternalModelInfo[];
}

export function searchModelsExternal(q: string, opts: { provider?: string } = {}): Promise<ModelSearchResponse> {
  const params = new URLSearchParams({ q });
  if (opts.provider) params.set("provider", opts.provider);
  return apiFetch<ModelSearchResponse>(`/v1/models/search?${params}`);
}

// [UI] POST /v1/models/discover — live-fetch the models a provider's /models
//   endpoint ACTUALLY supports (baseUrl/apiKey may be unsaved, from the
//   Add/Edit Provider form). Ground truth, not the static catalog.
export function discoverProviderModels(opts: {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  q?: string;
}): Promise<{ provider: string; baseUrl: string; count: number; matches: ExternalModelInfo[] }> {
  return apiFetch<{ provider: string; baseUrl: string; count: number; matches: ExternalModelInfo[] }>("/v1/models/discover", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

// [UI] POST /v1/models/resolve {agent} — resolve model by agent profile
export function resolveAgentModel(agent: { profile?: { model?: string } }): Promise<{ model: string }> {
  return apiFetch<{ model: string }>("/v1/models/resolve", { method: "POST", body: JSON.stringify({ agent }) });
}

// [UI] POST /v1/models/cost {inputTokens, outputTokens, model?} — calculate cost
export function calculateModelCost(
  inputTokens: number,
  outputTokens: number,
  model?: string,
): Promise<{ inputTokens: number; outputTokens: number; cost: number; estimated: boolean }> {
  return apiFetch<{ inputTokens: number; outputTokens: number; cost: number; estimated: boolean }>("/v1/models/cost", {
    method: "POST",
    body: JSON.stringify({ inputTokens, outputTokens, model }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Tools  (3 endpoints) — mount /v1/tools
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ToolInfo {
  id: string;
  description?: string;
  risk?: string;
  timeoutMs?: number;
  inputSchema?: unknown;
}

// [UI] GET /v1/tools — list tools (settings-dialog tab Tools)
export function fetchTools(): Promise<ToolInfo[]> {
  return apiFetch<{ tools: ToolInfo[] }>("/v1/tools").then((r) => r.tools ?? []);
}

// [UI] GET /v1/tools/:id — tool detail (input schema) — settings "Test tool"
export function getTool(id: string): Promise<{ tool: ToolInfo }> {
  return apiFetch<{ tool: ToolInfo }>(`/v1/tools/${encodeURIComponent(id)}`);
}

export type ToolExecResult =
  | { status: "success"; output: unknown }
  | { status: "error"; error?: string }
  | { status: "denied"; reason?: string };

// [UI] POST /v1/tools/:id/execute {input} — execute a tool (settings "Test")
//   → response: { status: "success", output } | { status: "error", error } | { status: "denied", reason }
export function executeTool(id: string, input: Record<string, unknown>): Promise<ToolExecResult> {
  return apiFetch<ToolExecResult>(`/v1/tools/${encodeURIComponent(id)}/execute`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Skills  (3 endpoints) — mount /v1/skills
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface SkillInfo {
  name: string;
  description?: string;
  tools?: string[];
  hidden?: boolean;
  color?: string;
  mode?: string;
}

// [UI] GET /v1/skills — list skills (settings-dialog tab Skills)
export function fetchSkills(): Promise<SkillInfo[]> {
  return apiFetch<{ skills: SkillInfo[] }>("/v1/skills").then((r) => r.skills ?? []);
}

// [UI] GET /v1/skills/:name — skill detail (click to view instructions)
export function getSkill(name: string): Promise<{ skill: { manifest: SkillInfo; body: string; raw: string } }> {
  return apiFetch<{ skill: { manifest: SkillInfo; body: string; raw: string } }>(`/v1/skills/${encodeURIComponent(name)}`);
}

// [UI] POST /v1/skills {name, description, instructions, tools?, directory?, color?} — create new skill
export interface CreateSkillInput {
  name: string;
  description: string;
  instructions: string;
  tools?: string[];
  directory?: string;
  color?: string;
}

export function createSkill(input: CreateSkillInput): Promise<{ ok: boolean; output: string }> {
  return apiFetch<{ ok: boolean; output: string }>("/v1/skills", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// [UI] POST /v1/skills/reload — reload skills from disk (settings-dialog Reload button)
export function reloadSkills(): Promise<{ ok: boolean; count: number }> {
  return apiFetch<{ ok: boolean; count: number }>("/v1/skills/reload", { method: "POST" });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Questions  (2 endpoints) — mount /v1/questions
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PendingQuestion {
  id: string;
  question: string;
  header?: string;
  options?: { label: string; description?: string }[];
  multiple?: boolean;
  createdAt: string;
}

// [UI] GET /v1/questions — pending agent questions (user prompt dialog)
export function fetchPendingQuestions(): Promise<PendingQuestion[]> {
  return apiFetch<{ questions: PendingQuestion[] }>("/v1/questions").then((r) => r.questions ?? []);
}

// [UI] POST /v1/questions/:id/reply {answer} — answer a question
export function replyQuestion(id: string, answer: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/v1/questions/${encodeURIComponent(id)}/reply`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Runs  (5 endpoints) — mount /v1/runs
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface RunInfo {
  runId: string;
  state: string;
}

// [TODO: no UI] POST /v1/runs {prompt} — create run (202, via SessionRunCoordinator)
//   → response: { runId, statusUrl, eventsUrl, session? }
// export function startRun(prompt: string): Promise<{ runId: string; statusUrl: string; eventsUrl: string; session?: { id: string } }> {
//   return apiFetch<{ runId: string; statusUrl: string; eventsUrl: string; session?: { id: string } }>("/v1/runs", {
//     method: "POST",
//     body: JSON.stringify({ prompt }),
//   });
// }

// [TODO: no UI] GET /v1/runs — list active runs (tab Runs)
// export function fetchRuns(): Promise<{ runs: RunInfo[]; activeCount: number }> {
//   return apiFetch<{ runs: RunInfo[]; activeCount: number }>("/v1/runs");
// }

// [TODO: no UI] GET /v1/runs/:id — events for a run (event log tab)
// export function fetchRunEvents(runId: string): Promise<{ runId: string; events: unknown[] }> {
//   return apiFetch<{ runId: string; events: unknown[] }>(`/v1/runs/${encodeURIComponent(runId)}/events`);
// }

// [TODO: no UI] GET /v1/runs/:id/state — run state
// export function fetchRunState(runId: string): Promise<{ runId: string; state: unknown }> {
//   return apiFetch<{ runId: string; state: unknown }>(`/v1/runs/${encodeURIComponent(runId)}/state`);
// }

// [TODO: no UI] POST /v1/runs/:id/cancel — cancel running run
// export function cancelRun(runId: string): Promise<{ runId: string; state: string }> {
//   return apiFetch<{ runId: string; state: string }>(`/v1/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });
// }

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: File History  (3 endpoints) — mount /v1/file-history
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface FileVersionInfo {
  filePath: string;
  content: string;
  timestamp: number;
}

export interface UndoEntryInfo {
  filePath: string;
  content: string;
  timestamp: number;
}

// [UI] GET /v1/file-history — file change history (chat toolbar Undo/Redo buttons)
export function fetchFileHistory(): Promise<FileVersionInfo[]> {
  return apiFetch<{ versions: FileVersionInfo[] }>("/v1/file-history").then((r) => r.versions ?? []);
}

// [UI] POST /v1/file-history/undo — undo last file change
export function undoFileChange(): Promise<{ entry: UndoEntryInfo | null }> {
  return apiFetch<{ entry: UndoEntryInfo | null }>("/v1/file-history/undo", { method: "POST" });
}

// [UI] POST /v1/file-history/redo — redo file change
export function redoFileChange(): Promise<{ entry: UndoEntryInfo | null }> {
  return apiFetch<{ entry: UndoEntryInfo | null }>("/v1/file-history/redo", { method: "POST" });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Stats  (1 endpoint) — mount /v1/stats
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface StatsResponse {
  totalSessions: number;
  totalMessages: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionsByDate: { date: string; count: number }[];
  costByModel: { model: string; cost: number }[];
}

// [UI] GET /v1/stats — usage overview (settings tab General / footer)
export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/v1/stats");
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Health  (1 endpoint) — mount /health (outside /v1)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [UI] GET /health — server status + uptime (status bar)
export function fetchHealth(): Promise<{ status: string; uptime: number }> {
  return apiFetch<{ status: string; uptime: number }>("/health");
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Plugins  (4 endpoints) — mount /v1/plugins
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  hooks: string[];
}

// [UI] GET /v1/plugins — list plugins (settings-dialog tab Skills & Plugins)
export function fetchPlugins(): Promise<PluginInfo[]> {
  return apiFetch<{ plugins: PluginInfo[] }>("/v1/plugins").then((r) => r.plugins ?? []);
}

// [TODO: no UI] GET /v1/plugins/:id — plugin detail
// export function getPlugin(id: string): Promise<{ plugin: PluginInfo }> {
//   return apiFetch<{ plugin: PluginInfo }>(`/v1/plugins/${encodeURIComponent(id)}`);
// }

// [UI] POST /v1/plugins/:id/activate — activate plugin (settings-dialog Activate button)
export function activatePlugin(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/v1/plugins/${encodeURIComponent(id)}/activate`, { method: "POST" });
}

// [UI] POST /v1/plugins/:id/deactivate — deactivate plugin (settings-dialog Deactivate button)
export function deactivatePlugin(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/v1/plugins/${encodeURIComponent(id)}/deactivate`, { method: "POST" });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: MCP  (4 endpoints) — mount /v1/mcp
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface McpServerInfo {
  id: string;
  name: string;
  transport: "stdio" | "streamable-http";
  status: "connected" | "disconnected";
  toolsCount: number;
}

// [UI] GET /v1/mcp/servers — list MCP servers (tab MCP)
export function fetchMcpServers(): Promise<McpServerInfo[]> {
  return apiFetch<{ servers: McpServerInfo[] }>("/v1/mcp/servers").then((r) => r.servers ?? []);
}

// [TODO: no UI] GET /v1/mcp/servers/:id — server detail (actual toolsCount)
// export function getMcpServer(id: string): Promise<{ server: McpServerInfo }> {
//   return apiFetch<{ server: McpServerInfo }>(`/v1/mcp/servers/${encodeURIComponent(id)}`);
// }

// [UI] POST /v1/mcp/servers/:id/start — connect server (tab MCP Start button)
export function startMcpServer(id: string): Promise<{ server: string; status: "connected" }> {
  return apiFetch<{ server: string; status: "connected" }>(`/v1/mcp/servers/${encodeURIComponent(id)}/start`, { method: "POST" });
}

// [UI] POST /v1/mcp/servers/:id/stop — disconnect server (tab MCP Stop button)
export function stopMcpServer(id: string): Promise<{ server: string; status: "disconnected" }> {
  return apiFetch<{ server: string; status: "disconnected" }>(`/v1/mcp/servers/${encodeURIComponent(id)}/stop`, { method: "POST" });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: LSP  (12 endpoints) — mount /v1/lsp
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface LspServerInfo {
  id: string;
  name: string;
  languageId: string;
  extensions: string[];
  status: "started" | "stopped";
  root?: string;
  connected?: boolean;
  since?: number;
  capabilities: string[];
}

export interface LspDiagnosticInfo {
  severity: "error" | "warning" | "info";
  message: string;
  source?: string;
  code?: string | number;
  range: unknown;
}

// [TODO: no UI] GET /v1/lsp/servers — list LSP servers + status (tab LSP)
// export function fetchLspServers(): Promise<LspServerInfo[]> {
//   return apiFetch<{ servers: LspServerInfo[] }>("/v1/lsp/servers").then((r) => r.servers ?? []);
// }

// [TODO: no UI] GET /v1/lsp/servers/:id — server detail
// export function getLspServer(id: string): Promise<{ server: LspServerInfo }> {
//   return apiFetch<{ server: LspServerInfo }>(`/v1/lsp/servers/${encodeURIComponent(id)}`);
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/start — start server
// export function startLspServer(id: string): Promise<{ server: LspServerInfo }> {
//   return apiFetch<{ server: LspServerInfo }>(`/v1/lsp/servers/${encodeURIComponent(id)}/start`, { method: "POST" });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/stop — stop server
// export function stopLspServer(id: string): Promise<{ server: LspServerInfo }> {
//   return apiFetch<{ server: LspServerInfo }>(`/v1/lsp/servers/${encodeURIComponent(id)}/stop`, { method: "POST" });
// }

// [TODO: no UI] GET /v1/lsp/diagnostics?filePath= — file diagnostics
// export function fetchLspDiagnostics(filePath: string): Promise<{ filePath: string; errorCount: number; diagnostics: LspDiagnosticInfo[] }> {
//   return apiFetch<{ filePath: string; errorCount: number; diagnostics: LspDiagnosticInfo[] }>(`/v1/lsp/diagnostics?filePath=${encodeURIComponent(filePath)}`);
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/completion {filePath, position} — completions
// export function lspCompletion(
//   id: string,
//   filePath: string,
//   position: { line: number; character: number },
// ): Promise<{ items: unknown[] }> {
//   return apiFetch<{ items: unknown[] }>(`/v1/lsp/servers/${encodeURIComponent(id)}/completion`, {
//     method: "POST",
//     body: JSON.stringify({ filePath, position }),
//   });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/hover {filePath, position}
// export function lspHover(id: string, filePath: string, position: { line: number; character: number }): Promise<unknown> {
//   return apiFetch<unknown>(`/v1/lsp/servers/${encodeURIComponent(id)}/hover`, { method: "POST", body: JSON.stringify({ filePath, position }) });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/definition {filePath, position}
// export function lspDefinition(id: string, filePath: string, position: { line: number; character: number }): Promise<unknown> {
//   return apiFetch<unknown>(`/v1/lsp/servers/${encodeURIComponent(id)}/definition`, { method: "POST", body: JSON.stringify({ filePath, position }) });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/references {filePath, position} → { locations }
// export function lspReferences(id: string, filePath: string, position: { line: number; character: number }): Promise<{ locations: unknown[] }> {
//   return apiFetch<{ locations: unknown[] }>(`/v1/lsp/servers/${encodeURIComponent(id)}/references`, { method: "POST", body: JSON.stringify({ filePath, position }) });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/signature-help {filePath, position}
// export function lspSignatureHelp(id: string, filePath: string, position: { line: number; character: number }): Promise<unknown> {
//   return apiFetch<unknown>(`/v1/lsp/servers/${encodeURIComponent(id)}/signature-help`, { method: "POST", body: JSON.stringify({ filePath, position }) });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/document-symbols {filePath} → { symbols }
// export function lspDocumentSymbols(id: string, filePath: string): Promise<{ symbols: unknown[] }> {
//   return apiFetch<{ symbols: unknown[] }>(`/v1/lsp/servers/${encodeURIComponent(id)}/document-symbols`, { method: "POST", body: JSON.stringify({ filePath }) });
// }

// [TODO: no UI] POST /v1/lsp/servers/:id/code-action {filePath, range, context} → { actions }
// export function lspCodeActions(id: string, filePath: string, range: unknown, context: { diagnostics: unknown[] }): Promise<{ actions: unknown[] }> {
//   return apiFetch<{ actions: unknown[] }>(`/v1/lsp/servers/${encodeURIComponent(id)}/code-action`, { method: "POST", body: JSON.stringify({ filePath, range, context }) });
// }

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Knowledge  (15 endpoints) — mount /v1/knowledge
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface MemoryInfo {
  key: string;
  value: string;
  sessionId: string;
  tier: "working" | "session" | "long-term";
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// [UI] GET /v1/knowledge/memories?tier=&sessionId= — list memories (tab Learning)
export function fetchMemories(tier?: MemoryInfo["tier"], sessionId?: string): Promise<MemoryInfo[]> {
  const params = new URLSearchParams();
  if (tier) params.set("tier", tier);
  if (sessionId) params.set("sessionId", sessionId);
  return apiFetch<{ memories: MemoryInfo[] }>(`/v1/knowledge/memories?${params}`).then((r) => r.memories ?? []);
}

// [UI] GET /v1/knowledge/memories/search?q=&sessionId= — search memories
export function searchMemories(q: string, sessionId?: string): Promise<MemoryInfo[]> {
  const params = new URLSearchParams({ q });
  if (sessionId) params.set("sessionId", sessionId);
  return apiFetch<{ memories: MemoryInfo[] }>(`/v1/knowledge/memories/search?${params}`).then((r) => r.memories ?? []);
}

// [UI] DELETE /v1/knowledge/memories/:key?sessionId= — delete memory
export function deleteMemory(key: string, sessionId?: string): Promise<{ success: boolean }> {
  const params = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return apiFetch<{ success: boolean }>(`/v1/knowledge/memories/${encodeURIComponent(key)}${params}`, { method: "DELETE" });
}

// [UI] POST /v1/knowledge/memories {key, value, sessionId, tier?, tags?} — add memory
export function addMemory(memory: { key: string; value: string; sessionId: string; tier?: MemoryInfo["tier"]; tags?: string[] }): Promise<MemoryInfo> {
  return apiFetch<MemoryInfo>("/v1/knowledge/memories", { method: "POST", body: JSON.stringify(memory) });
}

// [UI] PUT /v1/knowledge/memories/:key {value?, tier?, tags?, sessionId} — update memory
export function updateMemory(key: string, updates: { value?: string; tier?: MemoryInfo["tier"]; tags?: string[]; sessionId: string }): Promise<MemoryInfo> {
  return apiFetch<MemoryInfo>(`/v1/knowledge/memories/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(updates) });
}

export interface LearningStatus {
  enabled: boolean;
  pendingApprovals: number;
  memoryCount: number;
}

// [UI] GET /v1/knowledge/learning/status — learning engine status (settings tab Learning)
export function fetchLearningStatus(): Promise<LearningStatus> {
  return apiFetch<LearningStatus>("/v1/knowledge/learning/status");
}

// [UI] POST /v1/knowledge/learning/trigger — trigger review
export function triggerLearningReview(): Promise<{ triggered: boolean; message: string }> {
  return apiFetch<{ triggered: boolean; message: string }>("/v1/knowledge/learning/trigger", { method: "POST" });
}

// [UI] GET /v1/knowledge/learning/enabled {enabled} — toggle learning (settings tab Learning)
export function setLearningEnabled(enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> {
  return apiFetch<{ ok: boolean; enabled: boolean }>("/v1/knowledge/learning/enabled", { method: "POST", body: JSON.stringify({ enabled }) });
}

export interface KnowledgeApproval {
  id: string;
  key?: string;
  value?: string;
  reason?: string;
  createdAt?: string;
}

// [UI] GET /v1/knowledge/approvals — list pending memory approvals
export function fetchKnowledgeApprovals(): Promise<KnowledgeApproval[]> {
  return apiFetch<{ approvals: KnowledgeApproval[] }>("/v1/knowledge/approvals").then((r) => r.approvals ?? []);
}

// [UI] POST /v1/knowledge/approvals/:id/approve — approve memory
export function approveMemory(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/v1/knowledge/approvals/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

// [UI] POST /v1/knowledge/approvals/:id/reject — reject memory
export function rejectMemory(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/v1/knowledge/approvals/${encodeURIComponent(id)}/reject`, { method: "POST" });
}

// [UI] GET /v1/knowledge/bounded — memory bounded (auto-compact)
export function fetchBoundedMemory(): Promise<{ memory: unknown[]; totalChars: number }> {
  return apiFetch<{ memory: unknown[]; totalChars: number }>("/v1/knowledge/bounded");
}

// [UI] POST /v1/knowledge/profile {value} — set user profile
export function setLearningProfile(value: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/v1/knowledge/profile", { method: "POST", body: JSON.stringify({ value }) });
}

// [UI] POST /v1/knowledge/working-facts {key, value} — set working fact
export function setWorkingFact(key: string, value: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/v1/knowledge/working-facts", { method: "POST", body: JSON.stringify({ key, value }) });
}

// [UI] POST /v1/knowledge/working/clear — clear working memory
export function clearWorkingMemory(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/v1/knowledge/working/clear", { method: "POST" });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Permissions  (10 endpoints) — mount /v1/permissions
 * ═══════════════════════════════════════════════════════════════════════════ */

// [UI] POST /v1/permissions/rules {toolName, pattern, decision} — add dynamic rule
export function addPermissionRule(toolName: string, pattern: string, decision: "allow" | "deny"): Promise<{ ok: boolean; rule: { toolName: string; pattern: string; decision: string } }> {
  return apiFetch<{ ok: boolean; rule: { toolName: string; pattern: string; decision: string } }>("/v1/permissions/rules", { method: "POST", body: JSON.stringify({ toolName, pattern, decision }) });
}

// [UI] POST /v1/permissions/global-rules {rules} — set global rules
export function setGlobalPermissionRules(rules: Record<string, unknown>): Promise<{ ok: boolean; rules: Record<string, unknown> }> {
  return apiFetch<{ ok: boolean; rules: Record<string, unknown> }>("/v1/permissions/global-rules", { method: "POST", body: JSON.stringify({ rules }) });
}

// [UI] GET /v1/permissions/saved/:tool?agentId= — check saved approval
export function checkSavedApproval(toolName: string, agentId?: string): Promise<{ toolName: string; approved: boolean }> {
  const params = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
  return apiFetch<{ toolName: string; approved: boolean }>(`/v1/permissions/saved/${encodeURIComponent(toolName)}${params}`);
}

// [UI] POST /v1/permissions/limits/check {inputTokens?, outputTokens?, step?} — check limits
export function checkPermissionLimits(body: { inputTokens?: number; outputTokens?: number; step?: number }): Promise<{ maxTokensOk?: boolean; maxStepsOk?: boolean }> {
  return apiFetch<{ maxTokensOk?: boolean; maxStepsOk?: boolean }>("/v1/permissions/limits/check", { method: "POST", body: JSON.stringify(body) });
}

// [UI] POST /v1/permissions/risk-overrides {overrides} — override by risk level
export function setRiskOverrides(overrides: Record<string, "allow" | "deny" | "approval_required">): Promise<{ ok: boolean; overrides: Record<string, string> }> {
  return apiFetch<{ ok: boolean; overrides: Record<string, string> }>("/v1/permissions/risk-overrides", { method: "POST", body: JSON.stringify({ overrides }) });
}

// [UI] POST /v1/permissions/policies/evaluate {risk, toolId?, input?} — evaluate a rule
export function evaluatePermission(risk: string, toolId?: string, input?: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }> {
  return apiFetch<{ allowed: boolean; reason?: string }>("/v1/permissions/policies/evaluate", { method: "POST", body: JSON.stringify({ risk, toolId, input }) });
}

// [UI] GET /v1/permissions/policies — list dynamic rules
export function fetchPermissionPolicies(): Promise<unknown[]> {
  return apiFetch<{ policies: unknown[] }>("/v1/permissions/policies").then((r) => r.policies ?? []);
}

export interface PermissionRequest {
  id: string;
  runId: string;
  toolName: string;
  resource: string;
  reason: string;
  prompt: string;
  occurredAt: string;
}

// [UI] GET /v1/permissions/pending — pending permission requests (settings tab Permission)
export function fetchPendingPermissions(): Promise<PermissionRequest[]> {
  return apiFetch<{ pending: PermissionRequest[] }>("/v1/permissions/pending").then((r) => r.pending ?? []);
}

// [UI] POST /v1/permissions/:id/reply {reply, feedback?} — reply to request (reply: "once" | "always" | "reject")
export function replyPermissionRequest(id: string, reply: "once" | "always" | "reject", feedback?: string): Promise<{ ok: boolean; reply: string; feedback?: string }> {
  return apiFetch<{ ok: boolean; reply: string; feedback?: string }>(`/v1/permissions/${encodeURIComponent(id)}/reply`, { method: "POST", body: JSON.stringify({ reply, feedback }) });
}

// [UI] GET /v1/permissions/:id — permission request detail (Detail button in Pending Requests)
export function fetchPermissionRequest(id: string): Promise<PermissionRequest> {
  return apiFetch<{ request: PermissionRequest }>(`/v1/permissions/${encodeURIComponent(id)}`).then((r) => r.request);
}

// [TODO: no UI] GET /v1/permissions/:id — request detail
// export function getPermissionRequest(id: string): Promise<{ request: unknown }> {
//   return apiFetch<{ request: unknown }>(`/v1/permissions/${encodeURIComponent(id)}`);
// }

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Agents  (11 endpoints) — mount /v1/agents
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] GET /v1/agents — list agents (tab Agents)
// [TODO: no UI] POST /v1/agents — create agent
// [TODO: no UI] GET /v1/agents/find-by-capability?key=&value= — find agent by capability
// [TODO: no UI] GET /v1/agents/:id — agent detail
// [TODO: no UI] PATCH /v1/agents/:id — update agent
// [TODO: no UI] DELETE /v1/agents/:id — delete agent
// [TODO: no UI] GET /v1/agents/:id/children — child agents
// [TODO: no UI] GET /v1/agents/:id/parent — parent agent
// [TODO: no UI] GET /v1/agents/:id/ancestors — ancestor chain
// [TODO: no UI] POST /v1/agents/:id/delegate {prompt} — delegate task to child agent
// [TODO: no UI] POST /v1/agents/reload — reload agents from disk

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Engine  (10 endpoints) — mount /v1/engine (multi-agent, deferred)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] GET /v1/engine/status — { activeSession, currentRunId, ... }
// [TODO: no UI] GET /v1/engine/config — runtime engine config
// [TODO: no UI] PUT /v1/engine/config — update runtime config
// [TODO: no UI] POST /v1/engine/circuit-breaker/reset — reset circuit breaker
// [TODO: no UI] POST /v1/engine/use-agent {agentId} — switch active agent
// [TODO: no UI] GET /v1/engine/current-agent — currently active agent
// [TODO: no UI] POST /v1/engine/spawn-agent — spawn sub-agent
// [TODO: no UI] POST /v1/engine/send-input — send input to engine
// [TODO: no UI] POST /v1/engine/parallel-runs — run multiple agents in parallel
// [TODO: no UI] POST /v1/engine/tools — register tool handler

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Events  (4 endpoints) — mount /v1/events (+ /v1/runs/:id/events)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] GET /v1/runs/:id/events — (already listed in Runs module)
// [TODO: no UI] GET /v1/events/subscribe — SSE realtime (replaces/supplements WS ACP)
// [TODO: no UI] GET /v1/events/replay — replay durable events
// [TODO: no UI] POST /v1/events/publish — manually publish event (debug)

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Saga  (3 endpoints) — mount /v1/saga (debug undo/redo chain)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] GET /v1/saga/entries — list saga entries
// [TODO: no UI] POST /v1/saga/rollback/:step — rollback one step
// [TODO: no UI] POST /v1/saga/rollback-all — rollback all steps

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Context  (3 endpoints) — mount /v1/context (debug system context)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] GET /v1/context — baseline context
// [TODO: no UI] GET /v1/context/sources — context sources
// [TODO: no UI] POST /v1/context/reconcile — reconcile context

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Parsers  (2 endpoints) — mount /v1/parsers (dev tool)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] POST /v1/parsers/agent — parse agent YAML/frontmatter
// [TODO: no UI] POST /v1/parsers/skill — parse skill YAML/frontmatter

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Shares  (3 endpoints) — mount /v1/shares (share link)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] POST /v1/shares {sessionId?, expiresInDays?} — create share link
// [TODO: no UI] GET /v1/shares/:id — access share (public, no token needed)
// [TODO: no UI] DELETE /v1/shares/:id — delete share

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Webhooks  (2 endpoints) — mount /v1/webhooks (inbound, rarely used)
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] POST /v1/webhooks/:channel — receive webhook (HMAC verify)
// [TODO: no UI] GET /v1/webhooks/health — webhook status

/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE: Tokens  (1 endpoint) — mount /v1/tokens
 * ═══════════════════════════════════════════════════════════════════════════ */

// [TODO: no UI] POST /v1/tokens/count {text, model?} — count tokens in composer
// export function countTokens(text: string, model?: string): Promise<{ count: number }> {
//   return apiFetch<{ count: number }>("/v1/tokens/count", { method: "POST", body: JSON.stringify({ text, model }) });
// }

/* ═══════════════════════════════════════════════════════════════════════════
 * END OF CATALOG
 * Stats: 128 REST endpoints (25 modules) + 8 ACP (via AcpClient).
 * UI wired: 14. Not yet wired: 114. See docs/api-ui-matrix.md.
 * ═══════════════════════════════════════════════════════════════════════════ */
