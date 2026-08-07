import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "../hooks/use-theme";
import type { Language } from "../i18n";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type Shell = "bash" | "zsh" | "pwsh" | "powershell";
export type Provider = string;
export type DefaultAgent = "build" | "plan";
export type SandboxMode = "off" | "non-main" | "all";
export type SandboxScope = "session" | "agent" | "shared";

export interface GeneralConfig {
  defaultProvider: Provider;
  defaultModel: string;
  smallModel: string;
  defaultAgent: DefaultAgent;
  auto: boolean;
  logLevel: LogLevel;
  shell: Shell;
}

export interface AppearanceConfig {
  theme: Theme;
  language: Language;
  fontSize: number;
  showLineNumbers: boolean;
  fontFamily: string;
  showThinkingBlocks: boolean;
  compactMode: boolean;
  diffStyle: "inline" | "split" | "stacked";
  borderRadius: "sm" | "md" | "lg";
}

export interface BehaviourConfig {
  selfCorrectOnFailure: boolean;
  maxSelfCorrectAttempts: number;
  doomLoopThreshold: number;
}

export interface PermissionConfig {
  externalDirectoryAccess: boolean;
  permission: Record<string, unknown>;
  permissionRiskDefaults: Record<string, string>;
  allow: string[];
  deny: string[];
  ask: string[];
}

export interface NotificationConfig {
  enabled: boolean;
  onFailure: boolean;
  onApproval: boolean;
  onSuccess: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  desktop: boolean;
  onError: boolean;
  onPermission: boolean;
}

export interface ProfileConfig {
  username: string;
  email: string;
}

export interface ShortcutConfig {
  submit: string;
  cancel: string;
  toggleSidebar: string;
}

export interface SdkConfig {
  sdkPath: string;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  blacklist: string[];
  whitelist: string[];
}

export interface ModelConfig {
  maxTokens: number;
  thinkingBudget: number;
}

export interface ModelRoutingConfig {
  failover: Record<string, unknown>;
  advisorModel: string;
  perFeature: Record<string, string>;
}

export interface LearningConfig {
  enabled: boolean;
  backgroundReview: boolean;
  memoryWriteApproval: boolean;
  skillWriteApproval: boolean;
  memoryCharLimit: number;
  userCharLimit: number;
  autoMemoryEnabled: boolean;
  autoMemoryDirectory: string;
  autoMemoryMaxFiles: number;
}

export interface IndexingConfig {
  enabled: boolean;
  ignore: string[];
  maxFileSize: number;
  maxFiles: number;
  refreshInterval: number;
}

export interface HookConfig {
  preToolUse: Array<{ matcher: string; command: string; timeout: number }>;
  postToolUse: Array<{ matcher: string; command: string; timeout: number }>;
  sessionStart: Array<{ matcher: string; command: string }>;
  sessionEnd: Array<{ matcher: string; command: string }>;
}

export interface LintTestConfig {
  enabled: boolean;
  commands: Record<string, string>;
}

export interface TestConfig {
  enabled: boolean;
  command: string;
}

export interface AutoFixConfig {
  enabled: boolean;
  maxAttempts: number;
}

export interface ManagedConfig {
  enabled: boolean;
  allowedModels: string[];
  allowedMcpServers: string[];
  deniedMcpServers: string[];
  minVersion: string;
  forceLoginOrgId: string;
}

export interface AuditConfig {
  enabled: boolean;
  logPath: string;
  retentionDays: number;
  logLevel: string;
}

export interface EditorConfig {
  vimMode: boolean;
  multiline: boolean;
  autoSuggest: boolean;
  tabCompletion: boolean;
}

export interface PrivacyConfig {
  telemetry: boolean;
  autoUpdate: boolean;
  updateChannel: string;
  sessionSharing: string;
}

export interface SandboxConfig {
  mode: SandboxMode;
  scope: SandboxScope;
  timeoutMs: number;
  maxConcurrent: number;
}

export interface VntUiConfig {
  general: GeneralConfig;
  appearance: AppearanceConfig;
  behaviour: BehaviourConfig;
  permission: PermissionConfig;
  notifications: NotificationConfig;
  profile: ProfileConfig;
  shortcuts: ShortcutConfig;
  sdk: SdkConfig;
  provider: ProviderConfig;
  model: ModelConfig;
  modelRouting: ModelRoutingConfig;
  learning: LearningConfig;
  indexing: IndexingConfig;
  hooks: HookConfig;
  lint: LintTestConfig;
  test: TestConfig;
  autoFix: AutoFixConfig;
  managed: ManagedConfig;
  audit: AuditConfig;
  editor: EditorConfig;
  privacy: PrivacyConfig;
  sandbox: SandboxConfig;
}

interface ConfigActions {
  setGeneral: (value: Partial<GeneralConfig>) => void;
  setAppearance: (value: Partial<AppearanceConfig>) => void;
  setBehaviour: (value: Partial<BehaviourConfig>) => void;
  setPermission: (value: Partial<PermissionConfig>) => void;
  setNotifications: (value: Partial<NotificationConfig>) => void;
  setProfile: (value: Partial<ProfileConfig>) => void;
  setShortcuts: (value: Partial<ShortcutConfig>) => void;
  setSdk: (value: Partial<SdkConfig>) => void;
  setProvider: (value: Partial<ProviderConfig>) => void;
  setModel: (value: Partial<ModelConfig>) => void;
  setModelRouting: (value: Partial<ModelRoutingConfig>) => void;
  setLearning: (value: Partial<LearningConfig>) => void;
  setIndexing: (value: Partial<IndexingConfig>) => void;
  setHooks: (value: Partial<HookConfig>) => void;
  setLint: (value: Partial<LintTestConfig>) => void;
  setTest: (value: Partial<TestConfig>) => void;
  setAutoFix: (value: Partial<AutoFixConfig>) => void;
  setManaged: (value: Partial<ManagedConfig>) => void;
  setAudit: (value: Partial<AuditConfig>) => void;
  setEditor: (value: Partial<EditorConfig>) => void;
  setPrivacy: (value: Partial<PrivacyConfig>) => void;
  setSandbox: (value: Partial<SandboxConfig>) => void;
  resetConfig: () => void;
}

export type ConfigState = VntUiConfig & ConfigActions;

const DEFAULTS: VntUiConfig = {
  general: {
    defaultProvider: "",
    defaultModel: "",
    smallModel: "",
    defaultAgent: "build",
    auto: false,
    logLevel: "info",
    shell: "pwsh",
  },
  appearance: {
    theme: "light",
    language: "en",
    fontSize: 14,
    showLineNumbers: true,
    fontFamily: "roboto",
    showThinkingBlocks: true,
    compactMode: false,
    diffStyle: "inline",
    borderRadius: "md",
  },
  behaviour: {
    selfCorrectOnFailure: true,
    maxSelfCorrectAttempts: 3,
    doomLoopThreshold: 3,
  },
  permission: {
    externalDirectoryAccess: false,
    permission: {},
    permissionRiskDefaults: {},
    allow: [],
    deny: [],
    ask: [],
  },
  notifications: {
    enabled: true,
    onFailure: true,
    onApproval: true,
    onSuccess: false,
    soundEnabled: true,
    soundVolume: 70,
    desktop: true,
    onError: true,
    onPermission: true,
  },
  profile: {
    username: "",
    email: "",
  },
  shortcuts: {
    submit: "Ctrl+Enter",
    cancel: "Escape",
    toggleSidebar: "Ctrl+B",
  },
  sdk: {
    sdkPath: "./node_modules/@vinhnt-sdk/plugin-sdk",
  },
  provider: {
    apiKey: "",
    baseUrl: "",
    headers: {},
    body: {},
    blacklist: [],
    whitelist: [],
  },
  model: {
    maxTokens: 4096,
    thinkingBudget: 0,
  },
  modelRouting: {
    failover: { enabled: false, models: [] },
    advisorModel: "",
    perFeature: {},
  },
  learning: {
    enabled: false,
    backgroundReview: false,
    memoryWriteApproval: true,
    skillWriteApproval: true,
    memoryCharLimit: 2200,
    userCharLimit: 1400,
    autoMemoryEnabled: false,
    autoMemoryDirectory: "auto-memory",
    autoMemoryMaxFiles: 20,
  },
  indexing: {
    enabled: true,
    ignore: ["node_modules/**", "dist/**", ".git/**"],
    maxFileSize: 100000,
    maxFiles: 500,
    refreshInterval: 3600,
  },
  hooks: {
    preToolUse: [],
    postToolUse: [],
    sessionStart: [],
    sessionEnd: [],
  },
  lint: {
    enabled: true,
    commands: {},
  },
  test: {
    enabled: true,
    command: "",
  },
  autoFix: {
    enabled: false,
    maxAttempts: 3,
  },
  managed: {
    enabled: false,
    allowedModels: [],
    allowedMcpServers: [],
    deniedMcpServers: [],
    minVersion: "",
    forceLoginOrgId: "",
  },
  audit: {
    enabled: false,
    logPath: "",
    retentionDays: 90,
    logLevel: "info",
  },
  editor: {
    vimMode: false,
    multiline: true,
    autoSuggest: true,
    tabCompletion: false,
  },
  privacy: {
    telemetry: true,
    autoUpdate: true,
    updateChannel: "stable",
    sessionSharing: "manual",
  },
  sandbox: {
    mode: "off",
    scope: "session",
    timeoutMs: 30000,
    maxConcurrent: 3,
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setGeneral: (value) => set((s) => ({ general: { ...s.general, ...value } })),
      setAppearance: (value) => set((s) => ({ appearance: { ...s.appearance, ...value } })),
      setBehaviour: (value) => set((s) => ({ behaviour: { ...s.behaviour, ...value } })),
      setPermission: (value) => set((s) => ({ permission: { ...s.permission, ...value } })),
      setNotifications: (value) => set((s) => ({ notifications: { ...s.notifications, ...value } })),
      setProfile: (value) => set((s) => ({ profile: { ...s.profile, ...value } })),
      setShortcuts: (value) => set((s) => ({ shortcuts: { ...s.shortcuts, ...value } })),
      setSdk: (value) => set((s) => ({ sdk: { ...s.sdk, ...value } })),
      setProvider: (value) => set((s) => ({ provider: { ...s.provider, ...value } })),
      setModel: (value) => set((s) => ({ model: { ...s.model, ...value } })),
      setModelRouting: (value) => set((s) => ({ modelRouting: { ...s.modelRouting, ...value } })),
      setLearning: (value) => set((s) => ({ learning: { ...s.learning, ...value } })),
      setIndexing: (value) => set((s) => ({ indexing: { ...s.indexing, ...value } })),
      setHooks: (value) => set((s) => ({ hooks: { ...s.hooks, ...value } })),
      setLint: (value) => set((s) => ({ lint: { ...s.lint, ...value } })),
      setTest: (value) => set((s) => ({ test: { ...s.test, ...value } })),
      setAutoFix: (value) => set((s) => ({ autoFix: { ...s.autoFix, ...value } })),
      setManaged: (value) => set((s) => ({ managed: { ...s.managed, ...value } })),
      setAudit: (value) => set((s) => ({ audit: { ...s.audit, ...value } })),
      setEditor: (value) => set((s) => ({ editor: { ...s.editor, ...value } })),
      setPrivacy: (value) => set((s) => ({ privacy: { ...s.privacy, ...value } })),
      setSandbox: (value) => set((s) => ({ sandbox: { ...s.sandbox, ...value } })),
      resetConfig: () => set({ ...DEFAULTS }),
    }),
    { name: "vnt-ui-config", version: 4, migrate: () => ({ ...DEFAULTS }) }
  )
);
