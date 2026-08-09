/**
 * Type tests for @vinhnt-sdk/core
 * 
 * These tests verify that the public API has the correct types.
 * Run with: vitest run test/types.test-d.ts
 */
import { describe, it, expectTypeOf } from 'vitest';
import {
  AgentKernel,
  createAgent,
  InMemoryEventBus,
  InMemorySessionState,
  SessionRunCoordinator,
  InMemoryAgentRegistry,
  InMemoryModelRegistry,
  InMemoryApprovalStore,
  WorkspaceManager,
  Tracer,
  setLogger,
  setLogLevel,
  getLogger,
  defineTool,
  ToolRegistry,
  BoundedMemory,
  ContextCompressor,
  redactSecrets,
  detectSecrets,
} from '../src/index.js';
import type {
  AgentKernelConfig,
  RunHandle,
  CreateAgentParams,
  EventBus,
  EventHandler,
  Unsubscribe,
  RunEventStore,
  SessionStore,
  AgentRegistry,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelStreamEvent,
  ApprovalStore,
  Logger,
  LogLevel,
  PluginManifest,
  PluginContext,
  PluginHooks,
  Plugin,
  Tool,
  ToolConfig,
  ToolRisk,
  ToolDefinition,
  ToolContext,
  ToolHook,
  ToolProvider,
  MemoryItem,
  MemoryStore,
  RunId,
  SessionId,
  AgentId,
  TraceId,
  RequestId,
  RunStatus,
  RequestContext,
  AgentConfig,
  AgentProfile,
  Session,
  Message,
} from '../src/index.js';

describe('Core Package Type Tests', () => {
  describe('AgentKernel', () => {
    it('should have correct config type', () => {
      expectTypeOf<AgentKernelConfig>().toHaveProperty('workspaceRoot');
      expectTypeOf<AgentKernelConfig>().toHaveProperty('maxConcurrent');
    });
  });

  describe('createAgent', () => {
    it('should accept CreateAgentParams', () => {
      expectTypeOf<CreateAgentParams>().toHaveProperty('id');
      expectTypeOf<CreateAgentParams>().toHaveProperty('name');
    });
  });

  describe('EventBus', () => {
    it('should have on method', () => {
      expectTypeOf<EventBus>().toHaveProperty('on');
    });

    it('should have publish method', () => {
      expectTypeOf<EventBus>().toHaveProperty('publish');
    });

    it('should have stream method', () => {
      expectTypeOf<EventBus>().toHaveProperty('stream');
    });
  });

  describe('Tool System', () => {
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
  });

  describe('Knowledge System', () => {
    it('MemoryItem should have required properties', () => {
      expectTypeOf<MemoryItem>().toHaveProperty('id');
      expectTypeOf<MemoryItem>().toHaveProperty('content');
    });
  });

  describe('Branded IDs', () => {
    it('RunId should be a string', () => {
      expectTypeOf<RunId>().toBeString();
    });

    it('SessionId should be a string', () => {
      expectTypeOf<SessionId>().toBeString();
    });

    it('AgentId should be a string', () => {
      expectTypeOf<AgentId>().toBeString();
    });

    it('TraceId should be a string', () => {
      expectTypeOf<TraceId>().toBeString();
    });

    it('RequestId should be a string', () => {
      expectTypeOf<RequestId>().toBeString();
    });
  });

  describe('Core Types', () => {
    it('RunStatus should be a string', () => {
      expectTypeOf<RunStatus>().toBeString();
    });

    it('RequestContext should have required properties', () => {
      expectTypeOf<RequestContext>().toHaveProperty('traceId');
      expectTypeOf<RequestContext>().toHaveProperty('requestId');
    });

    it('AgentConfig should have required properties', () => {
      expectTypeOf<AgentConfig>().toHaveProperty('id');
      expectTypeOf<AgentConfig>().toHaveProperty('name');
    });

    it('Session should have required properties', () => {
      expectTypeOf<Session>().toHaveProperty('id');
      expectTypeOf<Session>().toHaveProperty('messages');
    });

    it('Message should have required properties', () => {
      expectTypeOf<Message>().toHaveProperty('role');
      expectTypeOf<Message>().toHaveProperty('content');
    });
  });

  describe('Logger', () => {
    it('Logger should have log methods', () => {
      expectTypeOf<Logger>().toHaveProperty('info');
      expectTypeOf<Logger>().toHaveProperty('warn');
      expectTypeOf<Logger>().toHaveProperty('error');
      expectTypeOf<Logger>().toHaveProperty('debug');
    });

    it('LogLevel should be a string', () => {
      expectTypeOf<LogLevel>().toBeString();
    });
  });
});
