// Auto-generated from TypeScript source — DO NOT EDIT
// Run: node scripts/generate-api-docs.mjs

window.PKG = [
{
  "id": "knowledge",
  "name": "@vinhnt-sdk/knowledge",
  "icon": "K",
  "tag": "Extension",
  "desc": "Bounded memory store and context compression.",
  "deps": [
    "schema",
    "tools"
  ],
  "exports": [
    {
      "type": "class",
      "name": "InMemoryMemoryStore",
      "desc": "In-memory {@link MemoryStore} backed by an array.",
      "methods": [
        {
          "sig": "get(key: string, sessionId: string): Promise<MemoryItem | undefined>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem | undefined>"
        },
        {
          "sig": "set(data: Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">): Promise<MemoryItem>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">",
              "r": true,
              "d": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">"
            }
          ],
          "ret": "Promise<MemoryItem>"
        },
        {
          "sig": "delete(key: string, sessionId: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "search(query: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "listByTier(tier: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "tier",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "items: MemoryItem[]",
          "desc": "items",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "SessionMemory",
      "desc": "Scoped memory accessor bound to a single session.",
      "methods": [
        {
          "sig": "constructor(sessionId: string, store: MemoryStore | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "store",
              "t": "MemoryStore | undefined",
              "r": false,
              "d": "MemoryStore | undefined"
            }
          ]
        },
        {
          "sig": "remember(key: string, value: string, tags: string[] | undefined): Promise<MemoryItem>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "tags",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "Promise<MemoryItem>"
        },
        {
          "sig": "recall(key: string): Promise<string | undefined>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<string | undefined>"
        },
        {
          "sig": "forget(key: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "search(query: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "getWorkingMemory(): Promise<MemoryItem[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "setWorkingMemory(data: Record<string, string>): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "Record<string, string>",
              "r": true,
              "d": "Record<string, string>"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "store: MemoryStore",
          "desc": "store",
          "params": []
        },
        {
          "sig": "sessionId: string",
          "desc": "sessionId",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "BoundedMemory",
      "desc": "In-memory memory store that truncates profile and working sections to configured limits.",
      "methods": [
        {
          "sig": "constructor(store: MemoryStore | undefined, limits: Partial<BoundedMemoryLimits> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "store",
              "t": "MemoryStore | undefined",
              "r": false,
              "d": "MemoryStore | undefined"
            },
            {
              "n": "limits",
              "t": "Partial<BoundedMemoryLimits> | undefined",
              "r": false,
              "d": "Partial<BoundedMemoryLimits> | undefined"
            }
          ]
        },
        {
          "sig": "setProfile(value: string): Promise<MemoryEntry>",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryEntry>"
        },
        {
          "sig": "getProfile(): MemoryEntry",
          "desc": "",
          "params": [],
          "ret": "MemoryEntry"
        },
        {
          "sig": "setWorkingFact(key: string, value: string): Promise<MemoryEntry>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryEntry>"
        },
        {
          "sig": "getWorking(): string",
          "desc": "",
          "params": [],
          "ret": "string"
        },
        {
          "sig": "clearWorking(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "getAllBounded(): MemoryEntry[]",
          "desc": "",
          "params": [],
          "ret": "MemoryEntry[]"
        },
        {
          "sig": "totalChars(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "profile: string",
          "desc": "profile",
          "params": []
        },
        {
          "sig": "working: string",
          "desc": "working",
          "params": []
        },
        {
          "sig": "store: MemoryStore",
          "desc": "store",
          "params": []
        },
        {
          "sig": "limits: BoundedMemoryLimits",
          "desc": "limits",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "MemoryItem",
      "desc": "MemoryItem",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tier",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "key",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "value",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "string[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "updatedAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "MemoryStore",
      "desc": "MemoryStore",
      "methods": [
        {
          "sig": "get(key: string, sessionId: string): Promise<MemoryItem | undefined>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem | undefined>"
        },
        {
          "sig": "set(item: Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">): Promise<MemoryItem>",
          "desc": "",
          "params": [
            {
              "n": "item",
              "t": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">",
              "r": true,
              "d": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">"
            }
          ],
          "ret": "Promise<MemoryItem>"
        },
        {
          "sig": "delete(key: string, sessionId: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "search(query: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "listByTier(tier: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "tier",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "MemoryTier",
      "desc": "Memory tier — string type, NOT closed union.\nUsers can register custom tiers via MemoryStore adapter.",
      "methods": [
        {
          "sig": "type MemoryTier = string",
          "desc": "Memory tier — string type, NOT closed union.\nUsers can register custom tiers via MemoryStore adapter.",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ContextCompressor",
      "desc": "Rule-based conversation compressor keeping head/tail messages and truncating tool output.",
      "methods": [
        {
          "sig": "constructor(opts: Partial<CompressorOptions> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "opts",
              "t": "Partial<CompressorOptions> | undefined",
              "r": false,
              "d": "Partial<CompressorOptions> | undefined"
            }
          ]
        },
        {
          "sig": "pruneToolOutputs(messages: readonly ChatMessage[]): readonly ChatMessage[]",
          "desc": "Phase 1: Prune verbose old tool outputs.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "readonly ChatMessage[]"
        },
        {
          "sig": "needsCompression(messages: readonly ChatMessage[]): boolean",
          "desc": "Determine if compression is needed based on token budget.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "compact(messages: readonly ChatMessage[], _signal: AbortSignal | undefined): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>",
          "desc": "Compress middle messages (head/tail protection + naive summarization).\r\nImplements ConversationCompactor.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            },
            {
              "n": "_signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>"
        },
        {
          "sig": "compress(messages: readonly ChatMessage[]): { messages: readonly ChatMessage[]; summary: CompressionSummary; }",
          "desc": "Phase 2-4: Synchronous compress.\r\n- Protects headCount messages at start\r\n- Protects tailCount messages at end\r\n- Summarizes middle portion",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "{ messages: readonly ChatMessage[]; summary: CompressionSummary; }"
        },
        {
          "sig": "opts: CompressorOptions",
          "desc": "opts",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "LlmCompactor",
      "desc": "LLM-powered conversation compressor that summarizes overflow via a {@link ModelProvider}.",
      "methods": [
        {
          "sig": "constructor(model: ModelProvider, opts: Partial<LlmCompactorOptions> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "model",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            },
            {
              "n": "opts",
              "t": "Partial<LlmCompactorOptions> | undefined",
              "r": false,
              "d": "Partial<LlmCompactorOptions> | undefined"
            }
          ]
        },
        {
          "sig": "compact(messages: readonly ChatMessage[], signal: AbortSignal | undefined): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>"
        },
        {
          "sig": "model: ModelProvider",
          "desc": "model",
          "params": []
        },
        {
          "sig": "opts: LlmCompactorOptions",
          "desc": "opts",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "buildPrompt",
      "desc": "Build a stable+contextual {@link PromptAssembly} from the given options.",
      "methods": [
        {
          "sig": "buildPrompt(options: PromptBuilderOptions): PromptAssembly",
          "desc": "Build a stable+contextual {@link PromptAssembly} from the given options.",
          "params": [
            {
              "n": "options",
              "t": "PromptBuilderOptions",
              "r": true,
              "d": "PromptBuilderOptions"
            }
          ],
          "ret": "PromptAssembly"
        }
      ]
    },
    {
      "type": "type",
      "name": "PromptBuilderOptions",
      "desc": "Inputs assembled into the final prompt: identity, guidance, context and memory entries.",
      "methods": [],
      "props": [
        {
          "name": "identity",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolGuidance",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "skillsIndex",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "projectContext",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "memoryEntries",
          "type": "MemoryEntry[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionMetadata",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createMemorySearchTool",
      "desc": "Create the `memory_search` tool that finds past session messages by keyword.",
      "methods": [
        {
          "sig": "createMemorySearchTool(store: SessionStore): ToolDefinition<unknown, unknown>",
          "desc": "Create the `memory_search` tool that finds past session messages by keyword.",
          "params": [
            {
              "n": "store",
              "t": "SessionStore",
              "r": true,
              "d": "SessionStore"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "class",
      "name": "WriteApprovalQueue",
      "desc": "In-memory {@link ApprovalHandler} queueing requests for explicit approve/reject.",
      "methods": [
        {
          "sig": "requestApproval(req: Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">): Promise<ApprovalRequest>",
          "desc": "",
          "params": [
            {
              "n": "req",
              "t": "Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">",
              "r": true,
              "d": "Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">"
            }
          ],
          "ret": "Promise<ApprovalRequest>"
        },
        {
          "sig": "approve(id: string, resolvedBy: string | undefined): Promise<ApprovalRequest | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resolvedBy",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<ApprovalRequest | undefined>"
        },
        {
          "sig": "reject(id: string, resolvedBy: string | undefined): Promise<ApprovalRequest | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resolvedBy",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<ApprovalRequest | undefined>"
        },
        {
          "sig": "listPending(): ApprovalRequest[]",
          "desc": "",
          "params": [],
          "ret": "ApprovalRequest[]"
        },
        {
          "sig": "getRequest(id: string): ApprovalRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ApprovalRequest | undefined"
        },
        {
          "sig": "expirePending(): number",
          "desc": "Mark expired requests — returns count expired",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "requests: ApprovalRequest[]",
          "desc": "requests",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalHandler",
      "desc": "Handler contract for approving/rejecting and listing pending approval requests.",
      "methods": [
        {
          "sig": "requestApproval(req: Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">): Promise<ApprovalRequest>",
          "desc": "",
          "params": [
            {
              "n": "req",
              "t": "Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">",
              "r": true,
              "d": "Omit<ApprovalRequest, \"id\" | \"requestedAt\" | \"status\">"
            }
          ],
          "ret": "Promise<ApprovalRequest>"
        },
        {
          "sig": "approve(id: string, resolvedBy: string | undefined): Promise<ApprovalRequest | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resolvedBy",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<ApprovalRequest | undefined>"
        },
        {
          "sig": "reject(id: string, resolvedBy: string | undefined): Promise<ApprovalRequest | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resolvedBy",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<ApprovalRequest | undefined>"
        },
        {
          "sig": "listPending(): ApprovalRequest[]",
          "desc": "",
          "params": [],
          "ret": "ApprovalRequest[]"
        },
        {
          "sig": "getRequest(id: string): ApprovalRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ApprovalRequest | undefined"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "BackgroundReview",
      "desc": "Asynchronously reviews sessions and extracts/records facts into memory.",
      "methods": [
        {
          "sig": "constructor(sessionId: string, boundedMem: BoundedMemory, store: MemoryStore | undefined, approvalQueue: WriteApprovalQueue | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "boundedMem",
              "t": "BoundedMemory",
              "r": true,
              "d": "BoundedMemory"
            },
            {
              "n": "store",
              "t": "MemoryStore | undefined",
              "r": false,
              "d": "MemoryStore | undefined"
            },
            {
              "n": "approvalQueue",
              "t": "WriteApprovalQueue | undefined",
              "r": false,
              "d": "WriteApprovalQueue | undefined"
            }
          ]
        },
        {
          "sig": "reviewTurn(messages: { role: string; content: string; }[], options: ReviewOptions): Promise<{ extracted: FactExtraction[]; approved: boolean; }>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "{ role: string; content: string; }[]",
              "r": true,
              "d": "{ role: string; content: string; }[]"
            },
            {
              "n": "options",
              "t": "ReviewOptions",
              "r": false,
              "d": "ReviewOptions"
            }
          ],
          "ret": "Promise<{ extracted: FactExtraction[]; approved: boolean; }>"
        },
        {
          "sig": "extractFacts(content: string): FactExtraction[]",
          "desc": "",
          "params": [
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "FactExtraction[]"
        },
        {
          "sig": "sessionMem: SessionMemory",
          "desc": "sessionMem",
          "params": []
        },
        {
          "sig": "boundedMem: BoundedMemory",
          "desc": "boundedMem",
          "params": []
        },
        {
          "sig": "approvalQueue: WriteApprovalQueue | undefined",
          "desc": "approvalQueue",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ReviewOptions",
      "desc": "Options controlling whether memory writes require explicit approval.",
      "methods": [],
      "props": [
        {
          "name": "requireApproval",
          "type": "boolean",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "LearningEngine",
      "desc": "Coordinates memory learning for a session: bounded storage, background\nreview, approval-gated writes and conversation compression.",
      "methods": [
        {
          "sig": "constructor(options: LearningEngineOptions)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "options",
              "t": "LearningEngineOptions",
              "r": true,
              "d": "LearningEngineOptions"
            }
          ]
        },
        {
          "sig": "setEnabled(val: boolean): void",
          "desc": "",
          "params": [
            {
              "n": "val",
              "t": "boolean",
              "r": true,
              "d": "boolean"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getBoundedMemory(): BoundedMemory",
          "desc": "",
          "params": [],
          "ret": "BoundedMemory"
        },
        {
          "sig": "getApprovalQueue(): WriteApprovalQueue",
          "desc": "",
          "params": [],
          "ret": "WriteApprovalQueue"
        },
        {
          "sig": "getCompressor(): ContextCompressor",
          "desc": "",
          "params": [],
          "ret": "ContextCompressor"
        },
        {
          "sig": "buildMemoryBlock(): MemoryEntry[]",
          "desc": "",
          "params": [],
          "ret": "MemoryEntry[]"
        },
        {
          "sig": "processTurn(messages: { role: string; content: string; }[]): Promise<{ extracted: number; staged: number; }>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "{ role: string; content: string; }[]",
              "r": true,
              "d": "{ role: string; content: string; }[]"
            }
          ],
          "ret": "Promise<{ extracted: number; staged: number; }>"
        },
        {
          "sig": "getPendingApprovals(): ApprovalRequest[]",
          "desc": "",
          "params": [],
          "ret": "ApprovalRequest[]"
        },
        {
          "sig": "approveMemory(id: string): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "rejectMemory(id: string): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "setProfile(value: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "setWorkingFact(key: string, value: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "clearWorking(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "config: LearningConfig",
          "desc": "config",
          "params": []
        },
        {
          "sig": "store: MemoryStore",
          "desc": "store",
          "params": []
        },
        {
          "sig": "boundedMem: BoundedMemory",
          "desc": "boundedMem",
          "params": []
        },
        {
          "sig": "approvalQueue: WriteApprovalQueue",
          "desc": "approvalQueue",
          "params": []
        },
        {
          "sig": "review: BackgroundReview",
          "desc": "review",
          "params": []
        },
        {
          "sig": "compressor: ContextCompressor",
          "desc": "compressor",
          "params": []
        },
        {
          "sig": "enabled: boolean",
          "desc": "enabled",
          "params": []
        },
        {
          "sig": "get isEnabled(): boolean",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "LearningEngineOptions",
      "desc": "Options for {@link LearningEngine}: runtime flags and session scope.",
      "methods": [],
      "props": [
        {
          "name": "config",
          "type": "LearningConfig",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "lsp",
  "name": "@vinhnt-sdk/lsp",
  "icon": "Lv",
  "tag": "Extension",
  "desc": "Language Server Protocol integration for code intelligence.",
  "deps": [
    "core",
    "tools",
    "schema"
  ],
  "exports": [
    {
      "type": "class",
      "name": "LspClient",
      "desc": "JSON-RPC client wrapping a single language server subprocess.",
      "methods": [
        {
          "sig": "constructor(definition: LspServerDefinition, root: string, initTimeoutMs: number, events: Partial<LspClientEvents> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "definition",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            },
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "initTimeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "events",
              "t": "Partial<LspClientEvents> | undefined",
              "r": false,
              "d": "Partial<LspClientEvents> | undefined"
            }
          ]
        },
        {
          "sig": "start(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "initialize(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "shutdown(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "openFile(uri: string, languageId: string, text: string): void",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "languageId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "changeFile(uri: string, text: string): void",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "closeFile(uri: string): void",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getDiagnostics(uri: string): Promise<LspDiagnostic[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspDiagnostic[]>"
        },
        {
          "sig": "getSymbols(query: string): Promise<LspSymbol[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspSymbol[]>"
        },
        {
          "sig": "getHover(uri: string, position: LspPosition): Promise<LspHoverResult | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspHoverResult | null>"
        },
        {
          "sig": "getDefinition(uri: string, position: LspPosition): Promise<LspLocation | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspLocation | null>"
        },
        {
          "sig": "getReferences(uri: string, position: LspPosition): Promise<LspLocation[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspLocation[]>"
        },
        {
          "sig": "getCompletion(uri: string, position: LspPosition): Promise<LspCompletionItem[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspCompletionItem[]>"
        },
        {
          "sig": "getTypeDefinition(uri: string, position: LspPosition): Promise<LspLocation | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspLocation | null>"
        },
        {
          "sig": "getImplementation(uri: string, position: LspPosition): Promise<LspLocation | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspLocation | null>"
        },
        {
          "sig": "getSignatureHelp(uri: string, position: LspPosition): Promise<LspSignatureHelp | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            }
          ],
          "ret": "Promise<LspSignatureHelp | null>"
        },
        {
          "sig": "getDocumentSymbols(uri: string): Promise<LspDocumentSymbol[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspDocumentSymbol[]>"
        },
        {
          "sig": "getCodeActions(uri: string, range: LspRange, context: { diagnostics: LspDiagnostic[]; }): Promise<LspCodeAction[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "range",
              "t": "LspRange",
              "r": true,
              "d": "LspRange"
            },
            {
              "n": "context",
              "t": "{ diagnostics: LspDiagnostic[]; }",
              "r": true,
              "d": "{ diagnostics: LspDiagnostic[]; }"
            }
          ],
          "ret": "Promise<LspCodeAction[]>"
        },
        {
          "sig": "getFormatting(uri: string, options: LspFormattingOptions): Promise<LspTextEdit[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "LspFormattingOptions",
              "r": true,
              "d": "LspFormattingOptions"
            }
          ],
          "ret": "Promise<LspTextEdit[]>"
        },
        {
          "sig": "getRename(uri: string, position: LspPosition, newName: string): Promise<LspWorkspaceEdit | null>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "position",
              "t": "LspPosition",
              "r": true,
              "d": "LspPosition"
            },
            {
              "n": "newName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspWorkspaceEdit | null>"
        },
        {
          "sig": "request(method: string, params: unknown, timeoutMs: number): Promise<T>",
          "desc": "",
          "params": [
            {
              "n": "method",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "params",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<T>"
        },
        {
          "sig": "sendNotification(method: string, params: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "method",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "params",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "sendRaw(msg: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "handleMessage(line: string): void",
          "desc": "",
          "params": [
            {
              "n": "line",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "handleResponse(msg: JsonRpcResponse): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "JsonRpcResponse",
              "r": true,
              "d": "JsonRpcResponse"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "handleError(msg: JsonRpcResponse): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "JsonRpcResponse",
              "r": true,
              "d": "JsonRpcResponse"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "handleNotification(msg: JsonRpcNotification): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "JsonRpcNotification",
              "r": true,
              "d": "JsonRpcNotification"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "cleanupPending(error: Error): void",
          "desc": "",
          "params": [
            {
              "n": "error",
              "t": "Error",
              "r": true,
              "d": "Error"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "process: ChildProcess | null",
          "desc": "process",
          "params": []
        },
        {
          "sig": "rl: Interface | null",
          "desc": "rl",
          "params": []
        },
        {
          "sig": "pending: Map<string | number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout; }>",
          "desc": "pending",
          "params": []
        },
        {
          "sig": "buffer: string",
          "desc": "buffer",
          "params": []
        },
        {
          "sig": "_connected: boolean",
          "desc": "_connected",
          "params": []
        },
        {
          "sig": "_ready: boolean",
          "desc": "_ready",
          "params": []
        },
        {
          "sig": "events: LspClientEvents",
          "desc": "events",
          "params": []
        },
        {
          "sig": "root: string",
          "desc": "root",
          "params": []
        },
        {
          "sig": "serverId: string",
          "desc": "serverId",
          "params": []
        },
        {
          "sig": "spawnedAt: number",
          "desc": "spawnedAt",
          "params": []
        },
        {
          "sig": "fileVersions: Map<string, number>",
          "desc": "fileVersions",
          "params": []
        },
        {
          "sig": "get connected(): boolean",
          "desc": "",
          "params": []
        },
        {
          "sig": "get ready(): boolean",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "LspPool",
      "desc": "Pool of running {@link LspClient}s keyed by server+root with idle eviction.",
      "methods": [
        {
          "sig": "constructor(config: Partial<LspPoolConfig> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "Partial<LspPoolConfig> | undefined",
              "r": false,
              "d": "Partial<LspPoolConfig> | undefined"
            }
          ]
        },
        {
          "sig": "registerCustomServers(servers: Record<string, Partial<LspServerDefinition>>): void",
          "desc": "Register custom LSP server definitions from user config.\nAccepts a record keyed by server ID with partial LspServerDefinition fields.\nCustom servers take priority over built-in servers for matching extensions.",
          "params": [
            {
              "n": "servers",
              "t": "Record<string, Partial<LspServerDefinition>>",
              "r": true,
              "d": "Record<string, Partial<LspServerDefinition>>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "applyCustomServers(servers: Record<string, Partial<LspServerDefinition>>): void",
          "desc": "Replace all custom server definitions (config hot-reload). Any previously\nregistered custom servers are dropped, then the new set is registered.",
          "params": [
            {
              "n": "servers",
              "t": "Record<string, Partial<LspServerDefinition>>",
              "r": true,
              "d": "Record<string, Partial<LspServerDefinition>>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setActiveRoots(roots: string[]): void",
          "desc": "Register workspace roots for explicit root resolution",
          "params": [
            {
              "n": "roots",
              "t": "string[]",
              "r": true,
              "d": "string[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "warmWorkspace(root: string): Promise<void>",
          "desc": "Start LSP for a specific workspace root (pre-warms)",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "shutdownRoot(root: string): Promise<void>",
          "desc": "Shutdown all LSP servers rooted at a specific workspace",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getOrStart(filePath: string): Promise<LspClient | null>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspClient | null>"
        },
        {
          "sig": "getOrStartForWorkspace(filePath: string, workspaceRoot: string): Promise<LspClient | null>",
          "desc": "Like getOrStart but with an explicit workspace root",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "workspaceRoot",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspClient | null>"
        },
        {
          "sig": "getDiagnostics(filePath: string): Promise<LspDiagnostic[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspDiagnostic[]>"
        },
        {
          "sig": "waitAndGetDiagnostics(filePath: string, sinceVersion: number): Promise<LspDiagnostic[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sinceVersion",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "Promise<LspDiagnostic[]>"
        },
        {
          "sig": "diagnosticsVersion(filePath: string): number",
          "desc": "Current diagnostic version for a file (0 when unknown/never updated)",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "touchFile(filePath: string, content: string): void",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "closeFile(filePath: string): void",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getClient(serverId: string, filePath: string | undefined): LspClient | null",
          "desc": "Find a running client by server ID, optionally matching a file path's root",
          "params": [
            {
              "n": "serverId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "filePath",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "LspClient | null"
        },
        {
          "sig": "getStatus(): LspServerStatus[]",
          "desc": "",
          "params": [],
          "ret": "LspServerStatus[]"
        },
        {
          "sig": "shutdownAll(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "detectMissing(): Promise<LspServerDefinition[]>",
          "desc": "Detect which language servers are missing from PATH",
          "params": [],
          "ret": "Promise<LspServerDefinition[]>"
        },
        {
          "sig": "autoInstall(def: LspServerDefinition): Promise<boolean>",
          "desc": "Attempt auto-install of a server via its autoInstall script",
          "params": [
            {
              "n": "def",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "autoInstallMissing(): Promise<{ success: string[]; failed: string[]; }>",
          "desc": "Try to auto-install all missing servers",
          "params": [],
          "ret": "Promise<{ success: string[]; failed: string[]; }>"
        },
        {
          "sig": "spawn(definition: LspServerDefinition, root: string, key: string): Promise<LspClient>",
          "desc": "",
          "params": [
            {
              "n": "definition",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            },
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<LspClient>"
        },
        {
          "sig": "resetIdleTimer(entry: PoolEntry): void",
          "desc": "",
          "params": [
            {
              "n": "entry",
              "t": "PoolEntry",
              "r": true,
              "d": "PoolEntry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "findClientForFile(filePath: string): LspClient | null",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "LspClient | null"
        },
        {
          "sig": "resolveRoot(filePath: string, definition: LspServerDefinition): string | null",
          "desc": "Resolve root for a file. Checks:\n1. Registered workspace roots (explicit match)\n2. Auto-detect via rootFiles markers (original behavior)",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "definition",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            }
          ],
          "ret": "string | null"
        },
        {
          "sig": "findRootByMarkers(filePath: string, definition: LspServerDefinition): string | null",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "definition",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            }
          ],
          "ret": "string | null"
        },
        {
          "sig": "findDefinition(ext: string): LspServerDefinition | undefined",
          "desc": "Look up server definition: custom servers take priority over built-in",
          "params": [
            {
              "n": "ext",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "LspServerDefinition | undefined"
        },
        {
          "sig": "getExtension(filePath: string): string",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "makeKey(serverId: string, root: string): string",
          "desc": "",
          "params": [
            {
              "n": "serverId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "entries: Map<string, PoolEntry>",
          "desc": "entries",
          "params": []
        },
        {
          "sig": "broken: Set<string>",
          "desc": "broken",
          "params": []
        },
        {
          "sig": "spawning: Map<string, Promise<LspClient>>",
          "desc": "spawning",
          "params": []
        },
        {
          "sig": "diagnostics: DiagnosticStore",
          "desc": "diagnostics",
          "params": []
        },
        {
          "sig": "config: LspPoolConfig",
          "desc": "config",
          "params": []
        },
        {
          "sig": "workspaceRoots: Set<string>",
          "desc": "workspaceRoots",
          "params": []
        },
        {
          "sig": "customServers: Map<string, LspServerDefinition>",
          "desc": "customServers",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "LspServerRegistry",
      "desc": "Registry for LSP servers.\nUsers register new servers via `register()` instead of hardcoding.",
      "methods": [
        {
          "sig": "constructor(defaultServers: LspServerDefinition[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "defaultServers",
              "t": "LspServerDefinition[] | undefined",
              "r": false,
              "d": "LspServerDefinition[] | undefined"
            }
          ]
        },
        {
          "sig": "register(definition: LspServerDefinition): void",
          "desc": "Register a new LSP server definition.",
          "params": [
            {
              "n": "definition",
              "t": "LspServerDefinition",
              "r": true,
              "d": "LspServerDefinition"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "registerAll(definitions: LspServerDefinition[]): void",
          "desc": "Register multiple LSP server definitions.",
          "params": [
            {
              "n": "definitions",
              "t": "LspServerDefinition[]",
              "r": true,
              "d": "LspServerDefinition[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "findByExtension(ext: string): LspServerDefinition | undefined",
          "desc": "Find a server by file extension.",
          "params": [
            {
              "n": "ext",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "LspServerDefinition | undefined"
        },
        {
          "sig": "findById(id: string): LspServerDefinition | undefined",
          "desc": "Find a server by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "LspServerDefinition | undefined"
        },
        {
          "sig": "getLanguageId(ext: string): string",
          "desc": "Get language ID for a file extension.",
          "params": [
            {
              "n": "ext",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "list(): LspServerDefinition[]",
          "desc": "List all registered servers.",
          "params": [],
          "ret": "LspServerDefinition[]"
        },
        {
          "sig": "servers: LspServerDefinition[]",
          "desc": "servers",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "DiagnosticStore",
      "desc": "In-memory store of per-uri diagnostics with waitFor support.",
      "methods": [
        {
          "sig": "set(uri: string, diagnostics: LspDiagnostic[]): void",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "diagnostics",
              "t": "LspDiagnostic[]",
              "r": true,
              "d": "LspDiagnostic[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "version(uri: string): number",
          "desc": "Current version for a uri (0 when never updated)",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "get(uri: string): StoredDiagnostics | undefined",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "StoredDiagnostics | undefined"
        },
        {
          "sig": "getAll(): StoredDiagnostics[]",
          "desc": "",
          "params": [],
          "ret": "StoredDiagnostics[]"
        },
        {
          "sig": "clear(uri: string): void",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "clearAll(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "waitForDiagnostics(uri: string, timeoutMs: number, sinceVersion: number): Promise<LspDiagnostic[]>",
          "desc": "",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "sinceVersion",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "Promise<LspDiagnostic[]>"
        },
        {
          "sig": "store: Map<string, StoredDiagnostics>",
          "desc": "store",
          "params": []
        },
        {
          "sig": "waiting: Map<string, (() => void)[]>",
          "desc": "waiting",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "formatDiagnostics",
      "desc": "Format diagnostics grouped into Errors/Warnings/Other sections.",
      "methods": [
        {
          "sig": "formatDiagnostics(diagnostics: LspDiagnostic[]): string",
          "desc": "Format diagnostics grouped into Errors/Warnings/Other sections.",
          "params": [
            {
              "n": "diagnostics",
              "t": "LspDiagnostic[]",
              "r": true,
              "d": "LspDiagnostic[]"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "createLspTools",
      "desc": "Create all LSP-backed tools for the given pool.",
      "methods": [
        {
          "sig": "createLspTools(pool: LspPool): ToolDefinition<unknown, unknown>[]",
          "desc": "Create all LSP-backed tools for the given pool.",
          "params": [
            {
              "n": "pool",
              "t": "LspPool",
              "r": true,
              "d": "LspPool"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>[]"
        }
      ]
    },
    {
      "type": "class",
      "name": "LspToolProvider",
      "desc": "LspToolProvider — Provides LSP tools.\n\nThis is a ToolProvider implementation that can be registered with\nthe core package's ToolProviderRegistry.",
      "methods": [
        {
          "sig": "constructor(pool: LspPool)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "pool",
              "t": "LspPool",
              "r": true,
              "d": "LspPool"
            }
          ]
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"lsp\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"LSP Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Language Server Protocol tools for code intelligence\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "pool: LspPool",
          "desc": "pool",
          "params": []
        },
        {
          "sig": "_tools: ToolDefinition<unknown, unknown>[]",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "LspServerDefinition",
      "desc": "LspServerDefinition",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "languageId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "extensions",
          "type": "string[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "command",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "args",
          "type": "string[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "rootFiles",
          "type": "string[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "autoInstall",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "env",
          "type": "Record<string, string> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "initializationOptions",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "isExperimental",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "LspDiagnostic",
      "desc": "LspDiagnostic",
      "methods": [],
      "props": [
        {
          "name": "range",
          "type": "LspRange",
          "required": true,
          "desc": ""
        },
        {
          "name": "severity",
          "type": "LspDiagnosticSeverity | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "code",
          "type": "string | number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "source",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "message",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "LspPosition",
      "desc": "LspPosition",
      "methods": [],
      "props": [
        {
          "name": "line",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "character",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "LspRange",
      "desc": "LspRange",
      "methods": [],
      "props": [
        {
          "name": "start",
          "type": "LspPosition",
          "required": true,
          "desc": ""
        },
        {
          "name": "end",
          "type": "LspPosition",
          "required": true,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "mcp",
  "name": "@vinhnt-sdk/mcp",
  "icon": "Mc",
  "tag": "Extension",
  "desc": "Model Context Protocol client/server for tool integration.",
  "deps": [
    "schema",
    "tools"
  ],
  "exports": [
    {
      "type": "class",
      "name": "McpClient",
      "desc": "MCP Client — connects to MCP servers and provides tool/resource access.",
      "methods": [
        {
          "sig": "connect(config: McpServerConfig): Promise<McpConnection>",
          "desc": "Connect to an MCP server.",
          "params": [
            {
              "n": "config",
              "t": "McpServerConfig",
              "r": true,
              "d": "McpServerConfig"
            }
          ],
          "ret": "Promise<McpConnection>"
        },
        {
          "sig": "getConnection(name: string): McpConnection | undefined",
          "desc": "Get an existing connection by server name.",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "McpConnection | undefined"
        },
        {
          "sig": "closeAll(): Promise<void>",
          "desc": "Close all connections.",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "createTransport(config: McpServerConfig): Promise<McpTransport>",
          "desc": "",
          "params": [
            {
              "n": "config",
              "t": "McpServerConfig",
              "r": true,
              "d": "McpServerConfig"
            }
          ],
          "ret": "Promise<McpTransport>"
        },
        {
          "sig": "initialize(transport: McpTransport, config: McpServerConfig): Promise<McpConnection>",
          "desc": "",
          "params": [
            {
              "n": "transport",
              "t": "McpTransport",
              "r": true,
              "d": "McpTransport"
            },
            {
              "n": "config",
              "t": "McpServerConfig",
              "r": true,
              "d": "McpServerConfig"
            }
          ],
          "ret": "Promise<McpConnection>"
        },
        {
          "sig": "connections: Map<string, McpConnection>",
          "desc": "connections",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "McpConnection",
      "desc": "Result of connecting to an MCP server.",
      "methods": [
        {
          "sig": "listTools(): Promise<McpTool[]>",
          "desc": "List tools exposed by the server.",
          "params": [],
          "ret": "Promise<McpTool[]>"
        },
        {
          "sig": "callTool(name: string, args: Record<string, unknown> | undefined): Promise<CallToolResult>",
          "desc": "Call a tool on the server.",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "Record<string, unknown> | undefined",
              "r": false,
              "d": "Record<string, unknown> | undefined"
            }
          ],
          "ret": "Promise<CallToolResult>"
        },
        {
          "sig": "listResources(): Promise<McpResource[]>",
          "desc": "List resources exposed by the server.",
          "params": [],
          "ret": "Promise<McpResource[]>"
        },
        {
          "sig": "readResource(uri: string): Promise<string>",
          "desc": "Read a resource from the server.",
          "params": [
            {
              "n": "uri",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "close(): Promise<void>",
          "desc": "Disconnect from the server.",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "serverInfo",
          "type": "{ name: string; version: string; }",
          "required": true,
          "desc": "Server info from initialize handshake."
        },
        {
          "name": "capabilities",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": "Server capabilities."
        }
      ]
    },
    {
      "type": "function",
      "name": "mapMcpTool",
      "desc": "Map an MCP tool to a vinhnt-sdk ToolDefinition.",
      "methods": [
        {
          "sig": "mapMcpTool(serverName: string, mcpTool: McpTool, connection: McpConnection): ToolDefinition<unknown, unknown>",
          "desc": "Map an MCP tool to a vinhnt-sdk ToolDefinition.",
          "params": [
            {
              "n": "serverName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "mcpTool",
              "t": "McpTool",
              "r": true,
              "d": "McpTool"
            },
            {
              "n": "connection",
              "t": "McpConnection",
              "r": true,
              "d": "McpConnection"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "discoverMcpTools",
      "desc": "Discover and map all tools from an MCP server.",
      "methods": [
        {
          "sig": "discoverMcpTools(serverName: string, connection: McpConnection): Promise<ToolDefinition<unknown, unknown>[]>",
          "desc": "Discover and map all tools from an MCP server.",
          "params": [
            {
              "n": "serverName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "connection",
              "t": "McpConnection",
              "r": true,
              "d": "McpConnection"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown>[]>"
        }
      ]
    },
    {
      "type": "function",
      "name": "mcpDomain",
      "desc": "Derive the MCP domain from a server name.\nConvention: `mcp__<server>__<tool>` → domain `\"mcp:<server>\"`",
      "methods": [
        {
          "sig": "mcpDomain(serverName: string): string",
          "desc": "Derive the MCP domain from a server name.\nConvention: `mcp__<server>__<tool>` → domain `\"mcp:<server>\"`",
          "params": [
            {
              "n": "serverName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "mcpToolId",
      "desc": "Create a tool ID for an MCP tool.\nConvention: `mcp__<server>__<tool>`",
      "methods": [
        {
          "sig": "mcpToolId(serverName: string, toolName: string): string",
          "desc": "Create a tool ID for an MCP tool.\nConvention: `mcp__<server>__<tool>`",
          "params": [
            {
              "n": "serverName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "type",
      "name": "McpServerConfig",
      "desc": "McpServerConfig",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "transport",
          "type": "\"stdio\" | \"sse\" | \"streamable-http\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "command",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "args",
          "type": "string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "env",
          "type": "Record<string, string> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "url",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "headers",
          "type": "Record<string, string> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "McpTool",
      "desc": "McpTool",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputSchema",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        },
        {
          "name": "annotations",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "McpResource",
      "desc": "McpResource",
      "methods": [],
      "props": [
        {
          "name": "uri",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "mimeType",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "McpTransportType",
      "desc": "McpTransportType",
      "methods": [
        {
          "sig": "type McpTransportType = McpTransportType",
          "desc": "McpTransportType",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "McpTransport",
      "desc": "McpTransport",
      "methods": [
        {
          "sig": "request(req: JsonRpcRequest): Promise<JsonRpcResponse>",
          "desc": "",
          "params": [
            {
              "n": "req",
              "t": "JsonRpcRequest",
              "r": true,
              "d": "JsonRpcRequest"
            }
          ],
          "ret": "Promise<JsonRpcResponse>"
        },
        {
          "sig": "notify(notification: JsonRpcNotification): void",
          "desc": "",
          "params": [
            {
              "n": "notification",
              "t": "JsonRpcNotification",
              "r": true,
              "d": "JsonRpcNotification"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "onMessage(handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "(msg: JsonRpcResponse | JsonRpcNotification) => void",
              "r": true,
              "d": "(msg: JsonRpcResponse | JsonRpcNotification) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "close(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "CallToolResult",
      "desc": "CallToolResult",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "readonly ({ readonly type: \"text\"; readonly text: string; } | { readonly type: \"image\"; readonly data: string; readon...",
          "required": true,
          "desc": ""
        },
        {
          "name": "isError",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ListToolsResult",
      "desc": "ListToolsResult",
      "methods": [],
      "props": [
        {
          "name": "tools",
          "type": "readonly McpTool[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "nextCursor",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "InitializeRequest",
      "desc": "InitializeRequest",
      "methods": [],
      "props": [
        {
          "name": "protocolVersion",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        },
        {
          "name": "clientInfo",
          "type": "{ readonly name: string; readonly version: string; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "InitializeResult",
      "desc": "InitializeResult",
      "methods": [],
      "props": [
        {
          "name": "protocolVersion",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "{ readonly tools?: { readonly listChanged?: boolean; }; readonly resources?: { readonly subscribe?: boolean; readonly...",
          "required": true,
          "desc": ""
        },
        {
          "name": "serverInfo",
          "type": "{ readonly name: string; readonly version: string; }",
          "required": true,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "security",
  "name": "@vinhnt-sdk/security",
  "icon": "Sec",
  "tag": "Extension",
  "desc": "Secret detection and redaction utilities.",
  "deps": [],
  "exports": [
    {
      "type": "function",
      "name": "sanitizeForLLM",
      "desc": "Sanitize external text before it enters the LLM context window.\n\nStrips known prompt-injection markers, unicode control characters,\nand truncates excessively long content.",
      "methods": [
        {
          "sig": "sanitizeForLLM(text: string, source: string | undefined): string",
          "desc": "Sanitize external text before it enters the LLM context window.\n\nStrips known prompt-injection markers, unicode control characters,\nand truncates excessively long content.",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "source",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "validateToolOutput",
      "desc": "Validate and post-process tool output before it enters context.\n\n- Injects a canary token so downstream consumers can detect if output\n  was tampered with after sanitization.\n- Strips injection patterns.",
      "methods": [
        {
          "sig": "validateToolOutput(output: string, toolName: string): string",
          "desc": "Validate and post-process tool output before it enters context.\n\n- Injects a canary token so downstream consumers can detect if output\n  was tampered with after sanitization.\n- Strips injection patterns.",
          "params": [
            {
              "n": "output",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "detectInjectionPatterns",
      "desc": "Check whether a string contains suspected prompt injection patterns.\n\nUseful for logging / audit without modifying the text.",
      "methods": [
        {
          "sig": "detectInjectionPatterns(text: string): string[]",
          "desc": "Check whether a string contains suspected prompt injection patterns.\n\nUseful for logging / audit without modifying the text.",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "redactSecrets",
      "desc": "Redact secrets from text.\n\nScans the input for known secret patterns and replaces them with\nplaceholder tokens. Safe to use on log messages, error output, and\narbitrary strings.",
      "methods": [
        {
          "sig": "redactSecrets(text: string): string",
          "desc": "Redact secrets from text.\n\nScans the input for known secret patterns and replaces them with\nplaceholder tokens. Safe to use on log messages, error output, and\narbitrary strings.",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "detectSecrets",
      "desc": "Check whether text contains suspected secrets (without modifying it).",
      "methods": [
        {
          "sig": "detectSecrets(text: string): string[]",
          "desc": "Check whether text contains suspected secrets (without modifying it).",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "createRedactingLogger",
      "desc": "Create a redaction middleware for a logger.\n\nReturns a function that wraps log output, automatically redacting\nany detected secrets before the message is written. Strings, error\nmessages and nested object values are all scrubbed.",
      "methods": [
        {
          "sig": "createRedactingLogger(originalLog: (...args: A) => void): (...args: A) => void",
          "desc": "Create a redaction middleware for a logger.\n\nReturns a function that wraps log output, automatically redacting\nany detected secrets before the message is written. Strings, error\nmessages and nested object values are all scrubbed.",
          "params": [
            {
              "n": "originalLog",
              "t": "(...args: A) => void",
              "r": true,
              "d": "(...args: A) => void"
            }
          ],
          "ret": "(...args: A) => void"
        }
      ]
    },
    {
      "type": "function",
      "name": "redactObjectSecrets",
      "desc": "Deep-redact secrets inside an object/array tree.\n\nSerializes the value to JSON, redacts known secret patterns, then parses\nit back so nested secrets (e.g. `{ apiKey: \"sk-...\" }` inside tool args)\nare scrubbed while the structure is preserved. Falls back to the original\nvalue if it cannot be serialized (circular refs, functions, etc.).",
      "methods": [
        {
          "sig": "redactObjectSecrets(value: T): T",
          "desc": "Deep-redact secrets inside an object/array tree.\n\nSerializes the value to JSON, redacts known secret patterns, then parses\nit back so nested secrets (e.g. `{ apiKey: \"sk-...\" }` inside tool args)\nare scrubbed while the structure is preserved. Falls back to the original\nvalue if it cannot be serialized (circular refs, functions, etc.).",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "T"
        }
      ]
    },
    {
      "type": "class",
      "name": "SecretRedactor",
      "desc": "Secret redactor with injectable patterns.\nUsers can register custom patterns without forking.",
      "methods": [
        {
          "sig": "constructor(config: SecretRedactorConfig | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "SecretRedactorConfig | undefined",
              "r": false,
              "d": "SecretRedactorConfig | undefined"
            }
          ]
        },
        {
          "sig": "register(pattern: SecretPattern): void",
          "desc": "Register a custom secret pattern",
          "params": [
            {
              "n": "pattern",
              "t": "SecretPattern",
              "r": true,
              "d": "SecretPattern"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(name: string): void",
          "desc": "Remove a pattern by name",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "redact(text: string): string",
          "desc": "Redact secrets from text",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "detect(text: string): string[]",
          "desc": "Detect secrets in text",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string[]"
        },
        {
          "sig": "patterns: SecretPattern[]",
          "desc": "patterns",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SecretRedactorConfig",
      "desc": "Secret redactor configuration — injectable dependency.\nUsers can register custom patterns without forking.",
      "methods": [],
      "props": [
        {
          "name": "patterns",
          "type": "SecretPattern[] | undefined",
          "required": false,
          "desc": "Custom patterns — merged with DEFAULT_SECRET_PATTERNS"
        },
        {
          "name": "overridePatterns",
          "type": "SecretPattern[] | undefined",
          "required": false,
          "desc": "Override default patterns completely"
        }
      ]
    },
    {
      "type": "type",
      "name": "SecretPattern",
      "desc": "Secret detection and redaction for logs and error messages.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "pattern",
          "type": "RegExp",
          "required": true,
          "desc": ""
        },
        {
          "name": "replacement",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "sanitizeEnv",
      "desc": "Build a sanitized environment: only the safe whitelist (plus any explicit\n`allowedVars`) survives; secrets are never forwarded to child processes.",
      "methods": [
        {
          "sig": "sanitizeEnv(source: Record<string, string | undefined>, allowedVars: string[] | undefined): Record<string, string>",
          "desc": "Build a sanitized environment: only the safe whitelist (plus any explicit\n`allowedVars`) survives; secrets are never forwarded to child processes.",
          "params": [
            {
              "n": "source",
              "t": "Record<string, string | undefined>",
              "r": false,
              "d": "Record<string, string | undefined>"
            },
            {
              "n": "allowedVars",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "Record<string, string>"
        }
      ]
    }
  ]
},
{
  "id": "trace",
  "name": "@vinhnt-sdk/trace",
  "icon": "Tr",
  "tag": "Extension",
  "desc": "Observability - OpenTelemetry spans, timeline, telemetry.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "class",
      "name": "SpanRecorder",
      "desc": "A span recorder — collects spans and provides trace context.",
      "methods": [
        {
          "sig": "constructor(traceId: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "traceId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "startSpan(name: string, kind: SpanKind, parentId: string | undefined): Span",
          "desc": "Start a new span",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "kind",
              "t": "SpanKind",
              "r": true,
              "d": "SpanKind"
            },
            {
              "n": "parentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Span"
        },
        {
          "sig": "endSpan(span: Span, status: SpanStatus): void",
          "desc": "End a span",
          "params": [
            {
              "n": "span",
              "t": "Span",
              "r": true,
              "d": "Span"
            },
            {
              "n": "status",
              "t": "SpanStatus",
              "r": false,
              "d": "SpanStatus"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getSpans(): readonly Span[]",
          "desc": "Get all recorded spans",
          "params": [],
          "ret": "readonly Span[]"
        },
        {
          "sig": "getSpanTree(): SpanNode[]",
          "desc": "Get span tree (root → children)",
          "params": [],
          "ret": "SpanNode[]"
        },
        {
          "sig": "getTotalDurationMs(): number",
          "desc": "Get total duration of the trace",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "spans: Span[]",
          "desc": "spans",
          "params": []
        },
        {
          "sig": "traceId: string",
          "desc": "traceId",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createSpan",
      "desc": "Create a new span.",
      "methods": [
        {
          "sig": "createSpan(name: string, kind: SpanKind, parentId: string | undefined, traceId: string | undefined): Span",
          "desc": "Create a new span.",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "kind",
              "t": "SpanKind",
              "r": true,
              "d": "SpanKind"
            },
            {
              "n": "parentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "traceId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Span"
        }
      ]
    },
    {
      "type": "function",
      "name": "endSpan",
      "desc": "End a span with a status.",
      "methods": [
        {
          "sig": "endSpan(span: Span, status: SpanStatus): void",
          "desc": "End a span with a status.",
          "params": [
            {
              "n": "span",
              "t": "Span",
              "r": true,
              "d": "Span"
            },
            {
              "n": "status",
              "t": "SpanStatus",
              "r": false,
              "d": "SpanStatus"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "addSpanEvent",
      "desc": "Add an event to a span.",
      "methods": [
        {
          "sig": "addSpanEvent(span: Span, name: string, attributes: Record<string, unknown> | undefined): void",
          "desc": "Add an event to a span.",
          "params": [
            {
              "n": "span",
              "t": "Span",
              "r": true,
              "d": "Span"
            },
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "attributes",
              "t": "Record<string, unknown> | undefined",
              "r": false,
              "d": "Record<string, unknown> | undefined"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "generateTraceId",
      "desc": "Generate a unique trace ID",
      "methods": [
        {
          "sig": "generateTraceId(): string",
          "desc": "Generate a unique trace ID",
          "params": [],
          "ret": "string"
        }
      ]
    },
    {
      "type": "type",
      "name": "Span",
      "desc": "A single trace span",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Unique span ID"
        },
        {
          "name": "parentId",
          "type": "string | undefined",
          "required": true,
          "desc": "Parent span ID (undefined for root spans)"
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Span name (e.g., \"llm.call\", \"tool.execute\", \"step\")"
        },
        {
          "name": "kind",
          "type": "SpanKind",
          "required": true,
          "desc": "Span kind"
        },
        {
          "name": "startTimeMs",
          "type": "number",
          "required": true,
          "desc": "Start time (Unix ms)"
        },
        {
          "name": "endTimeMs",
          "type": "number",
          "required": true,
          "desc": "End time (Unix ms, 0 if still active)"
        },
        {
          "name": "status",
          "type": "SpanStatus",
          "required": true,
          "desc": "Span status"
        },
        {
          "name": "attributes",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": "Span attributes (key-value pairs)"
        },
        {
          "name": "events",
          "type": "SpanEvent[]",
          "required": true,
          "desc": "Span events (timestamped annotations)"
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SpanKind",
      "desc": "Span kind",
      "methods": [
        {
          "sig": "type SpanKind = SpanKind",
          "desc": "Span kind",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SpanStatus",
      "desc": "Tracing — OpenTelemetry-compatible span model.\n\nSpans represent units of work (model call, tool execution, step, turn).\nThey form a tree: parent span → child spans.\n\nThis is a lightweight, zero-dependency implementation compatible with\nthe OpenTelemetry span model but without requiring the OTel SDK.\nSpan status",
      "methods": [
        {
          "sig": "type SpanStatus = SpanStatus",
          "desc": "Tracing — OpenTelemetry-compatible span model.\n\nSpans represent units of work (model call, tool execution, step, turn).\nThey form a tree: parent span → child spans.\n\nThis is a lightweight, zero-dependency implementation compatible with\nthe OpenTelemetry span model but without requiring the OTel SDK.\nSpan status",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SpanEvent",
      "desc": "A timestamped event within a span",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestampMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "attributes",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SpanNode",
      "desc": "A node in the span tree",
      "methods": [],
      "props": [
        {
          "name": "span",
          "type": "Span",
          "required": true,
          "desc": ""
        },
        {
          "name": "children",
          "type": "SpanNode[]",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TraceContext",
      "desc": "Trace context — passed through the call chain",
      "methods": [],
      "props": [
        {
          "name": "traceId",
          "type": "string",
          "required": true,
          "desc": "Root trace ID"
        },
        {
          "name": "span",
          "type": "Span",
          "required": true,
          "desc": "Current span"
        }
      ]
    },
    {
      "type": "class",
      "name": "Timeline",
      "desc": "Timeline — ordered sequence of events for a session.",
      "methods": [
        {
          "sig": "record(type: TimelineEventType, data: Record<string, unknown>): TimelineEvent",
          "desc": "Record an event",
          "params": [
            {
              "n": "type",
              "t": "TimelineEventType",
              "r": true,
              "d": "TimelineEventType"
            },
            {
              "n": "data",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "TimelineEvent"
        },
        {
          "sig": "getEvents(): readonly TimelineEvent[]",
          "desc": "Get all events",
          "params": [],
          "ret": "readonly TimelineEvent[]"
        },
        {
          "sig": "getEventsByType(type: TimelineEventType): readonly TimelineEvent[]",
          "desc": "Get events filtered by type",
          "params": [
            {
              "n": "type",
              "t": "TimelineEventType",
              "r": true,
              "d": "TimelineEventType"
            }
          ],
          "ret": "readonly TimelineEvent[]"
        },
        {
          "sig": "getEventsInRange(startMs: number, endMs: number): readonly TimelineEvent[]",
          "desc": "Get events in a time range",
          "params": [
            {
              "n": "startMs",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "endMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "readonly TimelineEvent[]"
        },
        {
          "sig": "count(): number",
          "desc": "Get event count",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getDurationMs(): number",
          "desc": "Get duration of the timeline",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "replay(handler: (event: TimelineEvent) => Promise<void>): Promise<void>",
          "desc": "Replay events through a handler",
          "params": [
            {
              "n": "handler",
              "t": "(event: TimelineEvent) => Promise<void>",
              "r": true,
              "d": "(event: TimelineEvent) => Promise<void>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "export(): TimelineEvent[]",
          "desc": "Export events as JSON",
          "params": [],
          "ret": "TimelineEvent[]"
        },
        {
          "sig": "import(events: TimelineEvent[]): void",
          "desc": "Import events from JSON",
          "params": [
            {
              "n": "events",
              "t": "TimelineEvent[]",
              "r": true,
              "d": "TimelineEvent[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "events: TimelineEvent[]",
          "desc": "events",
          "params": []
        },
        {
          "sig": "seq: number",
          "desc": "seq",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "buildTranscript",
      "desc": "Build a conversation transcript from timeline events.\nExtracts user messages, assistant responses, and tool calls.",
      "methods": [
        {
          "sig": "buildTranscript(events: readonly TimelineEvent[]): TranscriptEntry[]",
          "desc": "Build a conversation transcript from timeline events.\nExtracts user messages, assistant responses, and tool calls.",
          "params": [
            {
              "n": "events",
              "t": "readonly TimelineEvent[]",
              "r": true,
              "d": "readonly TimelineEvent[]"
            }
          ],
          "ret": "TranscriptEntry[]"
        }
      ]
    },
    {
      "type": "type",
      "name": "TimelineEvent",
      "desc": "A single timeline event",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "TimelineEventType",
          "required": true,
          "desc": "Event type"
        },
        {
          "name": "timestampMs",
          "type": "number",
          "required": true,
          "desc": "Timestamp (Unix ms)"
        },
        {
          "name": "data",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": "Event data (type-specific)"
        },
        {
          "name": "seq",
          "type": "number",
          "required": true,
          "desc": "Sequence number (monotonic within a session)"
        }
      ]
    },
    {
      "type": "type",
      "name": "TimelineEventType",
      "desc": "Timeline — session log IS the timeline.\n\nFull replay from durable events. Token-level replay fidelity\nvia assistant/chunk events.\n\nThe timeline is a linear sequence of events that can be replayed\nto reconstruct the full conversation history.\nTimeline event types — maps to KnownRunEvent from schema",
      "methods": [
        {
          "sig": "type TimelineEventType = TimelineEventType",
          "desc": "Timeline — session log IS the timeline.\n\nFull replay from durable events. Token-level replay fidelity\nvia assistant/chunk events.\n\nThe timeline is a linear sequence of events that can be replayed\nto reconstruct the full conversation history.\nTimeline event types — maps to KnownRunEvent from schema",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "TranscriptEntry",
      "desc": "A single entry in a conversation transcript",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "\"user\" | \"assistant\" | \"tool_call\" | \"tool_result\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "input",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "output",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "timestampMs",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "CostMeter",
      "desc": "Cost meter — tracks token usage and cost across operations.\nNamed differently from llm/TokenMeter to clarify purpose:\n- llm/TokenMeter: heuristic token estimation for request sizing\n- trace/CostMeter: actual usage tracking and cost aggregation",
      "methods": [
        {
          "sig": "record(inputTokens: number, outputTokens: number, modelId: string | undefined): UsageStats",
          "desc": "Record a token usage event",
          "params": [
            {
              "n": "inputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "outputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "modelId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "UsageStats"
        },
        {
          "sig": "getTotal(): UsageStats",
          "desc": "Get total usage",
          "params": [],
          "ret": "UsageStats"
        },
        {
          "sig": "getOperationCount(): number",
          "desc": "Get operation count",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getOperations(): readonly UsageStats[]",
          "desc": "Get all operation stats",
          "params": [],
          "ret": "readonly UsageStats[]"
        },
        {
          "sig": "reset(): void",
          "desc": "Reset the meter",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "totalInput: number",
          "desc": "totalInput",
          "params": []
        },
        {
          "sig": "totalOutput: number",
          "desc": "totalOutput",
          "params": []
        },
        {
          "sig": "operations: UsageStats[]",
          "desc": "operations",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "calculateCost",
      "desc": "Calculate cost from token counts.",
      "methods": [
        {
          "sig": "calculateCost(inputTokens: number, outputTokens: number, pricing: ModelPricing): number",
          "desc": "Calculate cost from token counts.",
          "params": [
            {
              "n": "inputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "outputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "pricing",
              "t": "ModelPricing",
              "r": false,
              "d": "ModelPricing"
            }
          ],
          "ret": "number"
        }
      ]
    },
    {
      "type": "function",
      "name": "calculateContextPressure",
      "desc": "Calculate context pressure.",
      "methods": [
        {
          "sig": "calculateContextPressure(currentTokens: number, maxTokens: number, compactThreshold: number): ContextPressure",
          "desc": "Calculate context pressure.",
          "params": [
            {
              "n": "currentTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "maxTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "compactThreshold",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "ContextPressure"
        }
      ]
    },
    {
      "type": "type",
      "name": "UsageStats",
      "desc": "Telemetry — usage aggregation, cost tracking, context pressure monitoring.\n\nAggregates usage per session/provider/model and tracks token costs.\nUsage statistics for a single operation",
      "methods": [],
      "props": [
        {
          "name": "inputTokens",
          "type": "number",
          "required": true,
          "desc": "Input tokens consumed"
        },
        {
          "name": "outputTokens",
          "type": "number",
          "required": true,
          "desc": "Output tokens generated"
        },
        {
          "name": "totalTokens",
          "type": "number",
          "required": true,
          "desc": "Total tokens (input + output)"
        },
        {
          "name": "costUsd",
          "type": "number",
          "required": true,
          "desc": "Estimated cost in USD"
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelPricing",
      "desc": "Model pricing per 1M tokens (USD)",
      "methods": [],
      "props": [
        {
          "name": "inputPer1M",
          "type": "number",
          "required": true,
          "desc": "Cost per 1M input tokens"
        },
        {
          "name": "outputPer1M",
          "type": "number",
          "required": true,
          "desc": "Cost per 1M output tokens"
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextPressure",
      "desc": "Context pressure — monitors context window usage.",
      "methods": [],
      "props": [
        {
          "name": "currentTokens",
          "type": "number",
          "required": true,
          "desc": "Current context tokens"
        },
        {
          "name": "maxTokens",
          "type": "number",
          "required": true,
          "desc": "Maximum context window"
        },
        {
          "name": "pressure",
          "type": "number",
          "required": true,
          "desc": "Pressure ratio (0.0 = empty, 1.0 = full)"
        },
        {
          "name": "shouldCompact",
          "type": "boolean",
          "required": true,
          "desc": "Whether compaction is recommended"
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "config",
  "name": "@vinhnt-sdk/config",
  "icon": "Co",
  "tag": "Core",
  "desc": "Configuration layer - credential references, settings, env resolution.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "type",
      "name": "CredentialRef",
      "desc": "Branded credential reference — a POSIX-style environment variable name.\nUse this instead of plain `string` to prevent passing literal secrets.",
      "methods": [
        {
          "sig": "type CredentialRef = CredentialRef",
          "desc": "Branded credential reference — a POSIX-style environment variable name.\nUse this instead of plain `string` to prevent passing literal secrets.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ResolvedCredential",
      "desc": "A resolved credential with its value and source.",
      "methods": [],
      "props": [
        {
          "name": "value",
          "type": "string",
          "required": true,
          "desc": "The secret value."
        },
        {
          "name": "source",
          "type": "CredentialSource",
          "required": true,
          "desc": "Where the credential was resolved from."
        }
      ]
    },
    {
      "type": "type",
      "name": "CredentialSource",
      "desc": "Source of a resolved credential.",
      "methods": [
        {
          "sig": "type CredentialSource = CredentialSource",
          "desc": "Source of a resolved credential.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CredentialInfo",
      "desc": "Metadata about a credential without exposing its value.",
      "methods": [],
      "props": [
        {
          "name": "configured",
          "type": "boolean",
          "required": true,
          "desc": "Whether the credential is configured (has a non-empty value)."
        },
        {
          "name": "source",
          "type": "CredentialSource | undefined",
          "required": true,
          "desc": "Where the credential would be resolved from."
        },
        {
          "name": "writable",
          "type": "boolean",
          "required": true,
          "desc": "Whether the credential can be written to (false for env-shadowed)."
        }
      ]
    },
    {
      "type": "type",
      "name": "CredentialProvider",
      "desc": "Abstract credential provider — resolves credential references to values.\n\nImplementations layer multiple sources (env, managed store, .env files)\nwith the following precedence:\n1. Process environment (read-only, always wins)\n2. Managed store (writable)\n3. Project .env (read-only fallback)\n4. User home .env (read-only fallback)",
      "methods": [
        {
          "sig": "resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>",
          "desc": "Resolve a credential reference to its value.\nReturns undefined if the credential is not configured.\nResolution is per-request — rotated credentials reach the next request.",
          "params": [
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            }
          ],
          "ret": "Promise<ResolvedCredential | undefined>"
        },
        {
          "sig": "describe(ref: CredentialRef): Promise<CredentialInfo>",
          "desc": "Describe a credential without exposing its value.\nUsed by configuration UIs to show which credentials are configured.",
          "params": [
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            }
          ],
          "ret": "Promise<CredentialInfo>"
        },
        {
          "sig": "set(ref: CredentialRef, value: string): Promise<void>",
          "desc": "Set a credential value in the managed store.\nRejects if the credential is shadowed by the process environment.",
          "params": [
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "unset(ref: CredentialRef): Promise<void>",
          "desc": "Remove a credential from the managed store.\nRejects if the credential is shadowed by the process environment.",
          "params": [
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            }
          ],
          "ret": "Promise<void>"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "credentialRef",
      "desc": "Create a credential reference from an environment variable name.\nThis is a type-level marker — no runtime validation.",
      "methods": [
        {
          "sig": "credentialRef(envName: string): CredentialRef",
          "desc": "Create a credential reference from an environment variable name.\nThis is a type-level marker — no runtime validation.",
          "params": [
            {
              "n": "envName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "CredentialRef"
        }
      ]
    },
    {
      "type": "type",
      "name": "SettingsNamespace",
      "desc": "Branded settings namespace identifier (kebab-case).",
      "methods": [
        {
          "sig": "type SettingsNamespace = SettingsNamespace",
          "desc": "Branded settings namespace identifier (kebab-case).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SettingsSection",
      "desc": "A settings section — the resolved configuration for a namespace.",
      "methods": [],
      "props": [
        {
          "name": "namespace",
          "type": "SettingsNamespace",
          "required": true,
          "desc": "The namespace this section belongs to."
        },
        {
          "name": "config",
          "type": "T",
          "required": true,
          "desc": "The resolved configuration values."
        },
        {
          "name": "layer",
          "type": "(string & {}) | \"default\" | \"composition\" | \"user\"",
          "required": true,
          "desc": "The layer this config was resolved from."
        }
      ]
    },
    {
      "type": "type",
      "name": "SettingsProvider",
      "desc": "Abstract settings provider — manages per-namespace configuration.\n\nSettings flow: schema defaults < composition base (cordis.yml) < user document.",
      "methods": [
        {
          "sig": "get(namespace: SettingsNamespace): SettingsSection<T> | undefined",
          "desc": "Get the current resolved config for a namespace.\nReturns undefined if the namespace is not registered.",
          "params": [
            {
              "n": "namespace",
              "t": "SettingsNamespace",
              "r": true,
              "d": "SettingsNamespace"
            }
          ],
          "ret": "SettingsSection<T> | undefined"
        },
        {
          "sig": "install(namespace: SettingsNamespace, schema: SettingsSchema<T>, base: T, callbacks: { setSource: (config: T) => void; onChange?: (config: T) => void; }): () => void",
          "desc": "Register a settings section with a schema and callbacks.\nThe section is merged from layers and watched for changes.",
          "params": [
            {
              "n": "namespace",
              "t": "SettingsNamespace",
              "r": true,
              "d": "SettingsNamespace"
            },
            {
              "n": "schema",
              "t": "SettingsSchema<T>",
              "r": true,
              "d": "SettingsSchema<T>"
            },
            {
              "n": "base",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "callbacks",
              "t": "{ setSource: (config: T) => void; onChange?: (config: T) => void; }",
              "r": true,
              "d": "{ setSource: (config: T) => void; onChange?: (config: T) => void; }"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "setSection(namespace: SettingsNamespace, config: T): void",
          "desc": "Update the user-document layer for a namespace.\nTriggers re-validation and onChange callbacks.",
          "params": [
            {
              "n": "namespace",
              "t": "SettingsNamespace",
              "r": true,
              "d": "SettingsNamespace"
            },
            {
              "n": "config",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "list(): readonly SettingsNamespace[]",
          "desc": "List all registered namespaces.",
          "params": [],
          "ret": "readonly SettingsNamespace[]"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "SettingsSchema",
      "desc": "Schema for validating and defaulting settings.",
      "methods": [
        {
          "sig": "parse(raw: unknown): T",
          "desc": "Parse and validate raw config, applying defaults.",
          "params": [
            {
              "n": "raw",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "T"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "settingsNamespace",
      "desc": "Create a settings namespace identifier.",
      "methods": [
        {
          "sig": "settingsNamespace(ns: string): SettingsNamespace",
          "desc": "Create a settings namespace identifier.",
          "params": [
            {
              "n": "ns",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "SettingsNamespace"
        }
      ]
    },
    {
      "type": "function",
      "name": "mergeLayers",
      "desc": "Merge configuration layers. Higher layers override lower layers.\nOnly defined properties override — undefined means \"keep lower layer\".",
      "methods": [
        {
          "sig": "mergeLayers(base: T, override: Partial<T>): T",
          "desc": "Merge configuration layers. Higher layers override lower layers.\nOnly defined properties override — undefined means \"keep lower layer\".",
          "params": [
            {
              "n": "base",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "override",
              "t": "Partial<T>",
              "r": true,
              "d": "Partial<T>"
            }
          ],
          "ret": "T"
        }
      ]
    },
    {
      "type": "type",
      "name": "EnvSnapshot",
      "desc": "Environment variable resolution — multi-layer env access.\n\nProvides a structured way to read environment variables with\nlayering (process env > .env file > defaults) and type-safe\nresolution.\nA frozen snapshot of environment variables.",
      "methods": [
        {
          "sig": "get(key: string): string | undefined",
          "desc": "Get an environment variable value.",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string | undefined"
        },
        {
          "sig": "has(key: string): boolean",
          "desc": "Check if an environment variable is set (even if empty).",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "all(): Readonly<Record<string, string | undefined>>",
          "desc": "Get all environment variables as a readonly record.",
          "params": [],
          "ret": "Readonly<Record<string, string | undefined>>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "MultiLayerEnvConfig",
      "desc": "Configuration for multi-layer credential resolution.",
      "methods": [],
      "props": [
        {
          "name": "processEnv",
          "type": "EnvSnapshot",
          "required": true,
          "desc": "Process environment (highest priority, read-only)."
        },
        {
          "name": "managedStore",
          "type": "Map<string, string> | undefined",
          "required": false,
          "desc": "Managed credential store (writable, second priority)."
        },
        {
          "name": "projectEnv",
          "type": "string | undefined",
          "required": false,
          "desc": "Project .env file content (third priority)."
        },
        {
          "name": "userEnv",
          "type": "string | undefined",
          "required": false,
          "desc": "User home .env file content (lowest priority)."
        }
      ]
    },
    {
      "type": "function",
      "name": "resolveEnv",
      "desc": "Create an env snapshot from a record of environment variables.",
      "methods": [
        {
          "sig": "resolveEnv(vars: Record<string, string | undefined>): EnvSnapshot",
          "desc": "Create an env snapshot from a record of environment variables.",
          "params": [
            {
              "n": "vars",
              "t": "Record<string, string | undefined>",
              "r": true,
              "d": "Record<string, string | undefined>"
            }
          ],
          "ret": "EnvSnapshot"
        }
      ]
    },
    {
      "type": "function",
      "name": "resolveCredentialFromEnv",
      "desc": "Resolve a credential from a process environment snapshot.\nChecks in order: env > undefined (caller handles other layers).",
      "methods": [
        {
          "sig": "resolveCredentialFromEnv(env: EnvSnapshot, ref: CredentialRef): ResolvedCredential | undefined",
          "desc": "Resolve a credential from a process environment snapshot.\nChecks in order: env > undefined (caller handles other layers).",
          "params": [
            {
              "n": "env",
              "t": "EnvSnapshot",
              "r": true,
              "d": "EnvSnapshot"
            },
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            }
          ],
          "ret": "ResolvedCredential | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "parseEnvFile",
      "desc": "Parse a .env file content into a record.\nSupports `KEY=value`, `KEY=\"value\"`, `# comments`, and blank lines.",
      "methods": [
        {
          "sig": "parseEnvFile(content: string): Record<string, string>",
          "desc": "Parse a .env file content into a record.\nSupports `KEY=value`, `KEY=\"value\"`, `# comments`, and blank lines.",
          "params": [
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Record<string, string>"
        }
      ]
    },
    {
      "type": "function",
      "name": "resolveCredentialMultiLayer",
      "desc": "Resolve a credential through 4 layers:\n1. Process environment (always wins, read-only)\n2. Managed store (writable)\n3. Project .env (read-only fallback)\n4. User home .env (read-only fallback)\n\nEmpty values are treated as absent.",
      "methods": [
        {
          "sig": "resolveCredentialMultiLayer(config: MultiLayerEnvConfig, ref: CredentialRef): ResolvedCredential | undefined",
          "desc": "Resolve a credential through 4 layers:\n1. Process environment (always wins, read-only)\n2. Managed store (writable)\n3. Project .env (read-only fallback)\n4. User home .env (read-only fallback)\n\nEmpty values are treated as absent.",
          "params": [
            {
              "n": "config",
              "t": "MultiLayerEnvConfig",
              "r": true,
              "d": "MultiLayerEnvConfig"
            },
            {
              "n": "ref",
              "t": "CredentialRef",
              "r": true,
              "d": "CredentialRef"
            }
          ],
          "ret": "ResolvedCredential | undefined"
        }
      ]
    }
  ]
},
{
  "id": "core",
  "name": "@vinhnt-sdk/core",
  "icon": "C",
  "tag": "Core",
  "desc": "Core agent kernel - lifecycle, tool execution, permissions, LLM interactions.",
  "deps": [
    "event",
    "llm",
    "permission",
    "sandbox",
    "schema",
    "security",
    "session",
    "knowledge",
    "tools",
    "step-executor"
  ],
  "exports": [
    {
      "type": "class",
      "name": "AgentKernel",
      "desc": "Core agent orchestration — run loop, permission gate, tool execution, sub-agent spawning.\r\nComposition root for all run-time services. Each call to `run()` creates a tracked\r\nrun lifecycle with abort support and session integration.",
      "methods": [
        {
          "sig": "constructor(config: AgentKernelConfig)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "AgentKernelConfig",
              "r": true,
              "d": "AgentKernelConfig"
            }
          ]
        },
        {
          "sig": "registerTool(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "Register a tool definition for the agent to call. Invalidates tool cache.",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "registerDomain(manifest: DomainManifest): void",
          "desc": "Register a named domain manifest (tool membership) for agent `domains` filtering.",
          "params": [
            {
              "n": "manifest",
              "t": "DomainManifest",
              "r": true,
              "d": "DomainManifest"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "domainFor(toolId: string): string | undefined",
          "desc": "Resolve the domain a tool belongs to, or undefined if it is a core tool.",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string | undefined"
        },
        {
          "sig": "manifestFor(domainId: string): DomainManifest | undefined",
          "desc": "Resolve the manifest for a domain id, or undefined.",
          "params": [
            {
              "n": "domainId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "DomainManifest | undefined"
        },
        {
          "sig": "emitEvent(event: Omit<KnownRunEvent, \"sequence\">, persist: boolean): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "Omit<KnownRunEvent, \"sequence\">",
              "r": true,
              "d": "Omit<KnownRunEvent, \"sequence\">"
            },
            {
              "n": "persist",
              "t": "boolean",
              "r": false,
              "d": "boolean"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "addSessionMessage(sid: string | undefined, role: string, content: string, extra: { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number; }; model?: string; cost?: number...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "sid",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            },
            {
              "n": "role",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "extra",
              "t": "{ toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number; }; model?: string; cost?: number...",
              "r": false,
              "d": "{ toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number; }; model?: string; cost?: number..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getAvailableTools(runId: RunId | undefined): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "findTool(name: string, runId: RunId | undefined): ToolDefinition<unknown, unknown> | undefined",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "runId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        },
        {
          "sig": "hasTool(name: string): boolean",
          "desc": "Whether a tool is registered in the underlying pool (regardless of per-agent filtering).",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "useAgent(agentId: AgentId): Promise<void>",
          "desc": "Switch to a named agent from the registry. Syncs permissions.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "setCurrentAgent(agent: AgentConfig): void",
          "desc": "Directly set the active agent config (bypasses registry lookup).",
          "params": [
            {
              "n": "agent",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "spawnAgent(params: SubAgentParams): Promise<AgentConfig>",
          "desc": "Create and register a new sub-agent from inline params.",
          "params": [
            {
              "n": "params",
              "t": "SubAgentParams",
              "r": true,
              "d": "SubAgentParams"
            }
          ],
          "ret": "Promise<AgentConfig>"
        },
        {
          "sig": "getCurrentAgent(): AgentConfig | undefined",
          "desc": "Current active agent config (if any).",
          "params": [],
          "ret": "AgentConfig | undefined"
        },
        {
          "sig": "setBehaviourMode(mode: AgentBehaviourMode): void",
          "desc": "Switch the current agent's behaviour mode (build/plan/custom). Resets tool cache.",
          "params": [
            {
              "n": "mode",
              "t": "AgentBehaviourMode",
              "r": true,
              "d": "AgentBehaviourMode"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setAutoApproval(enabled: boolean): void",
          "desc": "Toggle auto-approval at runtime (all tools approved without prompting).",
          "params": [
            {
              "n": "enabled",
              "t": "boolean",
              "r": true,
              "d": "boolean"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getBehaviourMode(): AgentBehaviourMode",
          "desc": "Get the current agent's behaviour mode (defaults to \"build\").",
          "params": [],
          "ret": "AgentBehaviourMode"
        },
        {
          "sig": "getAgentRegistry(): AgentRegistry | undefined",
          "desc": "Underlying agent registry (for listing/searching agents).",
          "params": [],
          "ret": "AgentRegistry | undefined"
        },
        {
          "sig": "getEventStore(): RunEventStore",
          "desc": "Underlying run event store (for audit/event sourcing).",
          "params": [],
          "ret": "RunEventStore"
        },
        {
          "sig": "runAgent(agentId: AgentId, prompt: string, ctx: RequestContext, sessionId: string | undefined, parentRunId: RunId | undefined, signal: AbortSignal | undefined): Promise<string>",
          "desc": "Delegate a prompt to a named sub-agent. Returns the agent's response text.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            },
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentRunId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "buildSystemPrompt(agent: AgentConfig | undefined): string | undefined",
          "desc": "Build the system head (agent identity + configured system prompt) for a run.",
          "params": [
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": true,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "string | undefined"
        },
        {
          "sig": "run(prompt: string, ctx: RequestContext, sessionId: string | undefined, userContentParts: readonly MessageContentPart[] | undefined, agentOverride: AgentConfig | undefined): RunHandle",
          "desc": "Start a new agent run. Creates a run ID, wires abort + session, and returns\r\na `RunHandle` (runId + completed promise + abort). The run loop executes\r\nasynchronously — the promise resolves when the run finishes (or fails).",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly MessageContentPart[] | undefined",
              "r": false,
              "d": "readonly MessageContentPart[] | undefined"
            },
            {
              "n": "agentOverride",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "RunHandle"
        },
        {
          "sig": "resumeRun(runId: RunId, prompt: string, ctx: RequestContext, sessionId: string | undefined, agentOverride: AgentConfig | undefined): Promise<RunHandle>",
          "desc": "Resume a previously persisted run from durable storage (snapshot + messages).\r\nRestores the run's session state (history, step counter, token counts) and\r\ncontinues the run loop from where it stopped. Emits no `run.started` event\r\n(the run has already started) and does not re-inject the original prompt.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "agentOverride",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "Promise<RunHandle>"
        },
        {
          "sig": "getActiveSessionIds(): Promise<string[]>",
          "desc": "Reconstruct session IDs with non-terminal runs from the event store (for restart recovery).",
          "params": [],
          "ret": "Promise<string[]>"
        },
        {
          "sig": "createRunHandle(prompt: string, ctx: RequestContext, sessionId: string | undefined, userContentParts: readonly MessageContentPart[] | undefined, agentOverride: AgentConfig | undefined): AgentRunHandle",
          "desc": "Start a new agent run with full lifecycle management.\r\nReturns an AgentRunHandle with cancel, status, and event streaming.",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly MessageContentPart[] | undefined",
              "r": false,
              "d": "readonly MessageContentPart[] | undefined"
            },
            {
              "n": "agentOverride",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "AgentRunHandle"
        },
        {
          "sig": "streamRun(prompt: string, ctx: RequestContext, sessionId: string | undefined, userContentParts: readonly MessageContentPart[] | undefined, agentOverride: AgentConfig | undefined): { runId: RunId; events: AsyncIterable<KnownRunEvent>; }",
          "desc": "Start a new agent run and stream events as an async iterable.\r\nReturns the run ID and an async iterable of run events.",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly MessageContentPart[] | undefined",
              "r": false,
              "d": "readonly MessageContentPart[] | undefined"
            },
            {
              "n": "agentOverride",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "{ runId: RunId; events: AsyncIterable<KnownRunEvent>; }"
        },
        {
          "sig": "getRunSession(runId: RunId): SessionRuntimeState | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "SessionRuntimeState | undefined"
        },
        {
          "sig": "activeRunContext(): RunContext | undefined",
          "desc": "Resolve the context of the most recently started run, if one is active.",
          "params": [],
          "ret": "RunContext | undefined"
        },
        {
          "sig": "runAgentsParallel(tasks: { agentId: AgentId; prompt: string; }[], ctx: RequestContext, sessionId: string | undefined, parentRunId: RunId | undefined, signal: AbortSignal | undefined): Promise<string>",
          "desc": "Run multiple sub-agents concurrently. Returns combined output.",
          "params": [
            {
              "n": "tasks",
              "t": "{ agentId: AgentId; prompt: string; }[]",
              "r": true,
              "d": "{ agentId: AgentId; prompt: string; }[]"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentRunId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "runSafe(prompt: string, ctx: RequestContext, sessionId: string | undefined, userContentParts: readonly MessageContentPart[] | undefined): { ok: true; value: { completed: Promise<void>; runId: RunId; abort(): void; }; error?: never; } | { ok: false; error:...",
          "desc": "Start a run with error-safe wrapper — returns `{ ok, value }` or `{ ok: false, error }`.",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly MessageContentPart[] | undefined",
              "r": false,
              "d": "readonly MessageContentPart[] | undefined"
            }
          ],
          "ret": "{ ok: true; value: { completed: Promise<void>; runId: RunId; abort(): void; }; error?: never; } | { ok: false; error:..."
        },
        {
          "sig": "getSaga(runId: RunId | undefined): ToolSaga",
          "desc": "Get the tool saga for inspecting completed tool calls and triggering rollbacks.",
          "params": [
            {
              "n": "runId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "ToolSaga"
        },
        {
          "sig": "getCircuitBreaker(): CircuitBreaker",
          "desc": "Get the circuit breaker for inspecting trip state and threshold.",
          "params": [],
          "ret": "CircuitBreaker"
        },
        {
          "sig": "getModelCaller(): ModelCaller",
          "desc": "Get the model caller for testing prompts against providers.",
          "params": [],
          "ret": "ModelCaller"
        },
        {
          "sig": "reconfigure(partial: Partial<Pick<AgentKernelConfig, \"model\" | \"maxTokens\" | \"maxSteps\" | \"stepTimeout\" | \"thinkingBudget\" | \"thinkingProm...): void",
          "desc": "Hot-reload runtime-tunable settings without rebuilding the kernel.\r\nUpdates the default model, generation limits, permission rules and\r\nrisk overrides. New runs pick up the values immediately.\r\n\r\nSupports both nested format (`permissions: { ... }`) and legacy flat format\r\n(`globalPermissionRules: ...`, `permissionRiskDefaults: ...`).",
          "params": [
            {
              "n": "partial",
              "t": "Partial<Pick<AgentKernelConfig, \"model\" | \"maxTokens\" | \"maxSteps\" | \"stepTimeout\" | \"thinkingBudget\" | \"thinkingProm...",
              "r": true,
              "d": "Partial<Pick<AgentKernelConfig, \"model\" | \"maxTokens\" | \"maxSteps\" | \"stepTimeout\" | \"thinkingBudget\" | \"thinkingProm..."
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getPermissionGate(): PermissionGate",
          "desc": "Get the permission gate for evaluating permission rules.",
          "params": [],
          "ret": "PermissionGate"
        },
        {
          "sig": "getRunState(runId: RunId): RunState | undefined",
          "desc": "Current state of a run (pending/running/completed/failed/cancelled).",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "RunState | undefined"
        },
        {
          "sig": "onRunStateChange(listener: (runId: RunId, state: RunState) => void): () => void",
          "desc": "Subscribe to run state transitions. Returns unsubscribe function.",
          "params": [
            {
              "n": "listener",
              "t": "(runId: RunId, state: RunState) => void",
              "r": true,
              "d": "(runId: RunId, state: RunState) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "sendInput(runId: RunId, text: string): void",
          "desc": "Send a user input string to a waiting run (e.g., approval response).",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "queuePendingEntry(runId: RunId, text: string): void",
          "desc": "Queue an input into the runtime queue and (when a session is attached) start persisting it.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "persistPendingInput(sessionId: string, text: string): Promise<{ sessionId: string; messageId: string; admittedSeq: number; }>",
          "desc": "Serialize per-session writes so sequential admissions get sequential seqs (RV-21).",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<{ sessionId: string; messageId: string; admittedSeq: number; }>"
        },
        {
          "sig": "maxAdmittedSeq(sessionId: string): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "hydratePendingInputs(runId: RunId, sessionId: string | undefined): Promise<void>",
          "desc": "Re-queue inputs admitted but not yet promoted (e.g. from a previous process\r\nthat crashed mid-run) in admission order, exactly once (RV-21).",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "markInputsPromoted(runId: RunId, texts: string[]): Promise<void>",
          "desc": "Mark the given drained inputs as promoted (best-effort, at-least-once on crash).",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "texts",
              "t": "string[]",
              "r": true,
              "d": "string[]"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "cancelCurrentRun(): void",
          "desc": "Abort all currently running sessions.",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "registerLifecycleResource(resource: LifecycleResource): void",
          "desc": "Register a lifecycle resource for graceful shutdown.",
          "params": [
            {
              "n": "resource",
              "t": "LifecycleResource",
              "r": true,
              "d": "LifecycleResource"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregisterLifecycleResource(id: string): void",
          "desc": "Unregister a lifecycle resource.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "shutdown(): Promise<{ success: string[]; failed: { id: string; error: unknown; }[]; }>",
          "desc": "Gracefully shut down all registered lifecycle resources.",
          "params": [],
          "ret": "Promise<{ success: string[]; failed: { id: string; error: unknown; }[]; }>"
        },
        {
          "sig": "runLoop(prompt: string, runId: RunId, ctx: RequestContext, runAbort: AbortController, sessionId: string | undefined, userContentParts: readonly { type: string; text?: string; image?: string; mimeType?: string; }[] | undefined, agentOverride: AgentConfig | undefined, runSaga: ToolSaga | undefined, resume: boolean | undefined, systemPrompt: string | undefined): Promise<RunLoopResult>",
          "desc": "",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "runAbort",
              "t": "AbortController",
              "r": true,
              "d": "AbortController"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly { type: string; text?: string; image?: string; mimeType?: string; }[] | undefined",
              "r": false,
              "d": "readonly { type: string; text?: string; image?: string; mimeType?: string; }[] | undefined"
            },
            {
              "n": "agentOverride",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            },
            {
              "n": "runSaga",
              "t": "ToolSaga | undefined",
              "r": false,
              "d": "ToolSaga | undefined"
            },
            {
              "n": "resume",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            },
            {
              "n": "systemPrompt",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<RunLoopResult>"
        },
        {
          "sig": "emitCompleted(event: { id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown>; }, sid: string | undefined, rid: RunId, totalIn: number, totalOut: number, status: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "{ id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown>; }",
              "r": true,
              "d": "{ id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown>; }"
            },
            {
              "n": "sid",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            },
            {
              "n": "rid",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "totalIn",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "totalOut",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "status",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "emitFail(rid: RunId, c: RequestContext, reason: string, steps: number, sid: string | undefined, totalIn: number, totalOut: number, dur: number | undefined, cancelled: boolean): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "rid",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "c",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "reason",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "steps",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "sid",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "totalIn",
              "t": "number",
              "r": false,
              "d": "number"
            },
            {
              "n": "totalOut",
              "t": "number",
              "r": false,
              "d": "number"
            },
            {
              "n": "dur",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "cancelled",
              "t": "boolean",
              "r": false,
              "d": "boolean"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "modelCaller: ModelCaller",
          "desc": "modelCaller",
          "params": []
        },
        {
          "sig": "permissionGate: PermissionGate",
          "desc": "permissionGate",
          "params": []
        },
        {
          "sig": "stateMachine: RunStateMachine",
          "desc": "stateMachine",
          "params": []
        },
        {
          "sig": "store: RunEventStore",
          "desc": "store",
          "params": []
        },
        {
          "sig": "tools: ToolDefinition<unknown, unknown>[]",
          "desc": "tools",
          "params": []
        },
        {
          "sig": "domainManifests: Map<string, DomainManifest>",
          "desc": "domainManifests",
          "params": []
        },
        {
          "sig": "maxSteps: number",
          "desc": "maxSteps",
          "params": []
        },
        {
          "sig": "maxTokens: number",
          "desc": "maxTokens",
          "params": []
        },
        {
          "sig": "maxToolCallsPerStep: number",
          "desc": "maxToolCallsPerStep",
          "params": []
        },
        {
          "sig": "compactor: ConversationCompactor | undefined",
          "desc": "compactor",
          "params": []
        },
        {
          "sig": "systemContext: ContextRegistry | undefined",
          "desc": "systemContext",
          "params": []
        },
        {
          "sig": "thinkingBudget: number",
          "desc": "thinkingBudget",
          "params": []
        },
        {
          "sig": "selfCorrectOnFailure: boolean",
          "desc": "selfCorrectOnFailure",
          "params": []
        },
        {
          "sig": "maxSelfCorrectAttempts: number",
          "desc": "maxSelfCorrectAttempts",
          "params": []
        },
        {
          "sig": "maxSubAgentDepth: number",
          "desc": "maxSubAgentDepth",
          "params": []
        },
        {
          "sig": "sessionStore: SessionStore | undefined",
          "desc": "sessionStore",
          "params": []
        },
        {
          "sig": "agentRegistry: AgentRegistry | undefined",
          "desc": "agentRegistry",
          "params": []
        },
        {
          "sig": "pluginManager: PluginManager | undefined",
          "desc": "pluginManager",
          "params": []
        },
        {
          "sig": "eventBus: EventBus | undefined",
          "desc": "eventBus",
          "params": []
        },
        {
          "sig": "sessionState: SessionRuntimeState | undefined",
          "desc": "sessionState",
          "params": []
        },
        {
          "sig": "toolRegistry: ToolRegistry | undefined",
          "desc": "toolRegistry",
          "params": []
        },
        {
          "sig": "toolProviderRegistry: ToolProviderRegistry | undefined",
          "desc": "toolProviderRegistry",
          "params": []
        },
        {
          "sig": "sessionTitleGenerator: ((prompt: string) => Promise<string>) | undefined",
          "desc": "sessionTitleGenerator",
          "params": []
        },
        {
          "sig": "saga: ToolSaga",
          "desc": "saga",
          "params": []
        },
        {
          "sig": "runSagas: Map<RunId, ToolSaga>",
          "desc": "runSagas",
          "params": []
        },
        {
          "sig": "stepExecutor: StepExecutor",
          "desc": "stepExecutor",
          "params": []
        },
        {
          "sig": "currentAgent: AgentConfig | undefined",
          "desc": "currentAgent",
          "params": []
        },
        {
          "sig": "currentDepth: number",
          "desc": "currentDepth",
          "params": []
        },
        {
          "sig": "agentChain: Set<AgentId>",
          "desc": "agentChain",
          "params": []
        },
        {
          "sig": "cachedTools: readonly ToolDefinition<unknown, unknown>[] | null",
          "desc": "cachedTools",
          "params": []
        },
        {
          "sig": "cachedToolsAgentId: string | undefined",
          "desc": "cachedToolsAgentId",
          "params": []
        },
        {
          "sig": "stepTimeout: number",
          "desc": "stepTimeout",
          "params": []
        },
        {
          "sig": "doomLoopThreshold: number",
          "desc": "doomLoopThreshold",
          "params": []
        },
        {
          "sig": "compactionThreshold: number | undefined",
          "desc": "compactionThreshold",
          "params": []
        },
        {
          "sig": "termination: TerminationPolicy | undefined",
          "desc": "termination",
          "params": []
        },
        {
          "sig": "circuitBreaker: CircuitBreaker",
          "desc": "circuitBreaker",
          "params": []
        },
        {
          "sig": "sessionDeps: KernelSessionDeps",
          "desc": "sessionDeps",
          "params": []
        },
        {
          "sig": "subAgentDeps: SubAgentRunnerDeps",
          "desc": "subAgentDeps",
          "params": []
        },
        {
          "sig": "runSessionStates: Map<RunId, SessionRuntimeState | undefined>",
          "desc": "runSessionStates",
          "params": []
        },
        {
          "sig": "runSessionIds: Map<RunId, string>",
          "desc": "runId → sessionId for pending-input persistence (RV-21).",
          "params": []
        },
        {
          "sig": "runPendingEntries: Map<RunId, PendingInputEntry[]>",
          "desc": "FIFO mirror of the state-machine input queue, used to mark promotion (RV-21).",
          "params": []
        },
        {
          "sig": "nextAdmittedSeq: Map<string, number>",
          "desc": "Per-session monotonic admitted-seq allocator, seeded from the store lazily (RV-21).",
          "params": []
        },
        {
          "sig": "inputWriteChains: Map<string, Promise<unknown>>",
          "desc": "Per-session serialized write chain so admitted seqs stay FIFO-consistent (RV-21).",
          "params": []
        },
        {
          "sig": "runContexts: Map<RunId, RunContext>",
          "desc": "Per-run execution context — keeps parallel runs' agent/depth/chain/tools isolated.",
          "params": []
        },
        {
          "sig": "lifecycleManager: LifecycleManager",
          "desc": "lifecycleManager",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "KernelError",
      "desc": "Kernel-level failure with a typed {@link KernelErrorCode}.",
      "methods": [
        {
          "sig": "constructor(kernelCode: KernelErrorCode, message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "kernelCode",
              "t": "KernelErrorCode",
              "r": true,
              "d": "KernelErrorCode"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: string",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "canTransitionRun",
      "desc": "Whether a run may transition directly from `from` to `to`.",
      "methods": [
        {
          "sig": "canTransitionRun(from: RunStatus, to: RunStatus): boolean",
          "desc": "Whether a run may transition directly from `from` to `to`.",
          "params": [
            {
              "n": "from",
              "t": "RunStatus",
              "r": true,
              "d": "RunStatus"
            },
            {
              "n": "to",
              "t": "RunStatus",
              "r": true,
              "d": "RunStatus"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "class",
      "name": "RunStateMachine",
      "desc": "Tracks per-run state, abort signals and input queues.",
      "methods": [
        {
          "sig": "getState(runId: RunId): RunState | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "RunState | undefined"
        },
        {
          "sig": "setState(runId: RunId, state: RunState): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "state",
              "t": "RunState",
              "r": true,
              "d": "RunState"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "onStateChange(listener: (runId: RunId, state: RunState) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(runId: RunId, state: RunState) => void",
              "r": true,
              "d": "(runId: RunId, state: RunState) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "createRun(runId: RunId, sessionId: string | undefined, parentRunId: RunId | undefined): AbortController | null",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentRunId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "AbortController | null"
        },
        {
          "sig": "getAbort(runId: RunId): AbortController | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "AbortController | undefined"
        },
        {
          "sig": "isAborted(runId: RunId): boolean",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "getSignal(runId: RunId): AbortSignal",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "AbortSignal"
        },
        {
          "sig": "cleanupRun(runId: RunId, sessionId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "cancelAll(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "sendInput(runId: RunId, text: string): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "drainInputs(runId: RunId): string[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "string[]"
        },
        {
          "sig": "setModelForRun(runId: RunId, model: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "model",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getModelForRun(runId: RunId): T | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "T | undefined"
        },
        {
          "sig": "runStates: any",
          "desc": "runStates",
          "params": []
        },
        {
          "sig": "runAborts: any",
          "desc": "runAborts",
          "params": []
        },
        {
          "sig": "pendingInputs: any",
          "desc": "pendingInputs",
          "params": []
        },
        {
          "sig": "busySessions: any",
          "desc": "busySessions",
          "params": []
        },
        {
          "sig": "modelForRun: any",
          "desc": "modelForRun",
          "params": []
        },
        {
          "sig": "stateSubscribers: any",
          "desc": "stateSubscribers",
          "params": []
        },
        {
          "sig": "runIdStack: RunId[]",
          "desc": "runIdStack",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentKernelConfig",
      "desc": "Configuration for AgentKernel — the core agent orchestration engine.",
      "methods": [],
      "props": [
        {
          "name": "model",
          "type": "ModelProvider",
          "required": true,
          "desc": "LLM provider for generating responses."
        },
        {
          "name": "store",
          "type": "RunEventStore",
          "required": true,
          "desc": "Event store for persisting run events and session state."
        },
        {
          "name": "tools",
          "type": "readonly ToolDefinition<unknown, unknown>[] | undefined",
          "required": false,
          "desc": "Tool definitions available to the agent."
        },
        {
          "name": "toolProviderRegistry",
          "type": "ToolProviderRegistry | undefined",
          "required": false,
          "desc": "ToolProviderRegistry — single source of truth for all tools."
        },
        {
          "name": "maxSteps",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of steps (LLM calls) per run. Default: 30."
        },
        {
          "name": "maxToolCallsPerStep",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum tool calls per step. Default: 10."
        },
        {
          "name": "maxConcurrentToolCalls",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum concurrent tool calls."
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum tokens per LLM response. Default: 4096."
        },
        {
          "name": "compactor",
          "type": "ConversationCompactor | undefined",
          "required": false,
          "desc": "Conversation compactor for context window management."
        },
        {
          "name": "systemContext",
          "type": "ContextRegistry | undefined",
          "required": false,
          "desc": "System context registry for dynamic system prompts."
        },
        {
          "name": "thinkingBudget",
          "type": "number | undefined",
          "required": false,
          "desc": "Token budget for extended thinking (0 = disabled)."
        },
        {
          "name": "thinkingPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": "Custom thinking prompt for extended thinking."
        },
        {
          "name": "selfCorrectOnFailure",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, auto-retry on tool execution failure."
        },
        {
          "name": "maxSelfCorrectAttempts",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum self-correction attempts per step."
        },
        {
          "name": "maxSubAgentDepth",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum sub-agent nesting depth."
        },
        {
          "name": "sessionStore",
          "type": "SessionStore | undefined",
          "required": false,
          "desc": "Session store for durable session persistence."
        },
        {
          "name": "sessionId",
          "type": "string | undefined",
          "required": false,
          "desc": "Session ID for resuming an existing session."
        },
        {
          "name": "agentRegistry",
          "type": "AgentRegistry | undefined",
          "required": false,
          "desc": "Agent registry for sub-agent spawning."
        },
        {
          "name": "pluginManager",
          "type": "PluginManager | undefined",
          "required": false,
          "desc": "Plugin manager for hook execution."
        },
        {
          "name": "sessionState",
          "type": "SessionRuntimeState | undefined",
          "required": false,
          "desc": "Runtime session state for the current run."
        },
        {
          "name": "toolRegistry",
          "type": "ToolRegistry | undefined",
          "required": false,
          "desc": "Tool registry for dynamic tool registration."
        },
        {
          "name": "modelRegistry",
          "type": "ModelRegistry | undefined",
          "required": false,
          "desc": "Model registry for multi-model routing."
        },
        {
          "name": "sessionTitleGenerator",
          "type": "((prompt: string) => Promise<string>) | undefined",
          "required": false,
          "desc": "Custom function to generate session titles from prompts."
        },
        {
          "name": "eventBus",
          "type": "EventBus | undefined",
          "required": false,
          "desc": "Event bus for publishing runtime events."
        },
        {
          "name": "stepTimeout",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-step timeout in ms. Default: 120000."
        },
        {
          "name": "circuitBreaker",
          "type": "CircuitBreaker | undefined",
          "required": false,
          "desc": "Circuit breaker for model call resilience."
        },
        {
          "name": "circuitBreakerOptions",
          "type": "CircuitBreakerOptions | undefined",
          "required": false,
          "desc": "Circuit breaker configuration (used if no breaker provided)."
        },
        {
          "name": "maxRetries",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of retries for transient model failures. Default: 3"
        },
        {
          "name": "retryBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Base delay for exponential backoff in ms. Default: 1000"
        },
        {
          "name": "maxRetryBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum delay for retry backoff in ms. Default: 30000"
        },
        {
          "name": "doomLoopThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": "Doom loop detection threshold (consecutive identical outputs). Default: 3."
        },
        {
          "name": "workspaceRoot",
          "type": "string | undefined",
          "required": false,
          "desc": "Workspace root directory for file operations."
        },
        {
          "name": "compactionThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": "Context compaction threshold ratio (0-1). Default: 0.75."
        },
        {
          "name": "noStore",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, disable event persistence (ephemeral runs)."
        },
        {
          "name": "termination",
          "type": "TerminationPolicy | undefined",
          "required": false,
          "desc": "Termination policy for advanced stop conditions."
        },
        {
          "name": "sandbox",
          "type": "KernelSandboxConfig | undefined",
          "required": false,
          "desc": "Sandbox configuration for shell execution."
        },
        {
          "name": "permissions",
          "type": "PermissionConfig | undefined",
          "required": false,
          "desc": "Permission configuration for tool execution."
        },
        {
          "name": "modelRouting",
          "type": "ModelRoutingConfig | undefined",
          "required": false,
          "desc": "Model routing configuration for multi-model setups."
        },
        {
          "name": "hooks",
          "type": "HookConfig | undefined",
          "required": false,
          "desc": "Hook configuration for plugin system."
        },
        {
          "name": "managedConfig",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": "Enterprise managed configuration."
        },
        {
          "name": "logger",
          "type": "Logger | undefined",
          "required": false,
          "desc": "Logger for kernel events."
        }
      ]
    },
    {
      "type": "type",
      "name": "RunHandle",
      "desc": "Handle for a running agent run — provides abort control and completion tracking.",
      "methods": [
        {
          "sig": "abort(): void",
          "desc": "Abort the running agent.",
          "params": [],
          "ret": "void"
        }
      ],
      "props": [
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": "Unique identifier for this run."
        },
        {
          "name": "completed",
          "type": "Promise<void>",
          "required": true,
          "desc": "Promise that resolves when the run completes (or rejects on failure)."
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentRunHandle",
      "desc": "Enhanced run handle with lifecycle management.\n\nProvides methods to control and monitor an agent run.",
      "methods": [
        {
          "sig": "cancel(): void",
          "desc": "Cancel the running agent.",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "events(): AsyncIterable<AgentEvent>",
          "desc": "Stream events from this run.",
          "params": [],
          "ret": "AsyncIterable<AgentEvent>"
        },
        {
          "sig": "onEvent(handler: (event: AgentEvent) => void): () => void",
          "desc": "Subscribe to events from this run.",
          "params": [
            {
              "n": "handler",
              "t": "(event: AgentEvent) => void",
              "r": true,
              "d": "(event: AgentEvent) => void"
            }
          ],
          "ret": "() => void"
        }
      ],
      "props": [
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": "Unique identifier for this run."
        },
        {
          "name": "completed",
          "type": "Promise<AgentRunResult>",
          "required": true,
          "desc": "Promise that resolves when the run completes (or rejects on failure)."
        },
        {
          "name": "isCancelled",
          "type": "boolean",
          "required": true,
          "desc": "Check if the run is cancelled."
        },
        {
          "name": "isCompleted",
          "type": "boolean",
          "required": true,
          "desc": "Check if the run is completed."
        },
        {
          "name": "isRunning",
          "type": "boolean",
          "required": true,
          "desc": "Check if the run is running."
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentRunResult",
      "desc": "Result of a completed agent run.",
      "methods": [],
      "props": [
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": "Run identifier."
        },
        {
          "name": "status",
          "type": "\"cancelled\" | \"failed\" | \"succeeded\"",
          "required": true,
          "desc": "Final status."
        },
        {
          "name": "output",
          "type": "string | undefined",
          "required": false,
          "desc": "Output text if successful."
        },
        {
          "name": "error",
          "type": "string | undefined",
          "required": false,
          "desc": "Error message if failed."
        },
        {
          "name": "totalSteps",
          "type": "number",
          "required": true,
          "desc": "Total number of steps executed."
        },
        {
          "name": "durationMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Total duration in milliseconds."
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "Input tokens used."
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "Output tokens used."
        }
      ]
    },
    {
      "type": "function",
      "name": "createAgent",
      "desc": "Create an {@link AgentConfig} from user parameters, applying sane defaults\n(streaming enabled, primary permission mode) and validating required fields.",
      "methods": [
        {
          "sig": "createAgent(params: CreateAgentParams): AgentConfig",
          "desc": "Create an {@link AgentConfig} from user parameters, applying sane defaults\n(streaming enabled, primary permission mode) and validating required fields.",
          "params": [
            {
              "n": "params",
              "t": "CreateAgentParams",
              "r": true,
              "d": "CreateAgentParams"
            }
          ],
          "ret": "AgentConfig"
        }
      ]
    },
    {
      "type": "type",
      "name": "CreateAgentParams",
      "desc": "Parameters for creating a primary agent config.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "AgentId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "profile",
          "type": "AgentProfile",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "AgentCapabilities | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "permissions",
          "type": "AgentPermissions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "systemPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryEventBus",
      "desc": "In-process {@link EventBus} with durable event retention and sync subscriber dispatch.",
      "methods": [
        {
          "sig": "publish(def: EventDefinition<T>, data: T, meta: { traceId?: string; aggregateId?: string; } | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "data",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "meta",
              "t": "{ traceId?: string; aggregateId?: string; } | undefined",
              "r": false,
              "d": "{ traceId?: string; aggregateId?: string; } | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "EventHandler<T>",
              "r": true,
              "d": "EventHandler<T>"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "subscribeAll(handler: EventHandler, namespace: string | undefined): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "EventHandler",
              "r": true,
              "d": "EventHandler"
            },
            {
              "n": "namespace",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "project(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "(event: TypedEvent<T>) => void",
              "r": true,
              "d": "(event: TypedEvent<T>) => void"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "durable(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "stream(def: EventDefinition<T>, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "streamWithReplay(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events with durable replay + live merge.\nFirst yields historical events from durable storage, then yields live events.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "clear(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "listeners: any",
          "desc": "listeners",
          "params": []
        },
        {
          "sig": "projectors: any",
          "desc": "projectors",
          "params": []
        },
        {
          "sig": "durableEvents: any",
          "desc": "durableEvents",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "EventBus",
      "desc": "EventBus",
      "methods": [
        {
          "sig": "publish(def: EventDefinition<T>, data: T, meta: { traceId?: string; aggregateId?: string; } | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "data",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "meta",
              "t": "{ traceId?: string; aggregateId?: string; } | undefined",
              "r": false,
              "d": "{ traceId?: string; aggregateId?: string; } | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "EventHandler<T>",
              "r": true,
              "d": "EventHandler<T>"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "subscribeAll(handler: EventHandler<unknown>, namespace: string | undefined): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "EventHandler<unknown>",
              "r": true,
              "d": "EventHandler<unknown>"
            },
            {
              "n": "namespace",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "durable(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "project(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "(event: TypedEvent<T>) => void",
              "r": true,
              "d": "(event: TypedEvent<T>) => void"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "stream(def: EventDefinition<T>, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events as an async iterable. Yields events as they are published.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "streamWithReplay(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events with durable replay + live merge.\nFirst yields historical events from durable storage, then yields live events.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "EventHandler",
      "desc": "EventHandler",
      "methods": [
        {
          "sig": "type EventHandler = EventHandler<T>",
          "desc": "EventHandler",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "Unsubscribe",
      "desc": "Unsubscribe",
      "methods": [
        {
          "sig": "type Unsubscribe = Unsubscribe",
          "desc": "Unsubscribe",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemorySessionState",
      "desc": "In-memory {@link SessionRuntimeState} implementation.",
      "methods": [
        {
          "sig": "pushMessage(msg: ChatMessage): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "ChatMessage",
              "r": true,
              "d": "ChatMessage"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "resetMessages(msgs: readonly ChatMessage[]): void",
          "desc": "",
          "params": [
            {
              "n": "msgs",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setContext(key: string, value: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "clearContext(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "snapshot(): SessionRuntimeSnapshot",
          "desc": "",
          "params": [],
          "ret": "SessionRuntimeSnapshot"
        },
        {
          "sig": "restore(snapshot: SessionRuntimeSnapshot): void",
          "desc": "",
          "params": [
            {
              "n": "snapshot",
              "t": "SessionRuntimeSnapshot",
              "r": true,
              "d": "SessionRuntimeSnapshot"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "fork(): SessionRuntimeState",
          "desc": "",
          "params": [],
          "ret": "SessionRuntimeState"
        },
        {
          "sig": "_messages: any",
          "desc": "_messages",
          "params": []
        },
        {
          "sig": "_context: any",
          "desc": "_context",
          "params": []
        },
        {
          "sig": "step: number",
          "desc": "step",
          "params": []
        },
        {
          "sig": "toolCallCount: number",
          "desc": "toolCallCount",
          "params": []
        },
        {
          "sig": "isRunning: boolean",
          "desc": "isRunning",
          "params": []
        },
        {
          "sig": "get messages(): readonly ChatMessage[]",
          "desc": "",
          "params": []
        },
        {
          "sig": "get context(): ReadonlyMap<string, unknown>",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "SessionRunCoordinator",
      "desc": "Coordinates the active session and run against a {@link RunHandler},\npersisting sessions and emitting lifecycle events to subscribed listeners.",
      "methods": [
        {
          "sig": "constructor(handler: RunHandler, sessionStore: SessionStore, sessionTree: SessionTree | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "handler",
              "t": "RunHandler",
              "r": true,
              "d": "RunHandler"
            },
            {
              "n": "sessionStore",
              "t": "SessionStore",
              "r": true,
              "d": "SessionStore"
            },
            {
              "n": "sessionTree",
              "t": "SessionTree | undefined",
              "r": false,
              "d": "SessionTree | undefined"
            }
          ]
        },
        {
          "sig": "onEvent(listener: (event: SessionEvent) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(event: SessionEvent) => void",
              "r": true,
              "d": "(event: SessionEvent) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "emit(event: SessionEvent): void",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "SessionEvent",
              "r": true,
              "d": "SessionEvent"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "listSessions(limit: number, offset: number): Promise<readonly Session[]>",
          "desc": "",
          "params": [
            {
              "n": "limit",
              "t": "number",
              "r": false,
              "d": "number"
            },
            {
              "n": "offset",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "Promise<readonly Session[]>"
        },
        {
          "sig": "getSession(id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "createSession(title: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "forkSession(title: string | undefined): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "switchSession(id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "startRun(prompt: string, ctx: RequestContext, agent: AgentConfig | undefined, userContentParts: readonly MessageContentPart[] | undefined): Promise<Result<RunId, KernelError>>",
          "desc": "",
          "params": [
            {
              "n": "prompt",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            },
            {
              "n": "userContentParts",
              "t": "readonly MessageContentPart[] | undefined",
              "r": false,
              "d": "readonly MessageContentPart[] | undefined"
            }
          ],
          "ret": "Promise<Result<RunId, KernelError>>"
        },
        {
          "sig": "sendInput(text: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "cancelRun(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "activeSession: Session | null",
          "desc": "activeSession",
          "params": []
        },
        {
          "sig": "activeRunId: RunId | null",
          "desc": "activeRunId",
          "params": []
        },
        {
          "sig": "eventListeners: Set<(event: SessionEvent) => void>",
          "desc": "eventListeners",
          "params": []
        },
        {
          "sig": "unsubRunState: (() => void) | null",
          "desc": "unsubRunState",
          "params": []
        },
        {
          "sig": "get currentSession(): Session | null",
          "desc": "",
          "params": []
        },
        {
          "sig": "get currentRunId(): RunId | null",
          "desc": "",
          "params": []
        },
        {
          "sig": "get runState(): RunState | undefined",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEventStore",
      "desc": "RunEventStore",
      "methods": [
        {
          "sig": "append(event: RunEvent<unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "appendTransactional(event: RunEvent<unknown>, sessionUpdate: { sessionId: string; updates: Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"output...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            },
            {
              "n": "sessionUpdate",
              "t": "{ sessionId: string; updates: Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"output...",
              "r": false,
              "d": "{ sessionId: string; updates: Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"output..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "exists(eventId: string): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "eventId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "list(runId: string, afterSequence: number | undefined): Promise<readonly RunEvent<unknown>[]>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "afterSequence",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly RunEvent<unknown>[]>"
        },
        {
          "sig": "listRunIds(): Promise<string[]>",
          "desc": "List all run IDs that have persisted events (for active-run discovery on restart).",
          "params": [],
          "ret": "Promise<string[]>"
        },
        {
          "sig": "getNextSequence(aggregateId: string): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "appendWithSequence(event: RunEvent<unknown>): Promise<number>",
          "desc": "Atomically allocate the next sequence for the aggregate and append the event\nin a single operation, then return the assigned sequence.\n\nImplementations that cannot do this atomically should fall back to\n`getNextSequence() + append()` for the returned value.",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "state",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getSnapshot(runId: string): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sequence",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "subscribe(listener: RunEventListener): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "RunEventListener",
              "r": true,
              "d": "RunEventListener"
            }
          ],
          "ret": "() => void"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "SessionStore",
      "desc": "SessionStore",
      "methods": [
        {
          "sig": "createSession(title: string | undefined, parentSessionId: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentSessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "forkSession(sourceSessionId: string, title: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "sourceSessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "getSession(id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "listSessions(limit: number | undefined, offset: number | undefined): Promise<readonly Session[]>",
          "desc": "",
          "params": [
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "offset",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Session[]>"
        },
        {
          "sig": "updateSession(id: string, updates: Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...",
              "r": true,
              "d": "Partial<Pick<Session, \"model\" | \"title\" | \"isActive\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deleteSession(id: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "addMessage(sessionId: string, role: string, content: string, toolCallId: string | undefined, tokens: { input: number; output: number; reasoning?: number; } | undefined, model: string | undefined, cost: number | undefined, admittedSeq: number | undefined): Promise<Message>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "role",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "toolCallId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "tokens",
              "t": "{ input: number; output: number; reasoning?: number; } | undefined",
              "r": false,
              "d": "{ input: number; output: number; reasoning?: number; } | undefined"
            },
            {
              "n": "model",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "cost",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "admittedSeq",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<Message>"
        },
        {
          "sig": "updateMessage(sessionId: string, messageId: string, updates: MessageSeqUpdates): Promise<void>",
          "desc": "Update message-level fields (e.g. mark a pending input as promoted on drain).\nOptional so minimal stores can skip input-segment tracking.",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "messageId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "MessageSeqUpdates",
              "r": true,
              "d": "MessageSeqUpdates"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listMessages(sessionId: string): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "searchMessages(query: string, limit: number | undefined): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "getSessionStats(): Promise<SessionStats>",
          "desc": "",
          "params": [],
          "ret": "Promise<SessionStats>"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "InMemoryAgentRegistry",
      "desc": "In-memory agent store with optional file loading (load/loadMultiple/reload).",
      "methods": [
        {
          "sig": "register(config: AgentConfig, parentId: AgentId | undefined): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "config",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            },
            {
              "n": "parentId",
              "t": "AgentId | undefined",
              "r": false,
              "d": "AgentId | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "get(id: AgentId): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "list(): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "unregister(id: AgentId): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            },
            {
              "n": "patch",
              "t": "Partial<AgentConfig>",
              "r": true,
              "d": "Partial<AgentConfig>"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "getChildren(parentId: AgentId): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "parentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "getParent(childId: AgentId): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "childId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "getAncestors(childId: AgentId): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "childId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "load(source: AgentSource): Promise<AgentConfig>",
          "desc": "",
          "params": [
            {
              "n": "source",
              "t": "AgentSource",
              "r": true,
              "d": "AgentSource"
            }
          ],
          "ret": "Promise<AgentConfig>"
        },
        {
          "sig": "loadMultiple(sources: AgentSource[]): Promise<AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "sources",
              "t": "AgentSource[]",
              "r": true,
              "d": "AgentSource[]"
            }
          ],
          "ret": "Promise<AgentConfig[]>"
        },
        {
          "sig": "reload(path: string): Promise<AgentConfig>",
          "desc": "",
          "params": [
            {
              "n": "path",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<AgentConfig>"
        },
        {
          "sig": "agents: Map<string, AgentConfig>",
          "desc": "agents",
          "params": []
        },
        {
          "sig": "parentMap: Map<string, string>",
          "desc": "parentMap",
          "params": []
        },
        {
          "sig": "childrenMap: Map<string, string[]>",
          "desc": "childrenMap",
          "params": []
        },
        {
          "sig": "loadedPaths: Set<string>",
          "desc": "loadedPaths",
          "params": []
        },
        {
          "sig": "pathToAgentId: Map<string, AgentId>",
          "desc": "pathToAgentId",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentRegistry",
      "desc": "Registry contract for storing and querying agent configs with parent/child hierarchy.",
      "methods": [
        {
          "sig": "register(config: AgentConfig, parentId: AgentId | undefined): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "config",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            },
            {
              "n": "parentId",
              "t": "AgentId | undefined",
              "r": false,
              "d": "AgentId | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "get(id: AgentId): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "list(): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            },
            {
              "n": "patch",
              "t": "Partial<AgentConfig>",
              "r": true,
              "d": "Partial<AgentConfig>"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "unregister(id: AgentId): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getChildren(parentId: AgentId): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "parentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        },
        {
          "sig": "getParent(childId: AgentId): Promise<AgentConfig | null>",
          "desc": "",
          "params": [
            {
              "n": "childId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<AgentConfig | null>"
        },
        {
          "sig": "getAncestors(childId: AgentId): Promise<readonly AgentConfig[]>",
          "desc": "",
          "params": [
            {
              "n": "childId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ],
          "ret": "Promise<readonly AgentConfig[]>"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "InMemoryModelRegistry",
      "desc": "In-memory {@link ModelRegistry} keyed by provider id.",
      "methods": [
        {
          "sig": "register(id: string, provider: ModelProvider): void",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "provider",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "get(id: string): ModelProvider | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ModelProvider | undefined"
        },
        {
          "sig": "list(): readonly { id: string; provider: ModelProvider; }[]",
          "desc": "",
          "params": [],
          "ret": "readonly { id: string; provider: ModelProvider; }[]"
        },
        {
          "sig": "providers: Map<string, ModelProvider>",
          "desc": "providers",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelProvider",
      "desc": "Interface for a model provider (generate/stream/token count).",
      "methods": [
        {
          "sig": "generate(request: ModelRequest, signal: AbortSignal | undefined): Promise<ModelResponse>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<ModelResponse>"
        },
        {
          "sig": "stream(request: ModelRequest, signal: AbortSignal | undefined): AsyncIterable<ModelStreamEvent>",
          "desc": "Streaming implementation — OPTIONAL. A provider that omits `stream`\nis non-streaming: the kernel falls back to `generate`. This keeps the\ncontract honest — a provider never advertises streaming it can't do.",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<ModelStreamEvent>"
        },
        {
          "sig": "countTokens(text: string): number",
          "desc": "",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        }
      ],
      "props": [
        {
          "name": "provider",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "ModelCapabilities",
          "required": true,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelRequest",
      "desc": "Model request — parameters for LLM generation.\n\nAligned with OpenAI Chat Completion format. All fields are optional\nexcept `messages` and `tools`.",
      "methods": [],
      "props": [
        {
          "name": "messages",
          "type": "readonly ChatMessage[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "readonly ToolDefinitionLike[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": "Model identifier — optional at schema level; set by provider adapter."
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxCompletionTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: max_completion_tokens — required for o-series models. Takes precedence over maxTokens."
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "topP",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "stopSequences",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "thinkingBudget",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "thinkingPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "providerOptions",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "system",
          "type": "string | undefined",
          "required": false,
          "desc": "System prompt — Anthropic-style top-level parameter (optional)."
        },
        {
          "name": "toolChoice",
          "type": "ToolChoice | undefined",
          "required": false,
          "desc": "OpenAI: tool_choice — controls tool calling behavior."
        },
        {
          "name": "parallelToolCalls",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: parallel_tool_calls — whether to allow parallel tool calls (default: true)."
        },
        {
          "name": "responseFormat",
          "type": "ResponseFormat | undefined",
          "required": false,
          "desc": "OpenAI: response_format — controls output format (JSON mode, JSON Schema)."
        },
        {
          "name": "streamOptions",
          "type": "StreamOptions | undefined",
          "required": false,
          "desc": "OpenAI: stream_options — options for streaming (e.g., include_usage)."
        },
        {
          "name": "presencePenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: presence_penalty — penalizes tokens based on presence (-2 to 2)."
        },
        {
          "name": "frequencyPenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: frequency_penalty — penalizes tokens based on frequency (-2 to 2)."
        },
        {
          "name": "logitBias",
          "type": "Record<string, number> | undefined",
          "required": false,
          "desc": "OpenAI: logit_bias — token-level logit biases (-100 to 100)."
        },
        {
          "name": "seed",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: seed — for reproducible outputs."
        },
        {
          "name": "user",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: user — end-user identifier for abuse monitoring."
        },
        {
          "name": "logprobs",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: logprobs — return log probabilities of output tokens."
        },
        {
          "name": "topLogprobs",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: top_logprobs — number of top logprobs per token (0-20)."
        },
        {
          "name": "reasoningEffort",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: reasoning_effort — controls reasoning token budget for o-series models."
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelResponse",
      "desc": "Model response — result from LLM generation.\n\nAligned with OpenAI Chat Completion response format.",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCalls",
          "type": "readonly { id: string; name: string; args: unknown; }[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "finishReason",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "ModelUsage | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "id",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI passthrough fields (optional)."
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: created — Unix timestamp of when the completion was created."
        },
        {
          "name": "systemFingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: system_fingerprint — backend configuration fingerprint."
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": "OpenAI: logprobs — token log probabilities (if requested)."
        },
        {
          "name": "refusal",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: refusal — model's refusal message (Structured Outputs safety)."
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelStreamEvent",
      "desc": "Union of streaming events emitted by a provider.",
      "methods": [
        {
          "sig": "type ModelStreamEvent = ModelStreamEvent",
          "desc": "Union of streaming events emitted by a provider.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelUsage",
      "desc": "Token usage information — aligned with OpenAI format with backward-compatible aliases.",
      "methods": [],
      "props": [
        {
          "name": "promptTokens",
          "type": "number",
          "required": true,
          "desc": "OpenAI: prompt_tokens"
        },
        {
          "name": "completionTokens",
          "type": "number",
          "required": true,
          "desc": "OpenAI: completion_tokens"
        },
        {
          "name": "totalTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cachedTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: prompt_tokens_details.cached_tokens"
        },
        {
          "name": "reasoningTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: completion_tokens_details.reasoning_tokens"
        },
        {
          "name": "audioTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: prompt_tokens_details.audio_tokens + completion_tokens_details.audio_tokens"
        }
      ]
    },
    {
      "type": "type",
      "name": "ContentPart",
      "desc": "Multimodal content part — matches OpenAI's content part format.",
      "methods": [
        {
          "sig": "type ContentPart = ContentPart",
          "desc": "Multimodal content part — matches OpenAI's content part format.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCallResult",
      "desc": "Tool call result in OpenAI format.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly arguments: string; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "getTextContent",
      "desc": "Extract plain text from a ChatMessage.content value.\nWorks with both string and ContentPart[] formats.",
      "methods": [
        {
          "sig": "getTextContent(content: string | readonly ContentPart[]): string",
          "desc": "Extract plain text from a ChatMessage.content value.\nWorks with both string and ContentPart[] formats.",
          "params": [
            {
              "n": "content",
              "t": "string | readonly ContentPart[]",
              "r": true,
              "d": "string | readonly ContentPart[]"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryApprovalStore",
      "desc": "In-memory {@link ApprovalStore} implementation.",
      "methods": [
        {
          "sig": "awaitReply(request: PermissionRequest, opts: AwaitReplyOptions | undefined): Promise<PermissionReply>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "PermissionRequest",
              "r": true,
              "d": "PermissionRequest"
            },
            {
              "n": "opts",
              "t": "AwaitReplyOptions | undefined",
              "r": false,
              "d": "AwaitReplyOptions | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "resolveRequest(requestId: string, reply: PermissionReply): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reply",
              "t": "PermissionReply",
              "r": true,
              "d": "PermissionReply"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getRequest(requestId: string): PermissionRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "PermissionRequest | undefined"
        },
        {
          "sig": "cancelRequest(requestId: string): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "pendingRequests(runId: string | undefined): readonly PermissionRequest[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "readonly PermissionRequest[]"
        },
        {
          "sig": "saveApproval(approval: SavedApproval): void",
          "desc": "",
          "params": [
            {
              "n": "approval",
              "t": "SavedApproval",
              "r": true,
              "d": "SavedApproval"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkApproval(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "Check whether a saved approval covers `resource`. A saved approval matches\nwhen its `action` and agent scope agree AND its `resource` glob-matches the\nrequested resource (e.g. `tool.read_file(src/*)` covers `tool.read_file(src/a.ts)`).",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "saveRejection(resource: string, action: string, agentId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkRejection(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "Check whether a saved rejection covers `resource`. A saved rejection matches\nwhen its `action` and agent scope agree AND its `resource` glob-matches the\nrequested resource (e.g. `tool.write_file(src/*)` covers `tool.write_file(src/a.ts)`).",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "pending: any",
          "desc": "pending",
          "params": []
        },
        {
          "sig": "requests: PermissionRequest[]",
          "desc": "requests",
          "params": []
        },
        {
          "sig": "savedApprovals: SavedApproval[]",
          "desc": "savedApprovals",
          "params": []
        },
        {
          "sig": "savedRejections: SavedApproval[]",
          "desc": "savedRejections",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalStore",
      "desc": "Store managing in-flight approval requests and saved allow/reject decisions.",
      "methods": [
        {
          "sig": "awaitReply(request: PermissionRequest, opts: AwaitReplyOptions | undefined): Promise<PermissionReply>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "PermissionRequest",
              "r": true,
              "d": "PermissionRequest"
            },
            {
              "n": "opts",
              "t": "AwaitReplyOptions | undefined",
              "r": false,
              "d": "AwaitReplyOptions | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "resolveRequest(requestId: string, reply: PermissionReply): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reply",
              "t": "PermissionReply",
              "r": true,
              "d": "PermissionReply"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getRequest(requestId: string): PermissionRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "PermissionRequest | undefined"
        },
        {
          "sig": "pendingRequests(runId: string | undefined): readonly PermissionRequest[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "readonly PermissionRequest[]"
        },
        {
          "sig": "cancelRequest(requestId: string): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "saveApproval(approval: SavedApproval): void",
          "desc": "",
          "params": [
            {
              "n": "approval",
              "t": "SavedApproval",
              "r": true,
              "d": "SavedApproval"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkApproval(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "saveRejection(resource: string, action: string, agentId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkRejection(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "WorkspaceManager",
      "desc": "Tracks registered workspace directories, manages the single active\nworkspace, and emits lifecycle events to listeners.",
      "methods": [
        {
          "sig": "add(root: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "remove(root: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "activate(root: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "deactivate(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "getActive(): Workspace | null",
          "desc": "",
          "params": [],
          "ret": "Workspace | null"
        },
        {
          "sig": "get(root: string): Workspace | undefined",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Workspace | undefined"
        },
        {
          "sig": "list(): readonly Workspace[]",
          "desc": "",
          "params": [],
          "ret": "readonly Workspace[]"
        },
        {
          "sig": "onEvent(listener: (event: WorkspaceEvent) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(event: WorkspaceEvent) => void",
              "r": true,
              "d": "(event: WorkspaceEvent) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "detect(root: string): string[]",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string[]"
        },
        {
          "sig": "makeWorkspaceId(root: string): WorkspaceId",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "WorkspaceId"
        },
        {
          "sig": "guessName(root: string): string",
          "desc": "",
          "params": [
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "emit(event: WorkspaceEvent): void",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "WorkspaceEvent",
              "r": true,
              "d": "WorkspaceEvent"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "workspaces: Map<string, Workspace>",
          "desc": "workspaces",
          "params": []
        },
        {
          "sig": "activeRoot: string | null",
          "desc": "activeRoot",
          "params": []
        },
        {
          "sig": "listeners: Set<(event: WorkspaceEvent) => void>",
          "desc": "listeners",
          "params": []
        },
        {
          "sig": "get size(): number",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemorySkillDefRegistry",
      "desc": "In-memory {@link SkillDefRegistry} backed by a {@link SkillDefParser},\noptionally loading skills from configured source directories.",
      "methods": [
        {
          "sig": "constructor(parser: SkillDefParser, sourceDirs: SourceDir[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "parser",
              "t": "SkillDefParser",
              "r": true,
              "d": "SkillDefParser"
            },
            {
              "n": "sourceDirs",
              "t": "SourceDir[] | undefined",
              "r": false,
              "d": "SourceDir[] | undefined"
            }
          ]
        },
        {
          "sig": "load(skills: SkillDefinition[]): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "skills",
              "t": "SkillDefinition[]",
              "r": true,
              "d": "SkillDefinition[]"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "loadFromSources(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "get(name: string): SkillDefinition | undefined",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "SkillDefinition | undefined"
        },
        {
          "sig": "list(): readonly SkillDefinition[]",
          "desc": "",
          "params": [],
          "ret": "readonly SkillDefinition[]"
        },
        {
          "sig": "search(query: string): SkillDefinition[]",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "SkillDefinition[]"
        },
        {
          "sig": "reload(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "scanDir(source: SourceDir): Promise<SkillDefinition[]>",
          "desc": "",
          "params": [
            {
              "n": "source",
              "t": "SourceDir",
              "r": true,
              "d": "SourceDir"
            }
          ],
          "ret": "Promise<SkillDefinition[]>"
        },
        {
          "sig": "skills: Map<string, SkillDefinition>",
          "desc": "skills",
          "params": []
        },
        {
          "sig": "parser: SkillDefParser",
          "desc": "parser",
          "params": []
        },
        {
          "sig": "sourceDirs: SourceDir[]",
          "desc": "sourceDirs",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "Tracer",
      "desc": "Lightweight trace span manager: creates child contexts, tracks span\ntiming, and wraps async work so results carry the current context.",
      "methods": [
        {
          "sig": "constructor(baseCtx: RequestContext | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "baseCtx",
              "t": "RequestContext | undefined",
              "r": false,
              "d": "RequestContext | undefined"
            }
          ]
        },
        {
          "sig": "createChild(ctx: RequestContext | undefined): RequestContext",
          "desc": "",
          "params": [
            {
              "n": "ctx",
              "t": "RequestContext | undefined",
              "r": false,
              "d": "RequestContext | undefined"
            }
          ],
          "ret": "RequestContext"
        },
        {
          "sig": "startSpan(name: string, ctx: RequestContext | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "RequestContext | undefined",
              "r": false,
              "d": "RequestContext | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "endSpan(): { name: string; durationMs: number; ctx: RequestContext; } | null",
          "desc": "",
          "params": [],
          "ret": "{ name: string; durationMs: number; ctx: RequestContext; } | null"
        },
        {
          "sig": "wrap(name: string, fn: () => Promise<T>, ctx: RequestContext | undefined): Promise<Traceable<T>>",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "fn",
              "t": "() => Promise<T>",
              "r": true,
              "d": "() => Promise<T>"
            },
            {
              "n": "ctx",
              "t": "RequestContext | undefined",
              "r": false,
              "d": "RequestContext | undefined"
            }
          ],
          "ret": "Promise<Traceable<T>>"
        },
        {
          "sig": "validate(ctx: unknown): RequestContext",
          "desc": "",
          "params": [
            {
              "n": "ctx",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "RequestContext"
        },
        {
          "sig": "spanStack: { name: string; start: number; ctx: RequestContext; }[]",
          "desc": "spanStack",
          "params": []
        },
        {
          "sig": "get currentCtx(): RequestContext",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "setLogger",
      "desc": "Replace the active logger (defaults to a console logger).",
      "methods": [
        {
          "sig": "setLogger(newLogger: Logger): void",
          "desc": "Replace the active logger (defaults to a console logger).",
          "params": [
            {
              "n": "newLogger",
              "t": "Logger",
              "r": true,
              "d": "Logger"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "setLogLevel",
      "desc": "Set the minimum level the active logger will emit.",
      "methods": [
        {
          "sig": "setLogLevel(level: LogLevel): void",
          "desc": "Set the minimum level the active logger will emit.",
          "params": [
            {
              "n": "level",
              "t": "LogLevel",
              "r": true,
              "d": "LogLevel"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "getLogger",
      "desc": "Get the active logger instance.",
      "methods": [
        {
          "sig": "getLogger(): Logger",
          "desc": "Get the active logger instance.",
          "params": [],
          "ret": "Logger"
        }
      ]
    },
    {
      "type": "type",
      "name": "Logger",
      "desc": "Minimal logger interface with level-scoped methods.",
      "methods": [
        {
          "sig": "debug(message: string, args: unknown[]): void",
          "desc": "",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown[]",
              "r": false,
              "d": "unknown[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "info(message: string, args: unknown[]): void",
          "desc": "",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown[]",
              "r": false,
              "d": "unknown[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "warn(message: string, args: unknown[]): void",
          "desc": "",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown[]",
              "r": false,
              "d": "unknown[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "error(message: string, args: unknown[]): void",
          "desc": "",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown[]",
              "r": false,
              "d": "unknown[]"
            }
          ],
          "ret": "void"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "LogLevel",
      "desc": "Severity levels supported by the SDK logger.",
      "methods": [
        {
          "sig": "type LogLevel = LogLevel",
          "desc": "Severity levels supported by the SDK logger.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "PluginManifest",
      "desc": "PluginManifest",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "version",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "author",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PluginContext",
      "desc": "PluginContext",
      "methods": [
        {
          "sig": "registerTool(tool: ToolDefinition<unknown, unknown>): Disposable",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "registerContextSource(source: ContextSourceValue<unknown>): Disposable",
          "desc": "",
          "params": [
            {
              "n": "source",
              "t": "ContextSourceValue<unknown>",
              "r": true,
              "d": "ContextSourceValue<unknown>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "registerAgent(config: AgentConfig): Promise<Disposable>",
          "desc": "",
          "params": [
            {
              "n": "config",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            }
          ],
          "ret": "Promise<Disposable>"
        },
        {
          "sig": "getAgentRegistry(): AgentRegistry",
          "desc": "",
          "params": [],
          "ret": "AgentRegistry"
        },
        {
          "sig": "getToolProviderRegistry(): ToolProviderRegistry",
          "desc": "",
          "params": [],
          "ret": "ToolProviderRegistry"
        },
        {
          "sig": "getEventBus(): EventBus",
          "desc": "",
          "params": [],
          "ret": "EventBus"
        },
        {
          "sig": "effect(cleanup: () => Promise<void>): Disposable",
          "desc": "Register an effect — a side-effect with automatic cleanup.\nThe returned Disposable unregisters the effect when disposed.",
          "params": [
            {
              "n": "cleanup",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "on(event: string | EventDefinition<unknown>, handler: (data: unknown) => void | Promise<void>): Disposable",
          "desc": "Subscribe to an event on the event bus.\nReturns a Disposable that unsubscribes when disposed.",
          "params": [
            {
              "n": "event",
              "t": "string | EventDefinition<unknown>",
              "r": true,
              "d": "string | EventDefinition<unknown>"
            },
            {
              "n": "handler",
              "t": "(data: unknown) => void | Promise<void>",
              "r": true,
              "d": "(data: unknown) => void | Promise<void>"
            }
          ],
          "ret": "Disposable"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "PluginHooks",
      "desc": "PluginHooks",
      "methods": [
        {
          "sig": "onRunStarted(data: { runId: string; prompt: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ runId: string; prompt: string; }",
              "r": true,
              "d": "{ runId: string; prompt: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepStarted(data: { step: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; }",
              "r": true,
              "d": "{ step: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onTokenStreamed(data: { content: string; step: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ content: string; step: number; }",
              "r": true,
              "d": "{ content: string; step: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onToolCompleted(data: { toolId: string; toolName: string; output: unknown; }): Promise<HookResult<{ output: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; output: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; output: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ output: unknown; }>>"
        },
        {
          "sig": "onToolFailed(data: { toolId: string; toolName: string; error: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; error: string; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; error: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onContextCompressed(data: { originalCount: number; compressedCount: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ originalCount: number; compressedCount: number; }",
              "r": true,
              "d": "{ originalCount: number; compressedCount: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepCompleted(data: { step: number; toolCallCount: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; toolCallCount: number; }",
              "r": true,
              "d": "{ step: number; toolCallCount: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepFailed(data: { step: number; reason: string; error?: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; reason: string; error?: string; }",
              "r": true,
              "d": "{ step: number; reason: string; error?: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onRunCompleted(data: { status: string; output?: string; error?: string; stopCondition?: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ status: string; output?: string; error?: string; stopCondition?: string; }",
              "r": true,
              "d": "{ status: string; output?: string; error?: string; stopCondition?: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onToolInvoked(data: { toolId: string; toolName: string; input: unknown; }): Promise<HookResult<{ input: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; input: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ input: unknown; }>>"
        },
        {
          "sig": "onPermissionAsk(data: { permission: string; resource: string; reason: string; }): Promise<HookResult<{ reply: \"once\" | \"always\" | \"reject\"; } | null>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ permission: string; resource: string; reason: string; }",
              "r": true,
              "d": "{ permission: string; resource: string; reason: string; }"
            }
          ],
          "ret": "Promise<HookResult<{ reply: \"once\" | \"always\" | \"reject\"; } | null>>"
        },
        {
          "sig": "onChatParams(data: { request: Record<string, unknown>; }): Promise<HookResult<{ request: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ request: Record<string, unknown>; }",
              "r": true,
              "d": "{ request: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ request: Record<string, unknown>; }>>"
        },
        {
          "sig": "onShellEnv(data: { env: Record<string, string>; }): Promise<HookResult<{ env: Record<string, string>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ env: Record<string, string>; }",
              "r": true,
              "d": "{ env: Record<string, string>; }"
            }
          ],
          "ret": "Promise<HookResult<{ env: Record<string, string>; }>>"
        },
        {
          "sig": "onBeforeModelCall(data: { request: Record<string, unknown>; }): Promise<HookResult<{ request: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ request: Record<string, unknown>; }",
              "r": true,
              "d": "{ request: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ request: Record<string, unknown>; }>>"
        },
        {
          "sig": "onAfterModelCall(data: { response: Record<string, unknown>; }): Promise<HookResult<{ response: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ response: Record<string, unknown>; }",
              "r": true,
              "d": "{ response: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ response: Record<string, unknown>; }>>"
        },
        {
          "sig": "onBeforeToolExecution(data: { toolId: string; toolName: string; input: unknown; }): Promise<HookResult<{ input: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; input: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ input: unknown; }>>"
        },
        {
          "sig": "onAfterToolExecution(data: { toolId: string; toolName: string; output: unknown; }): Promise<HookResult<{ output: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; output: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; output: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ output: unknown; }>>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "Plugin",
      "desc": "Plugin",
      "methods": [
        {
          "sig": "activate(ctx: PluginContext): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "ctx",
              "t": "PluginContext",
              "r": true,
              "d": "PluginContext"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deactivate(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "manifest",
          "type": "PluginManifest",
          "required": true,
          "desc": ""
        },
        {
          "name": "hooks",
          "type": "PluginHooks | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Disposable",
      "desc": "Disposable — cleanup handle returned by effects and event subscriptions.\nCall `dispose()` to unregister/cleanup. Multiple calls are safe (idempotent).",
      "methods": [
        {
          "sig": "dispose(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "createDisposable",
      "desc": "Create a disposable from a cleanup function.",
      "methods": [
        {
          "sig": "createDisposable(cleanup: () => Promise<void>): Disposable",
          "desc": "Create a disposable from a cleanup function.",
          "params": [
            {
              "n": "cleanup",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "Disposable"
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextSourceValue",
      "desc": "ContextSourceValue",
      "methods": [
        {
          "sig": "load(): Promise<T>",
          "desc": "",
          "params": [],
          "ret": "Promise<T>"
        },
        {
          "sig": "renderBaseline(value: T): string",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "renderUpdate(value: T, previous: T): string | null",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "previous",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "string | null"
        },
        {
          "sig": "renderRemoval(): string",
          "desc": "",
          "params": [],
          "ret": "string"
        }
      ],
      "props": [
        {
          "name": "key",
          "type": "ContextSourceKey",
          "required": true,
          "desc": ""
        },
        {
          "name": "priority",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextSourceKey",
      "desc": "ContextSourceKey",
      "methods": [
        {
          "sig": "type ContextSourceKey = ContextSourceKey",
          "desc": "ContextSourceKey",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunId",
      "desc": "A branded string identifying a run.",
      "methods": [
        {
          "sig": "type RunId = RunId",
          "desc": "A branded string identifying a run.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionId",
      "desc": "A branded string identifying a session.",
      "methods": [
        {
          "sig": "type SessionId = SessionId",
          "desc": "A branded string identifying a session.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentId",
      "desc": "A branded string identifying an agent.",
      "methods": [
        {
          "sig": "type AgentId = AgentId",
          "desc": "A branded string identifying an agent.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "TraceId",
      "desc": "A branded string identifying a trace.",
      "methods": [
        {
          "sig": "type TraceId = TraceId",
          "desc": "A branded string identifying a trace.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RequestId",
      "desc": "A branded string identifying a request.",
      "methods": [
        {
          "sig": "type RequestId = RequestId",
          "desc": "A branded string identifying a request.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunStatus",
      "desc": "RunStatus",
      "methods": [
        {
          "sig": "type RunStatus = RunStatus",
          "desc": "RunStatus",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RequestContext",
      "desc": "RequestContext",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "traceId",
          "type": "TraceId",
          "required": true,
          "desc": ""
        },
        {
          "name": "actorId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tenantId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentRunId",
          "type": "RunId | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentConfig",
      "desc": "Inferred type of {@link AgentConfigSchema}.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "AgentId",
          "required": true,
          "desc": ""
        },
        {
          "name": "profile",
          "type": "AgentProfile",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "AgentCapabilities",
          "required": true,
          "desc": ""
        },
        {
          "name": "permissions",
          "type": "AgentPermissions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "behaviourMode",
          "type": "AgentBehaviourMode | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "domains",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Domain ids this agent may use (e.g. \"coding\"). Undefined = no domain filtering (all tools)."
        },
        {
          "name": "systemPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentProfile",
      "desc": "Inferred type of {@link AgentProfileSchema}.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "version",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "author",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "hidden",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Session",
      "desc": "Session",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "title",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "updatedAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentSessionId",
          "type": "SessionId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "AgentId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cost",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "location",
          "type": "{ directory: string; workspaceId?: WorkspaceId; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "isActive",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Message",
      "desc": "Message",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "MessageId",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "role",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCallId",
          "type": "ToolCallId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tokens",
          "type": "MessageTokens | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cost",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "admittedSeq",
          "type": "number | undefined",
          "required": false,
          "desc": "Admission order for pending user inputs (RV-21). Persisted once and never changed."
        },
        {
          "name": "promotedSeq",
          "type": "number | undefined",
          "required": false,
          "desc": "Set to the admitted seq once the input has been drained into a run (RV-21)."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "VntError",
      "desc": "Base error for all VNT Agent errors.\nCarries correlation IDs so every throw is traceable.",
      "methods": [
        {
          "sig": "constructor(message: string, ctx: VntErrorCtx | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "VntErrorCtx | undefined",
              "r": false,
              "d": "VntErrorCtx | undefined"
            }
          ]
        },
        {
          "sig": "requestId: RequestId | undefined",
          "desc": "requestId",
          "params": []
        },
        {
          "sig": "traceId: TraceId | undefined",
          "desc": "traceId",
          "params": []
        },
        {
          "sig": "code: string | undefined",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: boolean",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentNotFoundError",
      "desc": "Thrown when an agent id cannot be found in the registry.",
      "methods": [
        {
          "sig": "constructor(agentId: AgentId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ]
        },
        {
          "sig": "agentId: AgentId",
          "desc": "agentId",
          "params": []
        },
        {
          "sig": "code: \"AGENT_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentValidationError",
      "desc": "Thrown when an agent config fails validation.",
      "methods": [
        {
          "sig": "constructor(message: string, details: readonly string[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "details",
              "t": "readonly string[] | undefined",
              "r": false,
              "d": "readonly string[] | undefined"
            }
          ]
        },
        {
          "sig": "code: \"AGENT_VALIDATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        },
        {
          "sig": "details: readonly string[]",
          "desc": "details",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentPermissionDenied",
      "desc": "Thrown when an agent is denied access to a resource.",
      "methods": [
        {
          "sig": "constructor(agentId: AgentId, resource: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            },
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "agentId: AgentId",
          "desc": "agentId",
          "params": []
        },
        {
          "sig": "resource: string",
          "desc": "resource",
          "params": []
        },
        {
          "sig": "code: \"AGENT_PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolNotFoundError",
      "desc": "Thrown when a tool name cannot be found in the registry.",
      "methods": [
        {
          "sig": "constructor(toolName: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "toolName: string",
          "desc": "toolName",
          "params": []
        },
        {
          "sig": "code: \"TOOL_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolExecutionError",
      "desc": "Thrown when a tool execution fails.",
      "methods": [
        {
          "sig": "constructor(toolName: string, cause: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "toolName: string",
          "desc": "toolName",
          "params": []
        },
        {
          "sig": "code: \"TOOL_EXECUTION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolPermissionDenied",
      "desc": "Thrown when a tool call is denied by permission rules.",
      "methods": [
        {
          "sig": "constructor(toolName: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "toolName: string",
          "desc": "toolName",
          "params": []
        },
        {
          "sig": "code: \"TOOL_PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunNotFoundError",
      "desc": "Thrown when a run id cannot be found in the store.",
      "methods": [
        {
          "sig": "constructor(runId: RunId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ]
        },
        {
          "sig": "runId: RunId",
          "desc": "runId",
          "params": []
        },
        {
          "sig": "code: \"RUN_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunAbortedError",
      "desc": "Thrown when a run is aborted.",
      "methods": [
        {
          "sig": "constructor(runId: RunId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ]
        },
        {
          "sig": "runId: RunId",
          "desc": "runId",
          "params": []
        },
        {
          "sig": "code: \"RUN_ABORTED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunTimeoutError",
      "desc": "Thrown when a run exceeds its timeout.",
      "methods": [
        {
          "sig": "constructor(runId: RunId, timeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "runId: RunId",
          "desc": "runId",
          "params": []
        },
        {
          "sig": "timeoutMs: number",
          "desc": "timeoutMs",
          "params": []
        },
        {
          "sig": "code: \"RUN_TIMEOUT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "CircuitBreakerOpenError",
      "desc": "Thrown when a circuit breaker is open (calls rejected until it resets).",
      "methods": [
        {
          "sig": "constructor(message: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"KERNEL_CIRCUIT_OPEN\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolInputError",
      "desc": "Thrown when a tool receives invalid input.",
      "methods": [
        {
          "sig": "constructor(toolName: string, message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_INPUT_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "PermissionDeniedError",
      "desc": "Thrown when a resource access is denied.",
      "methods": [
        {
          "sig": "constructor(resource: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ValidationError",
      "desc": "Thrown when a value fails validation.",
      "methods": [
        {
          "sig": "constructor(message: string, details: readonly string[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "details",
              "t": "readonly string[] | undefined",
              "r": false,
              "d": "readonly string[] | undefined"
            }
          ]
        },
        {
          "sig": "code: \"VALIDATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "TimeoutError",
      "desc": "Thrown when an operation times out.",
      "methods": [
        {
          "sig": "constructor(operation: string, timeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "operation",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "code: \"TIMEOUT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "NetworkError",
      "desc": "Thrown on a network-level failure.",
      "methods": [
        {
          "sig": "constructor(message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: \"NETWORK_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RateLimitError",
      "desc": "Thrown when a rate limit is exceeded; may carry a retry-after delay.",
      "methods": [
        {
          "sig": "constructor(message: string | undefined, retryAfterMs: number | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "retryAfterMs",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ]
        },
        {
          "sig": "code: \"RATE_LIMIT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        },
        {
          "sig": "retryAfterMs: number | undefined",
          "desc": "retryAfterMs",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AuthenticationError",
      "desc": "Thrown when authentication fails.",
      "methods": [
        {
          "sig": "constructor(message: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"AUTHENTICATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ConfigurationError",
      "desc": "Thrown on invalid configuration.",
      "methods": [
        {
          "sig": "constructor(message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"CONFIGURATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "PluginError",
      "desc": "Thrown when a plugin operation fails.",
      "methods": [
        {
          "sig": "constructor(pluginId: string, message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "pluginId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: \"PLUGIN_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "VntErrorCtx",
      "desc": "Options for VntError construction",
      "methods": [
        {
          "sig": "type VntErrorCtx = VntErrorCtx",
          "desc": "Options for VntError construction",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolRegistry",
      "desc": "Registers tools and domains, filters by permission, and materializes model-visible tool sets.",
      "methods": [
        {
          "sig": "register(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "registerDomain(manifest: DomainManifest): void",
          "desc": "Register a named domain and its tool membership (metadata only — does not register the tools).",
          "params": [
            {
              "n": "manifest",
              "t": "DomainManifest",
              "r": true,
              "d": "DomainManifest"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getDomains(): readonly DomainManifest[]",
          "desc": "",
          "params": [],
          "ret": "readonly DomainManifest[]"
        },
        {
          "sig": "domainFor(id: string): string | undefined",
          "desc": "Resolve the domain id a tool belongs to, or undefined if it is a core tool.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string | undefined"
        },
        {
          "sig": "listDomains(): readonly DomainManifest[]",
          "desc": "Get all registered domain manifests.",
          "params": [],
          "ret": "readonly DomainManifest[]"
        },
        {
          "sig": "domainSummaries(): DomainSummary[]",
          "desc": "Get domain summaries for UI/API consumption.",
          "params": [],
          "ret": "DomainSummary[]"
        },
        {
          "sig": "toolsForDomain(domainId: string): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "Get tools belonging to a specific domain.",
          "params": [
            {
              "n": "domainId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "get(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        },
        {
          "sig": "list(filter: ToolFilter | undefined): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [
            {
              "n": "filter",
              "t": "ToolFilter | undefined",
              "r": false,
              "d": "ToolFilter | undefined"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "count(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getOrThrow(id: string): ToolDefinition<unknown, unknown>",
          "desc": "Get a tool by ID, throwing a typed error if not found",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        },
        {
          "sig": "materialize(permissions: readonly ToolPermissionRule[] | undefined): ToolMaterialization",
          "desc": "Materialize the tool set for a given permission ruleset: drop tools the\nmodel must not see (wholly-denied), and return a `settle` that validates\nand executes a single tool call. Defaults to exposing every registered tool.",
          "params": [
            {
              "n": "permissions",
              "t": "readonly ToolPermissionRule[] | undefined",
              "r": false,
              "d": "readonly ToolPermissionRule[] | undefined"
            }
          ],
          "ret": "ToolMaterialization"
        },
        {
          "sig": "tools: Map<string, ToolDefinition<unknown, unknown>>",
          "desc": "tools",
          "params": []
        },
        {
          "sig": "domains: Map<string, DomainManifest>",
          "desc": "domains",
          "params": []
        },
        {
          "sig": "filterByRules: any",
          "desc": "Remove tools whose rule is wholly denied (deny \"*\" / deny this tool).",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "LazyToolRegistry",
      "desc": "A {@link ToolRegistry} that constructs tools lazily on first resolve.",
      "methods": [
        {
          "sig": "registerLazy(entry: LazyToolEntry): void",
          "desc": "",
          "params": [
            {
              "n": "entry",
              "t": "LazyToolEntry",
              "r": true,
              "d": "LazyToolEntry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "resolve(id: string): Promise<ToolDefinition<unknown, unknown> | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown> | undefined>"
        },
        {
          "sig": "register(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "list(): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "listLazy(): LazyToolEntry[]",
          "desc": "",
          "params": [],
          "ret": "LazyToolEntry[]"
        },
        {
          "sig": "count(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getOrThrow(id: string): ToolDefinition<unknown, unknown>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        },
        {
          "sig": "isLoaded(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "resolveAll(): Promise<ToolDefinition<unknown, unknown>[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<ToolDefinition<unknown, unknown>[]>"
        },
        {
          "sig": "entries: any",
          "desc": "entries",
          "params": []
        },
        {
          "sig": "loading: any",
          "desc": "loading",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolProviderRegistry",
      "desc": "ToolProviderRegistry — Manages multiple ToolProviders.\nSingle source of truth for all available tools.",
      "methods": [
        {
          "sig": "registerProvider(provider: ToolProvider): void",
          "desc": "Register a tool provider and all its tools.",
          "params": [
            {
              "n": "provider",
              "t": "ToolProvider",
              "r": true,
              "d": "ToolProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregisterProvider(id: string): void",
          "desc": "Unregister a tool provider and remove all its tools.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getProvider(id: string): ToolProvider | undefined",
          "desc": "Get a tool provider by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolProvider | undefined"
        },
        {
          "sig": "listProviders(): ToolProvider[]",
          "desc": "List all registered providers.",
          "params": [],
          "ret": "ToolProvider[]"
        },
        {
          "sig": "getAllTools(): ToolDefinition<unknown, unknown>[]",
          "desc": "Get all tools from all providers.",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "getTool(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "Get a tool by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        },
        {
          "sig": "hasTool(id: string): boolean",
          "desc": "Check if a tool exists.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "refreshProvider(id: string): Promise<void>",
          "desc": "Refresh a specific provider (e.g., MCP tools changed).",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "count(): number",
          "desc": "Get tool count.",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "providers: any",
          "desc": "providers",
          "params": []
        },
        {
          "sig": "tools: any",
          "desc": "tools",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "defineTool",
      "desc": "Build a schema-first {@link Tool} from its config.",
      "methods": [
        {
          "sig": "defineTool(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput>",
          "desc": "Build a schema-first {@link Tool} from its config.",
          "params": [
            {
              "n": "config",
              "t": "ToolConfig<TInput, TOutput>",
              "r": true,
              "d": "ToolConfig<TInput, TOutput>"
            }
          ],
          "ret": "Tool<TInput, TOutput>"
        }
      ]
    },
    {
      "type": "function",
      "name": "toolToDefinition",
      "desc": "Convenience: build a ToolDefinition directly from a ToolConfig.",
      "methods": [
        {
          "sig": "toolToDefinition(config: ToolConfig<TInput, TOutput>): ToolDefinition<TInput, TOutput>",
          "desc": "Convenience: build a ToolDefinition directly from a ToolConfig.",
          "params": [
            {
              "n": "config",
              "t": "ToolConfig<TInput, TOutput>",
              "r": true,
              "d": "ToolConfig<TInput, TOutput>"
            }
          ],
          "ret": "ToolDefinition<TInput, TOutput>"
        }
      ]
    },
    {
      "type": "function",
      "name": "zodSchemaToNestedJsonSchema",
      "desc": "Map a Zod schema to the codebase's `NestedJsonSchema` shape (best effort).",
      "methods": [
        {
          "sig": "zodSchemaToNestedJsonSchema(schema: ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>): NestedJsonSchema | undefined",
          "desc": "Map a Zod schema to the codebase's `NestedJsonSchema` shape (best effort).",
          "params": [
            {
              "n": "schema",
              "t": "ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>",
              "r": true,
              "d": "ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>"
            }
          ],
          "ret": "NestedJsonSchema | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "createCodingDomain",
      "desc": "Group the coding toolset (file/shell/search/web/image/git/lsp) under domain\n\"coding\". Pass the tool definitions the composition root has already built.",
      "methods": [
        {
          "sig": "createCodingDomain(tools: readonly ToolDefinition<unknown, unknown>[]): DomainManifest",
          "desc": "Group the coding toolset (file/shell/search/web/image/git/lsp) under domain\n\"coding\". Pass the tool definitions the composition root has already built.",
          "params": [
            {
              "n": "tools",
              "t": "readonly ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "readonly ToolDefinition<unknown, unknown>[]"
            }
          ],
          "ret": "DomainManifest"
        }
      ]
    },
    {
      "type": "function",
      "name": "generateDiff",
      "desc": "Generate a line-level diff between old and new content for a file.",
      "methods": [
        {
          "sig": "generateDiff(filePath: string, oldContent: string, newContent: string): UnifiedDiff",
          "desc": "Generate a line-level diff between old and new content for a file.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "oldContent",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "newContent",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "UnifiedDiff"
        }
      ]
    },
    {
      "type": "function",
      "name": "createReadFileTool",
      "desc": "Create the `read_file` tool. Reads a file relative to the workspace root,\nenforcing workspace boundaries and optionally tracking reads for the\nkernel's file-history features.",
      "methods": [
        {
          "sig": "createReadFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined, maxFileSize: number | undefined): ToolDefinition<{ filePath: string; stripTrailingNewline?: boolean; }, string>",
          "desc": "Create the `read_file` tool. Reads a file relative to the workspace root,\nenforcing workspace boundaries and optionally tracking reads for the\nkernel's file-history features.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            },
            {
              "n": "maxFileSize",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; stripTrailingNewline?: boolean; }, string>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createWriteFileTool",
      "desc": "Create the `write_file` tool. Writes content to a file, creating parent\ndirectories as needed and returning a diff of the change.",
      "methods": [
        {
          "sig": "createWriteFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; content: string; }, { written: string; bytes: number; diff: string; additions: num...",
          "desc": "Create the `write_file` tool. Writes content to a file, creating parent\ndirectories as needed and returning a diff of the change.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; content: string; }, { written: string; bytes: number; diff: string; additions: num..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createEditFileTool",
      "desc": "Create the `edit_file` tool. Applies exact/fuzzy search-and-replace edits\n(one hunk or a multi-hunk `edits[]` array) to an existing file.",
      "methods": [
        {
          "sig": "createEditFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; oldString?: string | undefined; newString?: string | undefined; edits?: readonly {...",
          "desc": "Create the `edit_file` tool. Applies exact/fuzzy search-and-replace edits\n(one hunk or a multi-hunk `edits[]` array) to an existing file.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; oldString?: string | undefined; newString?: string | undefined; edits?: readonly {..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createApplyPatchTool",
      "desc": "Create the `apply_patch` tool. Applies a SEARCH/REPLACE block patch where\neach search string must match exactly once in the target file.",
      "methods": [
        {
          "sig": "createApplyPatchTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; patch: string; }, { patched: string; blocks: number; diff: string; additions: numb...",
          "desc": "Create the `apply_patch` tool. Applies a SEARCH/REPLACE block patch where\neach search string must match exactly once in the target file.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; patch: string; }, { patched: string; blocks: number; diff: string; additions: numb..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createListDirectoryTool",
      "desc": "Create the `list_directory` tool. Lists a directory's entries\n(non-recursive), skipping `excludedDirs` (defaults to node_modules/.git).",
      "methods": [
        {
          "sig": "createListDirectoryTool(workspaceRoot: RootGetter, externalDirAccess: boolean | undefined, excludedDirs: string[] | undefined): ToolDefinition<{ dirPath: string; }, { name: string; type: string; path: string; }[]>",
          "desc": "Create the `list_directory` tool. Lists a directory's entries\n(non-recursive), skipping `excludedDirs` (defaults to node_modules/.git).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            },
            {
              "n": "excludedDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<{ dirPath: string; }, { name: string; type: string; path: string; }[]>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createReadImageTool",
      "desc": "Create the `read_image` tool that returns image content for the model to analyze.",
      "methods": [
        {
          "sig": "createReadImageTool(workspaceRoot: RootGetter, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; }, { filePath: string; mimeType?: string | undefined; size: number; message: strin...",
          "desc": "Create the `read_image` tool that returns image content for the model to analyze.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; }, { filePath: string; mimeType?: string | undefined; size: number; message: strin..."
        }
      ]
    },
    {
      "type": "function",
      "name": "readImageToContentParts",
      "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
      "methods": [
        {
          "sig": "readImageToContentParts(filePath: string, workspaceRoot: RootGetter | undefined, externalDirAccess: boolean | undefined): Promise<MessageContentPart[]>",
          "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "workspaceRoot",
              "t": "RootGetter | undefined",
              "r": false,
              "d": "RootGetter | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<MessageContentPart[]>"
        }
      ]
    },
    {
      "type": "class",
      "name": "FileReadTracker",
      "desc": "Tracks when files were read and enforces read-before-write: writes to a\nfile that was never read (or changed externally since) are denied.\n\nRecords are keyed by canonical real path and snapshotted with inode + size\n+ mtime so external replacement (delete/recreate, rename over) is caught\neven when the modification time happens to be unchanged.",
      "methods": [
        {
          "sig": "trackRead(filePath: string, st: Stats): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "st",
              "t": "Stats",
              "r": true,
              "d": "Stats"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "assertWasRead(filePath: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "clear(filePath: string): void",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "reset(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "records: any",
          "desc": "records",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryFileHistory",
      "desc": "In-memory {@link FileHistory} keeping an ordered version log plus undo/redo stacks.",
      "methods": [
        {
          "sig": "recordVersion(version: Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "version",
              "t": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }",
              "r": true,
              "d": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listVersions(filePath: string): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "getLatestVersion(filePath: string): Promise<FileVersion | null>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<FileVersion | null>"
        },
        {
          "sig": "rollbackTo(filePath: string, versionIndex: number): Promise<string>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "versionIndex",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "getAllChanges(): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "undo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "redo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "versions: any",
          "desc": "versions",
          "params": []
        },
        {
          "sig": "undoStack: any",
          "desc": "undoStack",
          "params": []
        },
        {
          "sig": "redoStack: any",
          "desc": "redoStack",
          "params": []
        },
        {
          "sig": "versionCounter: any",
          "desc": "versionCounter",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createFileHistoryHook",
      "desc": "Create a {@link ToolHook} that records write_file/edit_file changes into a {@link FileHistory}.",
      "methods": [
        {
          "sig": "createFileHistoryHook(fileHistory: FileHistory): ToolHook",
          "desc": "Create a {@link ToolHook} that records write_file/edit_file changes into a {@link FileHistory}.",
          "params": [
            {
              "n": "fileHistory",
              "t": "FileHistory",
              "r": true,
              "d": "FileHistory"
            }
          ],
          "ret": "ToolHook"
        }
      ]
    },
    {
      "type": "function",
      "name": "createShellTool",
      "desc": "Create the `shell` tool that executes a command in the workspace root with\ntimeout, tree-scoped kill-on-abort, and optional permission prompting.",
      "methods": [
        {
          "sig": "createShellTool(config: ShellToolConfig): ToolDefinition<{ command: string; timeoutMs?: number | undefined; }, ExecResult>",
          "desc": "Create the `shell` tool that executes a command in the workspace root with\ntimeout, tree-scoped kill-on-abort, and optional permission prompting.",
          "params": [
            {
              "n": "config",
              "t": "ShellToolConfig",
              "r": true,
              "d": "ShellToolConfig"
            }
          ],
          "ret": "ToolDefinition<{ command: string; timeoutMs?: number | undefined; }, ExecResult>"
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolSandbox",
      "desc": "Executes tool definitions with a default timeout applied on top of the\ncaller's abort signal, aborting the tool when either fires.",
      "methods": [
        {
          "sig": "constructor(config: SandboxConfig | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig | undefined",
              "r": false,
              "d": "SandboxConfig | undefined"
            }
          ]
        },
        {
          "sig": "execute(tool: ToolDefinition<unknown, unknown>, input: unknown, ctx: ToolContext): Promise<unknown>",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<unknown>"
        },
        {
          "sig": "config: any",
          "desc": "config",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "signalToToolContext",
      "desc": "Create a minimal ToolContext from an AbortSignal (for backward compat)",
      "methods": [
        {
          "sig": "signalToToolContext(signal: AbortSignal | undefined): ToolContext",
          "desc": "Create a minimal ToolContext from an AbortSignal (for backward compat)",
          "params": [
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "ToolContext"
        }
      ]
    },
    {
      "type": "function",
      "name": "createSandbox",
      "desc": "Create a process sandbox using the scopes wired into `@vinhnt-sdk/tools`\n(`host` and `process`). Unavailable scopes throw `SandboxUnavailableError`.",
      "methods": [
        {
          "sig": "createSandbox(config: SandboxConfig): ProcessSandbox",
          "desc": "Create a process sandbox using the scopes wired into `@vinhnt-sdk/tools`\n(`host` and `process`). Unavailable scopes throw `SandboxUnavailableError`.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig",
              "r": true,
              "d": "SandboxConfig"
            }
          ],
          "ret": "ProcessSandbox"
        }
      ]
    },
    {
      "type": "function",
      "name": "createWebFetchTool",
      "desc": "Create the `web_fetch` tool that fetches a URL and returns its content as\ntext (HTML is stripped unless `format: \"html\"`), truncated to the max size.",
      "methods": [
        {
          "sig": "createWebFetchTool(config: WebFetchToolConfig | undefined): ToolDefinition<{ url: string; format?: \"markdown\" | \"text\" | \"html\" | undefined; timeout?: number | undefined; }, str...",
          "desc": "Create the `web_fetch` tool that fetches a URL and returns its content as\ntext (HTML is stripped unless `format: \"html\"`), truncated to the max size.",
          "params": [
            {
              "n": "config",
              "t": "WebFetchToolConfig | undefined",
              "r": false,
              "d": "WebFetchToolConfig | undefined"
            }
          ],
          "ret": "ToolDefinition<{ url: string; format?: \"markdown\" | \"text\" | \"html\" | undefined; timeout?: number | undefined; }, str..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createWebSearchTool",
      "desc": "Create the `web_search` tool backed by a {@link WebSearchProvider}.",
      "methods": [
        {
          "sig": "createWebSearchTool(config: WebSearchToolConfig): ToolDefinition<{ query: string; numResults?: number | undefined; searchDepth?: \"basic\" | \"advanced\" | undefined; }, {...",
          "desc": "Create the `web_search` tool backed by a {@link WebSearchProvider}.",
          "params": [
            {
              "n": "config",
              "t": "WebSearchToolConfig",
              "r": true,
              "d": "WebSearchToolConfig"
            }
          ],
          "ret": "ToolDefinition<{ query: string; numResults?: number | undefined; searchDepth?: \"basic\" | \"advanced\" | undefined; }, {..."
        }
      ]
    },
    {
      "type": "class",
      "name": "TavilySearchProvider",
      "desc": "Tavily search provider adapter — convenience only.\nUser có thể tự implement provider khác: Serper, Bing, Google...",
      "methods": [
        {
          "sig": "constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string; })",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }",
              "r": true,
              "d": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }"
            }
          ]
        },
        {
          "sig": "search(query: string, options: { numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined",
              "r": false,
              "d": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "apiKey: any",
          "desc": "apiKey",
          "params": []
        },
        {
          "sig": "defaultNumResults: any",
          "desc": "defaultNumResults",
          "params": []
        },
        {
          "sig": "baseUrl: any",
          "desc": "baseUrl",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "SerperSearchProvider",
      "desc": "Serper (Google Search) provider adapter — convenience only.",
      "methods": [
        {
          "sig": "constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string; })",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }",
              "r": true,
              "d": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }"
            }
          ]
        },
        {
          "sig": "search(query: string, options: { numResults?: number; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; } | undefined",
              "r": false,
              "d": "{ numResults?: number; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "apiKey: any",
          "desc": "apiKey",
          "params": []
        },
        {
          "sig": "defaultNumResults: any",
          "desc": "defaultNumResults",
          "params": []
        },
        {
          "sig": "baseUrl: any",
          "desc": "baseUrl",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitStatusTool",
      "desc": "Create the `git_status` tool (branch + `git status --short`).",
      "methods": [
        {
          "sig": "createGitStatusTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_status` tool (branch + `git status --short`).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitDiffTool",
      "desc": "Create the `git_diff` tool (unstaged or `--staged` diff).",
      "methods": [
        {
          "sig": "createGitDiffTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_diff` tool (unstaged or `--staged` diff).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitLogTool",
      "desc": "Create the `git_log` tool (recent commit history, optionally scoped to a path).",
      "methods": [
        {
          "sig": "createGitLogTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_log` tool (recent commit history, optionally scoped to a path).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitCommitTool",
      "desc": "Create the `git_commit` tool that commits staged changes with a message.",
      "methods": [
        {
          "sig": "createGitCommitTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_commit` tool that commits staged changes with a message.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGlobFilesTool",
      "desc": "Create the `glob` tool that finds files matching a glob pattern under the workspace root.",
      "methods": [
        {
          "sig": "createGlobFilesTool(workspaceRoot: RootGetter, ignoredDirs: string[] | undefined): ToolDefinition<unknown, unknown>",
          "desc": "Create the `glob` tool that finds files matching a glob pattern under the workspace root.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "ignoredDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGrepFilesTool",
      "desc": "Create the `grep` tool that searches file contents for a regex pattern.",
      "methods": [
        {
          "sig": "createGrepFilesTool(workspaceRoot: RootGetter, ignoredDirs: string[] | undefined): ToolDefinition<unknown, unknown>",
          "desc": "Create the `grep` tool that searches file contents for a regex pattern.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "ignoredDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createToolSearchTool",
      "desc": "Create the `search_tools` tool that searches registered tools by query or tags.",
      "methods": [
        {
          "sig": "createToolSearchTool(registry: ToolRegistry): ToolDefinition<ToolSearchInput, { results: ToolSearchResult[]; }>",
          "desc": "Create the `search_tools` tool that searches registered tools by query or tags.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "ToolDefinition<ToolSearchInput, { results: ToolSearchResult[]; }>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createQuestionTool",
      "desc": "Create the `question` tool that asks the user a question (with optional\npredefined options). Pass a {@link QuestionHandler} to resolve answers.",
      "methods": [
        {
          "sig": "createQuestionTool(handler: QuestionHandler | undefined): ToolDefinition<QuestionInput, { answer: string; error?: string; }>",
          "desc": "Create the `question` tool that asks the user a question (with optional\npredefined options). Pass a {@link QuestionHandler} to resolve answers.",
          "params": [
            {
              "n": "handler",
              "t": "QuestionHandler | undefined",
              "r": false,
              "d": "QuestionHandler | undefined"
            }
          ],
          "ret": "ToolDefinition<QuestionInput, { answer: string; error?: string; }>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createTodoWriteTool",
      "desc": "Create the `todowrite` tool managing a structured task list with priorities and status.",
      "methods": [
        {
          "sig": "createTodoWriteTool(): ToolDefinition<unknown, unknown>",
          "desc": "Create the `todowrite` tool managing a structured task list with priorities and status.",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentToolProvider",
      "desc": "AgentToolProvider — Provides agent-related tools.\n\nTools are lazily created after the kernel is initialized\nto avoid circular dependencies.",
      "methods": [
        {
          "sig": "setKernel(kernel: KernelLike): void",
          "desc": "Set the kernel instance (call after kernel is created).",
          "params": [
            {
              "n": "kernel",
              "t": "KernelLike",
              "r": true,
              "d": "KernelLike"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"agents\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"Agent Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Agent management tools: spawn, delegate, list, create\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "kernel: any",
          "desc": "kernel",
          "params": []
        },
        {
          "sig": "_tools: any",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "createTools: any",
          "desc": "createTools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "SkillToolProvider",
      "desc": "SkillToolProvider — Provides skill-related tools.\n\nThis is a metadata provider that declares skill tools exist.\nActual tool creation happens in the composition root to avoid circular dependencies.",
      "methods": [
        {
          "sig": "addTools(tools: ToolDefinition<unknown, unknown>[]): void",
          "desc": "Add tools externally (called by composition root).",
          "params": [
            {
              "n": "tools",
              "t": "ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"skills\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"Skill Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Skill management tools: load, search, create\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "_tools: any",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolFileProvider",
      "desc": "ToolFileProvider — Loads tools from .vnt/tools/ directories.\n\nSupports both workspace-local and global tools.\nTools can override built-in tools by using the same name.",
      "methods": [
        {
          "sig": "constructor(id: string, name: string, tools: ToolDefinition<unknown, unknown>[])",
          "desc": "Create instance.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "tools",
              "t": "ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>[]"
            }
          ]
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: string",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"User-defined tools from .vnt/tools/\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "_tools: any",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolFileLoader",
      "desc": "ToolFileLoader — Discovers and loads tools from .vnt/tools/ directories.\n\nFiles are verified before import (RV-48): symlinks are rejected, the file\nmust resolve back inside its source directory, and an optional SHA-256 hash\npin can be enforced so a swapped file is never executed.",
      "methods": [
        {
          "sig": "loadFromDirectory(dir: string, hashes: Record<string, string> | undefined): Promise<ToolDefinition<unknown, unknown>[]>",
          "desc": "Load tools from a single directory.",
          "params": [
            {
              "n": "dir",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "hashes",
              "t": "Record<string, string> | undefined",
              "r": false,
              "d": "Record<string, string> | undefined"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown>[]>"
        },
        {
          "sig": "discover(workspaceRoot: string, hashes: Record<string, string> | undefined): Promise<ToolFileProvider>",
          "desc": "Discover tools from workspace and global directories.\n\nDiscovery order:\n1. Workspace-local: .vnt/tools/*.ts\n2. Global: ~/.vnt/tools/*.ts\n\nWorkspace tools override global tools with the same name.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "hashes",
              "t": "Record<string, string> | undefined",
              "r": false,
              "d": "Record<string, string> | undefined"
            }
          ],
          "ret": "Promise<ToolFileProvider>"
        },
        {
          "sig": "isVerifiedFile: any",
          "desc": "Verify a candidate tool file before importing it:\n1. Rejects symlinks outright (closes the TOCTOU window between listing and\n   import — Dirent already filters most symlinks, this is belt-and-braces).\n2. The canonical real path must resolve back INSIDE the source directory —\n   a file that escapes its directory is never executed.\n3. Optional SHA-256 hash pin: when a hash is supplied for this file, a\n   mismatch means the content changed on disk — skip, do not import.",
          "params": []
        },
        {
          "sig": "loadToolFromFile: any",
          "desc": "Load a single tool from a file.",
          "params": []
        },
        {
          "sig": "isToolDefinition: any",
          "desc": "Check if a value is a ToolDefinition.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "Tool",
      "desc": "A schema-first tool: owns its validation schema and derives its definition.",
      "methods": [
        {
          "sig": "toDefinition(): ToolDefinition<TInput, TOutput>",
          "desc": "Derive the provider-facing ToolDefinition (registers as `name`).",
          "params": [],
          "ret": "ToolDefinition<TInput, TOutput>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "input",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolConfig",
      "desc": "── Schema-first tool authoring (OpenCode-style `Tool.make`) ──────────────\nThe tool OWNS its validation schema (`input`) instead of importing a\nstandalone static schema. `toDefinition()` derives the provider-facing\n`ToolDefinition` (JSON Schema) from that schema, so there is exactly one\nsource of truth per tool. Domain namespacing is applied via `name`.",
      "methods": [
        {
          "sig": "normalize(raw: unknown): unknown",
          "desc": "Coerce raw model-agnostic input before validation (e.g. snake_case aliases).",
          "params": [
            {
              "n": "raw",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "unknown"
        },
        {
          "sig": "execute(input: TInput, ctx: ToolContext): Promise<TOutput>",
          "desc": "",
          "params": [
            {
              "n": "input",
              "t": "TInput",
              "r": true,
              "d": "TInput"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<TOutput>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Tool name / id. Use dot-prefixed names for domains: \"coding.read_file\"."
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "input",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>>",
          "required": true,
          "desc": "Runtime validation schema — owned by this tool, not a shared file."
        },
        {
          "name": "output",
          "type": "ZodType<TOutput, unknown, $ZodTypeInternals<TOutput, unknown>> | undefined",
          "required": false,
          "desc": "Optional output validation schema."
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-tool timeout in ms (overrides global default)."
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": "Permission action key for the gate (e.g. \"edit\", \"shell\"). Optional; defaults to risk."
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (kernel gate defers)."
        },
        {
          "name": "jsonSchema",
          "type": "NestedJsonSchema | undefined",
          "required": false,
          "desc": "Optional LLM-facing JSON Schema override (e.g. to advertise `path` aliases)."
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolRisk",
      "desc": "Tool risk level — open string for extensibility.",
      "methods": [
        {
          "sig": "type ToolRisk = string",
          "desc": "Tool risk level — open string for extensibility.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinition",
      "desc": "Provider-facing tool definition: schema, risk and execute.",
      "methods": [
        {
          "sig": "execute(input: TInput, ctx: ToolContext): Promise<TOutput>",
          "desc": "",
          "params": [
            {
              "n": "input",
              "t": "TInput",
              "r": true,
              "d": "TInput"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<TOutput>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-tool timeout in ms (overrides global default)."
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": "Permission action key for the gate (e.g. \"edit\", \"shell\"). Optional; defaults to risk."
        },
        {
          "name": "inputZodSchema",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime input validation (carried from defineTool)."
        },
        {
          "name": "outputZodSchema",
          "type": "ZodType<TOutput, unknown, $ZodTypeInternals<TOutput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime output validation (carried from defineTool)."
        },
        {
          "name": "deferred",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool is not loaded into context until explicitly requested via search."
        },
        {
          "name": "tags",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Tags for tool search (e.g. [\"file\", \"read\", \"search\"])."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinitionLike",
      "desc": "Minimal tool definition for schema-level typing (avoids circular dep with core/tool).",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path)."
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional)."
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolContext",
      "desc": "Context passed to every tool execution — replaces bare AbortSignal",
      "methods": [
        {
          "sig": "ask(input: { permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }): Promise<PermissionReply>",
          "desc": "Request human approval for a permission-bound operation.\nReturns the user's decision: \"once\" (allow once), \"always\" (approve forever), or \"reject\".\nWhen reply is \"always\", savePatterns are persisted as allow rules for future requests.",
          "params": [
            {
              "n": "input",
              "t": "{ permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }",
              "r": true,
              "d": "{ permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "metadata(input: { title?: string; metadata?: Record<string, unknown>; }): void",
          "desc": "Attach metadata to the current tool call (for observability)",
          "params": [
            {
              "n": "input",
              "t": "{ title?: string; metadata?: Record<string, unknown>; }",
              "r": true,
              "d": "{ title?: string; metadata?: Record<string, unknown>; }"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setCompensation(action: () => Promise<void>): void",
          "desc": "Register a compensation action for saga rollback.\nIf the current run fails or is cancelled, this action will be called\nto undo the tool's side effect (e.g., restore original file content).",
          "params": [
            {
              "n": "action",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "void"
        }
      ],
      "props": [
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "signal",
          "type": "AbortSignal",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentContext",
          "type": "RequestContext | undefined",
          "required": false,
          "desc": "The parent run's request context (traceId/actorId/tenantId/requestId).\nLets handoff tools (delegate/spawn) propagate identity + parent-run\nlinkage to child agents instead of inventing a synthetic context."
        },
        {
          "name": "env",
          "type": "Record<string, string>",
          "required": true,
          "desc": "Environment variables for subprocess execution (shell tool)"
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolHook",
      "desc": "Lifecycle hook that can intercept a tool call before and after execution.",
      "methods": [
        {
          "sig": "pre(params: { toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }): Promise<{ input: unknown; } | { denied: string; } | null>",
          "desc": "",
          "params": [
            {
              "n": "params",
              "t": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }"
            }
          ],
          "ret": "Promise<{ input: unknown; } | { denied: string; } | null>"
        },
        {
          "sig": "post(params: { toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }): Promise<ToolExecutionResult | null>",
          "desc": "",
          "params": [
            {
              "n": "params",
              "t": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }",
              "r": true,
              "d": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }"
            }
          ],
          "ret": "Promise<ToolExecutionResult | null>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionReply",
      "desc": "Reply from human-in-the-loop approval",
      "methods": [
        {
          "sig": "type PermissionReply = PermissionReply",
          "desc": "Reply from human-in-the-loop approval",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolExecutionResult",
      "desc": "Result of a tool execution.",
      "methods": [
        {
          "sig": "type ToolExecutionResult = ToolExecutionResult",
          "desc": "Result of a tool execution.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolPermissionRule",
      "desc": "Minimal permission rule relevant for tool filtering at the tool boundary.",
      "methods": [],
      "props": [
        {
          "name": "action",
          "type": "string",
          "required": true,
          "desc": "Tool id or wildcard pattern (e.g. \"coding.*\", \"*\")."
        },
        {
          "name": "effect",
          "type": "\"allow\" | \"deny\" | \"ask\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolMaterialization",
      "desc": "Tool set materialized for the model after filtering by permission rules.",
      "methods": [
        {
          "sig": "settle(input: { name: string; args: unknown; ctx?: ToolContext; }): Promise<unknown>",
          "desc": "Resolve one tool call: validate args and execute.",
          "params": [
            {
              "n": "input",
              "t": "{ name: string; args: unknown; ctx?: ToolContext; }",
              "r": true,
              "d": "{ name: string; args: unknown; ctx?: ToolContext; }"
            }
          ],
          "ret": "Promise<unknown>"
        },
        {
          "sig": "getTool(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "Lookup a tool definition by ID from the allowed set.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        }
      ],
      "props": [
        {
          "name": "definitions",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Provider-facing definitions the model is ALLOWED to see/invoke."
        },
        {
          "name": "denied",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Tool definitions that were denied by permission rules."
        }
      ]
    },
    {
      "type": "type",
      "name": "DomainManifest",
      "desc": "── Domain manifests (Phase 2) ────────────────────────────────────────────\nA domain is a named, swappable set of tools (e.g. \"coding\"). The agent core\ntreats domains as opaque: it only needs each tool's id (for membership) and\nthe set of domains an agent is allowed to use. This is the seam that lets\nthe same core power coding, research, data, devops — differing only by which\ndomains are mounted and which permission rules apply.\nA named group of tools exposed as a pluggable capability.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Domain id used in agent config `domains: [\"coding\"]`."
        },
        {
          "name": "tools",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Tools belonging to this domain. Only `id`/`name` drives membership."
        },
        {
          "name": "systemPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": "Optional domain-level system prompt (merged into the agent context)."
        },
        {
          "name": "permissionDefaults",
          "type": "readonly ToolPermissionRule[] | undefined",
          "required": false,
          "desc": "Domain-level permission defaults (allow/deny/ask) applied to its tools."
        }
      ]
    },
    {
      "type": "type",
      "name": "LazyToolEntry",
      "desc": "A tool registered for lazy, on-demand construction.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "factory",
          "type": "() => Promise<ToolDefinition<unknown, unknown>>",
          "required": true,
          "desc": ""
        },
        {
          "name": "instance",
          "type": "ToolDefinition<unknown, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalHandler",
      "desc": "Handler contract for requesting human approval of a tool call.",
      "methods": [
        {
          "sig": "requestApproval(tool: ToolDefinition<unknown, unknown>, input: unknown): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "Promise<boolean>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "UnifiedDiff",
      "desc": "Line-level unified diff with add/remove counts.",
      "methods": [],
      "props": [
        {
          "name": "diff",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "additions",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "removals",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolProvider",
      "desc": "ToolProvider — Interface for providing tools to the kernel.\n\nBuilt-in tools (coding) use BuiltinToolProvider.\nUser tools use ToolFileProvider.\nMCP tools use McpToolProvider.\nPlugin tools use PluginToolProvider.",
      "methods": [
        {
          "sig": "register(registry: ToolRegistry): void",
          "desc": "Register all tools into the given registry.\nCalled once when the provider is registered.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(registry: ToolRegistry): void",
          "desc": "Unregister all tools from the given registry.\nCalled when the provider is removed.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "refresh(): Promise<void>",
          "desc": "Optional: refresh tools from external source (e.g., MCP).\nCalled when external tools change.",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Get all tools provided by this provider.\nCalled during registration to populate the registry."
        }
      ]
    },
    {
      "type": "type",
      "name": "ShellToolConfig",
      "desc": "Configuration for the {@link createShellTool} command-execution tool.",
      "methods": [],
      "props": [
        {
          "name": "workspaceRoot",
          "type": "string | (() => string)",
          "required": true,
          "desc": ""
        },
        {
          "name": "defaultTimeoutMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "maxTimeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Hard cap on shell command timeout in ms (default: 300000)"
        },
        {
          "name": "askPermission",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, prompts for permission before executing shell commands (default: true)"
        },
        {
          "name": "sandboxScope",
          "type": "string | undefined",
          "required": false,
          "desc": "Sandbox scope for command execution (default: \"process\")"
        },
        {
          "name": "allowedPaths",
          "type": "string[] | undefined",
          "required": false,
          "desc": "Allowed filesystem paths for the executed command (enforced in the sandbox backend)"
        }
      ]
    },
    {
      "type": "type",
      "name": "FileHistory",
      "desc": "Versioned file history contract with undo/redo and rollback support.",
      "methods": [
        {
          "sig": "recordVersion(version: Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "version",
              "t": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }",
              "r": true,
              "d": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listVersions(filePath: string): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "getLatestVersion(filePath: string): Promise<FileVersion | null>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<FileVersion | null>"
        },
        {
          "sig": "rollbackTo(filePath: string, targetVersion: number): Promise<string>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "targetVersion",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "getAllChanges(): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "undo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "redo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "FileVersion",
      "desc": "A recorded file change (before/after content) attributed to a session and tool.",
      "methods": [],
      "props": [
        {
          "name": "filePath",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "originalContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "newContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "UndoEntry",
      "desc": "A single undo/redo step referencing the file content swap.",
      "methods": [],
      "props": [
        {
          "name": "filePath",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "originalContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "newContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "versionId",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "WebSearchToolConfig",
      "desc": "Configuration for the {@link createWebSearchTool} tool.",
      "methods": [],
      "props": [
        {
          "name": "provider",
          "type": "WebSearchProvider",
          "required": true,
          "desc": "Web search provider — injectable dependency.\nUser tự implement provider hoặc dùng built-in adapters."
        },
        {
          "name": "defaultNumResults",
          "type": "number | undefined",
          "required": false,
          "desc": "Default number of search results (default: 5)"
        },
        {
          "name": "timeout",
          "type": "number | undefined",
          "required": false,
          "desc": "Search timeout in ms (default: 15000)"
        }
      ]
    },
    {
      "type": "type",
      "name": "WebSearchProvider",
      "desc": "Web search provider interface — user tự implement.\nVí dụ: Tavily, Serper, Bing, Google Custom Search, DuckDuckGo...",
      "methods": [
        {
          "sig": "search(query: string, options: { numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined",
              "r": false,
              "d": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolSearchInput",
      "desc": "Input for the `search_tools` tool.",
      "methods": [],
      "props": [
        {
          "name": "query",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "string[] | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolSearchResult",
      "desc": "A found tool in `search_tools` results.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "readonly string[]",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "QuestionInput",
      "desc": "Input for the `question` tool.",
      "methods": [],
      "props": [
        {
          "name": "header",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "question",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "options",
          "type": "{ label: string; description?: string | undefined; }[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "multiple",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "QuestionHandler",
      "desc": "Resolver that returns the user's answer for a {@link QuestionInput}.",
      "methods": [
        {
          "sig": "type QuestionHandler = QuestionHandler",
          "desc": "Resolver that returns the user's answer for a {@link QuestionInput}.",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "BuiltinToolProvider",
      "desc": "BuiltinToolProvider — Provides all built-in coding tools.\n\nThese tools are always available and can be overridden\nby user tools in .vnt/tools/ or ~/.vnt/tools/.",
      "methods": [
        {
          "sig": "constructor(config: BuiltinToolConfig)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "BuiltinToolConfig",
              "r": true,
              "d": "BuiltinToolConfig"
            }
          ]
        },
        {
          "sig": "createTools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "createWebSearchTool(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"builtin\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"Built-in Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Core coding tools: file operations, shell, search, git, web\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "_tools: ToolDefinition<unknown, unknown>[] | null",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "config: BuiltinToolConfig",
          "desc": "config",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "BuiltinToolConfig",
      "desc": "Configuration for {@link BuiltinToolProvider}.",
      "methods": [],
      "props": [
        {
          "name": "workspaceRoot",
          "type": "string | (() => string)",
          "required": true,
          "desc": ""
        },
        {
          "name": "shell",
          "type": "ShellToolConfig",
          "required": true,
          "desc": ""
        },
        {
          "name": "webSearchProvider",
          "type": "WebSearchProvider | undefined",
          "required": false,
          "desc": "Web search provider — injectable dependency"
        },
        {
          "name": "webSearchApiKey",
          "type": "string | (() => string) | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolRuntime",
      "desc": "Runtime that registers tool definitions and executes them through the\npermission gate (deny/approve) and lifecycle hooks, isolated in a sandbox.",
      "methods": [
        {
          "sig": "constructor(config: ToolRuntimeConfig | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "ToolRuntimeConfig | undefined",
              "r": false,
              "d": "ToolRuntimeConfig | undefined"
            }
          ]
        },
        {
          "sig": "setApprovalHandler(handler: ApprovalHandler): void",
          "desc": "Set or replace the approval handler at runtime",
          "params": [
            {
              "n": "handler",
              "t": "ApprovalHandler",
              "r": true,
              "d": "ApprovalHandler"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "register(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getTools(): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "addHook(hook: ToolHook): void",
          "desc": "",
          "params": [
            {
              "n": "hook",
              "t": "ToolHook",
              "r": true,
              "d": "ToolHook"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "removeHook(id: string): void",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "addDynamicRule(rule: DynamicRule): void",
          "desc": "Register a dynamic rule from an \"always allow\" approval",
          "params": [
            {
              "n": "rule",
              "t": "DynamicRule",
              "r": true,
              "d": "DynamicRule"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getPermissionGate(): PermissionGate | undefined",
          "desc": "Expose permission gate for wiring approval handlers",
          "params": [],
          "ret": "PermissionGate | undefined"
        },
        {
          "sig": "execute(toolId: string, input: unknown, ctx: ToolContext | undefined): Promise<ToolExecutionResult>",
          "desc": "",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "ctx",
              "t": "ToolContext | undefined",
              "r": false,
              "d": "ToolContext | undefined"
            }
          ],
          "ret": "Promise<ToolExecutionResult>"
        },
        {
          "sig": "registry: ToolRegistry",
          "desc": "registry",
          "params": []
        },
        {
          "sig": "permissionGate: PermissionGate | undefined",
          "desc": "permissionGate",
          "params": []
        },
        {
          "sig": "approvalHandler: ApprovalHandler | undefined",
          "desc": "approvalHandler",
          "params": []
        },
        {
          "sig": "sandbox: ToolSandbox",
          "desc": "sandbox",
          "params": []
        },
        {
          "sig": "hooks: ToolHook[]",
          "desc": "hooks",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolRuntimeConfig",
      "desc": "Configuration for {@link ToolRuntime}.\n`permissionGate` enforces tool policy — REQUIRED for execution (fail-closed:\nwithout a gate, every execution is denied), `approvalHandler` drives\ninteractive approvals, and `sandbox` executes tools (defaults to an\nin-process {@link ToolSandbox}).",
      "methods": [],
      "props": [
        {
          "name": "permissionGate",
          "type": "PermissionGate | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "approvalHandler",
          "type": "ApprovalHandler | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "sandbox",
          "type": "ToolSandbox | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createKernelTools",
      "desc": "Adapt a {@link ToolRuntime} into kernel-consumable {@link ToolDefinition}s.\nEach runtime tool is wrapped so successful results are returned directly,\n`denied` results throw {@link ToolPermissionDenied}, and errors propagate.",
      "methods": [
        {
          "sig": "createKernelTools(rt: ToolRuntime): ToolDefinition<unknown, unknown>[]",
          "desc": "Adapt a {@link ToolRuntime} into kernel-consumable {@link ToolDefinition}s.\nEach runtime tool is wrapped so successful results are returned directly,\n`denied` results throw {@link ToolPermissionDenied}, and errors propagate.",
          "params": [
            {
              "n": "rt",
              "t": "ToolRuntime",
              "r": true,
              "d": "ToolRuntime"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "createPluginToolHook",
      "desc": "Create a ToolHook that bridges PluginManager lifecycle hooks into the ToolRuntime pipeline",
      "methods": [
        {
          "sig": "createPluginToolHook(pm: PluginManager): ToolHook",
          "desc": "Create a ToolHook that bridges PluginManager lifecycle hooks into the ToolRuntime pipeline",
          "params": [
            {
              "n": "pm",
              "t": "PluginManager",
              "r": true,
              "d": "PluginManager"
            }
          ],
          "ret": "ToolHook"
        }
      ]
    },
    {
      "type": "function",
      "name": "createToolProviderRegistry",
      "desc": "Create a ToolProviderRegistry with all built-in providers.\n\nThis is the main entry point for setting up the tool system.\nIt creates:\n1. BuiltinToolProvider (coding tools)\n2. User tools from .vnt/tools/ (if any)",
      "methods": [
        {
          "sig": "createToolProviderRegistry(config: { workspaceRoot: string; shell: { workspaceRoot: string | (() => string); defaultTimeoutMs: number; maxTimeoutMs?: nu...): Promise<ToolProviderRegistry>",
          "desc": "Create a ToolProviderRegistry with all built-in providers.\n\nThis is the main entry point for setting up the tool system.\nIt creates:\n1. BuiltinToolProvider (coding tools)\n2. User tools from .vnt/tools/ (if any)",
          "params": [
            {
              "n": "config",
              "t": "{ workspaceRoot: string; shell: { workspaceRoot: string | (() => string); defaultTimeoutMs: number; maxTimeoutMs?: nu...",
              "r": true,
              "d": "{ workspaceRoot: string; shell: { workspaceRoot: string | (() => string); defaultTimeoutMs: number; maxTimeoutMs?: nu..."
            }
          ],
          "ret": "Promise<ToolProviderRegistry>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createToolProvider",
      "desc": "Create a custom ToolProvider from a list of tools.",
      "methods": [
        {
          "sig": "createToolProvider(id: string, name: string, tools: ToolDefinition<unknown, unknown>[]): ToolProvider",
          "desc": "Create a custom ToolProvider from a list of tools.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "tools",
              "t": "ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>[]"
            }
          ],
          "ret": "ToolProvider"
        }
      ]
    },
    {
      "type": "function",
      "name": "registerProviderTools",
      "desc": "Register tools from a ToolProviderRegistry into an AgentKernel.",
      "methods": [
        {
          "sig": "registerProviderTools(kernel: AgentKernel, registry: ToolProviderRegistry): void",
          "desc": "Register tools from a ToolProviderRegistry into an AgentKernel.",
          "params": [
            {
              "n": "kernel",
              "t": "AgentKernel",
              "r": true,
              "d": "AgentKernel"
            },
            {
              "n": "registry",
              "t": "ToolProviderRegistry",
              "r": true,
              "d": "ToolProviderRegistry"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "class",
      "name": "BoundedMemory",
      "desc": "In-memory memory store that truncates profile and working sections to configured limits.",
      "methods": [
        {
          "sig": "constructor(store: MemoryStore | undefined, limits: Partial<BoundedMemoryLimits> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "store",
              "t": "MemoryStore | undefined",
              "r": false,
              "d": "MemoryStore | undefined"
            },
            {
              "n": "limits",
              "t": "Partial<BoundedMemoryLimits> | undefined",
              "r": false,
              "d": "Partial<BoundedMemoryLimits> | undefined"
            }
          ]
        },
        {
          "sig": "setProfile(value: string): Promise<MemoryEntry>",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryEntry>"
        },
        {
          "sig": "getProfile(): MemoryEntry",
          "desc": "",
          "params": [],
          "ret": "MemoryEntry"
        },
        {
          "sig": "setWorkingFact(key: string, value: string): Promise<MemoryEntry>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryEntry>"
        },
        {
          "sig": "getWorking(): string",
          "desc": "",
          "params": [],
          "ret": "string"
        },
        {
          "sig": "clearWorking(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "getAllBounded(): MemoryEntry[]",
          "desc": "",
          "params": [],
          "ret": "MemoryEntry[]"
        },
        {
          "sig": "totalChars(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "profile: any",
          "desc": "profile",
          "params": []
        },
        {
          "sig": "working: any",
          "desc": "working",
          "params": []
        },
        {
          "sig": "store: any",
          "desc": "store",
          "params": []
        },
        {
          "sig": "limits: any",
          "desc": "limits",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ContextCompressor",
      "desc": "Rule-based conversation compressor keeping head/tail messages and truncating tool output.",
      "methods": [
        {
          "sig": "constructor(opts: Partial<CompressorOptions> | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "opts",
              "t": "Partial<CompressorOptions> | undefined",
              "r": false,
              "d": "Partial<CompressorOptions> | undefined"
            }
          ]
        },
        {
          "sig": "pruneToolOutputs(messages: readonly ChatMessage[]): readonly ChatMessage[]",
          "desc": "Phase 1: Prune verbose old tool outputs.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "readonly ChatMessage[]"
        },
        {
          "sig": "needsCompression(messages: readonly ChatMessage[]): boolean",
          "desc": "Determine if compression is needed based on token budget.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "compact(messages: readonly ChatMessage[], _signal: AbortSignal | undefined): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>",
          "desc": "Compress middle messages (head/tail protection + naive summarization).\nImplements ConversationCompactor.",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            },
            {
              "n": "_signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>"
        },
        {
          "sig": "compress(messages: readonly ChatMessage[]): { messages: readonly ChatMessage[]; summary: CompressionSummary; }",
          "desc": "Phase 2-4: Synchronous compress.\n- Protects headCount messages at start\n- Protects tailCount messages at end\n- Summarizes middle portion",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "{ messages: readonly ChatMessage[]; summary: CompressionSummary; }"
        },
        {
          "sig": "opts: any",
          "desc": "opts",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "MemoryItem",
      "desc": "MemoryItem",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tier",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "key",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "value",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "string[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "updatedAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "MemoryStore",
      "desc": "MemoryStore",
      "methods": [
        {
          "sig": "get(key: string, sessionId: string): Promise<MemoryItem | undefined>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem | undefined>"
        },
        {
          "sig": "set(item: Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">): Promise<MemoryItem>",
          "desc": "",
          "params": [
            {
              "n": "item",
              "t": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">",
              "r": true,
              "d": "Omit<MemoryItem, \"id\" | \"createdAt\" | \"updatedAt\">"
            }
          ],
          "ret": "Promise<MemoryItem>"
        },
        {
          "sig": "delete(key: string, sessionId: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "search(query: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        },
        {
          "sig": "listByTier(tier: string, sessionId: string): Promise<MemoryItem[]>",
          "desc": "",
          "params": [
            {
              "n": "tier",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<MemoryItem[]>"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "redactSecrets",
      "desc": "Redact secrets from text.\n\nScans the input for known secret patterns and replaces them with\nplaceholder tokens. Safe to use on log messages, error output, and\narbitrary strings.",
      "methods": [
        {
          "sig": "redactSecrets(text: string): string",
          "desc": "Redact secrets from text.\n\nScans the input for known secret patterns and replaces them with\nplaceholder tokens. Safe to use on log messages, error output, and\narbitrary strings.",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "detectSecrets",
      "desc": "Check whether text contains suspected secrets (without modifying it).",
      "methods": [
        {
          "sig": "detectSecrets(text: string): string[]",
          "desc": "Check whether text contains suspected secrets (without modifying it).",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string[]"
        }
      ]
    }
  ]
},
{
  "id": "event",
  "name": "@vinhnt-sdk/event",
  "icon": "E",
  "tag": "Core",
  "desc": "Event bus, definitions, migration, global event system.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "class",
      "name": "EventRegistry",
      "desc": "Global registry mapping event type strings to their {@link EventDefinition}s.",
      "methods": [
        {
          "sig": "register(def: EventDefinition<T>): EventDefinition<T>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            }
          ],
          "ret": "EventDefinition<T>"
        },
        {
          "sig": "get(type: string): EventDefinition<unknown> | undefined",
          "desc": "",
          "params": [
            {
              "n": "type",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "EventDefinition<unknown> | undefined"
        },
        {
          "sig": "getAll(): readonly EventDefinition<unknown>[]",
          "desc": "",
          "params": [],
          "ret": "readonly EventDefinition<unknown>[]"
        },
        {
          "sig": "clear(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "definitions: Map<string, EventDefinition<unknown>>",
          "desc": "definitions",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "defineEvent",
      "desc": "Define (and register) an event type; duplicate types throw.",
      "methods": [
        {
          "sig": "defineEvent(def: EventDefinition<T>): EventDefinition<T>",
          "desc": "Define (and register) an event type; duplicate types throw.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            }
          ],
          "ret": "EventDefinition<T>"
        }
      ]
    },
    {
      "type": "type",
      "name": "EventDefinition",
      "desc": "Static metadata describing an event type: type string, description, durability and data schema.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "durable",
          "type": "{ readonly version: number; readonly aggregate: string; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "schema",
          "type": "ZodType<TData, unknown, $ZodTypeInternals<TData, unknown>> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TypedEvent",
      "desc": "A fully materialized event instance emitted for an aggregate.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "traceId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sequence",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "aggregateId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "data",
          "type": "TData",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "EventMigrationRegistry",
      "desc": "Registry of forward migrations keyed by event type and schema version.",
      "methods": [
        {
          "sig": "register(eventType: string, fromVersion: number, transform: MigrationFn): void",
          "desc": "Register a migration function for an event type.\nMigrations are chained: to migrate from v1 to v3, register v1→v2 and v2→v3.",
          "params": [
            {
              "n": "eventType",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "fromVersion",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "transform",
              "t": "MigrationFn",
              "r": true,
              "d": "MigrationFn"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "migrate(eventType: string, fromVersion: number, data: Record<string, unknown>, toVersion: number | undefined): Record<string, unknown>",
          "desc": "Migrate event data from `fromVersion` to `toVersion`.\nApplies migrations sequentially. Returns the original data if no migrations needed.",
          "params": [
            {
              "n": "eventType",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "fromVersion",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "data",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            },
            {
              "n": "toVersion",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Record<string, unknown>"
        },
        {
          "sig": "getLatestVersion(eventType: string): number",
          "desc": "Get the latest version for an event type by finding the highest toVersion.",
          "params": [
            {
              "n": "eventType",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "hasMigrations(eventType: string): boolean",
          "desc": "Check if migrations exist for an event type.",
          "params": [
            {
              "n": "eventType",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "clear(): void",
          "desc": "Clear all registered migrations (for testing).",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "migrations: Map<string, MigrationEntry[]>",
          "desc": "migrations",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "MigrationFn",
      "desc": "── Event Schema Migration Registry ────────────────────────────────────────\nHandles forward migration of event data when reading events that were\nwritten with an older schema version. Each migration is a function that\ntransforms data from version N to version N+1.\n\nUsage:\n  EventMigrationRegistry.register(\"run.completed\", 1, (data) => ({\n    ...data,\n    newField: data.oldField ?? \"default\",\n  }));\n\n  // When reading:\n  const migrated = EventMigrationRegistry.migrate(\"run.completed\", 1, data);\nA function that transforms event data from version N to N+1.",
      "methods": [
        {
          "sig": "type MigrationFn = MigrationFn",
          "desc": "── Event Schema Migration Registry ────────────────────────────────────────\nHandles forward migration of event data when reading events that were\nwritten with an older schema version. Each migration is a function that\ntransforms data from version N to version N+1.\n\nUsage:\n  EventMigrationRegistry.register(\"run.completed\", 1, (data) => ({\n    ...data,\n    newField: data.oldField ?? \"default\",\n  }));\n\n  // When reading:\n  const migrated = EventMigrationRegistry.migrate(\"run.completed\", 1, data);\nA function that transforms event data from version N to N+1.",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryEventBus",
      "desc": "In-process {@link EventBus} with durable event retention and sync subscriber dispatch.",
      "methods": [
        {
          "sig": "publish(def: EventDefinition<T>, data: T, meta: { traceId?: string; aggregateId?: string; } | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "data",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "meta",
              "t": "{ traceId?: string; aggregateId?: string; } | undefined",
              "r": false,
              "d": "{ traceId?: string; aggregateId?: string; } | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "EventHandler<T>",
              "r": true,
              "d": "EventHandler<T>"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "subscribeAll(handler: EventHandler, namespace: string | undefined): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "EventHandler",
              "r": true,
              "d": "EventHandler"
            },
            {
              "n": "namespace",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "project(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "(event: TypedEvent<T>) => void",
              "r": true,
              "d": "(event: TypedEvent<T>) => void"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "durable(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "stream(def: EventDefinition<T>, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "streamWithReplay(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events with durable replay + live merge.\nFirst yields historical events from durable storage, then yields live events.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "clear(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "listeners: ListenerEntry[]",
          "desc": "listeners",
          "params": []
        },
        {
          "sig": "projectors: Map<string, Set<EventHandler>>",
          "desc": "projectors",
          "params": []
        },
        {
          "sig": "durableEvents: Map<string, TypedEvent<unknown>[]>",
          "desc": "durableEvents",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "GlobalEventBus",
      "desc": "Process-wide {@link EventBus} backed by a Node EventEmitter, optionally\nbridged to other processes via a {@link RedisAdapter}.",
      "methods": [
        {
          "sig": "constructor(id: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "id",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "getId(): string",
          "desc": "",
          "params": [],
          "ret": "string"
        },
        {
          "sig": "setRedisAdapter(adapter: RedisAdapter): void",
          "desc": "",
          "params": [
            {
              "n": "adapter",
              "t": "RedisAdapter",
              "r": true,
              "d": "RedisAdapter"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "publish(def: EventDefinition<T>, data: T, meta: { traceId?: string; aggregateId?: string; } | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "data",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "meta",
              "t": "{ traceId?: string; aggregateId?: string; } | undefined",
              "r": false,
              "d": "{ traceId?: string; aggregateId?: string; } | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "EventHandler<T>",
              "r": true,
              "d": "EventHandler<T>"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "subscribeAll(handler: EventHandler, namespace: string | undefined): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "EventHandler",
              "r": true,
              "d": "EventHandler"
            },
            {
              "n": "namespace",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "project(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "(event: TypedEvent<T>) => void",
              "r": true,
              "d": "(event: TypedEvent<T>) => void"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "durable(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "stream(def: EventDefinition<T>, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "streamWithReplay(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events with durable replay + live merge.\nFirst yields historical events from durable storage, then yields live events.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "reset(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "emitter: import(\"node:events\")<any>",
          "desc": "emitter",
          "params": []
        },
        {
          "sig": "durableEvents: Map<string, TypedEvent<unknown>[]>",
          "desc": "durableEvents",
          "params": []
        },
        {
          "sig": "redisAdapter: RedisAdapter | null",
          "desc": "redisAdapter",
          "params": []
        },
        {
          "sig": "id: string",
          "desc": "id",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "getGlobalEventBus",
      "desc": "Return the process-wide singleton {@link GlobalEventBus}, creating it on first use.",
      "methods": [
        {
          "sig": "getGlobalEventBus(): GlobalEventBus",
          "desc": "Return the process-wide singleton {@link GlobalEventBus}, creating it on first use.",
          "params": [],
          "ret": "GlobalEventBus"
        }
      ]
    },
    {
      "type": "type",
      "name": "RedisAdapter",
      "desc": "Minimal Redis pub/sub adapter contract used to bridge the global bus across processes.",
      "methods": [
        {
          "sig": "publish(channel: string, message: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "channel",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "on(event: string, handler: (channel: string, message: string) => void): void",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "handler",
              "t": "(channel: string, message: string) => void",
              "r": true,
              "d": "(channel: string, message: string) => void"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(channel: string): void",
          "desc": "",
          "params": [
            {
              "n": "channel",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "EventBus",
      "desc": "EventBus",
      "methods": [
        {
          "sig": "publish(def: EventDefinition<T>, data: T, meta: { traceId?: string; aggregateId?: string; } | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "data",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "meta",
              "t": "{ traceId?: string; aggregateId?: string; } | undefined",
              "r": false,
              "d": "{ traceId?: string; aggregateId?: string; } | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "subscribe(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "EventHandler<T>",
              "r": true,
              "d": "EventHandler<T>"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "subscribeAll(handler: EventHandler<unknown>, namespace: string | undefined): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "handler",
              "t": "EventHandler<unknown>",
              "r": true,
              "d": "EventHandler<unknown>"
            },
            {
              "n": "namespace",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "durable(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "project(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe",
          "desc": "",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "handler",
              "t": "(event: TypedEvent<T>) => void",
              "r": true,
              "d": "(event: TypedEvent<T>) => void"
            }
          ],
          "ret": "Unsubscribe"
        },
        {
          "sig": "stream(def: EventDefinition<T>, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events as an async iterable. Yields events as they are published.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T>",
              "r": true,
              "d": "EventDefinition<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        },
        {
          "sig": "streamWithReplay(def: EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }, aggregateId: string, after: number | undefined, signal: AbortSignal | undefined): AsyncIterable<TypedEvent<T>>",
          "desc": "Stream events with durable replay + live merge.\nFirst yields historical events from durable storage, then yields live events.",
          "params": [
            {
              "n": "def",
              "t": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }",
              "r": true,
              "d": "EventDefinition<T> & { durable: { readonly version: number; readonly aggregate: string; }; }"
            },
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "after",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<TypedEvent<T>>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "EventHandler",
      "desc": "EventHandler",
      "methods": [
        {
          "sig": "type EventHandler = EventHandler<T>",
          "desc": "EventHandler",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "Unsubscribe",
      "desc": "Unsubscribe",
      "methods": [
        {
          "sig": "type Unsubscribe = Unsubscribe",
          "desc": "Unsubscribe",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "TypedSubscription",
      "desc": "TypedSubscription",
      "methods": [],
      "props": [
        {
          "name": "definition",
          "type": "EventDefinition<T>",
          "required": true,
          "desc": ""
        },
        {
          "name": "handler",
          "type": "EventHandler<T>",
          "required": true,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "guard",
  "name": "@vinhnt-sdk/guard",
  "icon": "G",
  "tag": "Core",
  "desc": "Guard plugins - circuit breaker, loop detection, tool timeout.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "class",
      "name": "CircuitBreaker",
      "desc": "Circuit breaker with failure thresholds, retry/backoff and half-open probing.",
      "methods": [
        {
          "sig": "constructor(options: CircuitBreakerOptions | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "options",
              "t": "CircuitBreakerOptions | undefined",
              "r": false,
              "d": "CircuitBreakerOptions | undefined"
            }
          ]
        },
        {
          "sig": "getState(): CircuitState",
          "desc": "",
          "params": [],
          "ret": "CircuitState"
        },
        {
          "sig": "call(fn: () => Promise<T>, signal: AbortSignal | undefined): Promise<T>",
          "desc": "Execute a function with circuit breaker and retry logic.\nRetries on transient failures with exponential backoff.",
          "params": [
            {
              "n": "fn",
              "t": "() => Promise<T>",
              "r": true,
              "d": "() => Promise<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<T>"
        },
        {
          "sig": "sleepAbortable(ms: number, signal: AbortSignal | undefined): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "ms",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onSuccess(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "onFailure(err: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "err",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "reset(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "getOptions(): Readonly<Required<CircuitBreakerOptions>>",
          "desc": "",
          "params": [],
          "ret": "Readonly<Required<CircuitBreakerOptions>>"
        },
        {
          "sig": "state: CircuitState",
          "desc": "state",
          "params": []
        },
        {
          "sig": "failureCount: number",
          "desc": "failureCount",
          "params": []
        },
        {
          "sig": "lastFailureTime: number",
          "desc": "lastFailureTime",
          "params": []
        },
        {
          "sig": "halfOpenSuccesses: number",
          "desc": "halfOpenSuccesses",
          "params": []
        },
        {
          "sig": "options: Required<CircuitBreakerOptions>",
          "desc": "options",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "CircuitBreakerOpenError",
      "desc": "Thrown when a call is rejected because the breaker is open.",
      "methods": [
        {
          "sig": "constructor(resetTimeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "resetTimeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "remainingMs: number",
          "desc": "remainingMs",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CircuitState",
      "desc": "Current circuit breaker state — strict union, state machine core.",
      "methods": [
        {
          "sig": "type CircuitState = CircuitState",
          "desc": "Current circuit breaker state — strict union, state machine core.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CircuitBreakerOptions",
      "desc": "Tuning for {@link CircuitBreaker}: failure/success thresholds and retry policy.",
      "methods": [],
      "props": [
        {
          "name": "failureThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "successThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "resetTimeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "isFailure",
          "type": "((err: unknown) => boolean) | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxRetries",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of retries for transient failures. Default: 3"
        },
        {
          "name": "backoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Base delay for exponential backoff in ms. Default: 1000"
        },
        {
          "name": "maxBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum delay for backoff in ms. Default: 30000"
        }
      ]
    },
    {
      "type": "class",
      "name": "LoopDetector",
      "desc": "Stateful loop detector — tracks recent calls and detects doom loops.",
      "methods": [
        {
          "sig": "constructor(threshold: number, maxHistory: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "threshold",
              "t": "number",
              "r": false,
              "d": "number"
            },
            {
              "n": "maxHistory",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ]
        },
        {
          "sig": "record(id: string, args: unknown): void",
          "desc": "Record a tool invocation.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "isDoomLoop(id: string, args: unknown): boolean",
          "desc": "Check if the given tool+args constitutes a doom loop.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "getHistory(): readonly RecentCall[]",
          "desc": "Get the recent call history (read-only copy).",
          "params": [],
          "ret": "readonly RecentCall[]"
        },
        {
          "sig": "reset(): void",
          "desc": "Reset the detector state.",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "recentCalls: RecentCall[]",
          "desc": "recentCalls",
          "params": []
        },
        {
          "sig": "threshold: number",
          "desc": "threshold",
          "params": []
        },
        {
          "sig": "maxHistory: number",
          "desc": "maxHistory",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "detectDoomLoop",
      "desc": "Detect whether the same tool+args repeated the last `threshold` calls.",
      "methods": [
        {
          "sig": "detectDoomLoop(recentCalls: RecentCall[], name: string, args: unknown, threshold: number): boolean",
          "desc": "Detect whether the same tool+args repeated the last `threshold` calls.",
          "params": [
            {
              "n": "recentCalls",
              "t": "RecentCall[]",
              "r": true,
              "d": "RecentCall[]"
            },
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "threshold",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "hashArgs",
      "desc": "Stable, order-independent hash of an arbitrary tool-arguments value.\nObject key order is normalized so `{a:1,b:2}` and `{b:2,a:1}` hash the same.",
      "methods": [
        {
          "sig": "hashArgs(value: unknown): string",
          "desc": "Stable, order-independent hash of an arbitrary tool-arguments value.\nObject key order is normalized so `{a:1,b:2}` and `{b:2,a:1}` hash the same.",
          "params": [
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "type",
      "name": "RecentCall",
      "desc": "A recorded tool invocation used for doom-loop detection.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "args",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "argsKey",
          "type": "string | undefined",
          "required": false,
          "desc": "Canonical hash of `args` — precomputed once for O(1) doom-loop comparison"
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolTimeoutError",
      "desc": "Thrown when a tool execution exceeds its timeout.",
      "methods": [
        {
          "sig": "constructor(toolId: string, timeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "toolId: string",
          "desc": "toolId",
          "params": []
        },
        {
          "sig": "timeoutMs: number",
          "desc": "timeoutMs",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "withToolTimeout",
      "desc": "Execute a function with a cooperative deadline.\n\nIf the deadline is exceeded, the function is aborted via the signal\nand `ToolTimeoutError` is thrown.",
      "methods": [
        {
          "sig": "withToolTimeout(toolId: string, timeoutMs: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T>",
          "desc": "Execute a function with a cooperative deadline.\n\nIf the deadline is exceeded, the function is aborted via the signal\nand `ToolTimeoutError` is thrown.",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "fn",
              "t": "(signal: AbortSignal) => Promise<T>",
              "r": true,
              "d": "(signal: AbortSignal) => Promise<T>"
            }
          ],
          "ret": "Promise<T>"
        }
      ]
    }
  ]
},
{
  "id": "llm",
  "name": "@vinhnt-sdk/llm",
  "icon": "L",
  "tag": "Core",
  "desc": "LLM adapter abstraction, registry, retry, token metering, model caller.",
  "deps": [
    "schema",
    "config",
    "tools"
  ],
  "exports": [
    {
      "type": "type",
      "name": "GenerateOptions",
      "desc": "Options for a model generation call.\nThis is the adapter's view of the request — provider-owned fields\n(model, apiKey, baseUrl) are resolved before reaching the adapter.",
      "methods": [],
      "props": [
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": "The provider/model identifier (e.g., \"deepseek-chat\", \"gpt-4o\")."
        },
        {
          "name": "messages",
          "type": "readonly { readonly [key: string]: unknown; readonly role: string; readonly content: string | readonly unknown[]; }[]",
          "required": true,
          "desc": "Conversation messages."
        },
        {
          "name": "tools",
          "type": "readonly { readonly type: \"function\"; readonly function: { readonly name: string; readonly description: string; reado...",
          "required": false,
          "desc": "Tool definitions (OpenAI function calling format)."
        },
        {
          "name": "toolChoice",
          "type": "\"auto\" | \"required\" | \"none\" | { readonly type: \"function\"; readonly function: { readonly name: string; }; } | undefined",
          "required": false,
          "desc": "Tool choice control."
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "Max completion tokens."
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": "Temperature (0-2)."
        },
        {
          "name": "topP",
          "type": "number | undefined",
          "required": false,
          "desc": "Top-p sampling."
        },
        {
          "name": "stop",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Stop sequences."
        },
        {
          "name": "reasoningEffort",
          "type": "string | undefined",
          "required": false,
          "desc": "Reasoning effort for o-series models."
        },
        {
          "name": "streamOptions",
          "type": "{ readonly includeUsage?: boolean; } | undefined",
          "required": false,
          "desc": "Stream options (include_usage, etc.)."
        },
        {
          "name": "providerOptions",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": "Provider-specific options passthrough."
        }
      ]
    },
    {
      "type": "type",
      "name": "StreamChunk",
      "desc": "Raw streaming chunk emitted by an adapter.\nThis is the adapter → runtime protocol.",
      "methods": [
        {
          "sig": "type StreamChunk = StreamChunk",
          "desc": "Raw streaming chunk emitted by an adapter.\nThis is the adapter → runtime protocol.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RetryPolicy",
      "desc": "Provider retry policy — captured at registration time.",
      "methods": [],
      "props": [
        {
          "name": "maxRetries",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of retries. Default: 2."
        },
        {
          "name": "baseDelayMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Base delay in ms for exponential backoff. Default: 1000."
        },
        {
          "name": "maxDelayMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum delay cap in ms. Default: 30000."
        },
        {
          "name": "retryableStatuses",
          "type": "readonly number[] | undefined",
          "required": false,
          "desc": "HTTP status codes that are retryable."
        }
      ]
    },
    {
      "type": "type",
      "name": "ProviderInfo",
      "desc": "Provider metadata — returned by `providerInfo()`.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Provider identifier (e.g., \"deepseek\", \"openai\", \"anthropic\")."
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Human-readable display name."
        }
      ]
    },
    {
      "type": "type",
      "name": "ResolvedModelInfo",
      "desc": "Resolved model info — returned by `resolveModel()`.",
      "methods": [],
      "props": [
        {
          "name": "provider",
          "type": "string",
          "required": true,
          "desc": "Provider identifier."
        },
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Model identifier."
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Human-readable model name."
        },
        {
          "name": "contextWindow",
          "type": "number | undefined",
          "required": false,
          "desc": "Context window in tokens."
        },
        {
          "name": "capabilities",
          "type": "Partial<ModelCapabilities> | undefined",
          "required": false,
          "desc": "Model capabilities."
        }
      ]
    },
    {
      "type": "class",
      "name": "LlmAdapter",
      "desc": "Abstract LLM adapter — the Service Definition for model providers.\n\nEvery provider implements this interface. The only required method is `stream()`.\nEverything else has sensible defaults.\n\nAdapters are stateless — all configuration is captured at registration time.\nThe adapter receives only the `GenerateOptions` per call.",
      "methods": [
        {
          "sig": "stream(options: GenerateOptions, signal: AbortSignal | undefined): AsyncIterable<StreamChunk>",
          "desc": "Stream one model call as raw chunks (token-level deltas).\nThis is the ONLY required method.",
          "params": [
            {
              "n": "options",
              "t": "GenerateOptions",
              "r": true,
              "d": "GenerateOptions"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<StreamChunk>"
        },
        {
          "sig": "providerInfo(provider: string): ProviderInfo",
          "desc": "Provider metadata — used for display and logging.\nDefault: `{ id: \"unknown\", name: \"Unknown Provider\" }`.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ProviderInfo"
        },
        {
          "sig": "providerRetryPolicy(provider: string): RetryPolicy | undefined",
          "desc": "Provider-specific retry policy — captured at registration time.\nDefault: undefined (use global defaults).",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "RetryPolicy | undefined"
        },
        {
          "sig": "listModels(provider: string): Promise<readonly ResolvedModelInfo[]>",
          "desc": "List available models for a provider.\nDefault: empty array.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly ResolvedModelInfo[]>"
        },
        {
          "sig": "resolveModel(provider: string, model: string, signal: AbortSignal | undefined): Promise<ResolvedModelInfo>",
          "desc": "Resolve a model identifier to full info.\nDefault: returns the model id as-is.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "model",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<ResolvedModelInfo>"
        }
      ]
    },
    {
      "type": "type",
      "name": "AdapterRegistrationHandle",
      "desc": "Handle returned by registerAdapter — controls the registration lifetime.",
      "methods": [
        {
          "sig": "dispose(): void",
          "desc": "Release all routes registered by this call.",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "replace(adapter: LlmAdapter): void",
          "desc": "Atomically replace the provider routes with a new adapter.",
          "params": [
            {
              "n": "adapter",
              "t": "LlmAdapter",
              "r": true,
              "d": "LlmAdapter"
            }
          ],
          "ret": "void"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "LlmRegistry",
      "desc": "Registry for LLM adapters — manages provider → adapter mapping.\n\nRegistration rules:\n- All-or-nothing: if any provider name conflicts, nothing registers\n- One adapter per provider route\n- Non-empty provider names required\n- Atomic swap: replace() validates the full candidate set before mutating",
      "methods": [
        {
          "sig": "registerAdapter(providerNames: readonly string[], adapter: LlmAdapter): AdapterRegistrationHandle",
          "desc": "Register an adapter for one or more provider names.",
          "params": [
            {
              "n": "providerNames",
              "t": "readonly string[]",
              "r": true,
              "d": "readonly string[]"
            },
            {
              "n": "adapter",
              "t": "LlmAdapter",
              "r": true,
              "d": "LlmAdapter"
            }
          ],
          "ret": "AdapterRegistrationHandle"
        },
        {
          "sig": "getAdapter(provider: string): LlmAdapter | undefined",
          "desc": "Get an adapter by provider name.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "LlmAdapter | undefined"
        },
        {
          "sig": "hasProvider(provider: string): boolean",
          "desc": "Check if a provider is registered.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "listProviders(): readonly (ProviderInfo & { readonly routes: readonly string[]; })[]",
          "desc": "Get metadata about all registered providers.",
          "params": [],
          "ret": "readonly (ProviderInfo & { readonly routes: readonly string[]; })[]"
        },
        {
          "sig": "getRetryPolicy(provider: string): RetryPolicy | undefined",
          "desc": "Get the retry policy for a provider.\nFalls back to the adapter's policy, then to the default.",
          "params": [
            {
              "n": "provider",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "RetryPolicy | undefined"
        },
        {
          "sig": "clear(): void",
          "desc": "Clear all registrations.",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "adapters: Map<string, { adapter: LlmAdapter; owner: symbol; }>",
          "desc": "provider name → { adapter, owner }",
          "params": []
        },
        {
          "sig": "owners: Map<symbol, string[]>",
          "desc": "owner symbol → provider names (for dispose)",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AdapterRegistrationError",
      "desc": "Error thrown when adapter registration fails.",
      "methods": [
        {
          "sig": "constructor(message: string, code: \"DUPLICATE_ADAPTER\" | \"EMPTY_PROVIDERS\" | \"CONFLICT\")",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "code",
              "t": "\"DUPLICATE_ADAPTER\" | \"EMPTY_PROVIDERS\" | \"CONFLICT\"",
              "r": true,
              "d": "\"DUPLICATE_ADAPTER\" | \"EMPTY_PROVIDERS\" | \"CONFLICT\""
            }
          ]
        }
      ]
    },
    {
      "type": "function",
      "name": "shouldRetry",
      "desc": "Determine whether a failure should be retried.",
      "methods": [
        {
          "sig": "shouldRetry(error: { readonly retryable?: boolean; readonly statusCode?: number; }, policy: RetryPolicy | undefined, attempt: number): boolean",
          "desc": "Determine whether a failure should be retried.",
          "params": [
            {
              "n": "error",
              "t": "{ readonly retryable?: boolean; readonly statusCode?: number; }",
              "r": true,
              "d": "{ readonly retryable?: boolean; readonly statusCode?: number; }"
            },
            {
              "n": "policy",
              "t": "RetryPolicy | undefined",
              "r": true,
              "d": "RetryPolicy | undefined"
            },
            {
              "n": "attempt",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "calculateDelay",
      "desc": "Calculate retry delay with exponential backoff + jitter.",
      "methods": [
        {
          "sig": "calculateDelay(attempt: number, policy: RetryPolicy | undefined, retryAfterMs: number | undefined): number",
          "desc": "Calculate retry delay with exponential backoff + jitter.",
          "params": [
            {
              "n": "attempt",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "policy",
              "t": "RetryPolicy | undefined",
              "r": true,
              "d": "RetryPolicy | undefined"
            },
            {
              "n": "retryAfterMs",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "number"
        }
      ]
    },
    {
      "type": "function",
      "name": "sleep",
      "desc": "Sleep for a given duration, abortable via signal.",
      "methods": [
        {
          "sig": "sleep(ms: number, signal: AbortSignal | undefined): Promise<void>",
          "desc": "Sleep for a given duration, abortable via signal.",
          "params": [
            {
              "n": "ms",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<void>"
        }
      ]
    },
    {
      "type": "class",
      "name": "TokenMeter",
      "desc": "Token meter — estimates token counts heuristically.\n\nProvider-specific tokenizers would be more accurate but would\ncouple the meter to a specific provider. The heuristic is\nintentionally approximate for budget estimation.",
      "methods": [
        {
          "sig": "estimateMessage(message: { readonly role: string; readonly content: string | readonly unknown[]; }): number",
          "desc": "Heuristically estimate the token count for a message.",
          "params": [
            {
              "n": "message",
              "t": "{ readonly role: string; readonly content: string | readonly unknown[]; }",
              "r": true,
              "d": "{ readonly role: string; readonly content: string | readonly unknown[]; }"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "estimateRequest(messages: readonly { readonly role: string; readonly content: string | readonly unknown[]; }[], tools: readonly unknown[] | undefined): number",
          "desc": "Estimate the token count for a full request.",
          "params": [
            {
              "n": "messages",
              "t": "readonly { readonly role: string; readonly content: string | readonly unknown[]; }[]",
              "r": true,
              "d": "readonly { readonly role: string; readonly content: string | readonly unknown[]; }[]"
            },
            {
              "n": "tools",
              "t": "readonly unknown[] | undefined",
              "r": false,
              "d": "readonly unknown[] | undefined"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "estimateText(text: string): number",
          "desc": "Estimate tokens for a text string.",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "measurePressure(usage: ModelUsage, contextLimit: number): number",
          "desc": "Measure context pressure — how much of the context window is used.",
          "params": [
            {
              "n": "usage",
              "t": "ModelUsage",
              "r": true,
              "d": "ModelUsage"
            },
            {
              "n": "contextLimit",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "number"
        },
        {
          "sig": "projectNextRequest(currentUsage: ModelUsage, messageGrowth: number): number",
          "desc": "Project next request token estimate based on current usage.",
          "params": [
            {
              "n": "currentUsage",
              "t": "ModelUsage",
              "r": true,
              "d": "ModelUsage"
            },
            {
              "n": "messageGrowth",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "number"
        }
      ]
    },
    {
      "type": "class",
      "name": "ModelCaller",
      "desc": "Runs model generation (streaming and non-streaming) with hooks, token counting and cost/token events.",
      "methods": [
        {
          "sig": "constructor(deps: ModelCallerDeps)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "deps",
              "t": "ModelCallerDeps",
              "r": true,
              "d": "ModelCallerDeps"
            }
          ]
        },
        {
          "sig": "setDefaultModel(model: ModelProvider): void",
          "desc": "Swap the default model at runtime (config hot-reload).",
          "params": [
            {
              "n": "model",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setRuntimeOptions(options: Partial<Pick<ModelCallerDeps, \"maxTokens\" | \"thinkingBudget\" | \"thinkingPrompt\">>): void",
          "desc": "Swap runtime-tunable generation settings at runtime (config hot-reload).",
          "params": [
            {
              "n": "options",
              "t": "Partial<Pick<ModelCallerDeps, \"maxTokens\" | \"thinkingBudget\" | \"thinkingPrompt\">>",
              "r": true,
              "d": "Partial<Pick<ModelCallerDeps, \"maxTokens\" | \"thinkingBudget\" | \"thinkingPrompt\">>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getDefaultModel(): ModelProvider",
          "desc": "",
          "params": [],
          "ret": "ModelProvider"
        },
        {
          "sig": "resolveAgentModel(agent: { profile: { model?: string; }; }, runId: RunId | undefined): ModelProvider",
          "desc": "",
          "params": [
            {
              "n": "agent",
              "t": "{ profile: { model?: string; }; }",
              "r": true,
              "d": "{ profile: { model?: string; }; }"
            },
            {
              "n": "runId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "ModelProvider"
        },
        {
          "sig": "getActiveModel(runId: RunId): ModelProvider",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "ModelProvider"
        },
        {
          "sig": "callModelStream(messages: ChatMessage[], step: number, runId: RunId, ctx: RequestContext, signal: AbortSignal, agentMaxTokens: number | undefined, disableTools: boolean | undefined): Promise<ModelResponse>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "ChatMessage[]",
              "r": true,
              "d": "ChatMessage[]"
            },
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "signal",
              "t": "AbortSignal",
              "r": true,
              "d": "AbortSignal"
            },
            {
              "n": "agentMaxTokens",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "disableTools",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<ModelResponse>"
        },
        {
          "sig": "doThinkingStep(messages: ChatMessage[], step: number, runId: RunId, ctx: RequestContext, signal: AbortSignal): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "ChatMessage[]",
              "r": true,
              "d": "ChatMessage[]"
            },
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "signal",
              "t": "AbortSignal",
              "r": true,
              "d": "AbortSignal"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "calculateCost(inputTokens: number, outputTokens: number, model: ModelProvider | undefined): number | undefined",
          "desc": "",
          "params": [
            {
              "n": "inputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "outputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "model",
              "t": "ModelProvider | undefined",
              "r": false,
              "d": "ModelProvider | undefined"
            }
          ],
          "ret": "number | undefined"
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelCallerDeps",
      "desc": "Dependencies required by {@link ModelCaller}.",
      "methods": [
        {
          "sig": "emitEvent(event: Omit<KnownRunEvent, \"sequence\">, persist: boolean | undefined): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "Omit<KnownRunEvent, \"sequence\">",
              "r": true,
              "d": "Omit<KnownRunEvent, \"sequence\">"
            },
            {
              "n": "persist",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "modelForRun(runId: RunId): ModelProvider | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "ModelProvider | undefined"
        },
        {
          "sig": "setModelForRun(runId: RunId, model: ModelProvider): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "model",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getAvailableTools(runId: RunId): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        }
      ],
      "props": [
        {
          "name": "defaultModel",
          "type": "ModelProvider",
          "required": true,
          "desc": ""
        },
        {
          "name": "modelRegistry",
          "type": "ModelRegistry | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "maxTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "thinkingBudget",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "thinkingPrompt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "pluginManager",
          "type": "ModelCallerPluginHooks | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "logger",
          "type": "ModelCallerLogger | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolChoice",
          "type": "ToolChoice | undefined",
          "required": false,
          "desc": "OpenAI: tool_choice — controls tool calling behavior."
        },
        {
          "name": "parallelToolCalls",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: parallel_tool_calls — whether to allow parallel tool calls."
        },
        {
          "name": "responseFormat",
          "type": "ResponseFormat | undefined",
          "required": false,
          "desc": "OpenAI: response_format — controls output format."
        },
        {
          "name": "streamOptions",
          "type": "StreamOptions | undefined",
          "required": false,
          "desc": "OpenAI: stream_options — options for streaming."
        },
        {
          "name": "presencePenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: presence_penalty — penalizes tokens based on presence."
        },
        {
          "name": "frequencyPenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: frequency_penalty — penalizes tokens based on frequency."
        },
        {
          "name": "logitBias",
          "type": "Record<string, number> | undefined",
          "required": false,
          "desc": "OpenAI: logit_bias — token-level logit biases."
        },
        {
          "name": "seed",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: seed — for reproducible outputs."
        },
        {
          "name": "user",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: user — end-user identifier."
        },
        {
          "name": "logprobs",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: logprobs — return log probabilities."
        },
        {
          "name": "topLogprobs",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: top_logprobs — number of top logprobs per token."
        },
        {
          "name": "maxCompletionTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: max_completion_tokens — for o-series models."
        },
        {
          "name": "reasoningEffort",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: reasoning_effort — controls reasoning token budget."
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelCallerPluginHooks",
      "desc": "Minimal structural hook surface used by the model caller.\n\nHosts (e.g. core's `PluginManager`) only need to implement `fireHook` for\nthe model-call hook names; no direct dependency on the full plugin contract.",
      "methods": [
        {
          "sig": "fireHook(name: \"onChatParams\" | \"onBeforeModelCall\" | \"onAfterModelCall\" | \"onTokenStreamed\", data: Record<string, unknown>): Promise<{ modified: Record<string, unknown>; } | null>",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "\"onChatParams\" | \"onBeforeModelCall\" | \"onAfterModelCall\" | \"onTokenStreamed\"",
              "r": true,
              "d": "\"onChatParams\" | \"onBeforeModelCall\" | \"onAfterModelCall\" | \"onTokenStreamed\""
            },
            {
              "n": "data",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "Promise<{ modified: Record<string, unknown>; } | null>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "ModelCallerLogger",
      "desc": "Minimal structural logger used by the model caller (host Logger satisfies it).",
      "methods": [
        {
          "sig": "info(message: string, args: unknown[]): void",
          "desc": "",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "unknown[]",
              "r": false,
              "d": "unknown[]"
            }
          ],
          "ret": "void"
        }
      ],
      "props": []
    }
  ]
},
{
  "id": "permission",
  "name": "@vinhnt-sdk/permission",
  "icon": "Per",
  "tag": "Core",
  "desc": "Permission management, approval stores, access control.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "function",
      "name": "matchPermission",
      "desc": "Evaluate a list of permission rules against a tool action and context.\nUses last-match-wins semantics: later rules override earlier ones.\n\nIf no rule matches, returns \"ask\" by default (safe default).",
      "methods": [
        {
          "sig": "matchPermission(rules: readonly AnyRule[], action: string, context: string | undefined): { effect: PermissionEffect; matchedRule?: AnyRule; }",
          "desc": "Evaluate a list of permission rules against a tool action and context.\nUses last-match-wins semantics: later rules override earlier ones.\n\nIf no rule matches, returns \"ask\" by default (safe default).",
          "params": [
            {
              "n": "rules",
              "t": "readonly AnyRule[]",
              "r": true,
              "d": "readonly AnyRule[]"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "context",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "{ effect: PermissionEffect; matchedRule?: AnyRule; }"
        }
      ]
    },
    {
      "type": "function",
      "name": "buildPermissionRules",
      "desc": "Build a lookup-friendly permission set from raw config rules.\nHandles flat syntax (`edit: deny`) and nested syntax (`bash: { \"*\": \"ask\", \"git diff\": \"allow\" }`).",
      "methods": [
        {
          "sig": "buildPermissionRules(config: Record<string, string | Record<string, string>>): PermissionRule[]",
          "desc": "Build a lookup-friendly permission set from raw config rules.\nHandles flat syntax (`edit: deny`) and nested syntax (`bash: { \"*\": \"ask\", \"git diff\": \"allow\" }`).",
          "params": [
            {
              "n": "config",
              "t": "Record<string, string | Record<string, string>>",
              "r": true,
              "d": "Record<string, string | Record<string, string>>"
            }
          ],
          "ret": "PermissionRule[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "normalizePermissions",
      "desc": "Normalize a permissions shorthand into a full {@link AgentRuleset}.",
      "methods": [
        {
          "sig": "normalizePermissions(p: AgentPermissions | undefined): AgentRuleset",
          "desc": "Normalize a permissions shorthand into a full {@link AgentRuleset}.",
          "params": [
            {
              "n": "p",
              "t": "AgentPermissions | undefined",
              "r": true,
              "d": "AgentPermissions | undefined"
            }
          ],
          "ret": "AgentRuleset"
        }
      ]
    },
    {
      "type": "function",
      "name": "mergeRulesets",
      "desc": "Merge a child ruleset over its parent (child deny rules override parent allows).",
      "methods": [
        {
          "sig": "mergeRulesets(child: AgentRuleset, parent: AgentRuleset): AgentRuleset",
          "desc": "Merge a child ruleset over its parent (child deny rules override parent allows).",
          "params": [
            {
              "n": "child",
              "t": "AgentRuleset",
              "r": true,
              "d": "AgentRuleset"
            },
            {
              "n": "parent",
              "t": "AgentRuleset",
              "r": true,
              "d": "AgentRuleset"
            }
          ],
          "ret": "AgentRuleset"
        }
      ]
    },
    {
      "type": "function",
      "name": "resolveEffectivePermissions",
      "desc": "Compute the effective ruleset for an agent, merging ancestor permissions.",
      "methods": [
        {
          "sig": "resolveEffectivePermissions(agent: AgentConfig, ancestors: AgentConfig[] | undefined): AgentRuleset",
          "desc": "Compute the effective ruleset for an agent, merging ancestor permissions.",
          "params": [
            {
              "n": "agent",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            },
            {
              "n": "ancestors",
              "t": "AgentConfig[] | undefined",
              "r": false,
              "d": "AgentConfig[] | undefined"
            }
          ],
          "ret": "AgentRuleset"
        }
      ]
    },
    {
      "type": "function",
      "name": "evaluatePermission",
      "desc": "Evaluate a resource against a ruleset.\n\nSemantics (matching OpenCode's findLast):\n- Rules are evaluated in order; last matching rule wins.\n- \"deny\" blocks access.\n- \"ask\" triggers human-in-the-loop.\n- \"allow\" permits access.\n- If no rule matches, the default is \"ask\" (safe default).\n\nWhen `paramPattern` is set on a rule, the rule only matches if\nthe JSON-stringified tool args also match the paramPattern glob.",
      "methods": [
        {
          "sig": "evaluatePermission(ruleset: AgentRuleset | undefined, resource: string, args: Record<string, unknown> | undefined): PermissionResult",
          "desc": "Evaluate a resource against a ruleset.\n\nSemantics (matching OpenCode's findLast):\n- Rules are evaluated in order; last matching rule wins.\n- \"deny\" blocks access.\n- \"ask\" triggers human-in-the-loop.\n- \"allow\" permits access.\n- If no rule matches, the default is \"ask\" (safe default).\n\nWhen `paramPattern` is set on a rule, the rule only matches if\nthe JSON-stringified tool args also match the paramPattern glob.",
          "params": [
            {
              "n": "ruleset",
              "t": "AgentRuleset | undefined",
              "r": true,
              "d": "AgentRuleset | undefined"
            },
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "Record<string, unknown> | undefined",
              "r": false,
              "d": "Record<string, unknown> | undefined"
            }
          ],
          "ret": "PermissionResult"
        }
      ]
    },
    {
      "type": "function",
      "name": "checkRiskAllowed",
      "desc": "Return whether the given risk level is allowed by the ruleset.",
      "methods": [
        {
          "sig": "checkRiskAllowed(ruleset: AgentRuleset | undefined, risk: string): boolean",
          "desc": "Return whether the given risk level is allowed by the ruleset.",
          "params": [
            {
              "n": "ruleset",
              "t": "AgentRuleset | undefined",
              "r": true,
              "d": "AgentRuleset | undefined"
            },
            {
              "n": "risk",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionResult",
      "desc": "Result of evaluating a resource against a ruleset.",
      "methods": [
        {
          "sig": "type PermissionResult = PermissionResult",
          "desc": "Result of evaluating a resource against a ruleset.",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryApprovalStore",
      "desc": "In-memory {@link ApprovalStore} implementation.",
      "methods": [
        {
          "sig": "awaitReply(request: PermissionRequest, opts: AwaitReplyOptions | undefined): Promise<PermissionReply>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "PermissionRequest",
              "r": true,
              "d": "PermissionRequest"
            },
            {
              "n": "opts",
              "t": "AwaitReplyOptions | undefined",
              "r": false,
              "d": "AwaitReplyOptions | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "resolveRequest(requestId: string, reply: PermissionReply): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reply",
              "t": "PermissionReply",
              "r": true,
              "d": "PermissionReply"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getRequest(requestId: string): PermissionRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "PermissionRequest | undefined"
        },
        {
          "sig": "cancelRequest(requestId: string): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "pendingRequests(runId: string | undefined): readonly PermissionRequest[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "readonly PermissionRequest[]"
        },
        {
          "sig": "saveApproval(approval: SavedApproval): void",
          "desc": "",
          "params": [
            {
              "n": "approval",
              "t": "SavedApproval",
              "r": true,
              "d": "SavedApproval"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkApproval(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "Check whether a saved approval covers `resource`. A saved approval matches\nwhen its `action` and agent scope agree AND its `resource` glob-matches the\nrequested resource (e.g. `tool.read_file(src/*)` covers `tool.read_file(src/a.ts)`).",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "saveRejection(resource: string, action: string, agentId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkRejection(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "Check whether a saved rejection covers `resource`. A saved rejection matches\nwhen its `action` and agent scope agree AND its `resource` glob-matches the\nrequested resource (e.g. `tool.write_file(src/*)` covers `tool.write_file(src/a.ts)`).",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "pending: Map<string, (reply: PermissionReply) => void>",
          "desc": "pending",
          "params": []
        },
        {
          "sig": "requests: PermissionRequest[]",
          "desc": "requests",
          "params": []
        },
        {
          "sig": "savedApprovals: SavedApproval[]",
          "desc": "savedApprovals",
          "params": []
        },
        {
          "sig": "savedRejections: SavedApproval[]",
          "desc": "savedRejections",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionStore",
      "desc": "Persistence contract for remembered allow/deny rules scoped per run.",
      "methods": [
        {
          "sig": "addSavedRule(runId: string, action: string, resource: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "removeSavedRule(runId: string, action: string, resource: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listSavedRules(runId: string): Promise<readonly PermissionRule[]>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly PermissionRule[]>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "ApprovalStore",
      "desc": "Store managing in-flight approval requests and saved allow/reject decisions.",
      "methods": [
        {
          "sig": "awaitReply(request: PermissionRequest, opts: AwaitReplyOptions | undefined): Promise<PermissionReply>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "PermissionRequest",
              "r": true,
              "d": "PermissionRequest"
            },
            {
              "n": "opts",
              "t": "AwaitReplyOptions | undefined",
              "r": false,
              "d": "AwaitReplyOptions | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "resolveRequest(requestId: string, reply: PermissionReply): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reply",
              "t": "PermissionReply",
              "r": true,
              "d": "PermissionReply"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getRequest(requestId: string): PermissionRequest | undefined",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "PermissionRequest | undefined"
        },
        {
          "sig": "pendingRequests(runId: string | undefined): readonly PermissionRequest[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "readonly PermissionRequest[]"
        },
        {
          "sig": "cancelRequest(requestId: string): void",
          "desc": "",
          "params": [
            {
              "n": "requestId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "saveApproval(approval: SavedApproval): void",
          "desc": "",
          "params": [
            {
              "n": "approval",
              "t": "SavedApproval",
              "r": true,
              "d": "SavedApproval"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkApproval(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "saveRejection(resource: string, action: string, agentId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkRejection(resource: string, action: string, agentId: string | undefined): boolean",
          "desc": "",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "AwaitReplyOptions",
      "desc": "Options controlling how long {@link ApprovalStore.awaitReply} waits.",
      "methods": [],
      "props": [
        {
          "name": "signal",
          "type": "AbortSignal | undefined",
          "required": false,
          "desc": "Abort when the caller's run is cancelled; rejects with AbortError."
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Hard timeout in ms; rejects with AbortError when elapsed."
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionEffect",
      "desc": "PermissionEffect",
      "methods": [
        {
          "sig": "type PermissionEffect = PermissionEffect",
          "desc": "PermissionEffect",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRule",
      "desc": "PermissionRule",
      "methods": [],
      "props": [
        {
          "name": "action",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "effect",
          "type": "PermissionEffect",
          "required": true,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRuleset",
      "desc": "PermissionRuleset",
      "methods": [
        {
          "sig": "type PermissionRuleset = PermissionRuleset",
          "desc": "PermissionRuleset",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRequest",
      "desc": "PermissionRequest",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "prompt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionReply",
      "desc": "PermissionReply",
      "methods": [
        {
          "sig": "type PermissionReply = PermissionReply",
          "desc": "PermissionReply",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SavedApproval",
      "desc": "SavedApproval",
      "methods": [],
      "props": [
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "action",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "plugin",
  "name": "@vinhnt-sdk/plugin",
  "icon": "P",
  "tag": "Core",
  "desc": "Plugin system with definePlugin, lifecycle hooks, and registry.",
  "deps": [
    "core"
  ],
  "exports": [
    {
      "type": "function",
      "name": "definePlugin",
      "desc": "Build a {@link Plugin} from a manifest plus hooks/lifecycle callbacks.",
      "methods": [
        {
          "sig": "definePlugin(manifest: PluginManifest, hooksOrOptions: PluginHooks | DefinePluginOptions | undefined): Plugin",
          "desc": "Build a {@link Plugin} from a manifest plus hooks/lifecycle callbacks.",
          "params": [
            {
              "n": "manifest",
              "t": "PluginManifest",
              "r": true,
              "d": "PluginManifest"
            },
            {
              "n": "hooksOrOptions",
              "t": "PluginHooks | DefinePluginOptions | undefined",
              "r": false,
              "d": "PluginHooks | DefinePluginOptions | undefined"
            }
          ],
          "ret": "Plugin"
        }
      ]
    },
    {
      "type": "type",
      "name": "PluginManifest",
      "desc": "PluginManifest",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "version",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "author",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PluginContext",
      "desc": "PluginContext",
      "methods": [
        {
          "sig": "registerTool(tool: ToolDefinition<unknown, unknown>): Disposable",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "registerContextSource(source: ContextSourceValue<unknown>): Disposable",
          "desc": "",
          "params": [
            {
              "n": "source",
              "t": "ContextSourceValue<unknown>",
              "r": true,
              "d": "ContextSourceValue<unknown>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "registerAgent(config: AgentConfig): Promise<Disposable>",
          "desc": "",
          "params": [
            {
              "n": "config",
              "t": "AgentConfig",
              "r": true,
              "d": "AgentConfig"
            }
          ],
          "ret": "Promise<Disposable>"
        },
        {
          "sig": "getAgentRegistry(): AgentRegistry",
          "desc": "",
          "params": [],
          "ret": "AgentRegistry"
        },
        {
          "sig": "getToolProviderRegistry(): ToolProviderRegistry",
          "desc": "",
          "params": [],
          "ret": "ToolProviderRegistry"
        },
        {
          "sig": "getEventBus(): EventBus",
          "desc": "",
          "params": [],
          "ret": "EventBus"
        },
        {
          "sig": "effect(cleanup: () => Promise<void>): Disposable",
          "desc": "Register an effect — a side-effect with automatic cleanup.\nThe returned Disposable unregisters the effect when disposed.",
          "params": [
            {
              "n": "cleanup",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "Disposable"
        },
        {
          "sig": "on(event: string | EventDefinition<unknown>, handler: (data: unknown) => void | Promise<void>): Disposable",
          "desc": "Subscribe to an event on the event bus.\nReturns a Disposable that unsubscribes when disposed.",
          "params": [
            {
              "n": "event",
              "t": "string | EventDefinition<unknown>",
              "r": true,
              "d": "string | EventDefinition<unknown>"
            },
            {
              "n": "handler",
              "t": "(data: unknown) => void | Promise<void>",
              "r": true,
              "d": "(data: unknown) => void | Promise<void>"
            }
          ],
          "ret": "Disposable"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "PluginHooks",
      "desc": "PluginHooks",
      "methods": [
        {
          "sig": "onRunStarted(data: { runId: string; prompt: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ runId: string; prompt: string; }",
              "r": true,
              "d": "{ runId: string; prompt: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepStarted(data: { step: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; }",
              "r": true,
              "d": "{ step: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onTokenStreamed(data: { content: string; step: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ content: string; step: number; }",
              "r": true,
              "d": "{ content: string; step: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onToolCompleted(data: { toolId: string; toolName: string; output: unknown; }): Promise<HookResult<{ output: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; output: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; output: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ output: unknown; }>>"
        },
        {
          "sig": "onToolFailed(data: { toolId: string; toolName: string; error: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; error: string; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; error: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onContextCompressed(data: { originalCount: number; compressedCount: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ originalCount: number; compressedCount: number; }",
              "r": true,
              "d": "{ originalCount: number; compressedCount: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepCompleted(data: { step: number; toolCallCount: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; toolCallCount: number; }",
              "r": true,
              "d": "{ step: number; toolCallCount: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onStepFailed(data: { step: number; reason: string; error?: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ step: number; reason: string; error?: string; }",
              "r": true,
              "d": "{ step: number; reason: string; error?: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onRunCompleted(data: { status: string; output?: string; error?: string; stopCondition?: string; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ status: string; output?: string; error?: string; stopCondition?: string; }",
              "r": true,
              "d": "{ status: string; output?: string; error?: string; stopCondition?: string; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onToolInvoked(data: { toolId: string; toolName: string; input: unknown; }): Promise<HookResult<{ input: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; input: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ input: unknown; }>>"
        },
        {
          "sig": "onPermissionAsk(data: { permission: string; resource: string; reason: string; }): Promise<HookResult<{ reply: \"once\" | \"always\" | \"reject\"; } | null>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ permission: string; resource: string; reason: string; }",
              "r": true,
              "d": "{ permission: string; resource: string; reason: string; }"
            }
          ],
          "ret": "Promise<HookResult<{ reply: \"once\" | \"always\" | \"reject\"; } | null>>"
        },
        {
          "sig": "onChatParams(data: { request: Record<string, unknown>; }): Promise<HookResult<{ request: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ request: Record<string, unknown>; }",
              "r": true,
              "d": "{ request: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ request: Record<string, unknown>; }>>"
        },
        {
          "sig": "onShellEnv(data: { env: Record<string, string>; }): Promise<HookResult<{ env: Record<string, string>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ env: Record<string, string>; }",
              "r": true,
              "d": "{ env: Record<string, string>; }"
            }
          ],
          "ret": "Promise<HookResult<{ env: Record<string, string>; }>>"
        },
        {
          "sig": "onBeforeModelCall(data: { request: Record<string, unknown>; }): Promise<HookResult<{ request: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ request: Record<string, unknown>; }",
              "r": true,
              "d": "{ request: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ request: Record<string, unknown>; }>>"
        },
        {
          "sig": "onAfterModelCall(data: { response: Record<string, unknown>; }): Promise<HookResult<{ response: Record<string, unknown>; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ response: Record<string, unknown>; }",
              "r": true,
              "d": "{ response: Record<string, unknown>; }"
            }
          ],
          "ret": "Promise<HookResult<{ response: Record<string, unknown>; }>>"
        },
        {
          "sig": "onBeforeToolExecution(data: { toolId: string; toolName: string; input: unknown; }): Promise<HookResult<{ input: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; input: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ input: unknown; }>>"
        },
        {
          "sig": "onAfterToolExecution(data: { toolId: string; toolName: string; output: unknown; }): Promise<HookResult<{ output: unknown; }>>",
          "desc": "",
          "params": [
            {
              "n": "data",
              "t": "{ toolId: string; toolName: string; output: unknown; }",
              "r": true,
              "d": "{ toolId: string; toolName: string; output: unknown; }"
            }
          ],
          "ret": "Promise<HookResult<{ output: unknown; }>>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "Plugin",
      "desc": "Plugin",
      "methods": [
        {
          "sig": "activate(ctx: PluginContext): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "ctx",
              "t": "PluginContext",
              "r": true,
              "d": "PluginContext"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deactivate(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "manifest",
          "type": "PluginManifest",
          "required": true,
          "desc": ""
        },
        {
          "name": "hooks",
          "type": "PluginHooks | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Disposable",
      "desc": "Disposable — cleanup handle returned by effects and event subscriptions.\nCall `dispose()` to unregister/cleanup. Multiple calls are safe (idempotent).",
      "methods": [
        {
          "sig": "dispose(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "createDisposable",
      "desc": "Create a disposable from a cleanup function.",
      "methods": [
        {
          "sig": "createDisposable(cleanup: () => Promise<void>): Disposable",
          "desc": "Create a disposable from a cleanup function.",
          "params": [
            {
              "n": "cleanup",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "Disposable"
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinition",
      "desc": "Provider-facing tool definition: schema, risk and execute.",
      "methods": [
        {
          "sig": "execute(input: TInput, ctx: ToolContext): Promise<TOutput>",
          "desc": "",
          "params": [
            {
              "n": "input",
              "t": "TInput",
              "r": true,
              "d": "TInput"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<TOutput>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-tool timeout in ms (overrides global default)."
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": "Permission action key for the gate (e.g. \"edit\", \"shell\"). Optional; defaults to risk."
        },
        {
          "name": "inputZodSchema",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime input validation (carried from defineTool)."
        },
        {
          "name": "outputZodSchema",
          "type": "ZodType<TOutput, unknown, $ZodTypeInternals<TOutput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime output validation (carried from defineTool)."
        },
        {
          "name": "deferred",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool is not loaded into context until explicitly requested via search."
        },
        {
          "name": "tags",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Tags for tool search (e.g. [\"file\", \"read\", \"search\"])."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolRisk",
      "desc": "Tool risk level — open string for extensibility.",
      "methods": [
        {
          "sig": "type ToolRisk = string",
          "desc": "Tool risk level — open string for extensibility.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextSourceValue",
      "desc": "ContextSourceValue",
      "methods": [
        {
          "sig": "load(): Promise<T>",
          "desc": "",
          "params": [],
          "ret": "Promise<T>"
        },
        {
          "sig": "renderBaseline(value: T): string",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "string"
        },
        {
          "sig": "renderUpdate(value: T, previous: T): string | null",
          "desc": "",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "previous",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "string | null"
        },
        {
          "sig": "renderRemoval(): string",
          "desc": "",
          "params": [],
          "ret": "string"
        }
      ],
      "props": [
        {
          "name": "key",
          "type": "ContextSourceKey",
          "required": true,
          "desc": ""
        },
        {
          "name": "priority",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextSourceKey",
      "desc": "ContextSourceKey",
      "methods": [
        {
          "sig": "type ContextSourceKey = ContextSourceKey",
          "desc": "ContextSourceKey",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "PluginRegistry",
      "desc": "Plugin registry interface for managing plugins.",
      "methods": [
        {
          "sig": "register(plugin: Plugin): void",
          "desc": "Register a plugin.",
          "params": [
            {
              "n": "plugin",
              "t": "Plugin",
              "r": true,
              "d": "Plugin"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "Unregister a plugin by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "get(id: string): Plugin | undefined",
          "desc": "Get a plugin by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Plugin | undefined"
        },
        {
          "sig": "list(): Plugin[]",
          "desc": "List all registered plugins.",
          "params": [],
          "ret": "Plugin[]"
        },
        {
          "sig": "count(): number",
          "desc": "Get the number of registered plugins.",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "has(id: string): boolean",
          "desc": "Check if a plugin is registered.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "InMemoryPluginRegistry",
      "desc": "In-memory plugin registry for managing plugins.",
      "methods": [
        {
          "sig": "register(plugin: Plugin): void",
          "desc": "",
          "params": [
            {
              "n": "plugin",
              "t": "Plugin",
              "r": true,
              "d": "Plugin"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "get(id: string): Plugin | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Plugin | undefined"
        },
        {
          "sig": "list(): Plugin[]",
          "desc": "",
          "params": [],
          "ret": "Plugin[]"
        },
        {
          "sig": "count(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "has(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "plugins: Map<string, Plugin>",
          "desc": "plugins",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "DefinePluginOptions",
      "desc": "Options for {@link definePlugin}: hooks and lifecycle callbacks.",
      "methods": [
        {
          "sig": "activate(ctx: PluginContext): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "ctx",
              "t": "PluginContext",
              "r": true,
              "d": "PluginContext"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deactivate(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "hooks",
          "type": "PluginHooks | undefined",
          "required": false,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "provider-openai-compatible",
  "name": "@vinhnt-sdk/provider-openai-compatible",
  "icon": "O",
  "tag": "Core",
  "desc": "OpenAI-compatible provider with streaming, retry, presets for DeepSeek, Anthropic, Ollama.",
  "deps": [
    "schema",
    "security",
    "config"
  ],
  "exports": [
    {
      "type": "class",
      "name": "OpenAICompatibleProvider",
      "desc": "OpenAI-compatible model provider.",
      "methods": [
        {
          "sig": "constructor(opts: OpenAICompatibleProviderOptions)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "opts",
              "t": "OpenAICompatibleProviderOptions",
              "r": true,
              "d": "OpenAICompatibleProviderOptions"
            }
          ]
        },
        {
          "sig": "generate(request: ModelRequest, signal: AbortSignal | undefined): Promise<ModelResponse>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<ModelResponse>"
        },
        {
          "sig": "stream(request: ModelRequest, signal: AbortSignal | undefined): AsyncIterable<ModelStreamEvent>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<ModelStreamEvent>"
        },
        {
          "sig": "usageFor(request: ModelRequest): boolean",
          "desc": "Effective usage-request flag: per-call override wins, else the provider default.",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "postCompletion(request: ModelRequest, opts: { stream: boolean; includeUsage: boolean; }, signal: AbortSignal | undefined): Promise<Response>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "opts",
              "t": "{ stream: boolean; includeUsage: boolean; }",
              "r": true,
              "d": "{ stream: boolean; includeUsage: boolean; }"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<Response>"
        },
        {
          "sig": "buildHeaders(): Record<string, string>",
          "desc": "",
          "params": [],
          "ret": "Record<string, string>"
        },
        {
          "sig": "fetchWithRetry(url: string, init: RequestInit, signal: AbortSignal | undefined): Promise<Response>",
          "desc": "",
          "params": [
            {
              "n": "url",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "init",
              "t": "RequestInit",
              "r": true,
              "d": "RequestInit"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<Response>"
        },
        {
          "sig": "provider: string",
          "desc": "provider",
          "params": []
        },
        {
          "sig": "model: string",
          "desc": "model",
          "params": []
        },
        {
          "sig": "contextLimit: number | undefined",
          "desc": "contextLimit",
          "params": []
        },
        {
          "sig": "pricing: ModelPricing | undefined",
          "desc": "pricing",
          "params": []
        },
        {
          "sig": "capabilities: ModelCapabilities",
          "desc": "capabilities",
          "params": []
        },
        {
          "sig": "baseUrl: string",
          "desc": "baseUrl",
          "params": []
        },
        {
          "sig": "apiKey: string | undefined",
          "desc": "apiKey",
          "params": []
        },
        {
          "sig": "headers: Readonly<Record<string, string>>",
          "desc": "headers",
          "params": []
        },
        {
          "sig": "retry: RetryOptions | undefined",
          "desc": "retry",
          "params": []
        },
        {
          "sig": "timeoutMs: number",
          "desc": "timeoutMs",
          "params": []
        },
        {
          "sig": "includeUsage: boolean",
          "desc": "includeUsage",
          "params": []
        },
        {
          "sig": "fetchImpl: typeof fetch",
          "desc": "fetchImpl",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAICompatibleProviderOptions",
      "desc": "Configuration for the OpenAI-compatible provider.",
      "methods": [],
      "props": [
        {
          "name": "baseUrl",
          "type": "string",
          "required": true,
          "desc": "Base URL without path, e.g. `https://api.openai.com/v1` or `http://localhost:11434/v1`."
        },
        {
          "name": "apiKey",
          "type": "string | undefined",
          "required": false,
          "desc": "Bearer API key for `Authorization` (optional for local providers)."
        },
        {
          "name": "defaultModel",
          "type": "string",
          "required": true,
          "desc": "Default model identifier sent in the request body."
        },
        {
          "name": "providerName",
          "type": "string | undefined",
          "required": false,
          "desc": "Provider name reported on `ModelProvider.provider`. Defaults to `\"openai-compatible\"`."
        },
        {
          "name": "headers",
          "type": "Readonly<Record<string, string>> | undefined",
          "required": false,
          "desc": "Extra headers merged over the defaults."
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "Partial<ModelCapabilities> | undefined",
          "required": false,
          "desc": "Overrides for the provider capability set (defaults: streaming+toolCalling)."
        },
        {
          "name": "retry",
          "type": "RetryOptions | undefined",
          "required": false,
          "desc": "Retry/backoff policy. Default: 3 retries, 1s base, 30s cap."
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-attempt request timeout in ms — bounds the time until the upstream\nresponds (headers arrive). A long-running stream is NOT cut off: the timer\nis discarded once the response headers arrive. Default: 120000."
        },
        {
          "name": "includeUsage",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Whether to request token usage via `stream_options.include_usage` when\nstreaming. Some OpenAI-compatible shims (e.g. Ollama) reject unknown\n`stream_options` fields — set `false` for those. Per-call override:\n`request.streamOptions.includeUsage`. Default: true."
        },
        {
          "name": "fetchImpl",
          "type": "typeof fetch | undefined",
          "required": false,
          "desc": "Injectable fetch implementation (defaults to the global `fetch`)."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "buildRequest",
      "desc": "Build an OpenAI Chat Completions request body from a vinhnt-sdk ModelRequest.\n\nMaps: messages, system (top-level), tools, tool_choice, parallel_tool_calls,\nmax_completion_tokens/max_tokens, temperature/top_p/stop, penalties,\nlogit_bias, seed, user, logprobs, reasoning_effort, response_format, and\n(when streaming) `stream: true` + `stream_options.include_usage`.",
      "methods": [
        {
          "sig": "buildRequest(request: ModelRequest, opts: BuildRequestOptions | undefined): OpenAICompatibleRequestBody",
          "desc": "Build an OpenAI Chat Completions request body from a vinhnt-sdk ModelRequest.\n\nMaps: messages, system (top-level), tools, tool_choice, parallel_tool_calls,\nmax_completion_tokens/max_tokens, temperature/top_p/stop, penalties,\nlogit_bias, seed, user, logprobs, reasoning_effort, response_format, and\n(when streaming) `stream: true` + `stream_options.include_usage`.",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "opts",
              "t": "BuildRequestOptions | undefined",
              "r": false,
              "d": "BuildRequestOptions | undefined"
            }
          ],
          "ret": "OpenAICompatibleRequestBody"
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAICompatibleRequestBody",
      "desc": "OpenAI Chat Completions request body (as POSTed to /chat/completions).",
      "methods": [],
      "props": [
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "messages",
          "type": "readonly OpenAIMessage[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "stream",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "stream_options",
          "type": "{ readonly include_usage?: boolean; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "readonly { readonly type: \"function\"; readonly function: { readonly name: string; readonly description: string; reado...",
          "required": false,
          "desc": ""
        },
        {
          "name": "tool_choice",
          "type": "\"auto\" | \"required\" | \"none\" | { readonly type: \"function\"; readonly function: { readonly name: string; }; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "parallel_tool_calls",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "max_tokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "max_completion_tokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "top_p",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "stop",
          "type": "string | readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "presence_penalty",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "frequency_penalty",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "logit_bias",
          "type": "Record<string, number> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "seed",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "user",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "logprobs",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "top_logprobs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "reasoning_effort",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "response_format",
          "type": "{ readonly type: \"json_object\"; } | { readonly type: \"json_schema\"; readonly json_schema: { readonly name: string; re...",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "BuildRequestOptions",
      "desc": "Build options.",
      "methods": [],
      "props": [
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": "Model identifier sent in the body. Defaults to the provider's `model`."
        },
        {
          "name": "stream",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Request a streaming response (`stream: true` + `stream_options.include_usage`)."
        },
        {
          "name": "includeUsage",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Track request/response token usage in streamed responses."
        }
      ]
    },
    {
      "type": "function",
      "name": "createSSEStream",
      "desc": "Parse an SSE byte stream into OpenAI streaming chunks.\n\nHandles: `data:` lines, `[DONE]` termination, multi-line JSON events and\nproviders that omit the blank-line event delimiter. `state.sawDone` flips to\ntrue when the `[DONE]` terminator is seen, letting the consumer distinguish\na clean completion from a truncated stream that closed without it.",
      "methods": [
        {
          "sig": "createSSEStream(body: Bytes, signal: AbortSignal | undefined, state: SSEParseState | undefined): AsyncIterable<OpenAIStreamChunk>",
          "desc": "Parse an SSE byte stream into OpenAI streaming chunks.\n\nHandles: `data:` lines, `[DONE]` termination, multi-line JSON events and\nproviders that omit the blank-line event delimiter. `state.sawDone` flips to\ntrue when the `[DONE]` terminator is seen, letting the consumer distinguish\na clean completion from a truncated stream that closed without it.",
          "params": [
            {
              "n": "body",
              "t": "Bytes",
              "r": true,
              "d": "Bytes"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            },
            {
              "n": "state",
              "t": "SSEParseState | undefined",
              "r": false,
              "d": "SSEParseState | undefined"
            }
          ],
          "ret": "AsyncIterable<OpenAIStreamChunk>"
        }
      ]
    },
    {
      "type": "function",
      "name": "toModelStreamEvents",
      "desc": "Assemble an OpenAI SSE stream into vinhnt-sdk `ModelStreamEvent`s.\n\nAccumulates fragmented tool-call argument deltas across chunks and emits\none complete `tool_call` event per call, then `done`.",
      "methods": [
        {
          "sig": "toModelStreamEvents(body: Bytes, signal: AbortSignal | undefined): AsyncIterable<ModelStreamEvent>",
          "desc": "Assemble an OpenAI SSE stream into vinhnt-sdk `ModelStreamEvent`s.\n\nAccumulates fragmented tool-call argument deltas across chunks and emits\none complete `tool_call` event per call, then `done`.",
          "params": [
            {
              "n": "body",
              "t": "Bytes",
              "r": true,
              "d": "Bytes"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<ModelStreamEvent>"
        }
      ]
    },
    {
      "type": "function",
      "name": "fromOpenAIMessage",
      "desc": "Convert OpenAI Chat Completion message to vinhnt-sdk ChatMessage.",
      "methods": [
        {
          "sig": "fromOpenAIMessage(msg: OpenAIMessage): ChatMessage",
          "desc": "Convert OpenAI Chat Completion message to vinhnt-sdk ChatMessage.",
          "params": [
            {
              "n": "msg",
              "t": "OpenAIMessage",
              "r": true,
              "d": "OpenAIMessage"
            }
          ],
          "ret": "ChatMessage"
        }
      ],
      "example": "```ts\nconst vntMsg = fromOpenAIMessage({\n  role: \"user\",\n  content: [{ type: \"text\", text: \"Hello\" }],\n});\n```"
    },
    {
      "type": "function",
      "name": "toOpenAIMessage",
      "desc": "Convert vinhnt-sdk ChatMessage to OpenAI Chat Completion message.",
      "methods": [
        {
          "sig": "toOpenAIMessage(msg: ChatMessage): OpenAIMessage",
          "desc": "Convert vinhnt-sdk ChatMessage to OpenAI Chat Completion message.",
          "params": [
            {
              "n": "msg",
              "t": "ChatMessage",
              "r": true,
              "d": "ChatMessage"
            }
          ],
          "ret": "OpenAIMessage"
        }
      ],
      "example": "```ts\nconst openaiMsg = toOpenAIMessage({\n  role: \"user\",\n  content: \"Hello\",\n});\n```"
    },
    {
      "type": "function",
      "name": "fromOpenAIResponse",
      "desc": "Convert OpenAI Chat Completion response to vinhnt-sdk ModelResponse.",
      "methods": [
        {
          "sig": "fromOpenAIResponse(res: OpenAIResponse): ModelResponse",
          "desc": "Convert OpenAI Chat Completion response to vinhnt-sdk ModelResponse.",
          "params": [
            {
              "n": "res",
              "t": "OpenAIResponse",
              "r": true,
              "d": "OpenAIResponse"
            }
          ],
          "ret": "ModelResponse"
        }
      ],
      "example": "```ts\nconst response = await fetch(\"https://api.openai.com/v1/chat/completions\", ...);\nconst data = await response.json();\nconst vntResponse = fromOpenAIResponse(data);\n```"
    },
    {
      "type": "function",
      "name": "toOpenAIResponse",
      "desc": "Convert vinhnt-sdk ModelResponse to OpenAI Chat Completion response format.",
      "methods": [
        {
          "sig": "toOpenAIResponse(res: ModelResponse): OpenAIResponse",
          "desc": "Convert vinhnt-sdk ModelResponse to OpenAI Chat Completion response format.",
          "params": [
            {
              "n": "res",
              "t": "ModelResponse",
              "r": true,
              "d": "ModelResponse"
            }
          ],
          "ret": "OpenAIResponse"
        }
      ],
      "example": "```ts\nconst openaiRes = toOpenAIResponse({\n  content: \"Hello!\",\n  finishReason: \"stop\",\n  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },\n});\n```"
    },
    {
      "type": "function",
      "name": "fromOpenAIStreamChunk",
      "desc": "Convert an OpenAI streaming chunk into an array of individual events.\n\nEach chunk can contain multiple choices, each with its own deltas. This\nfunction extracts each chunk's individual deltas. Use\n`toModelStreamEvents` (or the provider's `stream()`) for assembled output.",
      "methods": [
        {
          "sig": "fromOpenAIStreamChunk(chunk: OpenAIStreamChunk): StreamChunkEvent[]",
          "desc": "Convert an OpenAI streaming chunk into an array of individual events.\n\nEach chunk can contain multiple choices, each with its own deltas. This\nfunction extracts each chunk's individual deltas. Use\n`toModelStreamEvents` (or the provider's `stream()`) for assembled output.",
          "params": [
            {
              "n": "chunk",
              "t": "OpenAIStreamChunk",
              "r": true,
              "d": "OpenAIStreamChunk"
            }
          ],
          "ret": "StreamChunkEvent[]"
        }
      ],
      "example": "```ts\nfor await (const chunk of stream) {\n  const events = fromOpenAIStreamChunk(chunk);\n  for (const event of events) { /* handle event *\\/ }\n}\n```"
    },
    {
      "type": "function",
      "name": "fromOpenAIError",
      "desc": "Convert OpenAI error response to vinhnt-sdk VntError.",
      "methods": [
        {
          "sig": "fromOpenAIError(err: OpenAIErrorResponse): VntError",
          "desc": "Convert OpenAI error response to vinhnt-sdk VntError.",
          "params": [
            {
              "n": "err",
              "t": "OpenAIErrorResponse",
              "r": true,
              "d": "OpenAIErrorResponse"
            }
          ],
          "ret": "VntError"
        }
      ],
      "example": "```ts\nconst error = fromOpenAIError({\n  error: {\n    message: \"Rate limit exceeded\",\n    type: \"rate_limit_error\",\n    param: null,\n    code: \"rate_limit_exceeded\",\n  },\n});\n// error instanceof RateLimitError === true\n```"
    },
    {
      "type": "function",
      "name": "fromAnthropicMessage",
      "desc": "Convert Anthropic Messages API message to vinhnt-sdk ChatMessage.\n\nNote: Anthropic uses top-level `system` parameter, not role in messages.",
      "methods": [
        {
          "sig": "fromAnthropicMessage(msg: { role: \"user\" | \"assistant\"; content: string | { type: string; text?: string; }[]; }): ChatMessage",
          "desc": "Convert Anthropic Messages API message to vinhnt-sdk ChatMessage.\n\nNote: Anthropic uses top-level `system` parameter, not role in messages.",
          "params": [
            {
              "n": "msg",
              "t": "{ role: \"user\" | \"assistant\"; content: string | { type: string; text?: string; }[]; }",
              "r": true,
              "d": "{ role: \"user\" | \"assistant\"; content: string | { type: string; text?: string; }[]; }"
            }
          ],
          "ret": "ChatMessage"
        }
      ]
    },
    {
      "type": "class",
      "name": "UpstreamError",
      "desc": "Error representing a non-transient (or exhausted) upstream HTTP failure.\nCarries the HTTP status and an `ERR_UPSTREAM_<STATUS>` code.",
      "methods": [
        {
          "sig": "constructor(status: number, message: string, opts: { retryAfterMs?: number; cause?: unknown; } | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "status",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "opts",
              "t": "{ retryAfterMs?: number; cause?: unknown; } | undefined",
              "r": false,
              "d": "{ retryAfterMs?: number; cause?: unknown; } | undefined"
            }
          ]
        },
        {
          "sig": "status: number",
          "desc": "status",
          "params": []
        },
        {
          "sig": "retryAfterMs: number | undefined",
          "desc": "retryAfterMs",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "parseRetryAfterMs",
      "desc": "Parse a `Retry-After` header value into milliseconds.\nSupports both delta-seconds and HTTP-date forms.",
      "methods": [
        {
          "sig": "parseRetryAfterMs(value: string | null | undefined): number | undefined",
          "desc": "Parse a `Retry-After` header value into milliseconds.\nSupports both delta-seconds and HTTP-date forms.",
          "params": [
            {
              "n": "value",
              "t": "string | null | undefined",
              "r": true,
              "d": "string | null | undefined"
            }
          ],
          "ret": "number | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "computeBackoffMs",
      "desc": "Exponential backoff delay (ms) for a given attempt (0-indexed), capped.",
      "methods": [
        {
          "sig": "computeBackoffMs(attempt: number, opts: RetryOptions | undefined): number",
          "desc": "Exponential backoff delay (ms) for a given attempt (0-indexed), capped.",
          "params": [
            {
              "n": "attempt",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "opts",
              "t": "RetryOptions | undefined",
              "r": false,
              "d": "RetryOptions | undefined"
            }
          ],
          "ret": "number"
        }
      ]
    },
    {
      "type": "function",
      "name": "retryableStatusSet",
      "desc": "Full retry status set (defaults + caller extras).",
      "methods": [
        {
          "sig": "retryableStatusSet(opts: RetryOptions | undefined): Set<number>",
          "desc": "Full retry status set (defaults + caller extras).",
          "params": [
            {
              "n": "opts",
              "t": "RetryOptions | undefined",
              "r": false,
              "d": "RetryOptions | undefined"
            }
          ],
          "ret": "Set<number>"
        }
      ]
    },
    {
      "type": "function",
      "name": "extractErrorMessage",
      "desc": "Extract a human message from an OpenAI-style or plain error body.",
      "methods": [
        {
          "sig": "extractErrorMessage(body: unknown): string | undefined",
          "desc": "Extract a human message from an OpenAI-style or plain error body.",
          "params": [
            {
              "n": "body",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "string | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "abortableSleep",
      "desc": "Sleep that aborts early when the given signal fires.\n\nRV-50: the abort listener must be removed once the timer completes,\notherwise every backoff attaches one extra listener to long-lived signals\nthat never fires again (a listener leak).",
      "methods": [
        {
          "sig": "abortableSleep(ms: number, signal: AbortSignal | undefined): Promise<void>",
          "desc": "Sleep that aborts early when the given signal fires.\n\nRV-50: the abort listener must be removed once the timer completes,\notherwise every backoff attaches one extra listener to long-lived signals\nthat never fires again (a listener leak).",
          "params": [
            {
              "n": "ms",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<void>"
        }
      ]
    },
    {
      "type": "function",
      "name": "waitForRetry",
      "desc": "Wait for backoff (or Retry-After) between attempts, abortable.",
      "methods": [
        {
          "sig": "waitForRetry(attempt: number, opts: RetryOptions | undefined, retryAfterMs: number | undefined, signal: AbortSignal | undefined): Promise<void>",
          "desc": "Wait for backoff (or Retry-After) between attempts, abortable.",
          "params": [
            {
              "n": "attempt",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "opts",
              "t": "RetryOptions | undefined",
              "r": true,
              "d": "RetryOptions | undefined"
            },
            {
              "n": "retryAfterMs",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<void>"
        }
      ]
    },
    {
      "type": "function",
      "name": "toUpstreamError",
      "desc": "Map an upstream failure into a VntError. Prefers the provider's\nstructured OpenAI error body via `fromOpenAIError`, otherwise produces\nan `UpstreamError` with an `ERR_UPSTREAM_*` code.",
      "methods": [
        {
          "sig": "toUpstreamError(status: number, body: unknown, headers: Headers | undefined, cause: unknown): VntError",
          "desc": "Map an upstream failure into a VntError. Prefers the provider's\nstructured OpenAI error body via `fromOpenAIError`, otherwise produces\nan `UpstreamError` with an `ERR_UPSTREAM_*` code.",
          "params": [
            {
              "n": "status",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "body",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "headers",
              "t": "Headers | undefined",
              "r": false,
              "d": "Headers | undefined"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ],
          "ret": "VntError"
        }
      ]
    },
    {
      "type": "type",
      "name": "RetryOptions",
      "desc": "Retry configuration for the provider's HTTP calls.",
      "methods": [],
      "props": [
        {
          "name": "maxRetries",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of retry attempts after the initial request. Default: 3."
        },
        {
          "name": "baseBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Base exponential backoff in ms. Default: 1000."
        },
        {
          "name": "maxBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Cap for exponential backoff in ms. Default: 30000."
        },
        {
          "name": "fixedBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Optional fixed retry delay (ms) — overrides backoff when set."
        },
        {
          "name": "retryableStatuses",
          "type": "readonly number[] | undefined",
          "required": false,
          "desc": "Extra statuses to treat as retryable (merged with the default set)."
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIMessage",
      "desc": "OpenAI Chat Completion message format.",
      "methods": [],
      "props": [
        {
          "name": "role",
          "type": "\"user\" | \"assistant\" | \"system\" | \"developer\" | \"tool\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string | readonly OpenAIContentPart[] | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tool_call_id",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tool_calls",
          "type": "readonly OpenAIToolCall[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "refusal",
          "type": "string | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIContentPart",
      "desc": "OpenAI content part.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "\"text\" | \"image_url\" | \"input_audio\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "text",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "image_url",
          "type": "{ readonly url: string; readonly detail?: string; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "input_audio",
          "type": "{ readonly data: string; readonly format: string; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIToolCall",
      "desc": "OpenAI tool call in message.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly arguments: string; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIResponse",
      "desc": "OpenAI Chat Completion response format.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "object",
          "type": "\"chat.completion\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "choices",
          "type": "readonly OpenAIChoice[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "OpenAIUsage | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "system_fingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "service_tier",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIChoice",
      "desc": "OpenAI choice in response.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "message",
          "type": "{ readonly role: \"assistant\"; readonly content: string | null; readonly tool_calls?: readonly OpenAIToolCall[]; reado...",
          "required": true,
          "desc": ""
        },
        {
          "name": "finish_reason",
          "type": "string | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIUsage",
      "desc": "OpenAI usage breakdown.",
      "methods": [],
      "props": [
        {
          "name": "prompt_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "completion_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "total_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "prompt_tokens_details",
          "type": "{ readonly cached_tokens?: number; readonly text_tokens?: number; readonly audio_tokens?: number; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "completion_tokens_details",
          "type": "{ readonly reasoning_tokens?: number; readonly audio_tokens?: number; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamChunk",
      "desc": "OpenAI streaming chunk.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "object",
          "type": "\"chat.completion.chunk\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "choices",
          "type": "readonly OpenAIStreamChoice[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "system_fingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "service_tier",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "OpenAIUsage | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamChoice",
      "desc": "OpenAI streaming choice.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "delta",
          "type": "{ readonly role?: \"assistant\"; readonly content?: string | null; readonly reasoning_content?: string | null; readonly...",
          "required": true,
          "desc": ""
        },
        {
          "name": "finish_reason",
          "type": "string | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamToolCallDelta",
      "desc": "OpenAI streaming tool call delta.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "id",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name?: string; readonly arguments?: string; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIErrorResponse",
      "desc": "OpenAI error response.",
      "methods": [],
      "props": [
        {
          "name": "error",
          "type": "{ readonly message: string; readonly type: string; readonly param: string | null; readonly code: string | null; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createDeepSeekProvider",
      "desc": "createDeepSeekProvider",
      "methods": [
        {
          "sig": "createDeepSeekProvider(opts: DeepSeekProviderOptions): ModelProvider",
          "desc": "createDeepSeekProvider",
          "params": [
            {
              "n": "opts",
              "t": "DeepSeekProviderOptions",
              "r": true,
              "d": "DeepSeekProviderOptions"
            }
          ],
          "ret": "ModelProvider"
        }
      ]
    },
    {
      "type": "function",
      "name": "createAnthropicProvider",
      "desc": "createAnthropicProvider",
      "methods": [
        {
          "sig": "createAnthropicProvider(opts: AnthropicProviderOptions): ModelProvider",
          "desc": "createAnthropicProvider",
          "params": [
            {
              "n": "opts",
              "t": "AnthropicProviderOptions",
              "r": true,
              "d": "AnthropicProviderOptions"
            }
          ],
          "ret": "ModelProvider"
        }
      ]
    },
    {
      "type": "function",
      "name": "createOllamaProvider",
      "desc": "createOllamaProvider",
      "methods": [
        {
          "sig": "createOllamaProvider(opts: OllamaProviderOptions): ModelProvider",
          "desc": "createOllamaProvider",
          "params": [
            {
              "n": "opts",
              "t": "OllamaProviderOptions",
              "r": false,
              "d": "OllamaProviderOptions"
            }
          ],
          "ret": "ModelProvider"
        }
      ]
    },
    {
      "type": "function",
      "name": "createProviderFromPreset",
      "desc": "Create a provider from a generic preset configuration.",
      "methods": [
        {
          "sig": "createProviderFromPreset(preset: ProviderPreset, opts: { apiKey?: string; pricing?: ModelPricing; retry?: RetryOptions; fetchImpl?: typeof fetch; }): ModelProvider",
          "desc": "Create a provider from a generic preset configuration.",
          "params": [
            {
              "n": "preset",
              "t": "ProviderPreset",
              "r": true,
              "d": "ProviderPreset"
            },
            {
              "n": "opts",
              "t": "{ apiKey?: string; pricing?: ModelPricing; retry?: RetryOptions; fetchImpl?: typeof fetch; }",
              "r": false,
              "d": "{ apiKey?: string; pricing?: ModelPricing; retry?: RetryOptions; fetchImpl?: typeof fetch; }"
            }
          ],
          "ret": "ModelProvider"
        }
      ],
      "example": "```ts\nconst custom = createProviderFromPreset({\n  name: \"my-llm\",\n  baseUrl: \"https://my-llm.example.com/v1\",\n  defaultModel: \"my-model\",\n  contextLimit: 32000,\n  capabilities: { streaming: true, toolCalling: true },\n}, { apiKey: \"sk-...\" });\n```"
    },
    {
      "type": "function",
      "name": "resolveDeepSeekOptions",
      "desc": "resolveDeepSeekOptions",
      "methods": [
        {
          "sig": "resolveDeepSeekOptions(opts: DeepSeekProviderOptions, env: EnvSnapshot | undefined): ResolvedDeepSeekConfig",
          "desc": "resolveDeepSeekOptions",
          "params": [
            {
              "n": "opts",
              "t": "DeepSeekProviderOptions",
              "r": true,
              "d": "DeepSeekProviderOptions"
            },
            {
              "n": "env",
              "t": "EnvSnapshot | undefined",
              "r": false,
              "d": "EnvSnapshot | undefined"
            }
          ],
          "ret": "ResolvedDeepSeekConfig"
        }
      ]
    },
    {
      "type": "type",
      "name": "DeepSeekProviderOptions",
      "desc": "DeepSeekProviderOptions",
      "methods": [],
      "props": [
        {
          "name": "apiKey",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "apiKeyRef",
          "type": "CredentialRef | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "baseUrl",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "Partial<ModelCapabilities> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "retry",
          "type": "RetryOptions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "fetchImpl",
          "type": "typeof fetch | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ResolvedDeepSeekConfig",
      "desc": "ResolvedDeepSeekConfig",
      "methods": [],
      "props": [
        {
          "name": "apiKey",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "baseUrl",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "ModelCapabilities",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AnthropicProviderOptions",
      "desc": "AnthropicProviderOptions",
      "methods": [],
      "props": [
        {
          "name": "apiKey",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "baseUrl",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "Partial<ModelCapabilities> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "retry",
          "type": "RetryOptions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "fetchImpl",
          "type": "typeof fetch | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OllamaProviderOptions",
      "desc": "OllamaProviderOptions",
      "methods": [],
      "props": [
        {
          "name": "baseUrl",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "Partial<ModelCapabilities> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "retry",
          "type": "RetryOptions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "fetchImpl",
          "type": "typeof fetch | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ProviderPreset",
      "desc": "ProviderPreset",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "baseUrl",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "defaultModel",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "ModelCapabilities",
          "required": true,
          "desc": ""
        },
        {
          "name": "headers",
          "type": "Record<string, string> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "sandbox",
  "name": "@vinhnt-sdk/sandbox",
  "icon": "Sa",
  "tag": "Core",
  "desc": "Sandbox execution - process isolation, command parsing, timeout.",
  "deps": [
    "schema",
    "security"
  ],
  "exports": [
    {
      "type": "type",
      "name": "SandboxScope",
      "desc": "Sandbox execution scope — string type, NOT closed union",
      "methods": [
        {
          "sig": "type SandboxScope = string",
          "desc": "Sandbox execution scope — string type, NOT closed union",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SandboxConfig",
      "desc": "Sandbox configuration",
      "methods": [],
      "props": [
        {
          "name": "defaultTimeoutMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "scope",
          "type": "string | undefined",
          "required": false,
          "desc": "Execution scope (default: \"host\" — no isolation)"
        },
        {
          "name": "allowedPaths",
          "type": "string[] | undefined",
          "required": false,
          "desc": "Allowed filesystem paths (for \"process\" scope)"
        },
        {
          "name": "blockedPaths",
          "type": "string[] | undefined",
          "required": false,
          "desc": "Blocked filesystem paths"
        },
        {
          "name": "allowNetwork",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Allow network access (default: true)"
        },
        {
          "name": "allowedEnvVars",
          "type": "string[] | undefined",
          "required": false,
          "desc": "Allowed environment variables"
        },
        {
          "name": "allowedCommands",
          "type": "Set<string> | undefined",
          "required": false,
          "desc": "Allowed commands (for \"process\" scope)"
        },
        {
          "name": "enablePermissionModel",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Enable Node.js Permission Model (Node 22+)"
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SandboxResult",
      "desc": "Result of a sandboxed execution",
      "methods": [],
      "props": [
        {
          "name": "result",
          "type": "T",
          "required": true,
          "desc": ""
        },
        {
          "name": "exitCode",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "durationMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "timedOut",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "resources",
          "type": "{ cpuTimeMs?: number; memoryBytes?: number; } | undefined",
          "required": false,
          "desc": "Resources consumed during execution"
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ProcessSandbox",
      "desc": "Interface for sandbox execution adapters.\n\nImplementations can provide different levels of isolation:\n- `host`: No isolation\n- `process`: Node.js Permission Model + empty env + command allowlist\n- `container`: Docker/Firecracker microVM",
      "methods": [
        {
          "sig": "execute(options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number; }>>",
          "desc": "Execute a command in the sandbox",
          "params": [
            {
              "n": "options",
              "t": "ProcessSandboxExecuteOptions",
              "r": true,
              "d": "ProcessSandboxExecuteOptions"
            }
          ],
          "ret": "Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number; }>>"
        },
        {
          "sig": "destroy(): Promise<void>",
          "desc": "Clean up resources",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "scope",
          "type": "string",
          "required": true,
          "desc": "The scope this sandbox provides"
        }
      ]
    },
    {
      "type": "type",
      "name": "ProcessSandboxExecuteOptions",
      "desc": "Options for a sandboxed command execution",
      "methods": [],
      "props": [
        {
          "name": "command",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "cwd",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timeoutMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "env",
          "type": "Record<string, string> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "signal",
          "type": "AbortSignal | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "SandboxUnavailableError",
      "desc": "Thrown when a sandbox scope is requested but no backend is available for it.\n\nSandboxes are **fail-closed**: requesting an unsupported/unavailable scope\nnever silently downgrades to a weaker sandbox. Instead this error makes the\ngap explicit, listing the scopes that ARE wired.",
      "methods": [
        {
          "sig": "constructor(scope: string, availableScopes: readonly string[])",
          "desc": "Create instance.",
          "params": [
            {
              "n": "scope",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "availableScopes",
              "t": "readonly string[]",
              "r": false,
              "d": "readonly string[]"
            }
          ]
        },
        {
          "sig": "code: \"ERR_SANDBOX_UNAVAILABLE\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createSandbox",
      "desc": "Build a sandbox for the configured scope.\n\n**Fail-closed**: if the requested scope has no registered backend this throws\n`SandboxUnavailableError` — it never silently downgrades to a weaker sandbox.",
      "methods": [
        {
          "sig": "createSandbox(config: SandboxConfig, backends: SandboxBackends): ProcessSandbox",
          "desc": "Build a sandbox for the configured scope.\n\n**Fail-closed**: if the requested scope has no registered backend this throws\n`SandboxUnavailableError` — it never silently downgrades to a weaker sandbox.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig",
              "r": true,
              "d": "SandboxConfig"
            },
            {
              "n": "backends",
              "t": "SandboxBackends",
              "r": false,
              "d": "SandboxBackends"
            }
          ],
          "ret": "ProcessSandbox"
        }
      ]
    },
    {
      "type": "type",
      "name": "SandboxBackendFactory",
      "desc": "Factory that builds a `ProcessSandbox` for a scope from a config.",
      "methods": [
        {
          "sig": "type SandboxBackendFactory = SandboxBackendFactory",
          "desc": "Factory that builds a `ProcessSandbox` for a scope from a config.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SandboxBackends",
      "desc": "Backend registry passed to `createSandbox`. Keys are sandbox scopes; values\nare factories (or undefined if the scope is not wired).",
      "methods": [
        {
          "sig": "type SandboxBackends = SandboxBackends",
          "desc": "Backend registry passed to `createSandbox`. Keys are sandbox scopes; values\nare factories (or undefined if the scope is not wired).",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "parseCommand",
      "desc": "Shell command parsing utility.\nExtracts file and args from a command string, handling quotes and escapes.",
      "methods": [
        {
          "sig": "parseCommand(cmd: string): { file: string; args: string[]; }",
          "desc": "Shell command parsing utility.\nExtracts file and args from a command string, handling quotes and escapes.",
          "params": [
            {
              "n": "cmd",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "{ file: string; args: string[]; }"
        }
      ]
    },
    {
      "type": "function",
      "name": "killProcessTree",
      "desc": "Kill a child process and its whole subtree. Idempotent per pid while the\nkill is in-flight (the registry is pruned once the process exits).",
      "methods": [
        {
          "sig": "killProcessTree(child: ChildProcess, signal: NodeJS.Signals): boolean",
          "desc": "Kill a child process and its whole subtree. Idempotent per pid while the\nkill is in-flight (the registry is pruned once the process exits).",
          "params": [
            {
              "n": "child",
              "t": "ChildProcess",
              "r": true,
              "d": "ChildProcess"
            },
            {
              "n": "signal",
              "t": "NodeJS.Signals",
              "r": false,
              "d": "NodeJS.Signals"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "killProcessTreeAndWait",
      "desc": "Kill a child process and its whole subtree, then await its exit.\n\nThis is the awaited form of {@link killProcessTree} (RV-11): on Windows the\n`taskkill /T` spawn is no longer fire-and-forget — the returned promise\nresolves only after the child has actually exited, or the given timeout\nelapses.",
      "methods": [
        {
          "sig": "killProcessTreeAndWait(child: ChildProcess, signal: NodeJS.Signals, timeoutMs: number): Promise<boolean>",
          "desc": "Kill a child process and its whole subtree, then await its exit.\n\nThis is the awaited form of {@link killProcessTree} (RV-11): on Windows the\n`taskkill /T` spawn is no longer fire-and-forget — the returned promise\nresolves only after the child has actually exited, or the given timeout\nelapses.",
          "params": [
            {
              "n": "child",
              "t": "ChildProcess",
              "r": true,
              "d": "ChildProcess"
            },
            {
              "n": "signal",
              "t": "NodeJS.Signals",
              "r": false,
              "d": "NodeJS.Signals"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "Promise<boolean>"
        }
      ]
    },
    {
      "type": "function",
      "name": "killTreeTrackedPids",
      "desc": "Pids currently tracked as \"kill already issued\".\n\nExposed for observability/tests so a caller can confirm that a terminated\npid is no longer held (i.e. it is safe to kill again after reuse).",
      "methods": [
        {
          "sig": "killTreeTrackedPids(): number[]",
          "desc": "Pids currently tracked as \"kill already issued\".\n\nExposed for observability/tests so a caller can confirm that a terminated\npid is no longer held (i.e. it is safe to kill again after reuse).",
          "params": [],
          "ret": "number[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "isPidAlive",
      "desc": "True when the process (or its process group) is still alive.",
      "methods": [
        {
          "sig": "isPidAlive(pid: number): boolean",
          "desc": "True when the process (or its process group) is still alive.",
          "params": [
            {
              "n": "pid",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "pruneKillTreeState",
      "desc": "Prune the idempotency registry: drop pids whose process has exited or whose\nkill is older than the TTL. Without pruning the registry grows forever and a\nreused pid is treated as \"already killed\" — a silent no-op (RV-11).",
      "methods": [
        {
          "sig": "pruneKillTreeState(now: number): void",
          "desc": "Prune the idempotency registry: drop pids whose process has exited or whose\nkill is older than the TTL. Without pruning the registry grows forever and a\nreused pid is treated as \"already killed\" — a silent no-op (RV-11).",
          "params": [
            {
              "n": "now",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "resetKillTreeState",
      "desc": "Clear the idempotency registry (used by tests).",
      "methods": [
        {
          "sig": "resetKillTreeState(): void",
          "desc": "Clear the idempotency registry (used by tests).",
          "params": [],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "treeKillSpawnOptions",
      "desc": "Cross-platform spawn option that makes `killProcessTree` reach the whole\ntree. On Windows no extra flag is needed (taskkill walks the tree).",
      "methods": [
        {
          "sig": "treeKillSpawnOptions(): { detached: boolean; }",
          "desc": "Cross-platform spawn option that makes `killProcessTree` reach the whole\ntree. On Windows no extra flag is needed (taskkill walks the tree).",
          "params": [],
          "ret": "{ detached: boolean; }"
        }
      ]
    },
    {
      "type": "function",
      "name": "withTimeoutAndAbort",
      "desc": "Attach timeout + abort handling to a child process.\n\nThis is the shared pattern used by all sandbox backends (host, process,\ncontainer) to enforce execution timeouts and abort signals. It replaces\nthe duplicated `setTimeout` + `killProcessTree` + abort listener logic\nthat was previously copy-pasted across backends.\n\nRV-11: the timeout must kill the whole tree, not just the direct child.\n`execFile`'s built-in `timeout` option only SIGTERMs the spawned pid,\norphaning grandchildren — so the timeout is handled here instead.",
      "methods": [
        {
          "sig": "withTimeoutAndAbort(child: ChildProcess, timeoutMs: number, signal: AbortSignal | undefined, onAbort: (reason: string) => void): { timedOut: boolean; clearTimer: () => void; }",
          "desc": "Attach timeout + abort handling to a child process.\n\nThis is the shared pattern used by all sandbox backends (host, process,\ncontainer) to enforce execution timeouts and abort signals. It replaces\nthe duplicated `setTimeout` + `killProcessTree` + abort listener logic\nthat was previously copy-pasted across backends.\n\nRV-11: the timeout must kill the whole tree, not just the direct child.\n`execFile`'s built-in `timeout` option only SIGTERMs the spawned pid,\norphaning grandchildren — so the timeout is handled here instead.",
          "params": [
            {
              "n": "child",
              "t": "ChildProcess",
              "r": true,
              "d": "ChildProcess"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": true,
              "d": "AbortSignal | undefined"
            },
            {
              "n": "onAbort",
              "t": "(reason: string) => void",
              "r": true,
              "d": "(reason: string) => void"
            }
          ],
          "ret": "{ timedOut: boolean; clearTimer: () => void; }"
        }
      ],
      "example": "```ts\nconst child = execFile(file, args, options, callback);\nwithTimeoutAndAbort(child, 30_000, signal, () => {\n  resolve({ result: { stdout: \"\", stderr: \"Aborted\", exitCode: 1 }, exitCode: 1, durationMs: Date.now() - start, timedOut: false });\n});\n```"
    },
    {
      "type": "function",
      "name": "createHostSandbox",
      "desc": "Create a host (no-isolation) sandbox backend.",
      "methods": [
        {
          "sig": "createHostSandbox(_config: SandboxConfig | undefined): ProcessSandbox",
          "desc": "Create a host (no-isolation) sandbox backend.",
          "params": [
            {
              "n": "_config",
              "t": "SandboxConfig | undefined",
              "r": false,
              "d": "SandboxConfig | undefined"
            }
          ],
          "ret": "ProcessSandbox"
        }
      ]
    },
    {
      "type": "function",
      "name": "createProcessSandbox",
      "desc": "Create a process-isolation sandbox backend.",
      "methods": [
        {
          "sig": "createProcessSandbox(config: SandboxConfig): ProcessSandbox",
          "desc": "Create a process-isolation sandbox backend.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig",
              "r": true,
              "d": "SandboxConfig"
            }
          ],
          "ret": "ProcessSandbox"
        }
      ]
    }
  ]
},
{
  "id": "schema",
  "name": "@vinhnt-sdk/schema",
  "icon": "Sc",
  "tag": "Core",
  "desc": "Type definitions, error classes, wire-format schemas.",
  "deps": [],
  "exports": [
    {
      "type": "type",
      "name": "BrandedId",
      "desc": "A string branded with a nominal type tag `T` for compile-time safety.",
      "methods": [
        {
          "sig": "type BrandedId = BrandedId<T>",
          "desc": "A string branded with a nominal type tag `T` for compile-time safety.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunId",
      "desc": "A branded string identifying a run.",
      "methods": [
        {
          "sig": "type RunId = RunId",
          "desc": "A branded string identifying a run.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionId",
      "desc": "A branded string identifying a session.",
      "methods": [
        {
          "sig": "type SessionId = SessionId",
          "desc": "A branded string identifying a session.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentId",
      "desc": "A branded string identifying an agent.",
      "methods": [
        {
          "sig": "type AgentId = AgentId",
          "desc": "A branded string identifying an agent.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "TraceId",
      "desc": "A branded string identifying a trace.",
      "methods": [
        {
          "sig": "type TraceId = TraceId",
          "desc": "A branded string identifying a trace.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RequestId",
      "desc": "A branded string identifying a request.",
      "methods": [
        {
          "sig": "type RequestId = RequestId",
          "desc": "A branded string identifying a request.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCallId",
      "desc": "A branded string identifying a tool call.",
      "methods": [
        {
          "sig": "type ToolCallId = ToolCallId",
          "desc": "A branded string identifying a tool call.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "MessageId",
      "desc": "A branded string identifying a message.",
      "methods": [
        {
          "sig": "type MessageId = MessageId",
          "desc": "A branded string identifying a message.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "WorkspaceId",
      "desc": "A branded string identifying a workspace.",
      "methods": [
        {
          "sig": "type WorkspaceId = WorkspaceId",
          "desc": "A branded string identifying a workspace.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "EnvironmentId",
      "desc": "A branded string identifying an environment.",
      "methods": [
        {
          "sig": "type EnvironmentId = EnvironmentId",
          "desc": "A branded string identifying an environment.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "FilePatchId",
      "desc": "A branded string identifying a file patch.",
      "methods": [
        {
          "sig": "type FilePatchId = FilePatchId",
          "desc": "A branded string identifying a file patch.",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "isAgentId",
      "desc": "Type guard: is `v` a valid AgentId?",
      "methods": [
        {
          "sig": "isAgentId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid AgentId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isRunId",
      "desc": "Type guard: is `v` a valid RunId?",
      "methods": [
        {
          "sig": "isRunId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid RunId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isSessionId",
      "desc": "Type guard: is `v` a valid SessionId?",
      "methods": [
        {
          "sig": "isSessionId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid SessionId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isMessageId",
      "desc": "Type guard: is `v` a valid MessageId?",
      "methods": [
        {
          "sig": "isMessageId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid MessageId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isToolCallId",
      "desc": "Type guard: is `v` a valid ToolCallId?",
      "methods": [
        {
          "sig": "isToolCallId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid ToolCallId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isTraceId",
      "desc": "Type guard: is `v` a valid TraceId?",
      "methods": [
        {
          "sig": "isTraceId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid TraceId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isRequestId",
      "desc": "Type guard: is `v` a valid RequestId?",
      "methods": [
        {
          "sig": "isRequestId(v: unknown): boolean",
          "desc": "Type guard: is `v` a valid RequestId?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "isRecord",
      "desc": "Type guard: is `v` a non-null, non-array object?",
      "methods": [
        {
          "sig": "isRecord(v: unknown): boolean",
          "desc": "Type guard: is `v` a non-null, non-array object?",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "assertAgentId",
      "desc": "Assert `v` is a valid AgentId, throwing a TypeError otherwise.",
      "methods": [
        {
          "sig": "assertAgentId(v: unknown): void",
          "desc": "Assert `v` is a valid AgentId, throwing a TypeError otherwise.",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "assertRunId",
      "desc": "Assert `v` is a valid RunId, throwing a TypeError otherwise.",
      "methods": [
        {
          "sig": "assertRunId(v: unknown): void",
          "desc": "Assert `v` is a valid RunId, throwing a TypeError otherwise.",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "assertSessionId",
      "desc": "Assert `v` is a valid SessionId, throwing a TypeError otherwise.",
      "methods": [
        {
          "sig": "assertSessionId(v: unknown): void",
          "desc": "Assert `v` is a valid SessionId, throwing a TypeError otherwise.",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "function",
      "name": "assertMessageId",
      "desc": "Assert `v` is a valid MessageId, throwing a TypeError otherwise.",
      "methods": [
        {
          "sig": "assertMessageId(v: unknown): void",
          "desc": "Assert `v` is a valid MessageId, throwing a TypeError otherwise.",
          "params": [
            {
              "n": "v",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEvent",
      "desc": "RunEvent",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": ""
        },
        {
          "name": "sequence",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "traceId",
          "type": "TraceId",
          "required": true,
          "desc": ""
        },
        {
          "name": "data",
          "type": "TData",
          "required": true,
          "desc": ""
        },
        {
          "name": "persist",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If false, event is emitted live but not persisted to the event store (e.g. streaming tokens)"
        },
        {
          "name": "version",
          "type": "number | undefined",
          "required": false,
          "desc": "Schema version for migration support (matches EventDefinition.durable.version)"
        }
      ]
    },
    {
      "type": "type",
      "name": "KnownRunEvent",
      "desc": "KnownRunEvent",
      "methods": [
        {
          "sig": "type KnownRunEvent = KnownRunEvent",
          "desc": "KnownRunEvent",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunStartedData",
      "desc": "RunStartedData",
      "methods": [],
      "props": [
        {
          "name": "prompt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "agentName",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StepStartedData",
      "desc": "StepStartedData",
      "methods": [],
      "props": [
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TokenStreamedData",
      "desc": "TokenStreamedData",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ThinkingStartedData",
      "desc": "ThinkingStartedData",
      "methods": [],
      "props": [
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ThinkingContentData",
      "desc": "ThinkingContentData",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ThinkingCompletedData",
      "desc": "ThinkingCompletedData",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ContextCompressedData",
      "desc": "ContextCompressedData",
      "methods": [],
      "props": [
        {
          "name": "originalCount",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "compressedCount",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TokenCountedData",
      "desc": "TokenCountedData",
      "methods": [],
      "props": [
        {
          "name": "inputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "reasoningTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "source",
          "type": "\"local\" | \"api\" | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolInvokedData",
      "desc": "ToolInvokedData",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "input",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "domain",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "decision",
          "type": "\"allow\" | \"deny\" | \"ask\" | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCompletedData",
      "desc": "ToolCompletedData",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "domain",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolFailedData",
      "desc": "ToolFailedData",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "error",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "domain",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "decision",
          "type": "\"allow\" | \"deny\" | \"ask\" | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCancelledData",
      "desc": "ToolCancelledData",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "callId",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolSelfCorrectingData",
      "desc": "ToolSelfCorrectingData",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "error",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "attempt",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StepCompletedData",
      "desc": "StepCompletedData",
      "methods": [],
      "props": [
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCallCount",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StepFailedData",
      "desc": "StepFailedData",
      "methods": [],
      "props": [
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "error",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "RunCompletedData",
      "desc": "RunCompletedData",
      "methods": [],
      "props": [
        {
          "name": "status",
          "type": "\"succeeded\" | \"failed\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "cancelled",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "output",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "error",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "totalSteps",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "durationMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "reasoningTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRequestedData",
      "desc": "PermissionRequestedData",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "prompt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRepliedData",
      "desc": "PermissionRepliedData",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "reply",
          "type": "\"once\" | \"always\" | \"reject\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StepTypeChangedData",
      "desc": "StepTypeChangedData",
      "methods": [],
      "props": [
        {
          "name": "stepType",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "stepNumber",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "detail",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TurnStartedData",
      "desc": "TurnStartedData",
      "methods": [],
      "props": [
        {
          "name": "turn",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TurnEndedData",
      "desc": "TurnEndedData",
      "methods": [],
      "props": [
        {
          "name": "turn",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "\"completed\" | \"aborted\" | \"blocked\" | \"error\" | \"max_tokens\" | \"interrupted\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "LlmRetryData",
      "desc": "LlmRetryData",
      "methods": [],
      "props": [
        {
          "name": "attempt",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "delayMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "LlmRetryStartedData",
      "desc": "LlmRetryStartedData",
      "methods": [],
      "props": [
        {
          "name": "attempt",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalAskedData",
      "desc": "ApprovalAskedData",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalDecidedData",
      "desc": "ApprovalDecidedData",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "decision",
          "type": "\"allow\" | \"deny\" | \"unavailable\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentEvent",
      "desc": "Agent event — discriminated union of all agent events.\nUse this type for type-safe event handling.",
      "methods": [
        {
          "sig": "type AgentEvent = AgentEvent",
          "desc": "Agent event — discriminated union of all agent events.\nUse this type for type-safe event handling.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentEventBase",
      "desc": "Base agent event interface.\nAll agent events extend this interface.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentStartedEvent",
      "desc": "Agent started event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "prompt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelRequestEvent",
      "desc": "Model request event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tokenCount",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelResponseEvent",
      "desc": "Model response event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tokensUsed",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "durationMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolStartEvent",
      "desc": "Tool start event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "tool",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "input",
          "type": "unknown",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolEndEvent",
      "desc": "Tool end event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "tool",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "durationMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentThinkingEvent",
      "desc": "Agent thinking event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentCompletedEvent",
      "desc": "Agent completed event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "status",
          "type": "\"succeeded\" | \"failed\" | \"cancelled\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "error",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "durationMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentErrorEvent",
      "desc": "Agent error event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "error",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "code",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionEvent",
      "desc": "Permission requested event.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "timestamp",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "traceId",
          "type": "TraceId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "runId",
          "type": "RunId | undefined",
          "required": false,
          "desc": "",
          "inherited": "AgentEventBase"
        },
        {
          "name": "tool",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "VntError",
      "desc": "Base error for all VNT Agent errors.\nCarries correlation IDs so every throw is traceable.",
      "methods": [
        {
          "sig": "constructor(message: string, ctx: VntErrorCtx | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "VntErrorCtx | undefined",
              "r": false,
              "d": "VntErrorCtx | undefined"
            }
          ]
        },
        {
          "sig": "requestId: RequestId | undefined",
          "desc": "requestId",
          "params": []
        },
        {
          "sig": "traceId: TraceId | undefined",
          "desc": "traceId",
          "params": []
        },
        {
          "sig": "code: string | undefined",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: boolean",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentNotFoundError",
      "desc": "Thrown when an agent id cannot be found in the registry.",
      "methods": [
        {
          "sig": "constructor(agentId: AgentId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            }
          ]
        },
        {
          "sig": "code: \"AGENT_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentValidationError",
      "desc": "Thrown when an agent config fails validation.",
      "methods": [
        {
          "sig": "constructor(message: string, details: readonly string[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "details",
              "t": "readonly string[] | undefined",
              "r": false,
              "d": "readonly string[] | undefined"
            }
          ]
        },
        {
          "sig": "code: \"AGENT_VALIDATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        },
        {
          "sig": "details: readonly string[]",
          "desc": "details",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentPermissionDenied",
      "desc": "Thrown when an agent is denied access to a resource.",
      "methods": [
        {
          "sig": "constructor(agentId: AgentId, resource: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "agentId",
              "t": "AgentId",
              "r": true,
              "d": "AgentId"
            },
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"AGENT_PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolNotFoundError",
      "desc": "Thrown when a tool name cannot be found in the registry.",
      "methods": [
        {
          "sig": "constructor(toolName: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolExecutionError",
      "desc": "Thrown when a tool execution fails.",
      "methods": [
        {
          "sig": "constructor(toolName: string, cause: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_EXECUTION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolPermissionDenied",
      "desc": "Thrown when a tool call is denied by permission rules.",
      "methods": [
        {
          "sig": "constructor(toolName: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunNotFoundError",
      "desc": "Thrown when a run id cannot be found in the store.",
      "methods": [
        {
          "sig": "constructor(runId: RunId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ]
        },
        {
          "sig": "code: \"RUN_NOT_FOUND\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunAbortedError",
      "desc": "Thrown when a run is aborted.",
      "methods": [
        {
          "sig": "constructor(runId: RunId)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ]
        },
        {
          "sig": "code: \"RUN_ABORTED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RunTimeoutError",
      "desc": "Thrown when a run exceeds its timeout.",
      "methods": [
        {
          "sig": "constructor(runId: RunId, timeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "code: \"RUN_TIMEOUT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "KernelError",
      "desc": "Generic kernel-level failure.",
      "methods": [
        {
          "sig": "constructor(message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: \"KERNEL_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "CircuitBreakerOpenError",
      "desc": "Thrown when a circuit breaker is open (calls rejected until it resets).",
      "methods": [
        {
          "sig": "constructor(message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": false,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"KERNEL_CIRCUIT_OPEN\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolInputError",
      "desc": "Thrown when a tool receives invalid input.",
      "methods": [
        {
          "sig": "constructor(toolName: string, message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_INPUT_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "PermissionDeniedError",
      "desc": "Thrown when a resource access is denied.",
      "methods": [
        {
          "sig": "constructor(resource: string, reason: string | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "resource",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ]
        },
        {
          "sig": "code: \"PERMISSION_DENIED\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ValidationError",
      "desc": "Thrown when a value fails validation.",
      "methods": [
        {
          "sig": "constructor(message: string, details: readonly string[] | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "details",
              "t": "readonly string[] | undefined",
              "r": false,
              "d": "readonly string[] | undefined"
            }
          ]
        },
        {
          "sig": "code: \"VALIDATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "TimeoutError",
      "desc": "Thrown when an operation times out.",
      "methods": [
        {
          "sig": "constructor(operation: string, timeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "operation",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "timeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "code: \"TIMEOUT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "NetworkError",
      "desc": "Thrown on a network-level failure.",
      "methods": [
        {
          "sig": "constructor(message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: \"NETWORK_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "RateLimitError",
      "desc": "Thrown when a rate limit is exceeded; may carry a retry-after delay.",
      "methods": [
        {
          "sig": "constructor(message: string, retryAfterMs: number | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": false,
              "d": "string"
            },
            {
              "n": "retryAfterMs",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ]
        },
        {
          "sig": "code: \"RATE_LIMIT\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: true",
          "desc": "retryable",
          "params": []
        },
        {
          "sig": "retryAfterMs: number | undefined",
          "desc": "retryAfterMs",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "AuthenticationError",
      "desc": "Thrown when authentication fails.",
      "methods": [
        {
          "sig": "constructor(message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": false,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"AUTHENTICATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ConfigurationError",
      "desc": "Thrown on invalid configuration.",
      "methods": [
        {
          "sig": "constructor(message: string)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ]
        },
        {
          "sig": "code: \"CONFIGURATION_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "PluginError",
      "desc": "Thrown when a plugin operation fails.",
      "methods": [
        {
          "sig": "constructor(pluginId: string, message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "pluginId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: \"PLUGIN_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "VntErrorCtx",
      "desc": "Options for VntError construction",
      "methods": [
        {
          "sig": "type VntErrorCtx = VntErrorCtx",
          "desc": "Options for VntError construction",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunStatus",
      "desc": "RunStatus",
      "methods": [
        {
          "sig": "type RunStatus = RunStatus",
          "desc": "RunStatus",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RequestContext",
      "desc": "RequestContext",
      "methods": [],
      "props": [
        {
          "name": "requestId",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "traceId",
          "type": "TraceId",
          "required": true,
          "desc": ""
        },
        {
          "name": "actorId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tenantId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentRunId",
          "type": "RunId | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Result",
      "desc": "Discriminated union of success (value) or failure (error).",
      "methods": [
        {
          "sig": "type Result = Result<T, E>",
          "desc": "Discriminated union of success (value) or failure (error).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "Session",
      "desc": "Session",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "title",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "updatedAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentSessionId",
          "type": "SessionId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "AgentId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cost",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "location",
          "type": "{ directory: string; workspaceId?: WorkspaceId; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "isActive",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Message",
      "desc": "Message",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "MessageId",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "role",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCallId",
          "type": "ToolCallId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tokens",
          "type": "MessageTokens | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cost",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "admittedSeq",
          "type": "number | undefined",
          "required": false,
          "desc": "Admission order for pending user inputs (RV-21). Persisted once and never changed."
        },
        {
          "name": "promotedSeq",
          "type": "number | undefined",
          "required": false,
          "desc": "Set to the admitted seq once the input has been drained into a run (RV-21)."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "MessageTokens",
      "desc": "MessageTokens",
      "methods": [],
      "props": [
        {
          "name": "input",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "reasoning",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionStats",
      "desc": "SessionStats",
      "methods": [],
      "props": [
        {
          "name": "totalSessions",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalCost",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalInputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalOutputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalMessages",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionsByDate",
          "type": "{ date: string; count: number; }[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "costByModel",
          "type": "{ model: string; cost: number; }[]",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentProfile",
      "desc": "Inferred type of {@link AgentProfileSchema}.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "version",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "author",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "hidden",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentConfig",
      "desc": "Inferred type of {@link AgentConfigSchema}.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "AgentId",
          "required": true,
          "desc": ""
        },
        {
          "name": "profile",
          "type": "AgentProfile",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "AgentCapabilities",
          "required": true,
          "desc": ""
        },
        {
          "name": "permissions",
          "type": "AgentPermissions | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "behaviourMode",
          "type": "AgentBehaviourMode | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "domains",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Domain ids this agent may use (e.g. \"coding\"). Undefined = no domain filtering (all tools)."
        },
        {
          "name": "systemPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentPermissions",
      "desc": "Inferred type of {@link AgentPermissionsSchema}.",
      "methods": [],
      "props": [
        {
          "name": "mode",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "ruleset",
          "type": "AgentRuleset | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "allowedTools",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "deniedTools",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "allowedRisks",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxSteps",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentMode",
      "desc": "Agent mode — open string for extensibility.",
      "methods": [
        {
          "sig": "type AgentMode = string",
          "desc": "Agent mode — open string for extensibility.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentBehaviourMode",
      "desc": "Behaviour mode: determines which tools the agent can use. Build = full access, Plan = read-only.",
      "methods": [
        {
          "sig": "type AgentBehaviourMode = AgentBehaviourMode",
          "desc": "Behaviour mode: determines which tools the agent can use. Build = full access, Plan = read-only.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentCapabilities",
      "desc": "Inferred type of {@link AgentCapabilitiesSchema}.",
      "methods": [],
      "props": [
        {
          "name": "tools",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "models",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "streaming",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "thinking",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentRule",
      "desc": "Inferred type of {@link AgentRuleSchema}.",
      "methods": [],
      "props": [
        {
          "name": "effect",
          "type": "\"allow\" | \"deny\" | \"ask\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "target",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "paramPattern",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "AgentRuleset",
      "desc": "Inferred type of {@link AgentRulesetSchema}.",
      "methods": [],
      "props": [
        {
          "name": "rules",
          "type": "readonly AgentRule[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "allowedRisks",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxSteps",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inheritFromParent",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "MemoryEntry",
      "desc": "MemoryEntry",
      "methods": [],
      "props": [
        {
          "name": "key",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "value",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tier",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "charLimit",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillManifest",
      "desc": "Skill metadata manifest.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "mode",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxSteps",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "permission",
          "type": "SkillPermission | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "color",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "hidden",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillDefinition",
      "desc": "A fully loaded skill: manifest, source and body.",
      "methods": [],
      "props": [
        {
          "name": "manifest",
          "type": "SkillManifest",
          "required": true,
          "desc": ""
        },
        {
          "name": "source",
          "type": "SkillSource",
          "required": true,
          "desc": ""
        },
        {
          "name": "body",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "raw",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillSource",
      "desc": "Where a skill was loaded from and its priority.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "SkillSourceType",
          "required": true,
          "desc": ""
        },
        {
          "name": "dir",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "priority",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillSourceType",
      "desc": "Origin of a loaded skill.",
      "methods": [
        {
          "sig": "type SkillSourceType = SkillSourceType",
          "desc": "Origin of a loaded skill.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillPermission",
      "desc": "Permission map for skill-defined tools/files.",
      "methods": [
        {
          "sig": "type SkillPermission = SkillPermission",
          "desc": "Permission map for skill-defined tools/files.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SkillPermissionValue",
      "desc": "Permission effect for a skill scope.",
      "methods": [
        {
          "sig": "type SkillPermissionValue = SkillPermissionValue",
          "desc": "Permission effect for a skill scope.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ChatMessage",
      "desc": "A chat message with role, content and optional tool calls.",
      "methods": [],
      "props": [
        {
          "name": "role",
          "type": "ChatMessageRole",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string | readonly ContentPart[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCallId",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "toolCalls",
          "type": "readonly ToolCall[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "refusal",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: refusal message when Structured Outputs safety triggers."
        }
      ]
    },
    {
      "type": "type",
      "name": "ChatMessageRole",
      "desc": "Chat message roles — OpenAI-compatible union (incl. `developer` and `function`).",
      "methods": [
        {
          "sig": "type ChatMessageRole = ChatMessageRole",
          "desc": "Chat message roles — OpenAI-compatible union (incl. `developer` and `function`).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ContentPart",
      "desc": "Multimodal content part — matches OpenAI's content part format.",
      "methods": [
        {
          "sig": "type ContentPart = ContentPart",
          "desc": "Multimodal content part — matches OpenAI's content part format.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "MessageContentPart",
      "desc": "MessageContentPart",
      "methods": [
        {
          "sig": "type MessageContentPart = MessageContentPart",
          "desc": "MessageContentPart",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CompressionSummary",
      "desc": "Inferred type of {@link CompressionSummarySchema}.",
      "methods": [],
      "props": [
        {
          "name": "originalMessageCount",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "compressedMessageCount",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "summary",
          "type": "string | undefined",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalRequest",
      "desc": "Human-in-the-loop approval request.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "payload",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "requestedAt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "status",
          "type": "ApprovalStatus",
          "required": true,
          "desc": ""
        },
        {
          "name": "context",
          "type": "ApprovalContext | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "expiresAt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "resolvedAt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "resolvedBy",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ConversationCompactor",
      "desc": "Abstract conversation compactor: compresses a transcript and reports the result.",
      "methods": [
        {
          "sig": "compact(messages: readonly ChatMessage[], signal: AbortSignal | undefined): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "ModelProvider",
      "desc": "Interface for a model provider (generate/stream/token count).",
      "methods": [
        {
          "sig": "generate(request: ModelRequest, signal: AbortSignal | undefined): Promise<ModelResponse>",
          "desc": "",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<ModelResponse>"
        },
        {
          "sig": "stream(request: ModelRequest, signal: AbortSignal | undefined): AsyncIterable<ModelStreamEvent>",
          "desc": "Streaming implementation — OPTIONAL. A provider that omits `stream`\r\nis non-streaming: the kernel falls back to `generate`. This keeps the\r\ncontract honest — a provider never advertises streaming it can't do.",
          "params": [
            {
              "n": "request",
              "t": "ModelRequest",
              "r": true,
              "d": "ModelRequest"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "AsyncIterable<ModelStreamEvent>"
        },
        {
          "sig": "countTokens(text: string): number",
          "desc": "",
          "params": [
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "number"
        }
      ],
      "props": [
        {
          "name": "provider",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "contextLimit",
          "type": "number | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "capabilities",
          "type": "ModelCapabilities",
          "required": true,
          "desc": ""
        },
        {
          "name": "pricing",
          "type": "ModelPricing | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PromptAssembly",
      "desc": "Inferred type of {@link PromptAssemblySchema}.",
      "methods": [],
      "props": [
        {
          "name": "stable",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "context",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "volatile",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "assembled",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "version",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "metadata",
          "type": "Readonly<Record<string, unknown>>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionStore",
      "desc": "SessionStore",
      "methods": [
        {
          "sig": "createSession(title: string | undefined, parentSessionId: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentSessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "forkSession(sourceSessionId: string, title: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "sourceSessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "getSession(id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "listSessions(limit: number | undefined, offset: number | undefined): Promise<readonly Session[]>",
          "desc": "",
          "params": [
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "offset",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Session[]>"
        },
        {
          "sig": "updateSession(id: string, updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...",
              "r": true,
              "d": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deleteSession(id: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "addMessage(sessionId: string, role: string, content: string, toolCallId: string | undefined, tokens: { input: number; output: number; reasoning?: number; } | undefined, model: string | undefined, cost: number | undefined, admittedSeq: number | undefined): Promise<Message>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "role",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "toolCallId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "tokens",
              "t": "{ input: number; output: number; reasoning?: number; } | undefined",
              "r": false,
              "d": "{ input: number; output: number; reasoning?: number; } | undefined"
            },
            {
              "n": "model",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "cost",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "admittedSeq",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<Message>"
        },
        {
          "sig": "updateMessage(sessionId: string, messageId: string, updates: MessageSeqUpdates): Promise<void>",
          "desc": "Update message-level fields (e.g. mark a pending input as promoted on drain).\nOptional so minimal stores can skip input-segment tracking.",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "messageId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "MessageSeqUpdates",
              "r": true,
              "d": "MessageSeqUpdates"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listMessages(sessionId: string): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "searchMessages(query: string, limit: number | undefined): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "getSessionStats(): Promise<SessionStats>",
          "desc": "",
          "params": [],
          "ret": "Promise<SessionStats>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "MessageSeqUpdates",
      "desc": "Promotion state update for a pending input message (RV-21).",
      "methods": [
        {
          "sig": "type MessageSeqUpdates = MessageSeqUpdates",
          "desc": "Promotion state update for a pending input message (RV-21).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinitionLike",
      "desc": "Minimal tool definition for schema-level typing (avoids circular dep with core/tool).",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path)."
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional)."
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCall",
      "desc": "A function call requested by the model.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "args",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCallResult",
      "desc": "Tool call result in OpenAI format.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly arguments: string; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionRequest",
      "desc": "PermissionRequest",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "RequestId",
          "required": true,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "prompt",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionReply",
      "desc": "PermissionReply",
      "methods": [
        {
          "sig": "type PermissionReply = PermissionReply",
          "desc": "PermissionReply",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SavedApproval",
      "desc": "SavedApproval",
      "methods": [],
      "props": [
        {
          "name": "resource",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "action",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelRequest",
      "desc": "Model request — parameters for LLM generation.\r\n\r\nAligned with OpenAI Chat Completion format. All fields are optional\r\nexcept `messages` and `tools`.",
      "methods": [],
      "props": [
        {
          "name": "messages",
          "type": "readonly ChatMessage[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "readonly ToolDefinitionLike[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": "Model identifier — optional at schema level; set by provider adapter."
        },
        {
          "name": "maxTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxCompletionTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: max_completion_tokens — required for o-series models. Takes precedence over maxTokens."
        },
        {
          "name": "temperature",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "topP",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "stopSequences",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "thinkingBudget",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "thinkingPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "providerOptions",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "system",
          "type": "string | undefined",
          "required": false,
          "desc": "System prompt — Anthropic-style top-level parameter (optional)."
        },
        {
          "name": "toolChoice",
          "type": "ToolChoice | undefined",
          "required": false,
          "desc": "OpenAI: tool_choice — controls tool calling behavior."
        },
        {
          "name": "parallelToolCalls",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: parallel_tool_calls — whether to allow parallel tool calls (default: true)."
        },
        {
          "name": "responseFormat",
          "type": "ResponseFormat | undefined",
          "required": false,
          "desc": "OpenAI: response_format — controls output format (JSON mode, JSON Schema)."
        },
        {
          "name": "streamOptions",
          "type": "StreamOptions | undefined",
          "required": false,
          "desc": "OpenAI: stream_options — options for streaming (e.g., include_usage)."
        },
        {
          "name": "presencePenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: presence_penalty — penalizes tokens based on presence (-2 to 2)."
        },
        {
          "name": "frequencyPenalty",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: frequency_penalty — penalizes tokens based on frequency (-2 to 2)."
        },
        {
          "name": "logitBias",
          "type": "Record<string, number> | undefined",
          "required": false,
          "desc": "OpenAI: logit_bias — token-level logit biases (-100 to 100)."
        },
        {
          "name": "seed",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: seed — for reproducible outputs."
        },
        {
          "name": "user",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: user — end-user identifier for abuse monitoring."
        },
        {
          "name": "logprobs",
          "type": "boolean | undefined",
          "required": false,
          "desc": "OpenAI: logprobs — return log probabilities of output tokens."
        },
        {
          "name": "topLogprobs",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: top_logprobs — number of top logprobs per token (0-20)."
        },
        {
          "name": "reasoningEffort",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: reasoning_effort — controls reasoning token budget for o-series models."
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelResponse",
      "desc": "Model response — result from LLM generation.\r\n\r\nAligned with OpenAI Chat Completion response format.",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCalls",
          "type": "readonly { id: string; name: string; args: unknown; }[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "finishReason",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "ModelUsage | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "id",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI passthrough fields (optional)."
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: created — Unix timestamp of when the completion was created."
        },
        {
          "name": "systemFingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: system_fingerprint — backend configuration fingerprint."
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": "OpenAI: logprobs — token log probabilities (if requested)."
        },
        {
          "name": "refusal",
          "type": "string | undefined",
          "required": false,
          "desc": "OpenAI: refusal — model's refusal message (Structured Outputs safety)."
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelStreamEvent",
      "desc": "Union of streaming events emitted by a provider.",
      "methods": [
        {
          "sig": "type ModelStreamEvent = ModelStreamEvent",
          "desc": "Union of streaming events emitted by a provider.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelUsage",
      "desc": "Token usage information — aligned with OpenAI format with backward-compatible aliases.",
      "methods": [],
      "props": [
        {
          "name": "promptTokens",
          "type": "number",
          "required": true,
          "desc": "OpenAI: prompt_tokens"
        },
        {
          "name": "completionTokens",
          "type": "number",
          "required": true,
          "desc": "OpenAI: completion_tokens"
        },
        {
          "name": "totalTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "inputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "outputTokens",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cachedTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: prompt_tokens_details.cached_tokens"
        },
        {
          "name": "reasoningTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: completion_tokens_details.reasoning_tokens"
        },
        {
          "name": "audioTokens",
          "type": "number | undefined",
          "required": false,
          "desc": "OpenAI: prompt_tokens_details.audio_tokens + completion_tokens_details.audio_tokens"
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelPricing",
      "desc": "Per-1M-token pricing for a model.",
      "methods": [],
      "props": [
        {
          "name": "input",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "cacheRead",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "cacheWrite",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelCapabilities",
      "desc": "Capability flags of a model provider.",
      "methods": [],
      "props": [
        {
          "name": "streaming",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCalling",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "imageInput",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "thinking",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "structuredOutput",
          "type": "boolean",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ModelRegistry",
      "desc": "Registry mapping model ids to {@link ModelProvider}s.",
      "methods": [
        {
          "sig": "register(id: string, provider: ModelProvider): void",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "provider",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "get(id: string): ModelProvider | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ModelProvider | undefined"
        },
        {
          "sig": "list(): readonly { id: string; provider: ModelProvider; }[]",
          "desc": "",
          "params": [],
          "ret": "readonly { id: string; provider: ModelProvider; }[]"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "RunEventSnapshot",
      "desc": "RunEventSnapshot",
      "methods": [],
      "props": [
        {
          "name": "runId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sequence",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "state",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEventListener",
      "desc": "RunEventListener",
      "methods": [
        {
          "sig": "type RunEventListener = RunEventListener",
          "desc": "RunEventListener",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionUpdates",
      "desc": "SessionUpdates",
      "methods": [
        {
          "sig": "type SessionUpdates = Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | ...",
          "desc": "SessionUpdates",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEventStore",
      "desc": "RunEventStore",
      "methods": [
        {
          "sig": "append(event: RunEvent<unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "appendTransactional(event: RunEvent<unknown>, sessionUpdate: { sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            },
            {
              "n": "sessionUpdate",
              "t": "{ sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output...",
              "r": false,
              "d": "{ sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "exists(eventId: string): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "eventId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "list(runId: string, afterSequence: number | undefined): Promise<readonly RunEvent<unknown>[]>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "afterSequence",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly RunEvent<unknown>[]>"
        },
        {
          "sig": "listRunIds(): Promise<string[]>",
          "desc": "List all run IDs that have persisted events (for active-run discovery on restart).",
          "params": [],
          "ret": "Promise<string[]>"
        },
        {
          "sig": "getNextSequence(aggregateId: string): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "appendWithSequence(event: RunEvent<unknown>): Promise<number>",
          "desc": "Atomically allocate the next sequence for the aggregate and append the event\nin a single operation, then return the assigned sequence.\n\nImplementations that cannot do this atomically should fall back to\n`getNextSequence() + append()` for the returned value.",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "state",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getSnapshot(runId: string): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sequence",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "subscribe(listener: RunEventListener): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "RunEventListener",
              "r": true,
              "d": "RunEventListener"
            }
          ],
          "ret": "() => void"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "SessionNode",
      "desc": "A node in the hierarchical session tree.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "title",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "AgentId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "parentId",
          "type": "SessionId | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "children",
          "type": "readonly SessionNode[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "isActive",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "createdAt",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "depth",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionTreeSnapshot",
      "desc": "Serializable snapshot of the session tree.",
      "methods": [],
      "props": [
        {
          "name": "rootId",
          "type": "SessionId | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "nodes",
          "type": "SessionNode[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "activeSessionId",
          "type": "SessionId | null",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionTreeEvent",
      "desc": "Event emitted when the session tree changes.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "SessionId",
          "required": true,
          "desc": ""
        },
        {
          "name": "data",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TokenLogprob",
      "desc": "Log probability for a single token.",
      "methods": [],
      "props": [
        {
          "name": "token",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprob",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "bytes",
          "type": "readonly number[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "topLogprobs",
          "type": "readonly TopLogprob[] | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "TopLogprob",
      "desc": "Top log probability alternative.",
      "methods": [],
      "props": [
        {
          "name": "token",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprob",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "bytes",
          "type": "readonly number[] | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "Logprobs",
      "desc": "Log probabilities for a choice.",
      "methods": [],
      "props": [
        {
          "name": "content",
          "type": "readonly TokenLogprob[] | null | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "refusal",
          "type": "readonly TokenLogprob[] | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ResponseFormat",
      "desc": "Response format specification — controls output format (JSON mode, JSON Schema).",
      "methods": [
        {
          "sig": "type ResponseFormat = ResponseFormat",
          "desc": "Response format specification — controls output format (JSON mode, JSON Schema).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ResponseFormatJsonSchema",
      "desc": "JSON Schema configuration for structured outputs.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "schema",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "strict",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolChoice",
      "desc": "Controls tool calling behavior — auto, required, none, or force specific tool.\r\n\r\nSDK-internal representation. Use {@link toWireToolChoice} to convert\r\nto OpenAI wire format (`{type: \"function\", function: {name}}`).",
      "methods": [
        {
          "sig": "type ToolChoice = ToolChoice",
          "desc": "Controls tool calling behavior — auto, required, none, or force specific tool.\r\n\r\nSDK-internal representation. Use {@link toWireToolChoice} to convert\r\nto OpenAI wire format (`{type: \"function\", function: {name}}`).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "WireToolChoice",
      "desc": "OpenAI wire format for tool_choice.\r\nDiffers from SDK-internal {@link ToolChoice}: force-specific uses\r\n`{type: \"function\", function: {name}}` instead of `{type: \"function\", name}`.",
      "methods": [
        {
          "sig": "type WireToolChoice = WireToolChoice",
          "desc": "OpenAI wire format for tool_choice.\r\nDiffers from SDK-internal {@link ToolChoice}: force-specific uses\r\n`{type: \"function\", function: {name}}` instead of `{type: \"function\", name}`.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "StreamOptions",
      "desc": "Options for streaming responses.",
      "methods": [],
      "props": [
        {
          "name": "includeUsage",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Include token usage in the final stream chunk."
        }
      ]
    },
    {
      "type": "type",
      "name": "StreamingToolCallState",
      "desc": "Tracks the state of a streaming tool call as chunks arrive.\r\nUsed by provider SSE parsers to assemble complete tool calls.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Tool call ID (assigned by model)."
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Tool name (from first chunk with `function.name`)."
        },
        {
          "name": "argumentChunks",
          "type": "readonly string[]",
          "required": true,
          "desc": "Accumulated argument string chunks."
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonSchema",
      "desc": "JSON Schema type — represents a JSON Schema object.\r\nUsed for tool input schemas, response format schemas, etc.\r\n\r\nThis is intentionally a structural type (not a class) to stay\r\ndependency-free. Any valid JSON Schema object satisfies this type.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "properties",
          "type": "Record<string, JsonSchema> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "required",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "items",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "anyOf",
          "type": "readonly JsonSchema[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "allOf",
          "type": "readonly JsonSchema[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "oneOf",
          "type": "readonly JsonSchema[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "$ref",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "$defs",
          "type": "Record<string, JsonSchema> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "enum",
          "type": "readonly unknown[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "const",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "default",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "additionalProperties",
          "type": "boolean | JsonSchema | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "minItems",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxItems",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "minLength",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxLength",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "minimum",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maximum",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "pattern",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "format",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "title",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "getTextContent",
      "desc": "Extract plain text from a ChatMessage.content value.\r\nWorks with both string and ContentPart[] formats.",
      "methods": [
        {
          "sig": "getTextContent(content: string | readonly ContentPart[]): string",
          "desc": "Extract plain text from a ChatMessage.content value.\r\nWorks with both string and ContentPart[] formats.",
          "params": [
            {
              "n": "content",
              "t": "string | readonly ContentPart[]",
              "r": true,
              "d": "string | readonly ContentPart[]"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "toWireToolChoice",
      "desc": "Convert SDK-internal ToolChoice to OpenAI wire format.",
      "methods": [
        {
          "sig": "toWireToolChoice(choice: ToolChoice): WireToolChoice",
          "desc": "Convert SDK-internal ToolChoice to OpenAI wire format.",
          "params": [
            {
              "n": "choice",
              "t": "ToolChoice",
              "r": true,
              "d": "ToolChoice"
            }
          ],
          "ret": "WireToolChoice"
        }
      ],
      "example": "```ts\r\ntoWireToolChoice(\"auto\")                  // \"auto\"\r\ntoWireToolChoice({ type: \"function\", name: \"get_weather\" })\r\n  // { type: \"function\", function: { name: \"get_weather\" } }\r\n```"
    },
    {
      "type": "type",
      "name": "OpenAIMessage",
      "desc": "OpenAI Chat Completion message format.",
      "methods": [],
      "props": [
        {
          "name": "role",
          "type": "\"system\" | \"user\" | \"assistant\" | \"tool\" | \"developer\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string | readonly OpenAIContentPart[] | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tool_call_id",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tool_calls",
          "type": "readonly OpenAIToolCall[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "refusal",
          "type": "string | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIContentPart",
      "desc": "OpenAI content part.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "\"text\" | \"image_url\" | \"input_audio\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "text",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "image_url",
          "type": "{ readonly url: string; readonly detail?: string; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "input_audio",
          "type": "{ readonly data: string; readonly format: string; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIToolCall",
      "desc": "OpenAI tool call in message.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly arguments: string; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIResponse",
      "desc": "OpenAI Chat Completion response format.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "object",
          "type": "\"chat.completion\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "choices",
          "type": "readonly OpenAIChoice[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "OpenAIUsage | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "system_fingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "service_tier",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIChoice",
      "desc": "OpenAI choice in response.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "message",
          "type": "{ readonly role: \"assistant\"; readonly content: string | null; readonly tool_calls?: readonly OpenAIToolCall[]; reado...",
          "required": true,
          "desc": ""
        },
        {
          "name": "finish_reason",
          "type": "string | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIUsage",
      "desc": "OpenAI usage breakdown.",
      "methods": [],
      "props": [
        {
          "name": "prompt_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "completion_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "total_tokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "prompt_tokens_details",
          "type": "{ readonly cached_tokens?: number; readonly text_tokens?: number; readonly audio_tokens?: number; } | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "completion_tokens_details",
          "type": "{ readonly reasoning_tokens?: number; readonly audio_tokens?: number; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamChunk",
      "desc": "OpenAI streaming chunk.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "object",
          "type": "\"chat.completion.chunk\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "created",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "choices",
          "type": "readonly OpenAIStreamChoice[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "system_fingerprint",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "service_tier",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "usage",
          "type": "OpenAIUsage | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamChoice",
      "desc": "OpenAI streaming choice.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "delta",
          "type": "{ readonly role?: \"assistant\"; readonly content?: string | null; readonly reasoning_content?: string | null; readonly...",
          "required": true,
          "desc": ""
        },
        {
          "name": "finish_reason",
          "type": "string | null",
          "required": true,
          "desc": ""
        },
        {
          "name": "logprobs",
          "type": "Logprobs | null | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIStreamToolCallDelta",
      "desc": "OpenAI streaming tool call delta.",
      "methods": [],
      "props": [
        {
          "name": "index",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "id",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "function",
          "type": "{ readonly name?: string; readonly arguments?: string; } | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "OpenAIErrorResponse",
      "desc": "OpenAI error response.",
      "methods": [],
      "props": [
        {
          "name": "error",
          "type": "{ readonly message: string; readonly type: string; readonly param: string | null; readonly code: string | null; }",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "inferStepType",
      "desc": "Infer the agent step type from a tool name.",
      "methods": [
        {
          "sig": "inferStepType(toolName: string): string",
          "desc": "Infer the agent step type from a tool name.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "ok",
      "desc": "Wrap a value in a successful {@link Result}.",
      "methods": [
        {
          "sig": "ok(value: T): Result<T, E>",
          "desc": "Wrap a value in a successful {@link Result}.",
          "params": [
            {
              "n": "value",
              "t": "T",
              "r": true,
              "d": "T"
            }
          ],
          "ret": "Result<T, E>"
        }
      ]
    },
    {
      "type": "function",
      "name": "fail",
      "desc": "Wrap an error in a failed {@link Result}.",
      "methods": [
        {
          "sig": "fail(error: E): Result<T, E>",
          "desc": "Wrap an error in a failed {@link Result}.",
          "params": [
            {
              "n": "error",
              "t": "E",
              "r": true,
              "d": "E"
            }
          ],
          "ret": "Result<T, E>"
        }
      ]
    },
    {
      "type": "function",
      "name": "versionedSchema",
      "desc": "Build a {@link VersionedSchema} from options.",
      "methods": [
        {
          "sig": "versionedSchema(opts: VersionedSchemaOptions): VersionedSchema<T>",
          "desc": "Build a {@link VersionedSchema} from options.",
          "params": [
            {
              "n": "opts",
              "t": "VersionedSchemaOptions",
              "r": true,
              "d": "VersionedSchemaOptions"
            }
          ],
          "ret": "VersionedSchema<T>"
        }
      ]
    },
    {
      "type": "function",
      "name": "deprecated",
      "desc": "Wrap a Zod schema so its identifier/metadata registers a deprecation note.\nConsumers can read it back via the DEPRECATION_SYMBOL.",
      "methods": [
        {
          "sig": "deprecated(schema: T, note: DeprecationNote): T",
          "desc": "Wrap a Zod schema so its identifier/metadata registers a deprecation note.\nConsumers can read it back via the DEPRECATION_SYMBOL.",
          "params": [
            {
              "n": "schema",
              "t": "T",
              "r": true,
              "d": "T"
            },
            {
              "n": "note",
              "t": "DeprecationNote",
              "r": true,
              "d": "DeprecationNote"
            }
          ],
          "ret": "T"
        }
      ]
    },
    {
      "type": "type",
      "name": "SchemaVersionedBase",
      "desc": "Inferred type of {@link SchemaVersionedBaseSchema}.",
      "methods": [
        {
          "sig": "type SchemaVersionedBase = { type: string; version: number; data: unknown; }",
          "desc": "Inferred type of {@link SchemaVersionedBaseSchema}.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "VersionedSchemaOptions",
      "desc": "Options for building a {@link VersionedSchema}.",
      "methods": [],
      "props": [
        {
          "name": "kind",
          "type": "string",
          "required": true,
          "desc": "Stable kind, e.g. \"run-event\", \"session\"."
        },
        {
          "name": "versions",
          "type": "Record<number, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>",
          "required": true,
          "desc": "Per-version Zod schemas keyed by version number."
        },
        {
          "name": "migrations",
          "type": "SchemaMigration<unknown, unknown>[]",
          "required": true,
          "desc": "Upcast chain: each entry transitions one version step (1→2, 2→3, ...)."
        },
        {
          "name": "current",
          "type": "number",
          "required": true,
          "desc": "The current (highest) version to upcast toward."
        }
      ]
    },
    {
      "type": "function",
      "name": "wildcardMatch",
      "desc": "Wildcard pattern matching — \"*\" matches any sequence, \"**\" matches any sequence\n(same as * in non-path patterns), \"?\" matches a single char, \"\\*\" and \"\\?\"\nmatch literal * and ? characters.\nSupports last-match-wins semantics for permission rules.",
      "methods": [
        {
          "sig": "wildcardMatch(pattern: string, value: string): boolean",
          "desc": "Wildcard pattern matching — \"*\" matches any sequence, \"**\" matches any sequence\n(same as * in non-path patterns), \"?\" matches a single char, \"\\*\" and \"\\?\"\nmatch literal * and ? characters.\nSupports last-match-wins semantics for permission rules.",
          "params": [
            {
              "n": "pattern",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        }
      ]
    },
    {
      "type": "function",
      "name": "parseRunEvent",
      "desc": "Parse unknown data as a KnownRunEvent. Throws ZodError on mismatch.\nInferred type of {@link parseRunEventSchema}.",
      "methods": [
        {
          "sig": "parseRunEvent(data: unknown): { id: string; runId: string & { readonly __brand: \"RunId\"; }; sequence: number; occurredAt: string; traceId: string &...",
          "desc": "Parse unknown data as a KnownRunEvent. Throws ZodError on mismatch.\nInferred type of {@link parseRunEventSchema}.",
          "params": [
            {
              "n": "data",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "{ id: string; runId: string & { readonly __brand: \"RunId\"; }; sequence: number; occurredAt: string; traceId: string &..."
        }
      ]
    },
    {
      "type": "function",
      "name": "safeParseRunEvent",
      "desc": "Safe parse — returns { success, data } or { success, error }\nInferred type of {@link safeParseRunEventSchema}.",
      "methods": [
        {
          "sig": "safeParseRunEvent(data: unknown): ZodSafeParseResult<{ id: string; runId: string & { readonly __brand: \"RunId\"; }; sequence: number; occurredAt: string...",
          "desc": "Safe parse — returns { success, data } or { success, error }\nInferred type of {@link safeParseRunEventSchema}.",
          "params": [
            {
              "n": "data",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "ZodSafeParseResult<{ id: string; runId: string & { readonly __brand: \"RunId\"; }; sequence: number; occurredAt: string..."
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonRpcMessage",
      "desc": "JSON-RPC 2.0 types — shared between MCP and LSP packages.\n\nThese are the wire-format types for JSON-RPC communication.\nJSON-RPC 2.0 base message.",
      "methods": [],
      "props": [
        {
          "name": "jsonrpc",
          "type": "\"2.0\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonRpcRequest",
      "desc": "JSON-RPC 2.0 request.",
      "methods": [],
      "props": [
        {
          "name": "jsonrpc",
          "type": "\"2.0\"",
          "required": true,
          "desc": "",
          "inherited": "JsonRpcMessage"
        },
        {
          "name": "id",
          "type": "string | number",
          "required": true,
          "desc": ""
        },
        {
          "name": "method",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "params",
          "type": "unknown",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonRpcResponse",
      "desc": "JSON-RPC 2.0 response.",
      "methods": [],
      "props": [
        {
          "name": "jsonrpc",
          "type": "\"2.0\"",
          "required": true,
          "desc": "",
          "inherited": "JsonRpcMessage"
        },
        {
          "name": "id",
          "type": "string | number",
          "required": true,
          "desc": ""
        },
        {
          "name": "result",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "error",
          "type": "JsonRpcError | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonRpcError",
      "desc": "JSON-RPC 2.0 error object.",
      "methods": [],
      "props": [
        {
          "name": "code",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "message",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "data",
          "type": "unknown",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonRpcNotification",
      "desc": "JSON-RPC 2.0 notification (request without id).",
      "methods": [],
      "props": [
        {
          "name": "jsonrpc",
          "type": "\"2.0\"",
          "required": true,
          "desc": "",
          "inherited": "JsonRpcMessage"
        },
        {
          "name": "method",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "params",
          "type": "unknown",
          "required": false,
          "desc": ""
        }
      ]
    }
  ]
},
{
  "id": "session",
  "name": "@vinhnt-sdk/session",
  "icon": "Se",
  "tag": "Core",
  "desc": "Session persistence, conversation compaction, title generation.",
  "deps": [
    "schema"
  ],
  "exports": [
    {
      "type": "type",
      "name": "RunEventSnapshot",
      "desc": "RunEventSnapshot",
      "methods": [],
      "props": [
        {
          "name": "runId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sequence",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "state",
          "type": "Record<string, unknown>",
          "required": true,
          "desc": ""
        },
        {
          "name": "occurredAt",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEventListener",
      "desc": "RunEventListener",
      "methods": [
        {
          "sig": "type RunEventListener = RunEventListener",
          "desc": "RunEventListener",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionUpdates",
      "desc": "SessionUpdates",
      "methods": [
        {
          "sig": "type SessionUpdates = Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | ...",
          "desc": "SessionUpdates",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunEventStore",
      "desc": "RunEventStore",
      "methods": [
        {
          "sig": "append(event: RunEvent<unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "appendTransactional(event: RunEvent<unknown>, sessionUpdate: { sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            },
            {
              "n": "sessionUpdate",
              "t": "{ sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output...",
              "r": false,
              "d": "{ sessionId: string; updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"output..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "exists(eventId: string): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "eventId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "list(runId: string, afterSequence: number | undefined): Promise<readonly RunEvent<unknown>[]>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "afterSequence",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly RunEvent<unknown>[]>"
        },
        {
          "sig": "listRunIds(): Promise<string[]>",
          "desc": "List all run IDs that have persisted events (for active-run discovery on restart).",
          "params": [],
          "ret": "Promise<string[]>"
        },
        {
          "sig": "getNextSequence(aggregateId: string): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "appendWithSequence(event: RunEvent<unknown>): Promise<number>",
          "desc": "Atomically allocate the next sequence for the aggregate and append the event\nin a single operation, then return the assigned sequence.\n\nImplementations that cannot do this atomically should fall back to\n`getNextSequence() + append()` for the returned value.",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "state",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getSnapshot(runId: string): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "sequence",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "subscribe(listener: RunEventListener): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "RunEventListener",
              "r": true,
              "d": "RunEventListener"
            }
          ],
          "ret": "() => void"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "SessionStore",
      "desc": "SessionStore",
      "methods": [
        {
          "sig": "createSession(title: string | undefined, parentSessionId: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentSessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "forkSession(sourceSessionId: string, title: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "sourceSessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "getSession(id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "listSessions(limit: number | undefined, offset: number | undefined): Promise<readonly Session[]>",
          "desc": "",
          "params": [
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "offset",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Session[]>"
        },
        {
          "sig": "updateSession(id: string, updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...",
              "r": true,
              "d": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deleteSession(id: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "addMessage(sessionId: string, role: string, content: string, toolCallId: string | undefined, tokens: { input: number; output: number; reasoning?: number; } | undefined, model: string | undefined, cost: number | undefined, admittedSeq: number | undefined): Promise<Message>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "role",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "toolCallId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "tokens",
              "t": "{ input: number; output: number; reasoning?: number; } | undefined",
              "r": false,
              "d": "{ input: number; output: number; reasoning?: number; } | undefined"
            },
            {
              "n": "model",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "cost",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "admittedSeq",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<Message>"
        },
        {
          "sig": "updateMessage(sessionId: string, messageId: string, updates: MessageSeqUpdates): Promise<void>",
          "desc": "Update message-level fields (e.g. mark a pending input as promoted on drain).\nOptional so minimal stores can skip input-segment tracking.",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "messageId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "updates",
              "t": "MessageSeqUpdates",
              "r": true,
              "d": "MessageSeqUpdates"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listMessages(sessionId: string): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "searchMessages(query: string, limit: number | undefined): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "getSessionStats(): Promise<SessionStats>",
          "desc": "",
          "params": [],
          "ret": "Promise<SessionStats>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "MessageSeqUpdates",
      "desc": "Promotion state update for a pending input message (RV-21).",
      "methods": [
        {
          "sig": "type MessageSeqUpdates = MessageSeqUpdates",
          "desc": "Promotion state update for a pending input message (RV-21).",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionProvider",
      "desc": "Session provider — bundles session store + event store as a single unit.\n\nThis is the top-level abstraction that consumers (core kernel) depend on.\nIt encapsulates the persistence layer and can be swapped without\ntouching the kernel.",
      "methods": [
        {
          "sig": "dispose(): Promise<void>",
          "desc": "Dispose resources (connections, file handles, etc.).",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "sessionStore",
          "type": "SessionStore",
          "required": true,
          "desc": "The session store — CRUD for sessions and messages."
        },
        {
          "name": "eventStore",
          "type": "RunEventStore",
          "required": true,
          "desc": "The event store — append-only event log with snapshots."
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Provider name (for logging/debugging)."
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionProviderConfig",
      "desc": "Configuration for creating a session provider.",
      "methods": [],
      "props": [
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": "Provider name (default: \"memory\")."
        },
        {
          "name": "databaseUrl",
          "type": "string | undefined",
          "required": false,
          "desc": "Database URL (for drizzle providers)."
        },
        {
          "name": "walMode",
          "type": "boolean | undefined",
          "required": false,
          "desc": "Enable WAL mode for SQLite (default: true)."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "NullRunEventStore",
      "desc": "No-op {@link RunEventStore} used for testing.",
      "methods": [
        {
          "sig": "append(event: RunEvent<unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "appendWithSequence(event: RunEvent<unknown>): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "RunEvent<unknown>",
              "r": true,
              "d": "RunEvent<unknown>"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "list(_runId: string, _afterSequence: number | undefined): Promise<readonly RunEvent<unknown>[]>",
          "desc": "",
          "params": [
            {
              "n": "_runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_afterSequence",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly RunEvent<unknown>[]>"
        },
        {
          "sig": "listRunIds(): Promise<string[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<string[]>"
        },
        {
          "sig": "saveSnapshot(_runId: string, _state: Record<string, unknown>): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "_runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_state",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "getSnapshot(_runId: string): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "_runId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "getSnapshotAfterSequence(_runId: string, _sequence: number): Promise<RunEventSnapshot | null>",
          "desc": "",
          "params": [
            {
              "n": "_runId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_sequence",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<RunEventSnapshot | null>"
        },
        {
          "sig": "getNextSequence(_aggregateId: string): Promise<number>",
          "desc": "",
          "params": [
            {
              "n": "_aggregateId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<number>"
        },
        {
          "sig": "subscribe(listener: (event: RunEvent<unknown>) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(event: RunEvent<unknown>) => void",
              "r": true,
              "d": "(event: RunEvent<unknown>) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "listeners: Set<(event: RunEvent<unknown>) => void>",
          "desc": "listeners",
          "params": []
        },
        {
          "sig": "events: RunEvent<unknown>[]",
          "desc": "events",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "NullSessionStore",
      "desc": "No-op {@link SessionStore} used for testing.",
      "methods": [
        {
          "sig": "createSession(_title: string | undefined, _parentSessionId: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "_title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "_parentSessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "forkSession(_sourceSessionId: string, _title: string | undefined): Promise<Session>",
          "desc": "",
          "params": [
            {
              "n": "_sourceSessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_title",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<Session>"
        },
        {
          "sig": "getSession(_id: string): Promise<Session | null>",
          "desc": "",
          "params": [
            {
              "n": "_id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<Session | null>"
        },
        {
          "sig": "listSessions(_limit: number | undefined, _offset: number | undefined): Promise<readonly Session[]>",
          "desc": "",
          "params": [
            {
              "n": "_limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "_offset",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Session[]>"
        },
        {
          "sig": "updateSession(_id: string, _updates: Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "_id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_updates",
              "t": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI...",
              "r": true,
              "d": "Partial<Pick<Session, \"title\" | \"isActive\" | \"model\" | \"cost\" | \"inputTokens\" | \"outputTokens\" | \"location\" | \"agentI..."
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deleteSession(_id: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "_id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "addMessage(_sessionId: string, _role: string, _content: string, _toolCallId: string | undefined, _tokens: { input: number; output: number; reasoning?: number; } | undefined, _model: string | undefined, _cost: number | undefined, _admittedSeq: number | undefined): Promise<Message>",
          "desc": "",
          "params": [
            {
              "n": "_sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_role",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_content",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_toolCallId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "_tokens",
              "t": "{ input: number; output: number; reasoning?: number; } | undefined",
              "r": false,
              "d": "{ input: number; output: number; reasoning?: number; } | undefined"
            },
            {
              "n": "_model",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "_cost",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            },
            {
              "n": "_admittedSeq",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<Message>"
        },
        {
          "sig": "updateMessage(_sessionId: string, _messageId: string, _updates: { admittedSeq?: number; promotedSeq?: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "_sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_messageId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_updates",
              "t": "{ admittedSeq?: number; promotedSeq?: number; }",
              "r": true,
              "d": "{ admittedSeq?: number; promotedSeq?: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listMessages(_sessionId: string): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "_sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "searchMessages(_query: string, _limit: number | undefined): Promise<readonly Message[]>",
          "desc": "",
          "params": [
            {
              "n": "_query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_limit",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "Promise<readonly Message[]>"
        },
        {
          "sig": "getSessionStats(): Promise<SessionStats>",
          "desc": "",
          "params": [],
          "ret": "Promise<SessionStats>"
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionRuntimeState",
      "desc": "Runtime state of an active agent session",
      "methods": [
        {
          "sig": "pushMessage(msg: ChatMessage): void",
          "desc": "Append a message to conversation history",
          "params": [
            {
              "n": "msg",
              "t": "ChatMessage",
              "r": true,
              "d": "ChatMessage"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "resetMessages(msgs: readonly ChatMessage[]): void",
          "desc": "Replace the entire message list (e.g. after compaction)",
          "params": [
            {
              "n": "msgs",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setContext(key: string, value: unknown): void",
          "desc": "Set a context value",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "clearContext(): void",
          "desc": "Clear all context values",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "snapshot(): SessionRuntimeSnapshot",
          "desc": "Snapshot current state for serialisation",
          "params": [],
          "ret": "SessionRuntimeSnapshot"
        },
        {
          "sig": "restore(snapshot: SessionRuntimeSnapshot): void",
          "desc": "Restore from snapshot",
          "params": [
            {
              "n": "snapshot",
              "t": "SessionRuntimeSnapshot",
              "r": true,
              "d": "SessionRuntimeSnapshot"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "fork(): SessionRuntimeState",
          "desc": "Create an independent copy for parallel sub-agent execution",
          "params": [],
          "ret": "SessionRuntimeState"
        }
      ],
      "props": [
        {
          "name": "messages",
          "type": "readonly ChatMessage[]",
          "required": true,
          "desc": "Ordered conversation messages for model context"
        },
        {
          "name": "context",
          "type": "ReadonlyMap<string, unknown>",
          "required": true,
          "desc": "Active context sources as key-value pairs"
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": "Current step count in the kernel loop"
        },
        {
          "name": "toolCallCount",
          "type": "number",
          "required": true,
          "desc": "Cumulative tool calls in this run"
        },
        {
          "name": "isRunning",
          "type": "boolean",
          "required": true,
          "desc": "Whether the session is currently executing"
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionRuntimeSnapshot",
      "desc": "Serializable snapshot of SessionRuntimeState",
      "methods": [],
      "props": [
        {
          "name": "messages",
          "type": "readonly ChatMessage[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "context",
          "type": "Readonly<Record<string, unknown>>",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolCallCount",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "isRunning",
          "type": "boolean",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemorySessionState",
      "desc": "In-memory {@link SessionRuntimeState} implementation.",
      "methods": [
        {
          "sig": "pushMessage(msg: ChatMessage): void",
          "desc": "",
          "params": [
            {
              "n": "msg",
              "t": "ChatMessage",
              "r": true,
              "d": "ChatMessage"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "resetMessages(msgs: readonly ChatMessage[]): void",
          "desc": "",
          "params": [
            {
              "n": "msgs",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setContext(key: string, value: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "key",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "clearContext(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "snapshot(): SessionRuntimeSnapshot",
          "desc": "",
          "params": [],
          "ret": "SessionRuntimeSnapshot"
        },
        {
          "sig": "restore(snapshot: SessionRuntimeSnapshot): void",
          "desc": "",
          "params": [
            {
              "n": "snapshot",
              "t": "SessionRuntimeSnapshot",
              "r": true,
              "d": "SessionRuntimeSnapshot"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "fork(): SessionRuntimeState",
          "desc": "",
          "params": [],
          "ret": "SessionRuntimeState"
        },
        {
          "sig": "_messages: ChatMessage[]",
          "desc": "_messages",
          "params": []
        },
        {
          "sig": "_context: Map<string, unknown>",
          "desc": "_context",
          "params": []
        },
        {
          "sig": "step: number",
          "desc": "step",
          "params": []
        },
        {
          "sig": "toolCallCount: number",
          "desc": "toolCallCount",
          "params": []
        },
        {
          "sig": "isRunning: boolean",
          "desc": "isRunning",
          "params": []
        },
        {
          "sig": "get messages(): readonly ChatMessage[]",
          "desc": "",
          "params": []
        },
        {
          "sig": "get context(): ReadonlyMap<string, unknown>",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RestoredRun",
      "desc": "Result of restoring a run from durable storage.",
      "methods": [],
      "props": [
        {
          "name": "sessionState",
          "type": "SessionRuntimeState",
          "required": true,
          "desc": "The restored session runtime state with messages and step count."
        },
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": "The run ID being restored."
        },
        {
          "name": "sessionId",
          "type": "string | undefined",
          "required": true,
          "desc": "The session ID associated with the run."
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": "The step count restored from snapshot."
        },
        {
          "name": "totalInputTokens",
          "type": "number",
          "required": true,
          "desc": "Token counts restored from snapshot."
        },
        {
          "name": "totalOutputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "model",
          "type": "string | undefined",
          "required": true,
          "desc": "The model name from the snapshot."
        },
        {
          "name": "finalOutput",
          "type": "string | undefined",
          "required": true,
          "desc": "The final output if the run completed."
        }
      ]
    },
    {
      "type": "function",
      "name": "restoreRunFromStore",
      "desc": "Restore a run's state from durable storage (snapshot + messages).\n\nThis enables \"durable history reload\" — after a process restart, the kernel\ncan reconstruct the conversation context and continue from where it left off.\n\nUsage:\n  const restored = await restoreRunFromStore(store, sessionStore, runId);\n  if (restored) {\n    // Use restored.sessionState to resume the run\n    kernel.run(prompt, ctx, sessionId, restored.sessionState);\n  }",
      "methods": [
        {
          "sig": "restoreRunFromStore(eventStore: RunEventStore, sessionStore: SessionStore | undefined, runId: RunId): Promise<RestoredRun | null>",
          "desc": "Restore a run's state from durable storage (snapshot + messages).\n\nThis enables \"durable history reload\" — after a process restart, the kernel\ncan reconstruct the conversation context and continue from where it left off.\n\nUsage:\n  const restored = await restoreRunFromStore(store, sessionStore, runId);\n  if (restored) {\n    // Use restored.sessionState to resume the run\n    kernel.run(prompt, ctx, sessionId, restored.sessionState);\n  }",
          "params": [
            {
              "n": "eventStore",
              "t": "RunEventStore",
              "r": true,
              "d": "RunEventStore"
            },
            {
              "n": "sessionStore",
              "t": "SessionStore | undefined",
              "r": true,
              "d": "SessionStore | undefined"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "Promise<RestoredRun | null>"
        }
      ]
    },
    {
      "type": "function",
      "name": "findActiveSessionIds",
      "desc": "Reconstruct session busy state from event store on startup.\nReturns session IDs that have non-terminal (pending/running) events.",
      "methods": [
        {
          "sig": "findActiveSessionIds(eventStore: RunEventStore): Promise<string[]>",
          "desc": "Reconstruct session busy state from event store on startup.\nReturns session IDs that have non-terminal (pending/running) events.",
          "params": [
            {
              "n": "eventStore",
              "t": "RunEventStore",
              "r": true,
              "d": "RunEventStore"
            }
          ],
          "ret": "Promise<string[]>"
        }
      ]
    },
    {
      "type": "type",
      "name": "SessionTree",
      "desc": "Contract for a hierarchical session tree with navigation and eventing.",
      "methods": [
        {
          "sig": "add(sessionId: SessionId, title: string, parentId: SessionId | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "title",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "parentId",
              "t": "SessionId | undefined",
              "r": false,
              "d": "SessionId | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "remove(sessionId: SessionId): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "move(sessionId: SessionId, newParentId: SessionId | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "newParentId",
              "t": "SessionId | undefined",
              "r": false,
              "d": "SessionId | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "get(sessionId: SessionId): SessionNode | undefined",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "SessionNode | undefined"
        },
        {
          "sig": "getChildren(sessionId: SessionId): readonly SessionNode[]",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getAncestors(sessionId: SessionId): readonly SessionNode[]",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getRoots(): readonly SessionNode[]",
          "desc": "",
          "params": [],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getSnapshot(): SessionTreeSnapshot",
          "desc": "",
          "params": [],
          "ret": "SessionTreeSnapshot"
        },
        {
          "sig": "setActive(sessionId: SessionId): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setTitle(sessionId: SessionId, title: string): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "title",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "onEvent(listener: (event: SessionTreeEvent) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(event: SessionTreeEvent) => void",
              "r": true,
              "d": "(event: SessionTreeEvent) => void"
            }
          ],
          "ret": "() => void"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "InMemorySessionTree",
      "desc": "In-memory {@link SessionTree} implementation.",
      "methods": [
        {
          "sig": "add(sessionId: SessionId, title: string, parentId: SessionId | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "title",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "parentId",
              "t": "SessionId | undefined",
              "r": false,
              "d": "SessionId | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "remove(sessionId: SessionId): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "move(sessionId: SessionId, newParentId: SessionId | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "newParentId",
              "t": "SessionId | undefined",
              "r": false,
              "d": "SessionId | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "get(sessionId: SessionId): SessionNode | undefined",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "SessionNode | undefined"
        },
        {
          "sig": "getChildren(sessionId: SessionId): readonly SessionNode[]",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getAncestors(sessionId: SessionId): readonly SessionNode[]",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getRoots(): readonly SessionNode[]",
          "desc": "",
          "params": [],
          "ret": "readonly SessionNode[]"
        },
        {
          "sig": "getSnapshot(): SessionTreeSnapshot",
          "desc": "",
          "params": [],
          "ret": "SessionTreeSnapshot"
        },
        {
          "sig": "setActive(sessionId: SessionId): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setTitle(sessionId: SessionId, title: string): void",
          "desc": "",
          "params": [
            {
              "n": "sessionId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "title",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "onEvent(listener: (event: SessionTreeEvent) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(event: SessionTreeEvent) => void",
              "r": true,
              "d": "(event: SessionTreeEvent) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "toNode(node: InternalNode, _depth: number): SessionNode",
          "desc": "",
          "params": [
            {
              "n": "node",
              "t": "InternalNode",
              "r": true,
              "d": "InternalNode"
            },
            {
              "n": "_depth",
              "t": "number",
              "r": false,
              "d": "number"
            }
          ],
          "ret": "SessionNode"
        },
        {
          "sig": "isDescendant(ancestorId: SessionId, candidateId: SessionId): boolean",
          "desc": "",
          "params": [
            {
              "n": "ancestorId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            },
            {
              "n": "candidateId",
              "t": "SessionId",
              "r": true,
              "d": "SessionId"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "emit(event: SessionTreeEvent): void",
          "desc": "",
          "params": [
            {
              "n": "event",
              "t": "SessionTreeEvent",
              "r": true,
              "d": "SessionTreeEvent"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "nodes: Map<string, InternalNode>",
          "desc": "nodes",
          "params": []
        },
        {
          "sig": "listeners: Set<(event: SessionTreeEvent) => void>",
          "desc": "listeners",
          "params": []
        },
        {
          "sig": "activeId: SessionId | null",
          "desc": "activeId",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ConversationCompactor",
      "desc": "Abstract conversation compactor: compresses a transcript and reports the result.",
      "methods": [
        {
          "sig": "compact(messages: readonly ChatMessage[], signal: AbortSignal | undefined): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>",
          "desc": "",
          "params": [
            {
              "n": "messages",
              "t": "readonly ChatMessage[]",
              "r": true,
              "d": "readonly ChatMessage[]"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary; }>"
        }
      ],
      "props": []
    },
    {
      "type": "function",
      "name": "createDefaultSessionTitleGenerator",
      "desc": "Create a session title generator backed by the given model.",
      "methods": [
        {
          "sig": "createDefaultSessionTitleGenerator(model: ModelProvider): (prompt: string) => Promise<string>",
          "desc": "Create a session title generator backed by the given model.",
          "params": [
            {
              "n": "model",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "(prompt: string) => Promise<string>"
        }
      ]
    }
  ]
},
{
  "id": "step-executor",
  "name": "@vinhnt-sdk/step-executor",
  "icon": "S",
  "tag": "Core",
  "desc": "Step execution: tool lifecycle, timeouts, permission gating, doom-loop, circuit breaker.",
  "deps": [
    "event",
    "llm",
    "permission",
    "schema",
    "security",
    "session",
    "tools"
  ],
  "exports": [
    {
      "type": "type",
      "name": "StepExecutorPluginHooks",
      "desc": "Minimal structural plugin-hook surface used by the step executor.\n\nHosts (e.g. core's `PluginManager`) only need to implement `fireHook` for\nthe tool-lifecycle / permission hook names; no direct dependency on the\nfull plugin contract.",
      "methods": [
        {
          "sig": "fireHook(name: \"onToolInvoked\" | \"onBeforeToolExecution\" | \"onAfterToolExecution\" | \"onToolCompleted\" | \"onToolFailed\" | \"onShellEnv..., data: Record<string, unknown>): void | Promise<void | { modified: Record<string, unknown>; } | null> | { modified: Record<string, unknown>; } | null",
          "desc": "",
          "params": [
            {
              "n": "name",
              "t": "\"onToolInvoked\" | \"onBeforeToolExecution\" | \"onAfterToolExecution\" | \"onToolCompleted\" | \"onToolFailed\" | \"onShellEnv...",
              "r": true,
              "d": "\"onToolInvoked\" | \"onBeforeToolExecution\" | \"onAfterToolExecution\" | \"onToolCompleted\" | \"onToolFailed\" | \"onShellEnv..."
            },
            {
              "n": "data",
              "t": "Record<string, unknown>",
              "r": true,
              "d": "Record<string, unknown>"
            }
          ],
          "ret": "void | Promise<void | { modified: Record<string, unknown>; } | null> | { modified: Record<string, unknown>; } | null"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "StepExecutor",
      "desc": "Executes tool calls within a run step — manages permissions, approval,\r\nplugin hooks, doom-loop detection, external-path checking, concurrent\r\nexecution, self-correction, saga recording, and fallback strategies.",
      "methods": [
        {
          "sig": "constructor(deps: StepExecutorDeps)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "deps",
              "t": "StepExecutorDeps",
              "r": true,
              "d": "StepExecutorDeps"
            }
          ]
        },
        {
          "sig": "setSaga(saga: ToolSaga): void",
          "desc": "Swap the saga reference for per-run saga scoping",
          "params": [
            {
              "n": "saga",
              "t": "ToolSaga",
              "r": true,
              "d": "ToolSaga"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setCurrentAgent(agent: AgentConfig | undefined): void",
          "desc": "Swap the current agent reference for per-run agent scoping",
          "params": [
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": true,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getCurrentAgent(): AgentConfig | undefined",
          "desc": "Get the current agent reference (used by kernel to save prev before swap)",
          "params": [],
          "ret": "AgentConfig | undefined"
        },
        {
          "sig": "agentFor(runId: RunId): AgentConfig | undefined",
          "desc": "Resolve the agent that owns the given run, falling back to the instance default.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "AgentConfig | undefined"
        },
        {
          "sig": "sagaFor(runId: RunId): ToolSaga",
          "desc": "Resolve the saga that owns the given run, falling back to the instance default.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "ToolSaga"
        },
        {
          "sig": "runConcurrent(tasks: (() => Promise<T>)[], concurrency: number): Promise<PromiseSettledResult<T>[]>",
          "desc": "",
          "params": [
            {
              "n": "tasks",
              "t": "(() => Promise<T>)[]",
              "r": true,
              "d": "(() => Promise<T>)[]"
            },
            {
              "n": "concurrency",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<PromiseSettledResult<T>[]>"
        },
        {
          "sig": "executeToolCalls(toolCalls: ToolExecutionPlan[], messages: ChatMessage[], step: number, runId: RunId, ctx: RequestContext, runAbort: AbortController, sessionId: string | undefined, runModel: ModelProvider): Promise<{ toolCallCount: number; recentCalls: RecentCall[]; selfCorrectTokens: { input: number; output: number; }; to...",
          "desc": "Execute a batch of tool calls for the current step.\r\nHandles permission gating, approval dialogs, plugin hooks, doom-loop\r\ndetection, external-path checks, concurrent execution with configurable\r\nconcurrency, self-correction on failure, and saga compensation recording.",
          "params": [
            {
              "n": "toolCalls",
              "t": "ToolExecutionPlan[]",
              "r": true,
              "d": "ToolExecutionPlan[]"
            },
            {
              "n": "messages",
              "t": "ChatMessage[]",
              "r": true,
              "d": "ChatMessage[]"
            },
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "runAbort",
              "t": "AbortController",
              "r": true,
              "d": "AbortController"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            },
            {
              "n": "runModel",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            }
          ],
          "ret": "Promise<{ toolCallCount: number; recentCalls: RecentCall[]; selfCorrectTokens: { input: number; output: number; }; to..."
        },
        {
          "sig": "buildToolContext(tc: ToolExecutionPlan, runId: RunId, sessionId: string | undefined, ctx: RequestContext, runAbort: AbortController, tool: ToolDefinition<unknown, unknown>, compensationRef: { current: (() => Promise<void>) | null; }, metadataRef: MetadataRef): Promise<ToolContext>",
          "desc": "",
          "params": [
            {
              "n": "tc",
              "t": "ToolExecutionPlan",
              "r": true,
              "d": "ToolExecutionPlan"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "runAbort",
              "t": "AbortController",
              "r": true,
              "d": "AbortController"
            },
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            },
            {
              "n": "compensationRef",
              "t": "{ current: (() => Promise<void>) | null; }",
              "r": true,
              "d": "{ current: (() => Promise<void>) | null; }"
            },
            {
              "n": "metadataRef",
              "t": "MetadataRef",
              "r": true,
              "d": "MetadataRef"
            }
          ],
          "ret": "Promise<ToolContext>"
        },
        {
          "sig": "handleApproval(permResult: PermissionCheckResult, tc: ToolExecutionPlan, toolCtx: ToolContext, runId: RunId, ctx: RequestContext, _sessionId: string | undefined, messages: ChatMessage[], selfApproving: boolean | undefined): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "permResult",
              "t": "PermissionCheckResult",
              "r": true,
              "d": "PermissionCheckResult"
            },
            {
              "n": "tc",
              "t": "ToolExecutionPlan",
              "r": true,
              "d": "ToolExecutionPlan"
            },
            {
              "n": "toolCtx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "_sessionId",
              "t": "string | undefined",
              "r": true,
              "d": "string | undefined"
            },
            {
              "n": "messages",
              "t": "ChatMessage[]",
              "r": true,
              "d": "ChatMessage[]"
            },
            {
              "n": "selfApproving",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "runSelfCorrection(tc: ToolExecutionPlan, messages: ChatMessage[], recentCalls: RecentCall[], step: number, runId: RunId, ctx: RequestContext, runAbort: AbortController, toolCtx: ToolContext, errorMsg: string, runModel: ModelProvider, selfCorrectTokens: { input: number; output: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "tc",
              "t": "ToolExecutionPlan",
              "r": true,
              "d": "ToolExecutionPlan"
            },
            {
              "n": "messages",
              "t": "ChatMessage[]",
              "r": true,
              "d": "ChatMessage[]"
            },
            {
              "n": "recentCalls",
              "t": "RecentCall[]",
              "r": true,
              "d": "RecentCall[]"
            },
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "ctx",
              "t": "RequestContext",
              "r": true,
              "d": "RequestContext"
            },
            {
              "n": "runAbort",
              "t": "AbortController",
              "r": true,
              "d": "AbortController"
            },
            {
              "n": "toolCtx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            },
            {
              "n": "errorMsg",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "runModel",
              "t": "ModelProvider",
              "r": true,
              "d": "ModelProvider"
            },
            {
              "n": "selfCorrectTokens",
              "t": "{ input: number; output: number; }",
              "r": true,
              "d": "{ input: number; output: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "deps: StepExecutorDeps",
          "desc": "deps",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "StepExecutorDeps",
      "desc": "Dependencies required by {@link StepExecutor}.",
      "methods": [],
      "props": [
        {
          "name": "store",
          "type": "{ emitEvent(event: Omit<KnownRunEvent, \"sequence\">, persist?: boolean | undefined): Promise<void>; }",
          "required": true,
          "desc": ""
        },
        {
          "name": "addSessionMessage",
          "type": "(sessionId: string | undefined, role: string, content: string, extra?: Record<string, unknown> | undefined) => Promis...",
          "required": true,
          "desc": ""
        },
        {
          "name": "pluginManager",
          "type": "StepExecutorPluginHooks | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "permissionGate",
          "type": "PermissionGate",
          "required": true,
          "desc": ""
        },
        {
          "name": "modelCaller",
          "type": "ModelCaller",
          "required": true,
          "desc": ""
        },
        {
          "name": "maxToolCallsPerStep",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "maxConcurrentToolCalls",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxSelfCorrectAttempts",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "selfCorrectOnFailure",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "currentAgent",
          "type": "AgentConfig | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "saga",
          "type": "ToolSaga",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentForRun",
          "type": "((runId: RunId) => AgentConfig | undefined) | undefined",
          "required": false,
          "desc": "Resolve the active agent for a run — used to keep parallel runs isolated."
        },
        {
          "name": "sagaForRun",
          "type": "((runId: RunId) => ToolSaga) | undefined",
          "required": false,
          "desc": "Resolve the active saga for a run — used to keep parallel runs isolated."
        },
        {
          "name": "doomLoopThreshold",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "externalDirectoryAccess",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "workspaceRoot",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "findTool",
          "type": "(name: string, runId?: RunId | undefined) => ToolDefinition<unknown, unknown> | undefined",
          "required": true,
          "desc": ""
        },
        {
          "name": "hasTool",
          "type": "(name: string) => boolean",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolExecutionPlan",
      "desc": "One planned tool invocation within a step.",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "args",
          "type": "unknown",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "toolDomain",
      "desc": "Derive the owning domain from a namespaced tool id:\n`mcp__<server>__<tool>` → \"mcp:<server>\", `coding.read_file` → \"coding\",\nbare ids → \"core\".",
      "methods": [
        {
          "sig": "toolDomain(toolName: string): string",
          "desc": "Derive the owning domain from a namespaced tool id:\n`mcp__<server>__<tool>` → \"mcp:<server>\", `coding.read_file` → \"coding\",\nbare ids → \"core\".",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "evaluateStopConditions",
      "desc": "Evaluate declarative stop conditions against a step context. Returns the\nfirst matching condition, or undefined to continue. Kinds that need external\ninfrastructure (file-unchanged, screenshot, llm-judge) return undefined here;\nwire them through `stopHooks` / an evaluator agent instead.",
      "methods": [
        {
          "sig": "evaluateStopConditions(conditions: readonly StopCondition[], ctx: StepVerificationContext): StopCondition | undefined",
          "desc": "Evaluate declarative stop conditions against a step context. Returns the\nfirst matching condition, or undefined to continue. Kinds that need external\ninfrastructure (file-unchanged, screenshot, llm-judge) return undefined here;\nwire them through `stopHooks` / an evaluator agent instead.",
          "params": [
            {
              "n": "conditions",
              "t": "readonly StopCondition[]",
              "r": true,
              "d": "readonly StopCondition[]"
            },
            {
              "n": "ctx",
              "t": "StepVerificationContext",
              "r": true,
              "d": "StepVerificationContext"
            }
          ],
          "ret": "StopCondition | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "buildJudgeMessages",
      "desc": "Build the judge prompt for an `llm-judge` stop condition. The evaluator is\nasked to return a single verdict, not a long essay — cheap enough to run\nevery step.",
      "methods": [
        {
          "sig": "buildJudgeMessages(condition: { kind: \"llm-judge\"; agent: string; criteria: readonly string[]; }, ctx: StepVerificationContext, evaluatorAgent: string | undefined): { role: \"system\" | \"user\"; content: string; }[]",
          "desc": "Build the judge prompt for an `llm-judge` stop condition. The evaluator is\nasked to return a single verdict, not a long essay — cheap enough to run\nevery step.",
          "params": [
            {
              "n": "condition",
              "t": "{ kind: \"llm-judge\"; agent: string; criteria: readonly string[]; }",
              "r": true,
              "d": "{ kind: \"llm-judge\"; agent: string; criteria: readonly string[]; }"
            },
            {
              "n": "ctx",
              "t": "StepVerificationContext",
              "r": true,
              "d": "StepVerificationContext"
            },
            {
              "n": "evaluatorAgent",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "{ role: \"system\" | \"user\"; content: string; }[]"
        }
      ]
    },
    {
      "type": "function",
      "name": "parseJudgeVerdict",
      "desc": "Parse a judge verdict (`{\"met\": true|false}`) tolerantly.",
      "methods": [
        {
          "sig": "parseJudgeVerdict(content: string): { met: boolean; }",
          "desc": "Parse a judge verdict (`{\"met\": true|false}`) tolerantly.",
          "params": [
            {
              "n": "content",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "{ met: boolean; }"
        }
      ]
    },
    {
      "type": "function",
      "name": "toToolCallOutcome",
      "desc": "Normalize an arbitrary tool result into an outcome (exitCode from structured output).",
      "methods": [
        {
          "sig": "toToolCallOutcome(toolName: string, output: unknown): ToolCallOutcome",
          "desc": "Normalize an arbitrary tool result into an outcome (exitCode from structured output).",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "output",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "ToolCallOutcome"
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolCallOutcome",
      "desc": "── Termination policy (Phase 4) ─────────────────────────────────────────\nA declarative, per-run exit strategy layered on top of the plain loop:\nhard step cap, token budget, and stop conditions / hooks that are verified\nafter each step. The loop stays the unit of execution; the policy decides\nwhen it may stop early (success) or must be cut (budget exhausted).\nResult of one tool invocation, used by stop-condition evaluation.",
      "methods": [],
      "props": [
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "exitCode",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StepVerificationContext",
      "desc": "Read-only snapshot the loop exposes to stop conditions / hooks each step.",
      "methods": [],
      "props": [
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "finalOutput",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalInputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "totalOutputTokens",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "lastStepToolOutcomes",
          "type": "readonly ToolCallOutcome[]",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "StopCondition",
      "desc": "Declarative condition that can end the loop early.",
      "methods": [
        {
          "sig": "type StopCondition = StopCondition",
          "desc": "Declarative condition that can end the loop early.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "TerminationPolicy",
      "desc": "Hard limits and stop conditions that terminate a run.",
      "methods": [],
      "props": [
        {
          "name": "maxSteps",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-run hard step cap (overrides the kernel default when set)."
        },
        {
          "name": "budgetTokens",
          "type": "{ readonly input?: number; readonly output?: number; readonly total?: number; } | undefined",
          "required": false,
          "desc": "Token budget — the loop is cut when any limit is exceeded."
        },
        {
          "name": "stopConditions",
          "type": "readonly StopCondition[] | undefined",
          "required": false,
          "desc": "Declarative conditions checked after each step (e.g. stop-when-build-green)."
        },
        {
          "name": "stopHooks",
          "type": "readonly { onStepEnded(ctx: StepVerificationContext): Promise<\"continue\" | \"stop\">; }[] | undefined",
          "required": false,
          "desc": "Deterministic async hooks — return \"stop\" to end the run early as success."
        },
        {
          "name": "evaluatorAgent",
          "type": "string | undefined",
          "required": false,
          "desc": "Evaluator-optimizer: id of the judge agent used for `llm-judge` conditions."
        }
      ]
    },
    {
      "type": "class",
      "name": "PermissionGate",
      "desc": "Enforces 4-phase permission gating: global rules, agent perms, dynamic rules, risk defaults.",
      "methods": [
        {
          "sig": "constructor(deps: PermissionGateDeps)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "deps",
              "t": "PermissionGateDeps",
              "r": true,
              "d": "PermissionGateDeps"
            }
          ]
        },
        {
          "sig": "setAutoApprovalEnabled(enabled: boolean): void",
          "desc": "Toggle auto-approval at runtime (mirrors config.autoApprovalEnabled).",
          "params": [
            {
              "n": "enabled",
              "t": "boolean",
              "r": true,
              "d": "boolean"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setGlobalRules(configRules: Record<string, string | Record<string, string>>): void",
          "desc": "Parse and apply config-level permission rules (OpenCode-style nested `{ tool: \"allow|deny|ask\" }`).",
          "params": [
            {
              "n": "configRules",
              "t": "Record<string, string | Record<string, string>>",
              "r": true,
              "d": "Record<string, string | Record<string, string>>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setTopLevelRules(rules: Record<\"allow\" | \"deny\" | \"ask\", string[]>): void",
          "desc": "Apply top-level `allow`/`deny`/`ask` pattern lists (OpenCode-style\n`\"ToolName(glob)\"` strings). These take precedence over risk defaults and\nagent-level allowed/denied tool lists.",
          "params": [
            {
              "n": "rules",
              "t": "Record<\"allow\" | \"deny\" | \"ask\", string[]>",
              "r": true,
              "d": "Record<\"allow\" | \"deny\" | \"ask\", string[]>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "addDynamicRule(rule: DynamicRule): void",
          "desc": "Register a user-approved dynamic rule (last-match-wins over risk defaults).",
          "params": [
            {
              "n": "rule",
              "t": "DynamicRule",
              "r": true,
              "d": "DynamicRule"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setRiskOverrides(overrides: Partial<Record<string, ApprovalDecision>> | undefined): void",
          "desc": "Override risk-level defaults (read→allow, write→approval, destructive→deny).",
          "params": [
            {
              "n": "overrides",
              "t": "Partial<Record<string, ApprovalDecision>> | undefined",
              "r": false,
              "d": "Partial<Record<string, ApprovalDecision>> | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "checkTool(name: string, risk: string, args: Record<string, unknown> | undefined, agent: AgentConfig | undefined): PermissionCheckResult",
          "desc": "Evaluate whether a tool call is allowed.\n4-phase gate: global rules → agent permissions → dynamic rules → risk defaults.\nReturns { allowed, reason, needsApproval }.",
          "params": [
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "risk",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "args",
              "t": "Record<string, unknown> | undefined",
              "r": false,
              "d": "Record<string, unknown> | undefined"
            },
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "PermissionCheckResult"
        },
        {
          "sig": "checkMaxTokens(inputTokens: number, outputTokens: number, agent: AgentConfig | undefined): boolean",
          "desc": "Check whether combined token count stays within agent's maxTokens limit.",
          "params": [
            {
              "n": "inputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "outputTokens",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "checkMaxSteps(step: number, agent: AgentConfig | undefined): boolean",
          "desc": "Check whether step count is within agent's maxSteps limit.",
          "params": [
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": false,
              "d": "AgentConfig | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "askForTool(toolName: string, _toolId: string, runId: RunId, _sessionId: string, reason: string, _agentId: string, traceId: string, pluginManager: StepExecutorPluginHooks | undefined, savePatterns: readonly string[] | undefined, signal: AbortSignal | undefined): Promise<PermissionReply>",
          "desc": "Ask the user to approve a tool call.\nRoutes through ApprovalStore and plugin hooks.\nWhen reply is \"always\", `savePatterns` are persisted as allow rules so\nfuture matching calls auto-approve (without opening the whole tool).\nReturns \"once\", \"always\", or \"reject\".",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "_sessionId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "reason",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "_agentId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "traceId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "pluginManager",
              "t": "StepExecutorPluginHooks | undefined",
              "r": false,
              "d": "StepExecutorPluginHooks | undefined"
            },
            {
              "n": "savePatterns",
              "t": "readonly string[] | undefined",
              "r": false,
              "d": "readonly string[] | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "askViaApprovalStore(toolName: string, runId: RunId, reason: string, traceId: string, pluginManager: StepExecutorPluginHooks | undefined, signal: AbortSignal | undefined): Promise<PermissionReply>",
          "desc": "",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "reason",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "traceId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "pluginManager",
              "t": "StepExecutorPluginHooks | undefined",
              "r": false,
              "d": "StepExecutorPluginHooks | undefined"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "checkSavedApproval(toolName: string, argsOrAgentId: string | Record<string, unknown> | undefined, agentId: string | undefined): boolean",
          "desc": "Check whether a previously saved approval exists for this tool+args+agent.\nScoped to the args context pattern (e.g. `tool.write_file(src/*)` covers\n`src/a.ts`), falling back to a whole-tool approval (`tool.write_file`).\nA matching saved rejection always wins over a saved approval.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "argsOrAgentId",
              "t": "string | Record<string, unknown> | undefined",
              "r": false,
              "d": "string | Record<string, unknown> | undefined"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "getDynamicRules(): readonly DynamicRule[]",
          "desc": "Return all registered dynamic rules (saved allow/deny policies).",
          "params": [],
          "ret": "readonly DynamicRule[]"
        },
        {
          "sig": "saveApproval(toolName: string, argsOrAgentId: string | Record<string, unknown> | undefined, agentId: string | undefined): void",
          "desc": "Persist a saved approval so future matching calls skip the ask dialog.\nScoped to the args context pattern — approving `read_file(\"a.txt\")` does\nNOT auto-approve `read_file(\"b.txt\")` (whole-tool approval requires a call\nwith no scoped context, which resolves to `tool.<name>`).",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "argsOrAgentId",
              "t": "string | Record<string, unknown> | undefined",
              "r": false,
              "d": "string | Record<string, unknown> | undefined"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "saveRejection(toolName: string, argsOrAgentId: string | Record<string, unknown> | undefined, agentId: string | undefined): void",
          "desc": "Persist a saved rejection so future matching calls are auto-denied.\nScoped to the args context pattern like {@link saveApproval}.",
          "params": [
            {
              "n": "toolName",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "argsOrAgentId",
              "t": "string | Record<string, unknown> | undefined",
              "r": false,
              "d": "string | Record<string, unknown> | undefined"
            },
            {
              "n": "agentId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "globalPermissionRules: AgentRule[] | undefined",
          "desc": "globalPermissionRules",
          "params": []
        },
        {
          "sig": "dynamicRules: DynamicRule[]",
          "desc": "dynamicRules",
          "params": []
        },
        {
          "sig": "riskOverrides: Partial<Record<string, ApprovalDecision>> | undefined",
          "desc": "riskOverrides",
          "params": []
        },
        {
          "sig": "topLevelRules: { toolName: string; pattern: string; decision: \"allow\" | \"deny\" | \"ask\"; }[]",
          "desc": "topLevelRules",
          "params": []
        },
        {
          "sig": "autoApproval: boolean",
          "desc": "autoApproval",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalDecision",
      "desc": "Result of an approval check: allow, deny, or needs approval.",
      "methods": [
        {
          "sig": "type ApprovalDecision = ApprovalDecision",
          "desc": "Result of an approval check: allow, deny, or needs approval.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "DynamicRule",
      "desc": "A user-approved allow/deny rule for a tool call pattern.",
      "methods": [],
      "props": [
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "pattern",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "decision",
          "type": "\"allow\" | \"deny\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionCheckResult",
      "desc": "Outcome of {@link PermissionGate.checkTool}.",
      "methods": [],
      "props": [
        {
          "name": "allowed",
          "type": "boolean",
          "required": true,
          "desc": ""
        },
        {
          "name": "reason",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "needsApproval",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createRunContext",
      "desc": "Create a fresh per-run context.",
      "methods": [
        {
          "sig": "createRunContext(runId: RunId, agent: AgentConfig | undefined, saga: ToolSaga): RunContext",
          "desc": "Create a fresh per-run context.",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "agent",
              "t": "AgentConfig | undefined",
              "r": true,
              "d": "AgentConfig | undefined"
            },
            {
              "n": "saga",
              "t": "ToolSaga",
              "r": true,
              "d": "ToolSaga"
            }
          ],
          "ret": "RunContext"
        }
      ]
    },
    {
      "type": "type",
      "name": "RunContext",
      "desc": "Mutable state that belongs to a single run — kept out of the kernel\ninstance so concurrent runs never share (and clobber) each other's\nactive agent, sub-agent depth, agent chain, tool cache or saga.",
      "methods": [],
      "props": [
        {
          "name": "runId",
          "type": "RunId",
          "required": true,
          "desc": "The run this context belongs to."
        },
        {
          "name": "agent",
          "type": "AgentConfig | undefined",
          "required": true,
          "desc": "Agent actively executing this run (may change during sub-agent traversal)."
        },
        {
          "name": "depth",
          "type": "number",
          "required": true,
          "desc": "Current sub-agent nesting depth of this run."
        },
        {
          "name": "agentChain",
          "type": "Set<AgentId>",
          "required": true,
          "desc": "Agent ids already in this run's sub-agent call chain (cycle detection)."
        },
        {
          "name": "saga",
          "type": "ToolSaga",
          "required": true,
          "desc": "Per-run saga for tool compensation recording."
        },
        {
          "name": "cachedTools",
          "type": "readonly ToolDefinition<unknown, unknown>[] | null",
          "required": true,
          "desc": "Per-run tool resolution cache, keyed by the agent it was built for."
        },
        {
          "name": "cachedToolsAgentId",
          "type": "AgentId | undefined",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "KernelError",
      "desc": "Kernel-level failure with a typed {@link KernelErrorCode}.",
      "methods": [
        {
          "sig": "constructor(kernelCode: KernelErrorCode, message: string, cause: unknown)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "kernelCode",
              "t": "KernelErrorCode",
              "r": true,
              "d": "KernelErrorCode"
            },
            {
              "n": "message",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "cause",
              "t": "unknown",
              "r": false,
              "d": "unknown"
            }
          ]
        },
        {
          "sig": "code: string",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "KernelErrorCode",
      "desc": "Kernel-level failure codes for {@link KernelError}.",
      "methods": [
        {
          "sig": "type KernelErrorCode = KernelErrorCode",
          "desc": "Kernel-level failure codes for {@link KernelError}.",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "CircuitBreaker",
      "desc": "Circuit breaker with failure thresholds, retry/backoff and half-open probing.",
      "methods": [
        {
          "sig": "constructor(options: CircuitBreakerOptions | undefined)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "options",
              "t": "CircuitBreakerOptions | undefined",
              "r": false,
              "d": "CircuitBreakerOptions | undefined"
            }
          ]
        },
        {
          "sig": "getState(): CircuitState",
          "desc": "",
          "params": [],
          "ret": "CircuitState"
        },
        {
          "sig": "call(fn: () => Promise<T>, signal: AbortSignal | undefined): Promise<T>",
          "desc": "Execute a function with circuit breaker and retry logic.\nRetries on transient failures with exponential backoff.",
          "params": [
            {
              "n": "fn",
              "t": "() => Promise<T>",
              "r": true,
              "d": "() => Promise<T>"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<T>"
        },
        {
          "sig": "sleepAbortable(ms: number, signal: AbortSignal | undefined): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "ms",
              "t": "number",
              "r": true,
              "d": "number"
            },
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "onSuccess(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "onFailure(err: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "err",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "reset(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "getOptions(): Readonly<Required<CircuitBreakerOptions>>",
          "desc": "Get the current configuration options.",
          "params": [],
          "ret": "Readonly<Required<CircuitBreakerOptions>>"
        },
        {
          "sig": "state: CircuitState",
          "desc": "state",
          "params": []
        },
        {
          "sig": "failureCount: number",
          "desc": "failureCount",
          "params": []
        },
        {
          "sig": "lastFailureTime: number",
          "desc": "lastFailureTime",
          "params": []
        },
        {
          "sig": "halfOpenSuccesses: number",
          "desc": "halfOpenSuccesses",
          "params": []
        },
        {
          "sig": "options: Required<CircuitBreakerOptions>",
          "desc": "options",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "CircuitBreakerOpenError",
      "desc": "Thrown when a call is rejected because the breaker is open.",
      "methods": [
        {
          "sig": "constructor(resetTimeoutMs: number)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "resetTimeoutMs",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ]
        },
        {
          "sig": "remainingMs: number",
          "desc": "remainingMs",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CircuitState",
      "desc": "Current circuit breaker state.",
      "methods": [
        {
          "sig": "type CircuitState = CircuitState",
          "desc": "Current circuit breaker state.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "CircuitBreakerOptions",
      "desc": "Tuning for {@link CircuitBreaker}: failure/success thresholds and retry policy.",
      "methods": [],
      "props": [
        {
          "name": "failureThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "successThreshold",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "resetTimeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "isFailure",
          "type": "((err: unknown) => boolean) | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "maxRetries",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum number of retries for transient failures. Default: 3"
        },
        {
          "name": "backoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Base delay for exponential backoff in ms. Default: 1000"
        },
        {
          "name": "maxBackoffMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum delay for backoff in ms. Default: 30000"
        }
      ]
    },
    {
      "type": "class",
      "name": "RunStateMachine",
      "desc": "Tracks per-run state, abort signals and input queues.",
      "methods": [
        {
          "sig": "getState(runId: RunId): RunState | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "RunState | undefined"
        },
        {
          "sig": "setState(runId: RunId, state: RunState): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "state",
              "t": "RunState",
              "r": true,
              "d": "RunState"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "onStateChange(listener: (runId: RunId, state: RunState) => void): () => void",
          "desc": "",
          "params": [
            {
              "n": "listener",
              "t": "(runId: RunId, state: RunState) => void",
              "r": true,
              "d": "(runId: RunId, state: RunState) => void"
            }
          ],
          "ret": "() => void"
        },
        {
          "sig": "createRun(runId: RunId, sessionId: string | undefined, parentRunId: RunId | undefined): AbortController | null",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            },
            {
              "n": "parentRunId",
              "t": "RunId | undefined",
              "r": false,
              "d": "RunId | undefined"
            }
          ],
          "ret": "AbortController | null"
        },
        {
          "sig": "getAbort(runId: RunId): AbortController | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "AbortController | undefined"
        },
        {
          "sig": "isAborted(runId: RunId): boolean",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "getSignal(runId: RunId): AbortSignal",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "AbortSignal"
        },
        {
          "sig": "cleanupRun(runId: RunId, sessionId: string | undefined): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "sessionId",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "cancelAll(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "sendInput(runId: RunId, text: string): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "text",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "drainInputs(runId: RunId): string[]",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "string[]"
        },
        {
          "sig": "setModelForRun(runId: RunId, model: unknown): void",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            },
            {
              "n": "model",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getModelForRun(runId: RunId): T | undefined",
          "desc": "",
          "params": [
            {
              "n": "runId",
              "t": "RunId",
              "r": true,
              "d": "RunId"
            }
          ],
          "ret": "T | undefined"
        },
        {
          "sig": "runStates: Map<RunId, RunState>",
          "desc": "runStates",
          "params": []
        },
        {
          "sig": "runAborts: Map<RunId, AbortController>",
          "desc": "runAborts",
          "params": []
        },
        {
          "sig": "pendingInputs: Map<RunId, string[]>",
          "desc": "pendingInputs",
          "params": []
        },
        {
          "sig": "busySessions: Set<string>",
          "desc": "busySessions",
          "params": []
        },
        {
          "sig": "modelForRun: Map<RunId, unknown>",
          "desc": "modelForRun",
          "params": []
        },
        {
          "sig": "stateSubscribers: Set<(runId: RunId, state: RunState) => void>",
          "desc": "stateSubscribers",
          "params": []
        },
        {
          "sig": "runIdStack: RunId[]",
          "desc": "runIdStack",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "RunState",
      "desc": "Lifecycle state of a run.",
      "methods": [
        {
          "sig": "type RunState = RunState",
          "desc": "Lifecycle state of a run.",
          "params": []
        }
      ]
    }
  ]
},
{
  "id": "tools",
  "name": "@vinhnt-sdk/tools",
  "icon": "T",
  "tag": "Core",
  "desc": "Built-in tools: file, shell, git, web, search, registries.",
  "deps": [
    "sandbox",
    "schema",
    "security"
  ],
  "exports": [
    {
      "type": "type",
      "name": "Tool",
      "desc": "A schema-first tool: owns its validation schema and derives its definition.",
      "methods": [
        {
          "sig": "toDefinition(): ToolDefinition<TInput, TOutput>",
          "desc": "Derive the provider-facing ToolDefinition (registers as `name`).",
          "params": [],
          "ret": "ToolDefinition<TInput, TOutput>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "input",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>>",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolConfig",
      "desc": "── Schema-first tool authoring (OpenCode-style `Tool.make`) ──────────────\nThe tool OWNS its validation schema (`input`) instead of importing a\nstandalone static schema. `toDefinition()` derives the provider-facing\n`ToolDefinition` (JSON Schema) from that schema, so there is exactly one\nsource of truth per tool. Domain namespacing is applied via `name`.",
      "methods": [
        {
          "sig": "normalize(raw: unknown): unknown",
          "desc": "Coerce raw model-agnostic input before validation (e.g. snake_case aliases).",
          "params": [
            {
              "n": "raw",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "unknown"
        },
        {
          "sig": "execute(input: TInput, ctx: ToolContext): Promise<TOutput>",
          "desc": "",
          "params": [
            {
              "n": "input",
              "t": "TInput",
              "r": true,
              "d": "TInput"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<TOutput>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": "Tool name / id. Use dot-prefixed names for domains: \"coding.read_file\"."
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "input",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>>",
          "required": true,
          "desc": "Runtime validation schema — owned by this tool, not a shared file."
        },
        {
          "name": "output",
          "type": "ZodType<TOutput, unknown, $ZodTypeInternals<TOutput, unknown>> | undefined",
          "required": false,
          "desc": "Optional output validation schema."
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-tool timeout in ms (overrides global default)."
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": "Permission action key for the gate (e.g. \"edit\", \"shell\"). Optional; defaults to risk."
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (kernel gate defers)."
        },
        {
          "name": "jsonSchema",
          "type": "NestedJsonSchema | undefined",
          "required": false,
          "desc": "Optional LLM-facing JSON Schema override (e.g. to advertise `path` aliases)."
        }
      ]
    },
    {
      "type": "function",
      "name": "defineTool",
      "desc": "Build a schema-first {@link Tool} from its config.",
      "methods": [
        {
          "sig": "defineTool(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput>",
          "desc": "Build a schema-first {@link Tool} from its config.",
          "params": [
            {
              "n": "config",
              "t": "ToolConfig<TInput, TOutput>",
              "r": true,
              "d": "ToolConfig<TInput, TOutput>"
            }
          ],
          "ret": "Tool<TInput, TOutput>"
        }
      ]
    },
    {
      "type": "function",
      "name": "toolToDefinition",
      "desc": "Convenience: build a ToolDefinition directly from a ToolConfig.",
      "methods": [
        {
          "sig": "toolToDefinition(config: ToolConfig<TInput, TOutput>): ToolDefinition<TInput, TOutput>",
          "desc": "Convenience: build a ToolDefinition directly from a ToolConfig.",
          "params": [
            {
              "n": "config",
              "t": "ToolConfig<TInput, TOutput>",
              "r": true,
              "d": "ToolConfig<TInput, TOutput>"
            }
          ],
          "ret": "ToolDefinition<TInput, TOutput>"
        }
      ]
    },
    {
      "type": "function",
      "name": "zodSchemaToNestedJsonSchema",
      "desc": "Map a Zod schema to the codebase's `NestedJsonSchema` shape (best effort).",
      "methods": [
        {
          "sig": "zodSchemaToNestedJsonSchema(schema: ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>): NestedJsonSchema | undefined",
          "desc": "Map a Zod schema to the codebase's `NestedJsonSchema` shape (best effort).",
          "params": [
            {
              "n": "schema",
              "t": "ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>",
              "r": true,
              "d": "ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>"
            }
          ],
          "ret": "NestedJsonSchema | undefined"
        }
      ]
    },
    {
      "type": "function",
      "name": "commandPattern",
      "desc": "Convert a shell command string into a permission save pattern.\nThe pattern with trailing \" *\" allows exact-match or prefix-match in saved rules.\n\nExamples:\n  commandPattern(\"npm install express --save\") → \"npm install *\"\n  commandPattern(\"git checkout main\")         → \"git checkout *\"\n  commandPattern(\"cat file.txt\")              → \"cat *\"",
      "methods": [
        {
          "sig": "commandPattern(command: string): string",
          "desc": "Convert a shell command string into a permission save pattern.\nThe pattern with trailing \" *\" allows exact-match or prefix-match in saved rules.\n\nExamples:\n  commandPattern(\"npm install express --save\") → \"npm install *\"\n  commandPattern(\"git checkout main\")         → \"git checkout *\"\n  commandPattern(\"cat file.txt\")              → \"cat *\"",
          "params": [
            {
              "n": "command",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "function",
      "name": "prefix",
      "desc": "Extract the \"human-understandable command prefix\" from shell tokens.\n\nExamples:\n  prefix([\"npm\", \"install\", \"express\", \"--save\"]) → [\"npm\", \"install\"]\n  prefix([\"git\", \"checkout\", \"main\"])             → [\"git\", \"checkout\"]\n  prefix([\"docker\", \"compose\", \"up\", \"-d\"])       → [\"docker\", \"compose\", \"up\"]\n  prefix([\"cat\", \"file.txt\"])                     → [\"cat\"]\n  prefix([])                                      → []",
      "methods": [
        {
          "sig": "prefix(tokens: string[]): string[]",
          "desc": "Extract the \"human-understandable command prefix\" from shell tokens.\n\nExamples:\n  prefix([\"npm\", \"install\", \"express\", \"--save\"]) → [\"npm\", \"install\"]\n  prefix([\"git\", \"checkout\", \"main\"])             → [\"git\", \"checkout\"]\n  prefix([\"docker\", \"compose\", \"up\", \"-d\"])       → [\"docker\", \"compose\", \"up\"]\n  prefix([\"cat\", \"file.txt\"])                     → [\"cat\"]\n  prefix([])                                      → []",
          "params": [
            {
              "n": "tokens",
              "t": "string[]",
              "r": true,
              "d": "string[]"
            }
          ],
          "ret": "string[]"
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinitionLike",
      "desc": "Minimal tool definition for schema-level typing (avoids circular dep with core/tool).",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path)."
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional)."
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolDefinition",
      "desc": "Provider-facing tool definition: schema, risk and execute.",
      "methods": [
        {
          "sig": "execute(input: TInput, ctx: ToolContext): Promise<TOutput>",
          "desc": "",
          "params": [
            {
              "n": "input",
              "t": "TInput",
              "r": true,
              "d": "TInput"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<TOutput>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "name",
          "type": "string | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "risk",
          "type": "string",
          "required": true,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "selfApproving",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool prompts its own permission via `ctx.ask` (single approval path).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "inputSchema",
          "type": "JsonSchema | undefined",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "type",
          "type": "\"function\" | undefined",
          "required": false,
          "desc": "OpenAI tool format — for direct API passthrough (optional).",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "function",
          "type": "{ readonly name: string; readonly description: string; readonly parameters?: JsonSchema | undefined; readonly strict?...",
          "required": false,
          "desc": "",
          "inherited": "ToolDefinitionLike"
        },
        {
          "name": "timeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Per-tool timeout in ms (overrides global default)."
        },
        {
          "name": "permissionAction",
          "type": "string | undefined",
          "required": false,
          "desc": "Permission action key for the gate (e.g. \"edit\", \"shell\"). Optional; defaults to risk."
        },
        {
          "name": "inputZodSchema",
          "type": "ZodType<TInput, unknown, $ZodTypeInternals<TInput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime input validation (carried from defineTool)."
        },
        {
          "name": "outputZodSchema",
          "type": "ZodType<TOutput, unknown, $ZodTypeInternals<TOutput, unknown>> | undefined",
          "required": false,
          "desc": "Zod schema for runtime output validation (carried from defineTool)."
        },
        {
          "name": "deferred",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, tool is not loaded into context until explicitly requested via search."
        },
        {
          "name": "tags",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": "Tags for tool search (e.g. [\"file\", \"read\", \"search\"])."
        },
        {
          "name": "metadata",
          "type": "Record<string, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolRisk",
      "desc": "Tool risk level — open string for extensibility.",
      "methods": [
        {
          "sig": "type ToolRisk = string",
          "desc": "Tool risk level — open string for extensibility.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolFilter",
      "desc": "Filter options for listing tools.",
      "methods": [
        {
          "sig": "type ToolFilter = ToolFilter",
          "desc": "Filter options for listing tools.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolPermissionRule",
      "desc": "Minimal permission rule relevant for tool filtering at the tool boundary.",
      "methods": [],
      "props": [
        {
          "name": "action",
          "type": "string",
          "required": true,
          "desc": "Tool id or wildcard pattern (e.g. \"coding.*\", \"*\")."
        },
        {
          "name": "effect",
          "type": "\"allow\" | \"deny\" | \"ask\"",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolMaterialization",
      "desc": "Tool set materialized for the model after filtering by permission rules.",
      "methods": [
        {
          "sig": "settle(input: { name: string; args: unknown; ctx?: ToolContext; }): Promise<unknown>",
          "desc": "Resolve one tool call: validate args and execute.",
          "params": [
            {
              "n": "input",
              "t": "{ name: string; args: unknown; ctx?: ToolContext; }",
              "r": true,
              "d": "{ name: string; args: unknown; ctx?: ToolContext; }"
            }
          ],
          "ret": "Promise<unknown>"
        },
        {
          "sig": "getTool(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "Lookup a tool definition by ID from the allowed set.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        }
      ],
      "props": [
        {
          "name": "definitions",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Provider-facing definitions the model is ALLOWED to see/invoke."
        },
        {
          "name": "denied",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Tool definitions that were denied by permission rules."
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolRegistry",
      "desc": "Registers tools and domains, filters by permission, and materializes model-visible tool sets.",
      "methods": [
        {
          "sig": "register(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "registerDomain(manifest: DomainManifest): void",
          "desc": "Register a named domain and its tool membership (metadata only — does not register the tools).",
          "params": [
            {
              "n": "manifest",
              "t": "DomainManifest",
              "r": true,
              "d": "DomainManifest"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getDomains(): readonly DomainManifest[]",
          "desc": "",
          "params": [],
          "ret": "readonly DomainManifest[]"
        },
        {
          "sig": "domainFor(id: string): string | undefined",
          "desc": "Resolve the domain id a tool belongs to, or undefined if it is a core tool.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "string | undefined"
        },
        {
          "sig": "listDomains(): readonly DomainManifest[]",
          "desc": "Get all registered domain manifests.",
          "params": [],
          "ret": "readonly DomainManifest[]"
        },
        {
          "sig": "domainSummaries(): DomainSummary[]",
          "desc": "Get domain summaries for UI/API consumption.",
          "params": [],
          "ret": "DomainSummary[]"
        },
        {
          "sig": "toolsForDomain(domainId: string): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "Get tools belonging to a specific domain.",
          "params": [
            {
              "n": "domainId",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "get(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        },
        {
          "sig": "list(filter: ToolFilter | undefined): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [
            {
              "n": "filter",
              "t": "ToolFilter | undefined",
              "r": false,
              "d": "ToolFilter | undefined"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "count(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getOrThrow(id: string): ToolDefinition<unknown, unknown>",
          "desc": "Get a tool by ID, throwing a typed error if not found",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        },
        {
          "sig": "materialize(permissions: readonly ToolPermissionRule[] | undefined): ToolMaterialization",
          "desc": "Materialize the tool set for a given permission ruleset: drop tools the\nmodel must not see (wholly-denied), and return a `settle` that validates\nand executes a single tool call. Defaults to exposing every registered tool.",
          "params": [
            {
              "n": "permissions",
              "t": "readonly ToolPermissionRule[] | undefined",
              "r": false,
              "d": "readonly ToolPermissionRule[] | undefined"
            }
          ],
          "ret": "ToolMaterialization"
        },
        {
          "sig": "filterByRules(tools: readonly ToolDefinition<unknown, unknown>[], permissions: readonly ToolPermissionRule[] | undefined): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "Remove tools whose rule is wholly denied (deny \"*\" / deny this tool).",
          "params": [
            {
              "n": "tools",
              "t": "readonly ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "readonly ToolDefinition<unknown, unknown>[]"
            },
            {
              "n": "permissions",
              "t": "readonly ToolPermissionRule[] | undefined",
              "r": false,
              "d": "readonly ToolPermissionRule[] | undefined"
            }
          ],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "tools: Map<string, ToolDefinition<unknown, unknown>>",
          "desc": "tools",
          "params": []
        },
        {
          "sig": "domains: Map<string, DomainManifest>",
          "desc": "domains",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolContext",
      "desc": "Context passed to every tool execution — replaces bare AbortSignal",
      "methods": [
        {
          "sig": "ask(input: { permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }): Promise<PermissionReply>",
          "desc": "Request human approval for a permission-bound operation.\nReturns the user's decision: \"once\" (allow once), \"always\" (approve forever), or \"reject\".\nWhen reply is \"always\", savePatterns are persisted as allow rules for future requests.",
          "params": [
            {
              "n": "input",
              "t": "{ permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }",
              "r": true,
              "d": "{ permission: string; resource: string; reason: string; savePatterns?: readonly string[]; }"
            }
          ],
          "ret": "Promise<PermissionReply>"
        },
        {
          "sig": "metadata(input: { title?: string; metadata?: Record<string, unknown>; }): void",
          "desc": "Attach metadata to the current tool call (for observability)",
          "params": [
            {
              "n": "input",
              "t": "{ title?: string; metadata?: Record<string, unknown>; }",
              "r": true,
              "d": "{ title?: string; metadata?: Record<string, unknown>; }"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "setCompensation(action: () => Promise<void>): void",
          "desc": "Register a compensation action for saga rollback.\nIf the current run fails or is cancelled, this action will be called\nto undo the tool's side effect (e.g., restore original file content).",
          "params": [
            {
              "n": "action",
              "t": "() => Promise<void>",
              "r": true,
              "d": "() => Promise<void>"
            }
          ],
          "ret": "void"
        }
      ],
      "props": [
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "runId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "agentName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "signal",
          "type": "AbortSignal",
          "required": true,
          "desc": ""
        },
        {
          "name": "parentContext",
          "type": "RequestContext | undefined",
          "required": false,
          "desc": "The parent run's request context (traceId/actorId/tenantId/requestId).\nLets handoff tools (delegate/spawn) propagate identity + parent-run\nlinkage to child agents instead of inventing a synthetic context."
        },
        {
          "name": "env",
          "type": "Record<string, string>",
          "required": true,
          "desc": "Environment variables for subprocess execution (shell tool)"
        }
      ]
    },
    {
      "type": "type",
      "name": "PermissionReply",
      "desc": "Reply from human-in-the-loop approval",
      "methods": [
        {
          "sig": "type PermissionReply = PermissionReply",
          "desc": "Reply from human-in-the-loop approval",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolHook",
      "desc": "Lifecycle hook that can intercept a tool call before and after execution.",
      "methods": [
        {
          "sig": "pre(params: { toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }): Promise<{ input: unknown; } | { denied: string; } | null>",
          "desc": "",
          "params": [
            {
              "n": "params",
              "t": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }",
              "r": true,
              "d": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; }"
            }
          ],
          "ret": "Promise<{ input: unknown; } | { denied: string; } | null>"
        },
        {
          "sig": "post(params: { toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }): Promise<ToolExecutionResult | null>",
          "desc": "",
          "params": [
            {
              "n": "params",
              "t": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }",
              "r": true,
              "d": "{ toolId: string; tool: ToolDefinition<unknown, unknown>; input: unknown; result: ToolExecutionResult; }"
            }
          ],
          "ret": "Promise<ToolExecutionResult | null>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolExecutionResult",
      "desc": "Result of a tool execution.",
      "methods": [
        {
          "sig": "type ToolExecutionResult = ToolExecutionResult",
          "desc": "Result of a tool execution.",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonSchema7Object",
      "desc": "Minimal JSON Schema 7 object for tool input validation.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "\"object\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "properties",
          "type": "Record<string, JsonSchemaProperty> | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "required",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "JsonSchemaProperty",
      "desc": "A single property within a {@link JsonSchema7Object}.",
      "methods": [],
      "props": [
        {
          "name": "type",
          "type": "\"string\" | \"number\" | \"boolean\" | \"object\" | \"array\"",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "enum",
          "type": "readonly string[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "default",
          "type": "unknown",
          "required": false,
          "desc": ""
        },
        {
          "name": "items",
          "type": "JsonSchemaProperty | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "validateInput",
      "desc": "Validate tool input against a Zod schema, throwing {@link ToolInputError} on failure.",
      "methods": [
        {
          "sig": "validateInput(toolId: string, schema: ZodType<T, unknown, $ZodTypeInternals<T, unknown>>, input: unknown): T",
          "desc": "Validate tool input against a Zod schema, throwing {@link ToolInputError} on failure.",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "schema",
              "t": "ZodType<T, unknown, $ZodTypeInternals<T, unknown>>",
              "r": true,
              "d": "ZodType<T, unknown, $ZodTypeInternals<T, unknown>>"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "T"
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolInputError",
      "desc": "Thrown when tool input fails Zod validation.",
      "methods": [
        {
          "sig": "constructor(toolId: string, issues: $ZodIssue[])",
          "desc": "Create instance.",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "issues",
              "t": "$ZodIssue[]",
              "r": true,
              "d": "$ZodIssue[]"
            }
          ]
        },
        {
          "sig": "code: \"TOOL_INPUT_ERROR\"",
          "desc": "code",
          "params": []
        },
        {
          "sig": "retryable: false",
          "desc": "retryable",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "generateDiff",
      "desc": "Generate a line-level diff between old and new content for a file.",
      "methods": [
        {
          "sig": "generateDiff(filePath: string, oldContent: string, newContent: string): UnifiedDiff",
          "desc": "Generate a line-level diff between old and new content for a file.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "oldContent",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "newContent",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "UnifiedDiff"
        }
      ]
    },
    {
      "type": "type",
      "name": "UnifiedDiff",
      "desc": "Line-level unified diff with add/remove counts.",
      "methods": [],
      "props": [
        {
          "name": "diff",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "additions",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "removals",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createCodingDomain",
      "desc": "Group the coding toolset (file/shell/search/web/image/git/lsp) under domain\n\"coding\". Pass the tool definitions the composition root has already built.",
      "methods": [
        {
          "sig": "createCodingDomain(tools: readonly ToolDefinition<unknown, unknown>[]): DomainManifest",
          "desc": "Group the coding toolset (file/shell/search/web/image/git/lsp) under domain\n\"coding\". Pass the tool definitions the composition root has already built.",
          "params": [
            {
              "n": "tools",
              "t": "readonly ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "readonly ToolDefinition<unknown, unknown>[]"
            }
          ],
          "ret": "DomainManifest"
        }
      ]
    },
    {
      "type": "type",
      "name": "DomainManifest",
      "desc": "── Domain manifests (Phase 2) ────────────────────────────────────────────\nA domain is a named, swappable set of tools (e.g. \"coding\"). The agent core\ntreats domains as opaque: it only needs each tool's id (for membership) and\nthe set of domains an agent is allowed to use. This is the seam that lets\nthe same core power coding, research, data, devops — differing only by which\ndomains are mounted and which permission rules apply.\nA named group of tools exposed as a pluggable capability.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "Domain id used in agent config `domains: [\"coding\"]`."
        },
        {
          "name": "tools",
          "type": "readonly ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Tools belonging to this domain. Only `id`/`name` drives membership."
        },
        {
          "name": "systemPrompt",
          "type": "string | undefined",
          "required": false,
          "desc": "Optional domain-level system prompt (merged into the agent context)."
        },
        {
          "name": "permissionDefaults",
          "type": "readonly ToolPermissionRule[] | undefined",
          "required": false,
          "desc": "Domain-level permission defaults (allow/deny/ask) applied to its tools."
        }
      ]
    },
    {
      "type": "class",
      "name": "LazyToolRegistry",
      "desc": "A {@link ToolRegistry} that constructs tools lazily on first resolve.",
      "methods": [
        {
          "sig": "registerLazy(entry: LazyToolEntry): void",
          "desc": "",
          "params": [
            {
              "n": "entry",
              "t": "LazyToolEntry",
              "r": true,
              "d": "LazyToolEntry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "resolve(id: string): Promise<ToolDefinition<unknown, unknown> | undefined>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown> | undefined>"
        },
        {
          "sig": "register(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "list(): readonly ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "readonly ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "listLazy(): LazyToolEntry[]",
          "desc": "",
          "params": [],
          "ret": "LazyToolEntry[]"
        },
        {
          "sig": "count(): number",
          "desc": "",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "getOrThrow(id: string): ToolDefinition<unknown, unknown>",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        },
        {
          "sig": "isLoaded(id: string): boolean",
          "desc": "",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "resolveAll(): Promise<ToolDefinition<unknown, unknown>[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<ToolDefinition<unknown, unknown>[]>"
        },
        {
          "sig": "entries: Map<string, LazyToolEntry>",
          "desc": "entries",
          "params": []
        },
        {
          "sig": "loading: Map<string, Promise<ToolDefinition<unknown, unknown>>>",
          "desc": "loading",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "LazyToolEntry",
      "desc": "A tool registered for lazy, on-demand construction.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "risk",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "factory",
          "type": "() => Promise<ToolDefinition<unknown, unknown>>",
          "required": true,
          "desc": ""
        },
        {
          "name": "instance",
          "type": "ToolDefinition<unknown, unknown> | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolProviderRegistry",
      "desc": "ToolProviderRegistry — Manages multiple ToolProviders.\nSingle source of truth for all available tools.",
      "methods": [
        {
          "sig": "registerProvider(provider: ToolProvider): void",
          "desc": "Register a tool provider and all its tools.",
          "params": [
            {
              "n": "provider",
              "t": "ToolProvider",
              "r": true,
              "d": "ToolProvider"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregisterProvider(id: string): void",
          "desc": "Unregister a tool provider and remove all its tools.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getProvider(id: string): ToolProvider | undefined",
          "desc": "Get a tool provider by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolProvider | undefined"
        },
        {
          "sig": "listProviders(): ToolProvider[]",
          "desc": "List all registered providers.",
          "params": [],
          "ret": "ToolProvider[]"
        },
        {
          "sig": "getAllTools(): ToolDefinition<unknown, unknown>[]",
          "desc": "Get all tools from all providers.",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "getTool(id: string): ToolDefinition<unknown, unknown> | undefined",
          "desc": "Get a tool by ID.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown> | undefined"
        },
        {
          "sig": "hasTool(id: string): boolean",
          "desc": "Check if a tool exists.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "refreshProvider(id: string): Promise<void>",
          "desc": "Refresh a specific provider (e.g., MCP tools changed).",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "count(): number",
          "desc": "Get tool count.",
          "params": [],
          "ret": "number"
        },
        {
          "sig": "providers: Map<string, ToolProvider>",
          "desc": "providers",
          "params": []
        },
        {
          "sig": "tools: Map<string, ToolDefinition<unknown, unknown>>",
          "desc": "tools",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolProvider",
      "desc": "ToolProvider — Interface for providing tools to the kernel.\n\nBuilt-in tools (coding) use BuiltinToolProvider.\nUser tools use ToolFileProvider.\nMCP tools use McpToolProvider.\nPlugin tools use PluginToolProvider.",
      "methods": [
        {
          "sig": "register(registry: ToolRegistry): void",
          "desc": "Register all tools into the given registry.\nCalled once when the provider is registered.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(registry: ToolRegistry): void",
          "desc": "Unregister all tools from the given registry.\nCalled when the provider is removed.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "refresh(): Promise<void>",
          "desc": "Optional: refresh tools from external source (e.g., MCP).\nCalled when external tools change.",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "tools",
          "type": "ToolDefinition<unknown, unknown>[]",
          "required": true,
          "desc": "Get all tools provided by this provider.\nCalled during registration to populate the registry."
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolFileProvider",
      "desc": "ToolFileProvider — Loads tools from .vnt/tools/ directories.\n\nSupports both workspace-local and global tools.\nTools can override built-in tools by using the same name.",
      "methods": [
        {
          "sig": "constructor(id: string, name: string, tools: ToolDefinition<unknown, unknown>[])",
          "desc": "Create instance.",
          "params": [
            {
              "n": "id",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "name",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "tools",
              "t": "ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>[]"
            }
          ]
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: string",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"User-defined tools from .vnt/tools/\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "_tools: ToolDefinition<unknown, unknown>[]",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolFileLoader",
      "desc": "ToolFileLoader — Discovers and loads tools from .vnt/tools/ directories.\n\nFiles are verified before import (RV-48): symlinks are rejected, the file\nmust resolve back inside its source directory, and an optional SHA-256 hash\npin can be enforced so a swapped file is never executed.",
      "methods": [
        {
          "sig": "loadFromDirectory(dir: string, hashes: Record<string, string> | undefined): Promise<ToolDefinition<unknown, unknown>[]>",
          "desc": "Load tools from a single directory.",
          "params": [
            {
              "n": "dir",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "hashes",
              "t": "Record<string, string> | undefined",
              "r": false,
              "d": "Record<string, string> | undefined"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown>[]>"
        },
        {
          "sig": "isVerifiedFile(filePath: string, dir: string, expectedHash: string | undefined): Promise<boolean>",
          "desc": "Verify a candidate tool file before importing it:\n1. Rejects symlinks outright (closes the TOCTOU window between listing and\n   import — Dirent already filters most symlinks, this is belt-and-braces).\n2. The canonical real path must resolve back INSIDE the source directory —\n   a file that escapes its directory is never executed.\n3. Optional SHA-256 hash pin: when a hash is supplied for this file, a\n   mismatch means the content changed on disk — skip, do not import.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "dir",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "expectedHash",
              "t": "string | undefined",
              "r": false,
              "d": "string | undefined"
            }
          ],
          "ret": "Promise<boolean>"
        },
        {
          "sig": "loadToolFromFile(filePath: string): Promise<ToolDefinition<unknown, unknown> | null>",
          "desc": "Load a single tool from a file.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<ToolDefinition<unknown, unknown> | null>"
        },
        {
          "sig": "isToolDefinition(value: unknown): boolean",
          "desc": "Check if a value is a ToolDefinition.",
          "params": [
            {
              "n": "value",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "boolean"
        },
        {
          "sig": "discover(workspaceRoot: string, hashes: Record<string, string> | undefined): Promise<ToolFileProvider>",
          "desc": "Discover tools from workspace and global directories.\n\nDiscovery order:\n1. Workspace-local: .vnt/tools/*.ts\n2. Global: ~/.vnt/tools/*.ts\n\nWorkspace tools override global tools with the same name.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "hashes",
              "t": "Record<string, string> | undefined",
              "r": false,
              "d": "Record<string, string> | undefined"
            }
          ],
          "ret": "Promise<ToolFileProvider>"
        }
      ]
    },
    {
      "type": "type",
      "name": "ApprovalHandler",
      "desc": "Handler contract for requesting human approval of a tool call.",
      "methods": [
        {
          "sig": "requestApproval(tool: ToolDefinition<unknown, unknown>, input: unknown): Promise<boolean>",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            }
          ],
          "ret": "Promise<boolean>"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "ToolSaga",
      "desc": "Tracks tool calls per step and rolls back compensating actions in reverse order.",
      "methods": [
        {
          "sig": "record(entry: SagaEntry): void",
          "desc": "",
          "params": [
            {
              "n": "entry",
              "t": "SagaEntry",
              "r": true,
              "d": "SagaEntry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "registerCompensation(toolId: string, action: CompensationAction): void",
          "desc": "",
          "params": [
            {
              "n": "toolId",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "action",
              "t": "CompensationAction",
              "r": true,
              "d": "CompensationAction"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "getEntries(step: number | undefined): SagaEntry[]",
          "desc": "",
          "params": [
            {
              "n": "step",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "SagaEntry[]"
        },
        {
          "sig": "rollbackStep(step: number): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "step",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "rollbackAll(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        },
        {
          "sig": "clear(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "steps: Map<number, SagaEntry[]>",
          "desc": "steps",
          "params": []
        },
        {
          "sig": "compensations: Map<string, CompensationAction>",
          "desc": "compensations",
          "params": []
        },
        {
          "sig": "rolledBack: Set<string>",
          "desc": "rolledBack",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "SagaEntry",
      "desc": "A recorded tool invocation within a saga step.",
      "methods": [],
      "props": [
        {
          "name": "toolId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "input",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "output",
          "type": "unknown",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "step",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "CompensationAction",
      "desc": "A compensating action registered for a tool to undo its effect on rollback.",
      "methods": [
        {
          "sig": "compensate(): Promise<void>",
          "desc": "",
          "params": [],
          "ret": "Promise<void>"
        }
      ],
      "props": [
        {
          "name": "entry",
          "type": "SagaEntry",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createReadFileTool",
      "desc": "Create the `read_file` tool. Reads a file relative to the workspace root,\nenforcing workspace boundaries and optionally tracking reads for the\nkernel's file-history features.",
      "methods": [
        {
          "sig": "createReadFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined, maxFileSize: number | undefined): ToolDefinition<{ filePath: string; stripTrailingNewline?: boolean; }, string>",
          "desc": "Create the `read_file` tool. Reads a file relative to the workspace root,\nenforcing workspace boundaries and optionally tracking reads for the\nkernel's file-history features.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            },
            {
              "n": "maxFileSize",
              "t": "number | undefined",
              "r": false,
              "d": "number | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; stripTrailingNewline?: boolean; }, string>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createWriteFileTool",
      "desc": "Create the `write_file` tool. Writes content to a file, creating parent\ndirectories as needed and returning a diff of the change.",
      "methods": [
        {
          "sig": "createWriteFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; content: string; }, { written: string; bytes: number; diff: string; additions: num...",
          "desc": "Create the `write_file` tool. Writes content to a file, creating parent\ndirectories as needed and returning a diff of the change.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; content: string; }, { written: string; bytes: number; diff: string; additions: num..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createEditFileTool",
      "desc": "Create the `edit_file` tool. Applies exact/fuzzy search-and-replace edits\n(one hunk or a multi-hunk `edits[]` array) to an existing file.",
      "methods": [
        {
          "sig": "createEditFileTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; oldString?: string | undefined; newString?: string | undefined; edits?: readonly {...",
          "desc": "Create the `edit_file` tool. Applies exact/fuzzy search-and-replace edits\n(one hunk or a multi-hunk `edits[]` array) to an existing file.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; oldString?: string | undefined; newString?: string | undefined; edits?: readonly {..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createApplyPatchTool",
      "desc": "Create the `apply_patch` tool. Applies a SEARCH/REPLACE block patch where\neach search string must match exactly once in the target file.",
      "methods": [
        {
          "sig": "createApplyPatchTool(workspaceRoot: RootGetter, tracker: FileReadTracker | undefined, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; patch: string; }, { patched: string; blocks: number; diff: string; additions: numb...",
          "desc": "Create the `apply_patch` tool. Applies a SEARCH/REPLACE block patch where\neach search string must match exactly once in the target file.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "tracker",
              "t": "FileReadTracker | undefined",
              "r": false,
              "d": "FileReadTracker | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; patch: string; }, { patched: string; blocks: number; diff: string; additions: numb..."
        }
      ]
    },
    {
      "type": "function",
      "name": "createListDirectoryTool",
      "desc": "Create the `list_directory` tool. Lists a directory's entries\n(non-recursive), skipping `excludedDirs` (defaults to node_modules/.git).",
      "methods": [
        {
          "sig": "createListDirectoryTool(workspaceRoot: RootGetter, externalDirAccess: boolean | undefined, excludedDirs: string[] | undefined): ToolDefinition<{ dirPath: string; }, { name: string; type: string; path: string; }[]>",
          "desc": "Create the `list_directory` tool. Lists a directory's entries\n(non-recursive), skipping `excludedDirs` (defaults to node_modules/.git).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            },
            {
              "n": "excludedDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<{ dirPath: string; }, { name: string; type: string; path: string; }[]>"
        }
      ]
    },
    {
      "type": "function",
      "name": "ensurePathAccess",
      "desc": "Verify `target` stays inside the (realpath'd) workspace and return the real\npath to use for I/O. Symlink/junction escapes are always rejected — even\nwhen `externalDirAccess` is enabled — because the caller asked for a path\ninside the workspace; escaping it silently would bypass containment.",
      "methods": [
        {
          "sig": "ensurePathAccess(target: string, root: string, pathLabel: string, ctx: ToolContext, externalDirAccess: boolean | undefined): Promise<string>",
          "desc": "Verify `target` stays inside the (realpath'd) workspace and return the real\npath to use for I/O. Symlink/junction escapes are always rejected — even\nwhen `externalDirAccess` is enabled — because the caller asked for a path\ninside the workspace; escaping it silently would bypass containment.",
          "params": [
            {
              "n": "target",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "root",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "pathLabel",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<string>"
        }
      ]
    },
    {
      "type": "function",
      "name": "resolveRoot",
      "desc": "resolveRoot",
      "methods": [
        {
          "sig": "resolveRoot(r: RootGetter): string",
          "desc": "resolveRoot",
          "params": [
            {
              "n": "r",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "string"
        }
      ]
    },
    {
      "type": "type",
      "name": "RootGetter",
      "desc": "RootGetter",
      "methods": [
        {
          "sig": "type RootGetter = RootGetter",
          "desc": "RootGetter",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createReadImageTool",
      "desc": "Create the `read_image` tool that returns image content for the model to analyze.",
      "methods": [
        {
          "sig": "createReadImageTool(workspaceRoot: RootGetter, externalDirAccess: boolean | undefined): ToolDefinition<{ filePath: string; }, { filePath: string; mimeType?: string | undefined; size: number; message: strin...",
          "desc": "Create the `read_image` tool that returns image content for the model to analyze.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "ToolDefinition<{ filePath: string; }, { filePath: string; mimeType?: string | undefined; size: number; message: strin..."
        }
      ]
    },
    {
      "type": "function",
      "name": "readImageToContentParts",
      "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
      "methods": [
        {
          "sig": "readImageToContentParts(filePath: string, workspaceRoot: RootGetter | undefined, externalDirAccess: boolean | undefined): Promise<MessageContentPart[]>",
          "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "workspaceRoot",
              "t": "RootGetter | undefined",
              "r": false,
              "d": "RootGetter | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<MessageContentPart[]>"
        }
      ]
    },
    {
      "type": "class",
      "name": "FileReadTracker",
      "desc": "Tracks when files were read and enforces read-before-write: writes to a\nfile that was never read (or changed externally since) are denied.\n\nRecords are keyed by canonical real path and snapshotted with inode + size\n+ mtime so external replacement (delete/recreate, rename over) is caught\neven when the modification time happens to be unchanged.",
      "methods": [
        {
          "sig": "trackRead(filePath: string, st: Stats): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "st",
              "t": "Stats",
              "r": true,
              "d": "Stats"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "assertWasRead(filePath: string): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "clear(filePath: string): void",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "reset(): void",
          "desc": "",
          "params": [],
          "ret": "void"
        },
        {
          "sig": "records: Map<string, ReadRecord>",
          "desc": "records",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "InMemoryFileHistory",
      "desc": "In-memory {@link FileHistory} keeping an ordered version log plus undo/redo stacks.",
      "methods": [
        {
          "sig": "recordVersion(version: Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "version",
              "t": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }",
              "r": true,
              "d": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listVersions(filePath: string): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "getLatestVersion(filePath: string): Promise<FileVersion | null>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<FileVersion | null>"
        },
        {
          "sig": "rollbackTo(filePath: string, versionIndex: number): Promise<string>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "versionIndex",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "getAllChanges(): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "undo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "redo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "versions: FileVersion[]",
          "desc": "versions",
          "params": []
        },
        {
          "sig": "undoStack: UndoEntry[]",
          "desc": "undoStack",
          "params": []
        },
        {
          "sig": "redoStack: UndoEntry[]",
          "desc": "redoStack",
          "params": []
        },
        {
          "sig": "versionCounter: number",
          "desc": "versionCounter",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createFileHistoryHook",
      "desc": "Create a {@link ToolHook} that records write_file/edit_file changes into a {@link FileHistory}.",
      "methods": [
        {
          "sig": "createFileHistoryHook(fileHistory: FileHistory): ToolHook",
          "desc": "Create a {@link ToolHook} that records write_file/edit_file changes into a {@link FileHistory}.",
          "params": [
            {
              "n": "fileHistory",
              "t": "FileHistory",
              "r": true,
              "d": "FileHistory"
            }
          ],
          "ret": "ToolHook"
        }
      ]
    },
    {
      "type": "type",
      "name": "FileHistory",
      "desc": "Versioned file history contract with undo/redo and rollback support.",
      "methods": [
        {
          "sig": "recordVersion(version: Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }): Promise<void>",
          "desc": "",
          "params": [
            {
              "n": "version",
              "t": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }",
              "r": true,
              "d": "Omit<FileVersion, \"timestamp\"> & { timestamp?: number; }"
            }
          ],
          "ret": "Promise<void>"
        },
        {
          "sig": "listVersions(filePath: string): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "getLatestVersion(filePath: string): Promise<FileVersion | null>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "Promise<FileVersion | null>"
        },
        {
          "sig": "rollbackTo(filePath: string, targetVersion: number): Promise<string>",
          "desc": "",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "targetVersion",
              "t": "number",
              "r": true,
              "d": "number"
            }
          ],
          "ret": "Promise<string>"
        },
        {
          "sig": "getAllChanges(): Promise<readonly FileVersion[]>",
          "desc": "",
          "params": [],
          "ret": "Promise<readonly FileVersion[]>"
        },
        {
          "sig": "undo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        },
        {
          "sig": "redo(): Promise<UndoEntry | null>",
          "desc": "",
          "params": [],
          "ret": "Promise<UndoEntry | null>"
        }
      ],
      "props": []
    },
    {
      "type": "type",
      "name": "FileVersion",
      "desc": "A recorded file change (before/after content) attributed to a session and tool.",
      "methods": [],
      "props": [
        {
          "name": "filePath",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "sessionId",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "originalContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "newContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "UndoEntry",
      "desc": "A single undo/redo step referencing the file content swap.",
      "methods": [],
      "props": [
        {
          "name": "filePath",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "originalContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "newContent",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "toolName",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "timestamp",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "versionId",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createShellTool",
      "desc": "Create the `shell` tool that executes a command in the workspace root with\ntimeout, tree-scoped kill-on-abort, and optional permission prompting.",
      "methods": [
        {
          "sig": "createShellTool(config: ShellToolConfig): ToolDefinition<{ command: string; timeoutMs?: number | undefined; }, ExecResult>",
          "desc": "Create the `shell` tool that executes a command in the workspace root with\ntimeout, tree-scoped kill-on-abort, and optional permission prompting.",
          "params": [
            {
              "n": "config",
              "t": "ShellToolConfig",
              "r": true,
              "d": "ShellToolConfig"
            }
          ],
          "ret": "ToolDefinition<{ command: string; timeoutMs?: number | undefined; }, ExecResult>"
        }
      ]
    },
    {
      "type": "type",
      "name": "ShellToolConfig",
      "desc": "Configuration for the {@link createShellTool} command-execution tool.",
      "methods": [],
      "props": [
        {
          "name": "workspaceRoot",
          "type": "string | (() => string)",
          "required": true,
          "desc": ""
        },
        {
          "name": "defaultTimeoutMs",
          "type": "number",
          "required": true,
          "desc": ""
        },
        {
          "name": "maxTimeoutMs",
          "type": "number | undefined",
          "required": false,
          "desc": "Hard cap on shell command timeout in ms (default: 300000)"
        },
        {
          "name": "askPermission",
          "type": "boolean | undefined",
          "required": false,
          "desc": "If true, prompts for permission before executing shell commands (default: true)"
        },
        {
          "name": "sandboxScope",
          "type": "string | undefined",
          "required": false,
          "desc": "Sandbox scope for command execution (default: \"process\")"
        },
        {
          "name": "allowedPaths",
          "type": "string[] | undefined",
          "required": false,
          "desc": "Allowed filesystem paths for the executed command (enforced in the sandbox backend)"
        }
      ]
    },
    {
      "type": "class",
      "name": "ToolSandbox",
      "desc": "Executes tool definitions with a default timeout applied on top of the\ncaller's abort signal, aborting the tool when either fires.",
      "methods": [
        {
          "sig": "constructor(config: SandboxConfig)",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig",
              "r": false,
              "d": "SandboxConfig"
            }
          ]
        },
        {
          "sig": "execute(tool: ToolDefinition<unknown, unknown>, input: unknown, ctx: ToolContext): Promise<unknown>",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            },
            {
              "n": "input",
              "t": "unknown",
              "r": true,
              "d": "unknown"
            },
            {
              "n": "ctx",
              "t": "ToolContext",
              "r": true,
              "d": "ToolContext"
            }
          ],
          "ret": "Promise<unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "signalToToolContext",
      "desc": "Create a minimal ToolContext from an AbortSignal (for backward compat)",
      "methods": [
        {
          "sig": "signalToToolContext(signal: AbortSignal | undefined): ToolContext",
          "desc": "Create a minimal ToolContext from an AbortSignal (for backward compat)",
          "params": [
            {
              "n": "signal",
              "t": "AbortSignal | undefined",
              "r": false,
              "d": "AbortSignal | undefined"
            }
          ],
          "ret": "ToolContext"
        }
      ]
    },
    {
      "type": "function",
      "name": "createSandbox",
      "desc": "Create a process sandbox using the scopes wired into `@vinhnt-sdk/tools`\n(`host` and `process`). Unavailable scopes throw `SandboxUnavailableError`.",
      "methods": [
        {
          "sig": "createSandbox(config: SandboxConfig): ProcessSandbox",
          "desc": "Create a process sandbox using the scopes wired into `@vinhnt-sdk/tools`\n(`host` and `process`). Unavailable scopes throw `SandboxUnavailableError`.",
          "params": [
            {
              "n": "config",
              "t": "SandboxConfig",
              "r": true,
              "d": "SandboxConfig"
            }
          ],
          "ret": "ProcessSandbox"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGlobFilesTool",
      "desc": "Create the `glob` tool that finds files matching a glob pattern under the workspace root.",
      "methods": [
        {
          "sig": "createGlobFilesTool(workspaceRoot: RootGetter, ignoredDirs: string[] | undefined): ToolDefinition<unknown, unknown>",
          "desc": "Create the `glob` tool that finds files matching a glob pattern under the workspace root.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "ignoredDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGrepFilesTool",
      "desc": "Create the `grep` tool that searches file contents for a regex pattern.",
      "methods": [
        {
          "sig": "createGrepFilesTool(workspaceRoot: RootGetter, ignoredDirs: string[] | undefined): ToolDefinition<unknown, unknown>",
          "desc": "Create the `grep` tool that searches file contents for a regex pattern.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            },
            {
              "n": "ignoredDirs",
              "t": "string[] | undefined",
              "r": false,
              "d": "string[] | undefined"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createToolSearchTool",
      "desc": "Create the `search_tools` tool that searches registered tools by query or tags.",
      "methods": [
        {
          "sig": "createToolSearchTool(registry: ToolRegistry): ToolDefinition<ToolSearchInput, { results: ToolSearchResult[]; }>",
          "desc": "Create the `search_tools` tool that searches registered tools by query or tags.",
          "params": [
            {
              "n": "registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "ToolDefinition<ToolSearchInput, { results: ToolSearchResult[]; }>"
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolSearchInput",
      "desc": "Input for the `search_tools` tool.",
      "methods": [],
      "props": [
        {
          "name": "query",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "string[] | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "ToolSearchResult",
      "desc": "A found tool in `search_tools` results.",
      "methods": [],
      "props": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "tags",
          "type": "readonly string[]",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createWebFetchTool",
      "desc": "Create the `web_fetch` tool that fetches a URL and returns its content as\ntext (HTML is stripped unless `format: \"html\"`), truncated to the max size.",
      "methods": [
        {
          "sig": "createWebFetchTool(config: WebFetchToolConfig | undefined): ToolDefinition<{ url: string; format?: \"markdown\" | \"text\" | \"html\" | undefined; timeout?: number | undefined; }, str...",
          "desc": "Create the `web_fetch` tool that fetches a URL and returns its content as\ntext (HTML is stripped unless `format: \"html\"`), truncated to the max size.",
          "params": [
            {
              "n": "config",
              "t": "WebFetchToolConfig | undefined",
              "r": false,
              "d": "WebFetchToolConfig | undefined"
            }
          ],
          "ret": "ToolDefinition<{ url: string; format?: \"markdown\" | \"text\" | \"html\" | undefined; timeout?: number | undefined; }, str..."
        }
      ]
    },
    {
      "type": "type",
      "name": "WebFetchToolConfig",
      "desc": "Configuration for the {@link createWebFetchTool} tool.",
      "methods": [],
      "props": [
        {
          "name": "maxResponseSize",
          "type": "number | undefined",
          "required": false,
          "desc": "Maximum response size in bytes (default: 524288)"
        }
      ]
    },
    {
      "type": "function",
      "name": "createWebSearchTool",
      "desc": "Create the `web_search` tool backed by a {@link WebSearchProvider}.",
      "methods": [
        {
          "sig": "createWebSearchTool(config: WebSearchToolConfig): ToolDefinition<{ query: string; numResults?: number | undefined; searchDepth?: \"basic\" | \"advanced\" | undefined; }, {...",
          "desc": "Create the `web_search` tool backed by a {@link WebSearchProvider}.",
          "params": [
            {
              "n": "config",
              "t": "WebSearchToolConfig",
              "r": true,
              "d": "WebSearchToolConfig"
            }
          ],
          "ret": "ToolDefinition<{ query: string; numResults?: number | undefined; searchDepth?: \"basic\" | \"advanced\" | undefined; }, {..."
        }
      ]
    },
    {
      "type": "class",
      "name": "TavilySearchProvider",
      "desc": "Tavily search provider adapter — convenience only.\nUser có thể tự implement provider khác: Serper, Bing, Google...",
      "methods": [
        {
          "sig": "constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string; })",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }",
              "r": true,
              "d": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }"
            }
          ]
        },
        {
          "sig": "search(query: string, options: { numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined",
              "r": false,
              "d": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "apiKey: string",
          "desc": "apiKey",
          "params": []
        },
        {
          "sig": "defaultNumResults: number",
          "desc": "defaultNumResults",
          "params": []
        },
        {
          "sig": "baseUrl: string",
          "desc": "baseUrl",
          "params": []
        }
      ]
    },
    {
      "type": "class",
      "name": "SerperSearchProvider",
      "desc": "Serper (Google Search) provider adapter — convenience only.",
      "methods": [
        {
          "sig": "constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string; })",
          "desc": "Create instance.",
          "params": [
            {
              "n": "config",
              "t": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }",
              "r": true,
              "d": "{ apiKey: string; defaultNumResults?: number; baseUrl?: string; }"
            }
          ]
        },
        {
          "sig": "search(query: string, options: { numResults?: number; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; } | undefined",
              "r": false,
              "d": "{ numResults?: number; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        },
        {
          "sig": "name: string",
          "desc": "name",
          "params": []
        },
        {
          "sig": "apiKey: string",
          "desc": "apiKey",
          "params": []
        },
        {
          "sig": "defaultNumResults: number",
          "desc": "defaultNumResults",
          "params": []
        },
        {
          "sig": "baseUrl: string",
          "desc": "baseUrl",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "WebSearchToolConfig",
      "desc": "Configuration for the {@link createWebSearchTool} tool.",
      "methods": [],
      "props": [
        {
          "name": "provider",
          "type": "WebSearchProvider",
          "required": true,
          "desc": "Web search provider — injectable dependency.\nUser tự implement provider hoặc dùng built-in adapters."
        },
        {
          "name": "defaultNumResults",
          "type": "number | undefined",
          "required": false,
          "desc": "Default number of search results (default: 5)"
        },
        {
          "name": "timeout",
          "type": "number | undefined",
          "required": false,
          "desc": "Search timeout in ms (default: 15000)"
        }
      ]
    },
    {
      "type": "type",
      "name": "WebSearchProvider",
      "desc": "Web search provider interface — user tự implement.\nVí dụ: Tavily, Serper, Bing, Google Custom Search, DuckDuckGo...",
      "methods": [
        {
          "sig": "search(query: string, options: { numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined): Promise<WebSearchResponse>",
          "desc": "",
          "params": [
            {
              "n": "query",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "options",
              "t": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined",
              "r": false,
              "d": "{ numResults?: number; searchDepth?: \"basic\" | \"advanced\"; } | undefined"
            }
          ],
          "ret": "Promise<WebSearchResponse>"
        }
      ],
      "props": [
        {
          "name": "name",
          "type": "string",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "WebSearchResponse",
      "desc": "Response of a web search: ranked results plus an optional synthesized answer.",
      "methods": [],
      "props": [
        {
          "name": "results",
          "type": "SearchResult[]",
          "required": true,
          "desc": ""
        },
        {
          "name": "answer",
          "type": "string | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "SearchResult",
      "desc": "A single web search result.",
      "methods": [],
      "props": [
        {
          "name": "title",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "url",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "content",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "score",
          "type": "number",
          "required": true,
          "desc": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitStatusTool",
      "desc": "Create the `git_status` tool (branch + `git status --short`).",
      "methods": [
        {
          "sig": "createGitStatusTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_status` tool (branch + `git status --short`).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitDiffTool",
      "desc": "Create the `git_diff` tool (unstaged or `--staged` diff).",
      "methods": [
        {
          "sig": "createGitDiffTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_diff` tool (unstaged or `--staged` diff).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitLogTool",
      "desc": "Create the `git_log` tool (recent commit history, optionally scoped to a path).",
      "methods": [
        {
          "sig": "createGitLogTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_log` tool (recent commit history, optionally scoped to a path).",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createGitCommitTool",
      "desc": "Create the `git_commit` tool that commits staged changes with a message.",
      "methods": [
        {
          "sig": "createGitCommitTool(workspaceRoot: RootGetter): ToolDefinition<unknown, unknown>",
          "desc": "Create the `git_commit` tool that commits staged changes with a message.",
          "params": [
            {
              "n": "workspaceRoot",
              "t": "RootGetter",
              "r": true,
              "d": "RootGetter"
            }
          ],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "function",
      "name": "createQuestionTool",
      "desc": "Create the `question` tool that asks the user a question (with optional\npredefined options). Pass a {@link QuestionHandler} to resolve answers.",
      "methods": [
        {
          "sig": "createQuestionTool(handler: QuestionHandler | undefined): ToolDefinition<QuestionInput, { answer: string; error?: string; }>",
          "desc": "Create the `question` tool that asks the user a question (with optional\npredefined options). Pass a {@link QuestionHandler} to resolve answers.",
          "params": [
            {
              "n": "handler",
              "t": "QuestionHandler | undefined",
              "r": false,
              "d": "QuestionHandler | undefined"
            }
          ],
          "ret": "ToolDefinition<QuestionInput, { answer: string; error?: string; }>"
        }
      ]
    },
    {
      "type": "type",
      "name": "QuestionInput",
      "desc": "Input for the `question` tool.",
      "methods": [],
      "props": [
        {
          "name": "header",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "question",
          "type": "string",
          "required": true,
          "desc": ""
        },
        {
          "name": "options",
          "type": "{ label: string; description?: string | undefined; }[] | undefined",
          "required": false,
          "desc": ""
        },
        {
          "name": "multiple",
          "type": "boolean | undefined",
          "required": false,
          "desc": ""
        }
      ]
    },
    {
      "type": "type",
      "name": "QuestionHandler",
      "desc": "Resolver that returns the user's answer for a {@link QuestionInput}.",
      "methods": [
        {
          "sig": "type QuestionHandler = QuestionHandler",
          "desc": "Resolver that returns the user's answer for a {@link QuestionInput}.",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "createTodoWriteTool",
      "desc": "Create the `todowrite` tool managing a structured task list with priorities and status.",
      "methods": [
        {
          "sig": "createTodoWriteTool(): ToolDefinition<unknown, unknown>",
          "desc": "Create the `todowrite` tool managing a structured task list with priorities and status.",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>"
        }
      ]
    },
    {
      "type": "class",
      "name": "AgentToolProvider",
      "desc": "AgentToolProvider — Provides agent-related tools.\n\nTools are lazily created after the kernel is initialized\nto avoid circular dependencies.",
      "methods": [
        {
          "sig": "setKernel(kernel: KernelLike): void",
          "desc": "Set the kernel instance (call after kernel is created).",
          "params": [
            {
              "n": "kernel",
              "t": "KernelLike",
              "r": true,
              "d": "KernelLike"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "createTools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": [],
          "ret": "ToolDefinition<unknown, unknown>[]"
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"agents\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"Agent Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Agent management tools: spawn, delegate, list, create\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "kernel: KernelLike | null",
          "desc": "kernel",
          "params": []
        },
        {
          "sig": "_tools: ToolDefinition<unknown, unknown>[]",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "type",
      "name": "KernelLike",
      "desc": "Minimal kernel interface for tool registration.\nAvoids circular dependency with",
      "methods": [
        {
          "sig": "registerTool(tool: ToolDefinition<unknown, unknown>): void",
          "desc": "",
          "params": [
            {
              "n": "tool",
              "t": "ToolDefinition<unknown, unknown>",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>"
            }
          ],
          "ret": "void"
        }
      ],
      "props": []
    },
    {
      "type": "class",
      "name": "SkillToolProvider",
      "desc": "SkillToolProvider — Provides skill-related tools.\n\nThis is a metadata provider that declares skill tools exist.\nActual tool creation happens in the composition root to avoid circular dependencies.",
      "methods": [
        {
          "sig": "addTools(tools: ToolDefinition<unknown, unknown>[]): void",
          "desc": "Add tools externally (called by composition root).",
          "params": [
            {
              "n": "tools",
              "t": "ToolDefinition<unknown, unknown>[]",
              "r": true,
              "d": "ToolDefinition<unknown, unknown>[]"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "register(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "unregister(_registry: ToolRegistry): void",
          "desc": "",
          "params": [
            {
              "n": "_registry",
              "t": "ToolRegistry",
              "r": true,
              "d": "ToolRegistry"
            }
          ],
          "ret": "void"
        },
        {
          "sig": "id: \"skills\"",
          "desc": "id",
          "params": []
        },
        {
          "sig": "name: \"Skill Tools\"",
          "desc": "name",
          "params": []
        },
        {
          "sig": "description: \"Skill management tools: load, search, create\"",
          "desc": "description",
          "params": []
        },
        {
          "sig": "_tools: ToolDefinition<unknown, unknown>[]",
          "desc": "_tools",
          "params": []
        },
        {
          "sig": "get tools(): ToolDefinition<unknown, unknown>[]",
          "desc": "",
          "params": []
        }
      ]
    },
    {
      "type": "function",
      "name": "readImageToContentParts",
      "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
      "methods": [
        {
          "sig": "readImageToContentParts(filePath: string, workspaceRoot: RootGetter | undefined, externalDirAccess: boolean | undefined): Promise<MessageContentPart[]>",
          "desc": "Read an image file into model message parts (`text` + base64 `image`),\nvalidating the file extension, magic bytes and workspace containment.\n\nWhen `workspaceRoot` is provided the path is checked against the workspace\nboundary (realpath-aware, symlink-safe) before reading.",
          "params": [
            {
              "n": "filePath",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "workspaceRoot",
              "t": "RootGetter | undefined",
              "r": false,
              "d": "RootGetter | undefined"
            },
            {
              "n": "externalDirAccess",
              "t": "boolean | undefined",
              "r": false,
              "d": "boolean | undefined"
            }
          ],
          "ret": "Promise<MessageContentPart[]>"
        }
      ]
    },
    {
      "type": "function",
      "name": "lintToolDescription",
      "desc": "Lint a single tool description. Returns the report (empty `issues` = clean).",
      "methods": [
        {
          "sig": "lintToolDescription(tool: string, description: string): ToolDescriptionReport",
          "desc": "Lint a single tool description. Returns the report (empty `issues` = clean).",
          "params": [
            {
              "n": "tool",
              "t": "string",
              "r": true,
              "d": "string"
            },
            {
              "n": "description",
              "t": "string",
              "r": true,
              "d": "string"
            }
          ],
          "ret": "ToolDescriptionReport"
        }
      ]
    },
    {
      "type": "function",
      "name": "lintToolDefinitions",
      "desc": "Lint a list of tool definitions, returning only the ones with issues.",
      "methods": [
        {
          "sig": "lintToolDefinitions(definitions: readonly { id: string; description: string; }[]): ToolDescriptionReport[]",
          "desc": "Lint a list of tool definitions, returning only the ones with issues.",
          "params": [
            {
              "n": "definitions",
              "t": "readonly { id: string; description: string; }[]",
              "r": true,
              "d": "readonly { id: string; description: string; }[]"
            }
          ],
          "ret": "ToolDescriptionReport[]"
        }
      ]
    }
  ]
},
];
