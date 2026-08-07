import type { AgentConfig, SkillSource } from "@vinhnt-sdk/schema";

export interface AgentDefinition {
  readonly config: AgentConfig;
  readonly source: SkillSource;
  readonly raw: string;
}

export interface AgentDefParser {
  parse(raw: string, source: SkillSource): AgentDefinition;
  parseFile(filePath: string, source: SkillSource): Promise<AgentDefinition>;
}
