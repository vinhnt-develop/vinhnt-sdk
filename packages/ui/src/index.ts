export { cn } from "./lib/utils";

export { Button } from "./components/button";
export type { ButtonProps } from "./components/button";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/card";

export { Input } from "./components/input";
export type { InputProps } from "./components/input";

export { Badge } from "./components/badge";
export type { BadgeProps } from "./components/badge";

export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./components/select";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "./components/dropdown-menu";

export { CodeBlock } from "./components/code-block";
export type { CodeBlockProps } from "./components/code-block";

export { ToolCall } from "./components/tool-call";
export type { ToolCallProps } from "./components/tool-call";

export { Markdown } from "./components/markdown";
export type { MarkdownProps } from "./components/markdown";

export { ChatMessage } from "./components/chat-message";
export type { ChatMessageProps } from "./components/chat-message";

export { MessageList } from "./components/message-list";
export type { MessageListProps } from "./components/message-list";

export { ChatInput } from "./components/chat-input";
export type { ChatInputProps } from "./components/chat-input";

export { useTheme, type Theme } from "./hooks/use-theme";
export { useAppearance } from "./hooks/use-appearance";
export { useConfigHotReload } from "./hooks/use-config-hot-reload";

export { setupI18n, changeLanguage, i18n } from "./i18n/index";
export type { Language } from "./i18n/index";

export { useConnectionStore, subscribeToAcpEvents } from "./stores/connection-store";
export type { ConnectionStatus } from "./stores/connection-store";
export { usePermissionStore, initPermissionListener } from "./stores/permission-store";
export { useAcpStream } from "./hooks/use-acp-stream";
export { AcpClient } from "./lib/acp-client";
export type { AcpConnectionStatus, TaskStreamNotification, TaskEventHandler, AcpClientOptions, PermissionRequestInfo, ChatRunMode } from "./lib/acp-client";

export { FigmaService, figmaService } from "./lib/figma-service";
export type { FigmaStatus, FigmaTool } from "./lib/figma-service";

export {
  apiFetch,
  ApiClientError,
  getApiBaseUrl,
  setApiBaseUrl,
  getApiToken,
  setApiToken,
  setDefaultApiToken,
  fetchServerConfig,
  saveServerConfig,
  fetchSkills,
  fetchTools,
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  forkSession,
  fetchWorkspaces,
  addWorkspace,
  removeWorkspace,
  activateWorkspace,
  deactivateWorkspace,
  fetchPlugins,
  activatePlugin,
  deactivatePlugin,
  reloadSkills,
  fetchMcpServers,
  startMcpServer,
  stopMcpServer,
  fetchModels,
  fetchModelCatalog,
  searchModelsExternal,
  discoverProviderModels,
  getTool,
  executeTool,
  fetchLearningStatus,
  setLearningEnabled,
  triggerLearningReview,
  fetchMemories,
  searchMemories,
  deleteMemory,
  addMemory,
  updateMemory,
  fetchKnowledgeApprovals,
  approveMemory,
  rejectMemory,
  fetchBoundedMemory,
  setLearningProfile,
  setWorkingFact,
  clearWorkingMemory,
  fetchPendingPermissions,
  replyPermissionRequest,
  fetchPermissionRequest,
  addPermissionRule,
  setGlobalPermissionRules,
  checkSavedApproval,
  checkPermissionLimits,
  setRiskOverrides,
  evaluatePermission,
  fetchPermissionPolicies,
  fetchStats,
  fetchHealth,
  fetchFileHistory,
  undoFileChange,
  redoFileChange,
  getActiveWorkspace,
  detectWorkspaces,
  getSession,
  fetchSessionMessages,
  fetchPendingQuestions,
  replyQuestion,
  searchSessions,
  addSessionMessage,
  getActiveModel,
  getModelProvider,
  testModelPrompt,
  testProviderModel,
  resolveAgentModel,
  calculateModelCost,
  getSkill,
  createSkill,
} from "./lib/api-client";
export type {
  ApiErrorDetail,
  ServerConfigResponse,
  SkillInfo,
  ToolInfo,
  ToolExecResult,
  ApiSession,
  ApiWorkspace,
  PluginInfo,
  McpServerInfo,
  ModelInfo,
  ProviderInfo,
  ProviderCatalogEntry,
  ExternalModelCost,
  ExternalModelInfo,
  ModelSearchResponse,
  ModelsResponse,
  LearningStatus,
  PermissionRequest,
  StatsResponse,
  FileVersionInfo,
  UndoEntryInfo,
  ApiSessionMessage,
  MemoryInfo,
  KnowledgeApproval,
  CreateSkillInput,
} from "./lib/api-client";

export { UI_TO_SERVER_KEY, SERVER_TO_UI_KEY, uiValuesToServerPatch, flattenConfig, getPath } from "./lib/config-mapper";

export { useSessionStore } from "./stores/session-store";
export type { SessionInfo } from "./stores/session-store";

export { useWorkspaceStore } from "./stores/workspace-store";
export type { WorkspaceInfo } from "./stores/workspace-store";

export { useConfigStore } from "./stores/config-store";
export type {
  GeneralConfig, AppearanceConfig, BehaviourConfig, PermissionConfig,
  NotificationConfig, ProfileConfig, ShortcutConfig, ProviderConfig, ModelConfig,
  ModelRoutingConfig, LearningConfig, IndexingConfig, HookConfig, LintTestConfig, TestConfig,
  AutoFixConfig, ManagedConfig, AuditConfig, EditorConfig, PrivacyConfig,
  LogLevel, Shell, Provider, DefaultAgent, SandboxMode, SandboxScope,
} from "./stores/config-store";

export { useMessageStore } from "./stores/message-store";
export type { Message, MessageRole, ToolCallData } from "./stores/message-store";
export type { PendingQuestion } from "./lib/api-client";
