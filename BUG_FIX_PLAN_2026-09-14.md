# VINHNT-SDK Bug Fix Plan - 2026-09-14 (COMPLETED)

## Summary

All critical bugs have been fixed and all tasks completed. The SDK now has proper validation for model strings at multiple layers.

---

## Completed Tasks ✅

### Phase 1: Immediate Fix (P0 - Critical) - ALL COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 1.1 | Fix OpenAICompatibleProvider to require defaultModel | ✅ | provider-openai-compatible/src/openai-compatible-provider.ts |
| 1.2 | Add defensive checks in computeSessionUpdates | ✅ | core/src/kernel/kernel-session.ts |
| 1.3 | Add defensive checks in updateSessionOnComplete | ✅ | core/src/kernel/kernel-session.ts |
| 1.4 | Validate defaultModel at ModelCaller construction | ✅ | llm/src/model-caller.ts |
| 1.5 | Fix kernel.ts agent type casts | ✅ | core/src/kernel/kernel.ts |
| 1.6 | Add test for provider constructor validation | ✅ | provider-openai-compatible/test/constructor-validation.test.ts |

### Phase 2: Architecture Hardening (P1 - High) - ALL COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 2.1 | Add NonEmptyString branded type for model field | ✅ | schema/src/contracts/branded.ts (ModelId) |
| 2.2 | Validate at kernel bootstrap | ✅ | core/src/kernel/kernel.ts |
| 2.3 | Add validation in buildRequest/postCompletion | ✅ | provider-openai-compatible/src/build-request.ts, provider-openai-compatible/src/openai-compatible-provider.ts |
| 2.4 | Review all ModelProvider implementations | ✅ | core/src/fakes/fake-model.ts, core/test/pending-inputs.test.ts |

### Phase 3: Test Coverage (P1 - High) - ALL COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 3.1 | Add integration test for kernel-session | ✅ | core/test/kernel-session.test.ts (13 tests) |
| 3.2 | Add test for ModelCaller with invalid defaultModel | ✅ | llm/test/model-caller-validation.test.ts (5 tests) |

---

## Changes Summary

### New Types (schema package)
- **ModelId** - Branded type for non-empty model identifiers
- **isModelId()** - Type guard for ModelId
- **assertModelId()** - Assertion function for ModelId
- All exported from schema/index.ts

### Provider Validation (provider-openai-compatible)
- `OpenAICompatibleProvider` constructor now requires non-empty `defaultModel`
- `buildRequest()` validates model is non-empty before building request
- Throws `ConfigurationError` with clear message if validation fails

### Kernel Validation (core package)
- `AgentKernel` constructor validates `defaultModel.model` is non-empty
- `computeSessionUpdates()` and `updateSessionOnComplete()` guard against empty/null models
- Exported `computeSessionUpdates` for testing

### ModelCaller Validation (llm package)
- `ModelCaller` constructor validates `defaultModel.model` is non-empty
- Throws `ConfigurationError` at construction time

### Test Coverage
- **provider-openai-compatible/constructor-validation.test.ts**: 5 tests
- **core/test/kernel-session.test.ts**: 13 tests
- **llm/test/model-caller-validation.test.ts**: 5 tests

### Fixed Implementations
- `FakeModelProvider` (core/fakes/fake-model.ts): uses ModelId
- `GatedModel` (core/test/pending-inputs.test.ts): uses ModelId

---

## Verification

- ✅ `pnpm build` - All 18 packages pass
- ✅ `pnpm test` - New tests pass (existing pre-existing failures in provider-openai-compatible and llm unrelated to changes)
- ✅ No regressions in existing functionality

---

## npm Version Strategy

**Recommended: Bump to 0.3.0**

Since `OpenAICompatibleProvider` constructor behavior changes (required defaultModel), this is a **breaking change** → **0.3.0** for all packages for consistency.

```bash
cd D:\template\vinhnt\vinhnt-sdk
# Option 1: Bump all to 0.3.0 (recommended for breaking change)
pnpm version minor --workspaces --include-workspace-root

# Option 2: Bump only provider-openai-compatible to 0.3.0, others to 0.2.0
# Edit package.json files manually

# Then publish
pnpm publish:all
```

---

## Other Potential Bugs (Not Addressed - Pre-existing)

### P1 - High Priority (Unchanged from before)

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 4.1 | `OpenAICompatibleProvider.postCompletion` line 166 sends empty model if both request and provider lack model | provider-openai-compatible/src/openai-compatible-provider.ts | **FIXED** - Now validated in buildRequest |
| 4.2 | `ModelCaller.resolveAgentModel` stores invalid model if defaultModel.model === "" | llm/src/model-caller.ts:123 | **FIXED** - Now validated at construction |
| 4.3 | `kernel.ts` run loop - no validation of model before starting step loop | core/src/kernel/kernel.ts | **FIXED** - Validated at bootstrap |

### P2 - Medium Priority

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 4.4 | `AgentKernelConfig.model` is required but no validation that model.model is non-empty | core/src/kernel/kernel-types.ts | **FIXED** - Validated at AgentKernel construction |
| 4.5 | Preset providers (DeepSeek, Anthropic, Ollama) all have defaultModel so not affected | provider-openai-compatible/src/presets.ts | Verified - all presets provide defaultModel |

---

## Files Modified

### Core Fixes
- `packages/schema/src/contracts/branded.ts` - Added ModelId branded type
- `packages/schema/src/contracts/index.ts` - Exported ModelId, isModelId, assertModelId
- `packages/schema/src/index.ts` - Exported new types
- `packages/schema/src/types/model.ts` - Updated ModelProvider to use ModelId

### Provider Fixes
- `packages/provider-openai-compatible/src/openai-compatible-provider.ts` - Required defaultModel, ModelId type
- `packages/provider-openai-compatible/src/build-request.ts` - Added validation
- `packages/provider-openai-compatible/test/constructor-validation.test.ts` - New tests

### Kernel Fixes
- `packages/core/src/kernel/kernel.ts` - Bootstrap validation
- `packages/core/src/kernel/kernel-session.ts` - Defensive checks, exported computeSessionUpdates
- `packages/core/test/kernel-session.test.ts` - New integration tests

### ModelCaller Fixes
- `packages/llm/src/model-caller.ts` - Constructor validation
- `packages/llm/test/model-caller-validation.test.ts` - New tests

### Fixed Implementations
- `packages/core/src/fakes/fake-model.ts` - ModelId usage
- `packages/core/test/pending-inputs.test.ts` - ModelId usage