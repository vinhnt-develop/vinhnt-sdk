# @vinhnt-sdk/provider-openai-compatible

OpenAI-compatible model provider for VNT Agent — implemented with **raw `fetch`**, zero AI SDK.

Implements the [`ModelProvider`](https://github.com/vinhnt-develop/vinhnt-sdk) contract using the OpenAI Chat Completion API
(`/chat/completions`), including SSE streaming.

## Features

- `buildRequest(modelRequest, { stream })` → OpenAI Chat Completion body
- `createSSEStream(body, signal)` → parse `data:` + `[DONE]` + final usage chunk
- Tool-call delta assembly → `ModelStreamEvent`
- Retry/backoff on retryable HTTP statuses + `Retry-After` header
- Upstream failures map to `UpstreamError` with `ERR_UPSTREAM_<STATUS>` codes
- Conversion functions (`fromOpenAIMessage`, `fromOpenAIResponse`, `fromOpenAIStreamChunk`, …) imported from schema types

## Usage

```ts
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const provider = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
  defaultModel: "gpt-4o",
  retry: { maxRetries: 3 },
});
```

Use it anywhere a `ModelProvider` is accepted (kernel `model`, model registry, agent profiles).