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
  generateDiff,
  lintToolDescription,
  lintToolDefinitions,
  validateInput,
  ToolInputError,
  commandPattern,
  createCodingDomain,
  LazyToolRegistry,
  ToolProviderRegistry,
  ToolFileProvider,
  ToolFileLoader,
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

    it('ToolFileProvider should be defined', () => {
      expectTypeOf(ToolFileProvider).toBeDefined();
    });

    it('ToolFileLoader should be defined', () => {
      expectTypeOf(ToolFileLoader).toBeDefined();
    });
  });

  describe('Provider Types', () => {
    it('ToolProvider should be an object type', () => {
      expectTypeOf<ToolProvider>().toHaveProperty('register');
    });

    it('ToolHook should be a function type', () => {
      expectTypeOf<ToolHook>().toMatchFunctionSignature(() => undefined);
    });
  });
});