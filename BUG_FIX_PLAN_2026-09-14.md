# VINHNT-SDK Bug Fix Plan - 2026-09-14

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

### Phase 1: Immediate Fix (P0 - Critical)

#### 1.1 Fix `OpenAICompatibleProvider` to require valid model
**File**: `packages/provider-openai-compatible/src/openai-compatible-provider.ts`
- Make `defaultModel` required in constructor options OR throw if not provided
- Add validation in constructor

#### 1.2 Add defensive null/empty checks in `kernel-session.ts`
**File**: `packages/core/src/kernel/kernel-session.ts`
- `computeSessionUpdates()` - guard against empty model
- `updateSessionOnComplete()` - same

#### 1.3 Ensure `ModelCallerDeps.defaultModel` is always valid
**File**: `packages/core/src/kernel/kernel.ts` (where ModelCaller is instantiated)
- Validate defaultModel has non-empty model string at kernel init

---

### Phase 2: Architecture Hardening (P1 - High)

#### 2.1 Make `ModelProvider.model` non-empty in type system
**File**: `packages/schema/src/types/model.ts`
- Add branded type or validation: `NonEmptyString` for model
- Or add runtime assertion in `OpenAICompatibleProvider` constructor

#### 2.2 Add fail-closed validation in `ModelCaller.getActiveModel()`
**File**: `packages/llm/src/model-caller.ts`
- Assert returned model has non-empty `.model` string
- Throw `ConfigurationError` if not

#### 2.3 Validate at kernel bootstrap
**File**: `packages/core/src/kernel/kernel.ts`
- In `AgentKernel` constructor or `run()`, verify `modelCaller.getDefaultModel().model` is non-empty

---

### Phase 3: Test Coverage (P1 - High)

#### 3.1 Add test for provider without defaultModel
**File**: `packages/provider-openai-compatible/test/openai-compatible-provider.test.ts`
- Test constructor throws without defaultModel
- Test session update works with valid model

#### 3.2 Add integration test for kernel-session
**File**: `packages/core/test/kernel-session.test.ts`
- Test `computeSessionUpdates` with valid model
- Test `computeSessionUpdates` with empty model (should not crash)

---

### Phase 4: Other Potential Bugs Found During Review

#### 4.1 `OpenAICompatibleProvider.postCompletion` line 166
```typescript
model: request.model ?? this.model,
```
If both are empty, sends `model: ""` to API → upstream error
**Fix**: Validate before request, throw if no model available

#### 4.2 `ModelCaller.resolveAgentModel` line 123
```typescript
if (runId) this.deps.setModelForRun(runId, this.deps.defaultModel);
```
If `defaultModel.model === ""`, stores invalid model for run
**Fix**: Validate defaultModel at ModelCaller construction

#### 4.3 `buildRequest` in `provider-openai-compatible`
May send empty model to API if both request and provider lack model
**Fix**: Add validation in `buildRequest` or `postCompletion`

#### 4.4 `kernel.ts` run loop - no validation of model before starting
Should validate model exists before entering step loop

---

## Detailed Task List

| # | Task | Priority | File | Status |
|---|------|----------|------|--------|
| 1 | Fix OpenAICompatibleProvider to require defaultModel | P0 | provider-openai-compatible/src/openai-compatible-provider.ts | ⬜ |
| 2 | Add defensive checks in computeSessionUpdates | P0 | core/src/kernel/kernel-session.ts | ⬜ |
| 3 | Add defensive checks in updateSessionOnComplete | P0 | core/src/kernel/kernel-session.ts | ⬜ |
| 4 | Validate defaultModel at ModelCaller construction | P1 | llm/src/model-caller.ts | ⬜ |
| 5 | Validate at kernel bootstrap | P1 | core/src/kernel/kernel.ts | ⬜ |
| 6 | Add validation in buildRequest/postCompletion | P1 | provider-openai-compatible/src/openai-compatible-provider.ts | ⬜ |
| 7 | Add test: provider without defaultModel throws | P1 | provider-openai-compatible/test/ | ⬜ |
| 8 | Add test: kernel-session with valid/empty model | P1 | core/test/ | ⬜ |
| 9 | Review all ModelProvider implementations for same issue | P2 | - | ⬜ |
| 10 | Add NonEmptyString branded type for model field | P2 | schema/src/types/model.ts | ⬜ |

---

## Verification Checklist

After fixes:
- [ ] `pnpm build` passes all 18 packages
- [ ] `pnpm test` passes all packages
- [ ] Manual test: create provider without defaultModel → throws ConfigurationError
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

**Action**: After fixes pass tests, run `pnpm version prerelease --preid=rc` or manual version bump, then `pnpm publish:all`