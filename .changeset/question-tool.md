---
"@vinhnt-sdk/tools": minor
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/event": minor
"@vinhnt-sdk/step-executor": minor
"@vinhnt-sdk/core": minor
---

feat(tools): human-in-the-loop `question` tool — durable `question.requested` / `question.replied` events, injectable `QuestionStore` (+ `InMemoryQuestionStore`), and `ToolContext.askQuestion` for block-await-resume. The `question` tool now supports a 1–4 item batch form and resumes the run with the store reply; wire it via `AgentKernel` config `questions.questionStore`.
