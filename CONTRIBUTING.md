# Contributing to vinhnt-sdk

Thank you for your interest in contributing to vinhnt-sdk! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Requests](#pull-requests)
- [Issues](#issues)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 9
- Git

### Installation

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/vinhnt-sdk.git
   cd vinhnt-sdk
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build all packages:
   ```bash
   pnpm build
   ```

## Development Setup

### Build Order

Packages must be built in order due to dependencies:

```
schema → security → tools → knowledge → core → plugin → lsp
```

Or simply run:

```bash
pnpm build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @vinhnt-sdk/core test

# Run tests in watch mode
pnpm --filter @vinhnt-sdk/core test:watch
```

### Linting

```bash
pnpm lint
```

## Project Structure

```
vinhnt-sdk/
├── packages/
│   ├── schema/       # Core types, contracts, schemas
│   ├── core/         # Agent kernel, orchestration
│   ├── tools/        # Built-in tools
│   ├── knowledge/    # Memory, context compression
│   ├── security/     # Prompt injection, secret redaction
│   ├── plugin/       # Plugin system
│   └── lsp/          # LSP integration
├── docs/             # Documentation
├── examples/         # Example implementations
└── .agents/          # AI agent workflow config (git-ignored)
```

### Package Responsibilities

- **schema**: Core types, contracts, Zod schemas, error classes
- **core**: Agent kernel, tool execution, permissions, sessions, events
- **tools**: Built-in tools (file, shell, git, web, search, image)
- **knowledge**: Memory stores, context compression, prompt building
- **security**: Prompt injection protection, secret redaction
- **plugin**: Plugin loading and lifecycle management
- **lsp**: Language Server Protocol integration

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the [Code Standards](#code-standards)
- Add tests for new functionality
- Update documentation if needed

### 3. Run Checks

```bash
pnpm build
pnpm test
pnpm lint
```

### 4. Commit Changes

Use conventional commit messages:

```bash
git commit -m "feat(core): add new feature"
git commit -m "fix(tools): resolve bug in file tools"
git commit -m "docs(schema): update API documentation"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Standards

### TypeScript

- Use TypeScript 6.0+ features
- Prefer interfaces over types for object shapes
- Use branded types for IDs (e.g., `RunId`, `SessionId`)
- No `any` types - use `unknown` if needed
- Use Zod for runtime validation

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `tool-registry.ts`)
- **Classes**: `PascalCase` (e.g., `ToolRegistry`)
- **Interfaces**: `PascalCase` (e.g., `ToolConfig`)
- **Functions**: `camelCase` (e.g., `createTool`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Types**: `PascalCase` (e.g., `ToolRisk`)

### Error Handling

- Extend `VntError` for all SDK errors
- Include `code` and `retryable` properties
- Use specific error classes (e.g., `ToolInputError`, `NetworkError`)

```typescript
import { VntError } from "@vinhnt-sdk/schema";

class MyCustomError extends VntError {
  readonly code = "my_custom_error";
  readonly retryable = false;
}
```

### No Hardcoded Data

- **NEVER** hardcode prices, model names, URLs, or language patterns
- Use dependency injection for all configuration
- Use registry patterns for extension points
- Use string types with `KNOWN_*` constants

```typescript
// ❌ Bad
const MODEL_NAME = "gpt-4";

// ✅ Good
interface ModelConfig {
  model: string; // Injectable, not hardcoded
}

const KNOWN_MODELS = ["gpt-4", "claude-3"] as const;
```

### Documentation

- Add JSDoc comments to all public APIs
- Include `@example` tags for complex functions
- Document parameters and return values

```typescript
/**
 * Creates a new tool with the given configuration.
 * 
 * @param config - Tool configuration
 * @returns Tool instance
 * 
 * @example
 * ```typescript
 * const tool = defineTool({
 *   name: "my_tool",
 *   description: "A custom tool",
 *   risk: "read",
 *   input: z.object({ query: z.string() }),
 *   async execute(input) {
 *     return `Result: ${input.query}`;
 *   },
 * });
 * ```
 */
export function defineTool<T>(config: ToolConfig<T>): Tool<T> {
  // ...
}
```

## Testing

### Test Structure

- Use Vitest for testing
- Place tests next to source files: `*.test.ts`
- Follow the naming convention: `describe("Feature")`, `it("should...")`

### Test Guidelines

- Test both success and error cases
- Mock external dependencies
- Use descriptive test names
- Aim for high coverage on critical paths

```typescript
import { describe, it, expect, vi } from "vitest";
import { ToolRegistry } from "./registry.js";

describe("ToolRegistry", () => {
  it("should register and retrieve tools", () => {
    const registry = new ToolRegistry();
    const tool = { id: "test", name: "Test Tool" };
    
    registry.register(tool);
    expect(registry.get("test")).toEqual(tool);
  });

  it("should return undefined for unknown tools", () => {
    const registry = new ToolRegistry();
    expect(registry.get("unknown")).toBeUndefined();
  });
});
```

## Documentation

### Package Documentation

Each package should have:

1. `README.md` with overview, installation, and usage
2. API documentation in `docs/packages/`
3. JSDoc comments on all public APIs

### Examples

Add examples in `examples/` directory:

```
examples/
├── basic/
├── advanced/
└── plugins/
```

## Pull Requests

### PR Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why, not how
3. **Tests**: Include tests for new features
4. **Documentation**: Update relevant docs
5. **Size**: Keep PRs focused and small

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered

### Labels

- `bug` - Bug reports
- `enhancement` - Feature requests
- `documentation` - Documentation issues
- `good first issue` - Good for newcomers

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Questions?

If you have questions, feel free to:
1. Open an issue
2. Start a discussion on GitHub
3. Review existing documentation

Thank you for contributing to vinhnt-sdk!
