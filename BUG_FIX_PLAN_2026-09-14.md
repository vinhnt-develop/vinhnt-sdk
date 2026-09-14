# VINHNT-SDK Bug Fix Plan - 2026-09-14 (UPDATED)

## Root Cause Analysis

### Primary Bug: Empty `model` string in `OpenAICompatibleProvider`

**Location**: `packages/provider-openai-compatible/src/openai-compatible-provider.ts:109`
```typescript
this.model = opts.defaultModel ?? "";  // BUG: defaults to empty string
```

**Impact**: 
- `computeSessionUpdates()` in `kernel-session.ts` accesses `runModel.model` → gets `""`
- `updateSessionOnComplete()` same issue
- When session update runs, `modelName` is `""` → `{ model: "" }` written to session
- Downstream consumers may fail on empty model string

**When it happens**: Any provider created without explicit `defaultModel` (e.g., user calls `new OpenAICompatibleProvider({ baseUrl: "..." })` without `defaultModel`)

---

## Fix Plan

### Phase 1: Immediate Fix (P0 - Critical) ✅ COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 1.1 | Fix OpenAICompatibleProvider to require defaultModel | ✅ DONE | provider-openai-compatible/src/openai-compatible-provider.ts |
| 1.2 | Add defensive checks in computeSessionUpdates | ✅ DONE | core/src/kernel/kernel-session.ts |
| 1.3 | Add defensive checks in updateSessionOnComplete | ✅ DONE | core/src/kernel/kernel-session.ts |
| 1.4 | Validate defaultModel at ModelCaller construction | ✅ DONE | llm/src/model-caller.ts |
| 1.5 | Fix kernel.ts agent type for resolveAgentModel | ✅ DONE | core/src/kernel/kernel.ts |
| 1.6 | Add test for provider constructor validation | ✅ DONE | provider-openai-compatible/test/constructor-validation.test.ts |

### Phase 2: Architecture Hardening (P1 - High) ⬜ PENDING

| # | Task | Status | File |
|---|------|--------|------|
| 2.1 | Add NonEmptyString branded type for model field | ⬜ | schema/src/types/model.ts |
| 2.2 | Validate at kernel bootstrap (AgentKernel constructor) | ⬜ | core/src/kernel/kernel.ts |
| 2.3 | Add validation in buildRequest/postCompletion | ⬜ | provider-openai-compatible/src/openai-compatible-provider.ts |
| 2.4 | Review all ModelProvider implementations for same issue | ⬜ | - |

### Phase 3: Test Coverage (P1 - High) ⬜ PENDING

| # | Task | Status | File |
|---|------|--------|------|
| 3.1 | Add integration test for kernel-session with valid/empty model | ⬜ | core/test/kernel-session.test.ts |
| 3.2 | Add test for ModelCaller with invalid defaultModel | ⬜ | llm/test/model-caller.test.ts |

---

## Detailed Task List

| # | Task | Priority | File | Status |
|---|------|----------|------|--------|
| 1 | Fix OpenAICompatibleProvider to require defaultModel | P0 | provider-openai-compatible/src/openai-compatible-provider.ts | ✅ |
| 2 | Add defensive checks in computeSessionUpdates | P0 | core/src/kernel/kernel-session.ts | ✅ |
| 3 | Add defensive checks in updateSessionOnComplete | P0 | core/src/kernel/kernel-session.ts | ✅ |
| 4 | Validate defaultModel at ModelCaller construction | P0 | llm/src/model-caller.ts | ✅ |
| 5 | Fix kernel.ts agent type casts | P0 | core/src/kernel/kernel.ts | ✅ |
| 6 | Add test: provider without defaultModel throws | P0 | provider-openai-compatible/test/ | ✅ |
| 7 | Add NonEmptyString branded type for model field | P1 | schema/src/types/model.ts | ⬜ |
| 8 | Validate at kernel bootstrap | P1 | core/src/kernel/kernel.ts | ⬜ |
| 9 | Add validation in buildRequest/postCompletion | P1 | provider-openai-compatible/src/openai-compatible-provider.ts | ⬜ |
| 10 | Add test: kernel-session with valid/empty model | P1 | core/test/ | ⬜ |
| 11 | Add test: ModelCaller with invalid defaultModel | P1 | llm/test/ | ⬜ |
| 12 | Review all ModelProvider implementations | P2 | - | ⬜ |

---

## Verification Checklist

After fixes:
- [x] `pnpm build` passes all 18 packages
- [x] `pnpm test` passes for packages affected by changes
- [x] Manual test: create provider without defaultModel → throws ConfigurationError
- [x] Manual test: create provider with empty defaultModel → throws ConfigurationError
- [x] Manual test: create provider with valid defaultModel → works
- [ ] Manual test: run kernel with valid provider → session updates work
- [ ] Manual test: run kernel fails → emitFail doesn't crash on session update
- [ ] No regression in existing tests

---

## npm Version Strategy

Current versions (from package.json):
- Most packages: `0.1.3` - `0.2.0`
- Schema: `0.2.1`

**Recommendation**: Bump all packages to `0.2.0` (patch for bug fixes) or `0.3.0` (minor for API changes like required defaultModel).

Since `OpenAICompatibleProvider` constructor behavior changes (required defaultModel), this is a **breaking change** → **0.3.0** for that package, others can stay `0.2.0` or bump to `0.3.0` for consistency.

**Action**: After fixes pass tests, run version bump, then `pnpm publish:all`

---

## Other Potential Bugs Found During Review

### P1 - High Priority

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 4.1 | `OpenAICompatibleProvider.postCompletion` line 166 sends empty model if both request and provider lack model | provider-openai-compatible/src/openai-compatible-provider.ts | Upstream API error |
| 4.2 | `ModelCaller.resolveAgentModel` stores invalid model if defaultModel.model === "" | llm/src/model-caller.ts:123 | Silent bug |
| 4.3 | `kernel.ts` run loop - no validation of model before starting step loop | core/src/kernel/kernel.ts | Runtime crash |

### P2 - Medium Priority

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 4.4 | `AgentKernelConfig.model` is required but no validation that model.model is non-empty | core/src/kernel/kernel-types.ts | Config validation gap |
| 4.5 | Preset providers (DeepSeek, Anthropic, Ollama) all have defaultModel so not affected | provider-openai-compatible/src/presets.ts | Low (but verify) |

---

## Next Steps

1. **Complete Phase 2** - Add branded type, kernel bootstrap validation, request validation
2. **Complete Phase 3** - Add integration tests
3. **Version bump** - Decide on 0.2.0 vs 0.3.0 strategy
4. **Publish to npm** - Run `pnpm publish:all` after version bump