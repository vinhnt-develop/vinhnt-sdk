// @vinhnt-sdk/config
// Configuration layer — credential references, settings namespaces, env resolution

export {
  type CredentialRef,
  type ResolvedCredential,
  type CredentialSource,
  type CredentialInfo,
  type CredentialProvider,
  credentialRef,
} from "./credentials.js";

export {
  type SettingsNamespace,
  type SettingsSection,
  type SettingsProvider,
  type SettingsSchema,
  settingsNamespace,
  mergeLayers,
} from "./settings.js";

export {
  type EnvSnapshot,
  type MultiLayerEnvConfig,
  resolveEnv,
  resolveCredentialFromEnv,
  parseEnvFile,
  resolveCredentialMultiLayer,
} from "./env.js";

export { parseJsonc, parseJsoncFile } from "./jsonc-parser.js";

export {
  FileCredentialProvider,
  type FileCredentialProviderOptions,
} from "./file-credential-provider.js";

export {
  FileSettingsProvider,
  type FileSettingsProviderOptions,
} from "./file-settings-provider.js";

export {
  ConfigMigrator,
  defineMigration,
  type ConfigMigration,
  WORKSPACE_V1_TO_V2,
} from "./config-migrator.js";
