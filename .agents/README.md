# .agents — Private Development Knowledge Base

> This directory is **git-ignored**. It contains private development configuration, research, and reusable skills for AI agents working on vinhnt-sdk.

---

## Purpose

This is the **brain** of the agent system. Every time an agent receives a prompt, it should scan this directory to:

1. Understand the project context
2. Load relevant skills and rules
3. Check existing plans
4. Follow defined workflows
5. Reference external repos and papers

---

## Agent Execution Workflow

When an agent receives a prompt, execute this scan:

### Phase 1: Context Loading (Always)

```
1. READ .agents/README.md                    ← You are here
2. READ .agents/instructions/architecture.md  ← System design context
3. READ .agents/instructions/coding-standards.md  ← Code conventions
4. READ .agents/instructions/development-workflow.md  ← Dev commands
```

### Phase 2: Rule Check (Before Code Changes)

```
5. READ .agents/rules/security.md            ← If touching security-sensitive code
6. READ .agents/rules/code-review.md         ← If reviewing code
7. READ .agents/rules/testing.md             ← If writing tests
```

### Phase 3: Skill Loading (Task-Specific)

```
8. READ .agents/skills/code-review/SKILL.md      ← For code review tasks
9. READ .agents/skills/research/SKILL.md         ← For research tasks
10. READ .agents/skills/testing/SKILL.md         ← For testing tasks
11. READ .agents/skills/documentation/SKILL.md   ← For documentation tasks
12. READ .agents/skills/library-design/SKILL.md  ← For library design decisions
13. READ .agents/skills/upgrade-plan/SKILL.md    ← For upgrade planning
```

### Phase 4: Plan Management (Always)

```
12. LIST .agents/plans/                     ← Check existing plans
13. IF task matches existing plan → UPDATE plan
14. IF new task → CREATE new plan with:
    - File: .agents/plans/YYYY-MM-DD_<plan-name>.md
    - Tasks with [ ] checkboxes
    - Status tracking
```

### Phase 5: Execution (Per Task)

```
15. Follow workflow from .agents/workflow/ if applicable
16. Execute task according to plan
17. Update plan checkboxes as tasks complete
18. Log changes in plan's "Changes" section
```

---

## 8-Phase Architecture Refactor (2026-08-25)

The current major initiative is an 8-phase architecture refactor. See `.agents/plans/2026-08-25_architecture-refactor.md` for full details.

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Type System Overhaul (RunUsage nested, provider-spec package) | ✅ Completed |
| Phase 2 | Error Handling Overhaul (domain, category, isInstance) | ✅ Completed |
| Phase 3 | Token/Usage System (integrated in Phase 1) | ✅ Completed |
| Phase 4 | Agent Loop Refactor (prepareStep callback) | ✅ Completed |
| Phase 5 | Configuration Overhaul (DynamicArgument, RunConfig) | ✅ Completed |
| Phase 6 | Extensibility (ToolMiddleware) | ✅ Completed |
| Phase 7 | Observability (TelemetryProvider) | ✅ Completed |
| Phase 8 | Testing (@vinhnt-sdk/test-utils) | ✅ Completed |

---

## Directory Structure

```
.agents/
├── README.md                    # This file — full workflow documentation
├── .gitignore                   # Ignore everything except key files
│
├── instructions/                # Context & standards
│   ├── architecture.md          # System design, layer model, patterns
│   ├── coding-standards.md      # TypeScript conventions, naming, types
│   └── development-workflow.md  # Commands, git workflow, release process
│
├── rules/                       # Mandatory rules
│   ├── security.md              # Security practices (P0-P2)
│   ├── code-review.md           # Review checklist
│   └── testing.md               # Testing standards
│
├── skills/                      # Reusable agent skills
│   ├── code-review/
│   │   ├── SKILL.md             # Code review workflow
│   │   └── resource/            # Checklists, templates
│   ├── research/
│   │   ├── SKILL.md             # Research workflow
│   │   └── resource/            # Search queries, sources
│   ├── testing/
│   │   ├── SKILL.md             # Testing workflow
│   │   └── resource/            # Templates, fake references
│   ├── documentation/
│   │   ├── SKILL.md             # Documentation workflow
│   │   └── resource/            # Style guides, templates
│   ├── library-design/
│   │   ├── SKILL.md             # Library design principles & checklist
│   │   └── appendix.md          # 10 industry patterns + pre-refactor checklist
│   └── upgrade-plan/
│       └── SKILL.md             # Upgrade planning workflow
│
├── workflow/                    # Process definitions
│   ├── pull-request.md          # PR creation and review process
│   ├── issue-triage.md          # Issue categorization and routing
│   └── release.md               # Versioning and publishing process
│
├── plans/                       # Active plans (dated, task-tracked)
│   └── YYYY-MM-DD_<plan-name>.md
│
├── research/                    # Analysis and reports
│   ├── openai-api-spec-2026.md          # OpenAI API v2.3.0 reference
│   ├── hardcoded-data-violations.md     # Historical: 42 violations (RESOLVED)
│   ├── library-design-violations.md     # Historical: violations by package (OUTDATED)
│   ├── library-design-principles.md     # TypeScript library design principles
│   ├── competitive-landscape-2026.md    # Competitive analysis
│   ├── sandbox-isolation-research.md    # Sandbox security research
│   ├── a2a-protocol-research.md         # Agent-to-Agent protocol
│   ├── ai-observability-research.md     # LLM observability
│   ├── community-insights-2026.md       # Developer pain points
│   ├── comprehensive-review-report.md   # Full codebase review (OUTDATED)
│   ├── market-analysis-ai-coding-agents.md  # Market analysis
│   └── github-issues-templates.md       # Issue templates
│
└── references/                  # External resources
    └── agent-repos.md           # Agent framework links, papers, reports
```

---

## Plan File Format

Every plan lives in `.agents/plans/` and follows this format:

```markdown
# Plan: <Title>

> Created: YYYY-MM-DD HH:MM
> Status: in_progress | completed | cancelled

## Goal
What we're trying to achieve.

## Tasks
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

## Notes
- Decisions made
- Links to references
- Blockers or issues

## Changes
- YYYY-MM-DD HH:MM — Created plan
- YYYY-MM-DD HH:MM — Updated status
```

**Naming convention:** `YYYY-MM-DD_<kebab-case-plan-name>.md`

Examples:
- `2026-08-08_add-streaming-support.md`
- `2026-08-09_fix-security-issues.md`
- `2026-08-10_research-a2a-protocol.md`

---

## How Skills Work

Each skill in `skills/` contains:

1. **SKILL.md** — The skill definition:
   - When to use it
   - Step-by-step workflow
   - Output format template
   - Links to resources

2. **resource/** — Supporting materials:
   - Checklists
   - Templates
   - Reference data
   - Search queries

### Loading a Skill

When a task matches a skill description:

1. Read the skill's `SKILL.md`
2. Follow the workflow steps
3. Use the output format template
4. Reference resources as needed

---

## How Rules Work

Rules are **mandatory** constraints. Before any code change:

| Rule File | When to Read |
|-----------|-------------|
| `security.md` | Before any security-related work, shell tools, file access |
| `code-review.md` | Before reviewing PRs or own changes |
| `testing.md` | Before writing or modifying tests |

Rules use priority levels:
- **P0 (Critical):** Must fix before production
- **P1 (High):** Required for production
- **P2 (Medium):** Best practice

---

## How References Work

`references/agent-repos.md` contains curated links to:

- AI agent frameworks (OpenAI, Anthropic, Google, Meta, Microsoft)
- Open source agent projects
- Academic papers on agent research
- Industry reports (McKinsey, Gartner)
- Protocol specifications (MCP, A2A)

**Usage:** When researching a topic, check references first. Use `websearch` to fetch latest info from these sources.

---

## Maintenance

### Adding a New Skill
1. Create `skills/<skill-name>/SKILL.md`
2. Create `skills/<skill-name>/resource/` if needed
3. Update this README's directory structure

### Adding a New Rule
1. Create `rules/<rule-name>.md`
2. Use P0/P1/P2 priority levels
3. Update this README's "How Rules Work" section

### Creating a Plan
1. Create `plans/YYYY-MM-DD_<plan-name>.md`
2. Follow the plan file format
3. Update task checkboxes as work progresses

### Updating References
1. Add new links to `references/agent-repos.md`
2. Include description and URL
3. Categorize by type (framework, paper, report)

---

## Quick Reference

### For AI Agents
```
When you receive a prompt:
1. Scan .agents/README.md for workflow
2. Load relevant instructions
3. Check rules for constraints
4. Load matching skill
5. Create/update plan
6. Execute with plan tracking
```

### For Human Developers
```
When starting a session:
1. Review .agents/instructions/ for context
2. Check .agents/plans/ for active work
3. Reference .agents/research/ for analysis
4. Use .agents/workflow/ for processes
```