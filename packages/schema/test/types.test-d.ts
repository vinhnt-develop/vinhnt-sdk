/**
 * Type tests for @vinhnt-sdk/schema
 * 
 * These tests verify that the public API has the correct types.
 * Run with: vitest run test/types.test-d.ts
 */
import { describe, it, expectTypeOf, expect } from 'vitest';
import {
  AgentNotFoundError,
  AgentValidationError,
  AgentPermissionDenied,
  ToolNotFoundError,
  ToolExecutionError,
  ToolPermissionDenied,
  RunNotFoundError,
  RunAbortedError,
  RunTimeoutError,
  KernelError,
  CircuitBreakerOpenError,
  PermissionDeniedError,
  RateLimitError,
  AuthenticationError,
  ConfigurationError,
  PluginError,
  EventRegistry,
  defineEvent,
  wildcardMatch,
  SchemaVersionedBaseSchema,
  versionedSchema,
  deprecated,
  AgentConfigSchema,
  RequestContextSchema,
  APPROVAL_CATEGORY_LABELS,
  AGENT_STEP_LABELS,
  inferStepType,
  ok,
  fail,
} from '../src/index.js';
import type {
  BrandedId,
  RunId,
  SessionId,
  AgentId,
  TraceId,
  RequestId,
  ToolCallId,
  MessageId,
  WorkspaceId,
  EnvironmentId,
  FilePatchId,
  RunEvent,
  KnownRunEvent,
  VntErrorCtx,
  RunStatus,
  RequestContext,
  Result,
  Session,
  Message,
  AgentConfig,
  AgentProfile,

  VntError,
  ToolInputError,
  ValidationError,
  TimeoutError,
  NetworkError} from '../src/index.js';
import type {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelStreamEvent,
} from '../src/index.js';

describe('Schema Package Type Tests', () => {
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

    it('ToolCallId should be a string', () => {
      expectTypeOf<ToolCallId>().toBeString();
    });

    it('MessageId should be a string', () => {
      expectTypeOf<MessageId>().toBeString();
    });
  });

  describe('Error Classes', () => {
    it('VntError should have code property', () => {
      expectTypeOf<VntError>().toHaveProperty('code');
    });

    it('VntError should have retryable property', () => {
      expectTypeOf<VntError>().toHaveProperty('retryable');
    });

    it('ToolInputError should extend VntError', () => {
      expectTypeOf<ToolInputError>().toMatchTypeOf<VntError>();
    });

    it('NetworkError should extend VntError', () => {
      expectTypeOf<NetworkError>().toMatchTypeOf<VntError>();
    });

    it('TimeoutError should extend VntError', () => {
      expectTypeOf<TimeoutError>().toMatchTypeOf<VntError>();
    });

    it('ValidationError should extend VntError', () => {
      expectTypeOf<ValidationError>().toMatchTypeOf<VntError>();
    });
  });

  describe('Event System', () => {
    it('EventRegistry should be defined', () => {
      expect(EventRegistry).toBeDefined();
    });

    it('RunEvent should have type property', () => {
      expectTypeOf<RunEvent>().toHaveProperty('type');
    });

    it('KnownRunEvent should be a string', () => {
      expectTypeOf<KnownRunEvent>().toBeString();
    });
  });

  describe('Core Types', () => {
    it('RunStatus should be a string', () => {
      expectTypeOf<RunStatus>().toBeString();
    });

    it('RequestContext should have traceId', () => {
      expectTypeOf<RequestContext>().toHaveProperty('traceId');
    });

    it('Result should have ok property', () => {
      expectTypeOf<Result>().toHaveProperty('ok');
    });

    it('Session should have id property', () => {
      expectTypeOf<Session>().toHaveProperty('id');
    });

    it('Message should have role property', () => {
      expectTypeOf<Message>().toHaveProperty('role');
    });

    it('AgentConfig should have id property', () => {
      expectTypeOf<AgentConfig>().toHaveProperty('id');
    });
  });

  describe('Utility Functions', () => {
    it('wildcardMatch should be defined', () => {
      expect(wildcardMatch).toBeDefined();
    });

    it('ok should be defined', () => {
      expect(ok).toBeDefined();
    });

    it('fail should be defined', () => {
      expect(fail).toBeDefined();
    });
  });

  describe('Schema Versioning', () => {
    it('SchemaVersionedBaseSchema should be defined', () => {
      expect(SchemaVersionedBaseSchema).toBeDefined();
    });

    it('versionedSchema should be defined', () => {
      expect(versionedSchema).toBeDefined();
    });

    it('deprecated should be defined', () => {
      expect(deprecated).toBeDefined();
    });
  });

  describe('Zod Schemas', () => {
    it('AgentConfigSchema should be defined', () => {
      expect(AgentConfigSchema).toBeDefined();
    });

    it('RequestContextSchema should be defined', () => {
      expect(RequestContextSchema).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('APPROVAL_CATEGORY_LABELS should be defined', () => {
      expect(APPROVAL_CATEGORY_LABELS).toBeDefined();
    });

    it('AGENT_STEP_LABELS should be defined', () => {
      expect(AGENT_STEP_LABELS).toBeDefined();
    });
  });

  describe('ModelProvider contract', () => {
    it('a provider without stream is a valid ModelProvider (stream is optional)', () => {
      const nonStreaming = {
        provider: "fake",
        model: "fake",
        contextLimit: undefined,
        capabilities: { streaming: false, toolCalling: false, imageInput: false, thinking: false, structuredOutput: false },
        generate: async (_request: ModelRequest, _signal?: AbortSignal): Promise<ModelResponse> => ({ content: "ok" }),
      } satisfies ModelProvider;
      expectTypeOf(nonStreaming.stream).toBeUndefined();
    });

    it('a provider with stream still satisfies ModelProvider', () => {
      const streaming = {
        provider: "fake",
        model: "fake",
        contextLimit: undefined,
        capabilities: { streaming: true, toolCalling: false, imageInput: false, thinking: false, structuredOutput: false },
        async *stream(_request: ModelRequest, _signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
          yield { type: "done" };
        },
        generate: async (_request: ModelRequest): Promise<ModelResponse> => ({ content: "ok" }),
      } satisfies ModelProvider;
      expectTypeOf(streaming.stream).not.toBeUndefined();
    });
  });
});
