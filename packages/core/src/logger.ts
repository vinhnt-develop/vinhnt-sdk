// Logger lives in @vinhnt-sdk/schema (universal dependency) so every package
// shares one injectable instance; core re-exports for API stability (P5.9).
export { setLogger, setLogLevel, getLogger } from "@vinhnt-sdk/schema";
export type { Logger, LogLevel } from "@vinhnt-sdk/schema";
