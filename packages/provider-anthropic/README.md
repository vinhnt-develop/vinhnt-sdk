# @vinhnt-sdk/provider-anthropic

Anthropic (Claude) model provider tip for VNT Agent — a thin wrapper over
[`@vinhnt-sdk/provider-openai-compatible`](https://github.com/vinhnt-develop/vinhnt-sdk)
pointed at the **Claude OpenAI-compatible endpoint**
(`https://api.anthropic.com/v1/chat/completions`) with the required
`anthropic-version` header. No shared implementation with other tips.

> The OpenAI-compatibility layer is primarily intended for quick testing and
> comparison. Use the native Claude API for production features such as prompt
> caching, citations and extended thinking.

## Usage

```ts
import { createAnthropicProvider } from "@vinhnt-sdk/provider-anthropic";

const provider = createAnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Defaults: baseUrl https://api.anthropic.com/v1, model claude-sonnet-4-6,
// headers { "anthropic-version": "2023-06-01" }, context 200K
```

## Options

| Option            | Default                     | Description                                   |
| ----------------- | --------------------------- | --------------------------------------------- |
| `apiKey`          | required                    | Anthropic API key (`sk-ant-...`)              |
| `baseUrl`         | `https://api.anthropic.com/v1` | API endpoint (OpenAI-compatible layer)     |
| `model`           | `claude-sonnet-4-6`         | Default Claude model                          |
| `contextLimit`    | `200000`                    | Context window (tokens)                       |
| `capabilities`    | streaming/toolCalling/imageInput | Capability flags (thinking/structuredOutput disabled — the compat layer does not expose them) |
| `retry`           | base provider default       | Retry/backoff policy                          |