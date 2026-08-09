/**
 * Type tests for @vinhnt-sdk/tools
 * 
 * These tests verify that the public API has the correct types.
 * Run with: vitest run test/types.test-d.ts
 */
import { describe, it, expectTypeOf } from 'vitest';
import {
  defineTool,
  toolToDefinition,
  zodSchemaToNestedJsonSchema,
  ToolRegistry,
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createApplyPatchTool,
  createListDirectoryTool,
  createShellTool,
  createGitStatusTool,
  createGitDiffTool,
  createGitLogTool,
  createGitCommitTool,
  createGlobFilesTool,
  createGrepFilesTool,
  createWebFetchTool,
  createReadImageTool,
  readImageToContentParts,
  createQuestionTool,
  createWebSearchTool,
  createTodoWriteTool,
  createToolSearchTool,
  ToolSandbox,
  signalToToolContext,
  createSandbox,
  generateDiff,
  lintToolDescription,
  lintToolDefinitions,
  validateInput,
  ToolInputError,
  commandPattern,
  FileReadTracker,
  InMemoryFileHistory,
  createFileHistoryHook,
  createCodingDomain,
  LazyToolRegistry,
  ToolProviderRegistry,
  BuiltinToolProvider,
  ToolFileProvider,
  ToolFileLoader,
  AgentToolProvider,
  SkillToolProvider,
  createToolProviderRegistry,
  createToolProvider,
} from '../src/index.js';
import type {
  Tool,
  ToolConfig,
  ToolRisk,
  ToolDefinition,
  ToolContext,
  ToolHook,
  ToolProvider,
} from '../src/index.js';

describe('Tools Package Type Tests', () => {
  describe('Tool Definition', () => {
    it('defineTool should be defined', () => {
      expectTypeOf(defineTool).toBeDefined();
    });

    it('toolToDefinition should be defined', () => {
      expectTypeOf(toolToDefinition).toBeDefined();
    });

    it('zodSchemaToNestedJsonSchema should be defined', () => {
      expectTypeOf(zodSchemaToNestedJsonSchema).toBeDefined();
    });
  });

  describe('ToolRegistry', () => {
    it('ToolRegistry should be defined', () => {
      expectTypeOf(ToolRegistry).toBeDefined();
    });
  });

  describe('Tool Types', () => {
    it('Tool should have execute method', () => {
      expectTypeOf<Tool>().toHaveProperty('execute');
    });

    it('ToolConfig should have required properties', () => {
      expectTypeOf<ToolConfig>().toHaveProperty('name');
      expectTypeOf<ToolConfig>().toHaveProperty('description');
      expectTypeOf<ToolConfig>().toHaveProperty('risk');
      expectTypeOf<ToolConfig>().toHaveProperty('input');
      expectTypeOf<ToolConfig>().toHaveProperty('execute');
    });

    it('ToolRisk should be a string', () => {
      expectTypeOf<ToolRisk>().toBeString();
    });

    it('ToolDefinition should have required properties', () => {
      expectTypeOf<ToolDefinition>().toHaveProperty('id');
      expectTypeOf<ToolDefinition>().toHaveProperty('name');
    });
  });

  describe('Tool Context', () => {
    it('ToolContext should have required properties', () => {
      expectTypeOf<ToolContext>().toHaveProperty('workspaceRoot');
    });
  });

  describe('Built-in Tools', () => {
    it('createReadFileTool should be defined', () => {
      expectTypeOf(createReadFileTool).toBeDefined();
    });

    it('createWriteFileTool should be defined', () => {
      expectTypeOf(createWriteFileTool).toBeDefined();
    });

    it('createEditFileTool should be defined', () => {
      expectTypeOf(createEditFileTool).toBeDefined();
    });

    it('createApplyPatchTool should be defined', () => {
      expectTypeOf(createApplyPatchTool).toBeDefined();
    });

    it('createListDirectoryTool should be defined', () => {
      expectTypeOf(createListDirectoryTool).toBeDefined();
    });

    it('createShellTool should be defined', () => {
      expectTypeOf(createShellTool).toBeDefined();
    });

    it('createGitStatusTool should be defined', () => {
      expectTypeOf(createGitStatusTool).toBeDefined();
    });

    it('createGitDiffTool should be defined', () => {
      expectTypeOf(createGitDiffTool).toBeDefined();
    });

    it('createGitLogTool should be defined', () => {
      expectTypeOf(createGitLogTool).toBeDefined();
    });

    it('createGitCommitTool should be defined', () => {
      expectTypeOf(createGitCommitTool).toBeDefined();
    });

    it('createGlobFilesTool should be defined', () => {
      expectTypeOf(createGlobFilesTool).toBeDefined();
    });

    it('createGrepFilesTool should be defined', () => {
      expectTypeOf(createGrepFilesTool).toBeDefined();
    });

    it('createWebFetchTool should be defined', () => {
      expectTypeOf(createWebFetchTool).toBeDefined();
    });

    it('createReadImageTool should be defined', () => {
      expectTypeOf(createReadImageTool).toBeDefined();
    });

    it('createQuestionTool should be defined', () => {
      expectTypeOf(createQuestionTool).toBeDefined();
    });

    it('createWebSearchTool should be defined', () => {
      expectTypeOf(createWebSearchTool).toBeDefined();
    });

    it('createTodoWriteTool should be defined', () => {
      expectTypeOf(createTodoWriteTool).toBeDefined();
    });

    it('createToolSearchTool should be defined', () => {
      expectTypeOf(createToolSearchTool).toBeDefined();
    });
  });

  describe('Sandbox', () => {
    it('ToolSandbox should be defined', () => {
      expectTypeOf(ToolSandbox).toBeDefined();
    });

    it('signalToToolContext should be defined', () => {
      expectTypeOf(signalToToolContext).toBeDefined();
    });

    it('createSandbox should be defined', () => {
      expectTypeOf(createSandbox).toBeDefined();
    });
  });

  describe('Utilities', () => {
    it('generateDiff should be defined', () => {
      expectTypeOf(generateDiff).toBeDefined();
    });

    it('lintToolDescription should be defined', () => {
      expectTypeOf(lintToolDescription).toBeDefined();
    });

    it('lintToolDefinitions should be defined', () => {
      expectTypeOf(lintToolDefinitions).toBeDefined();
    });

    it('validateInput should be defined', () => {
      expectTypeOf(validateInput).toBeDefined();
    });

    it('ToolInputError should be defined', () => {
      expectTypeOf(ToolInputError).toBeDefined();
    });

    it('commandPattern should be defined', () => {
      expectTypeOf(commandPattern).toBeDefined();
    });
  });

  describe('File History', () => {
    it('FileReadTracker should be defined', () => {
      expectTypeOf(FileReadTracker).toBeDefined();
    });

    it('InMemoryFileHistory should be defined', () => {
      expectTypeOf(InMemoryFileHistory).toBeDefined();
    });

    it('createFileHistoryHook should be defined', () => {
      expectTypeOf(createFileHistoryHook).toBeDefined();
    });
  });

  describe('Domain', () => {
    it('createCodingDomain should be defined', () => {
      expectTypeOf(createCodingDomain).toBeDefined();
    });
  });

  describe('Lazy Registry', () => {
    it('LazyToolRegistry should be defined', () => {
      expectTypeOf(LazyToolRegistry).toBeDefined();
    });
  });

  describe('Provider System', () => {
    it('ToolProviderRegistry should be defined', () => {
      expectTypeOf(ToolProviderRegistry).toBeDefined();
    });

    it('BuiltinToolProvider should be defined', () => {
      expectTypeOf(BuiltinToolProvider).toBeDefined();
    });

    it('ToolFileProvider should be defined', () => {
      expectTypeOf(ToolFileProvider).toBeDefined();
    });

    it('ToolFileLoader should be defined', () => {
      expectTypeOf(ToolFileLoader).toBeDefined();
    });

    it('AgentToolProvider should be defined', () => {
      expectTypeOf(AgentToolProvider).toBeDefined();
    });

    it('SkillToolProvider should be defined', () => {
      expectTypeOf(SkillToolProvider).toBeDefined();
    });

    it('createToolProviderRegistry should be defined', () => {
      expectTypeOf(createToolProviderRegistry).toBeDefined();
    });

    it('createToolProvider should be defined', () => {
      expectTypeOf(createToolProvider).toBeDefined();
    });
  });
});
