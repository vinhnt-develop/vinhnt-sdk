# @vinhnt-sdk/provider-deepseek

DeepSeek model provider tip for VNT Agent — a thin wrapper over
[`@vinhnt-sdk/provider-openai-compatible`](https://github.com/vinhnt-develop/vinhnt-sdk)
that wires the DeepSeek **base URL**, **default model** and **capability flags**.
No shared implementation with other tips; each tip only configures the base provider.

## Usage

```ts
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-deepseek";

const provider = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// Defaults: baseUrl https://api.deepseek.com/v1, model deepseek-chat, context 64K

// Streaming and tool calling work out of the box via the base provider.
```

## Options

| Option            | Default                                  | Description                     |
| ----------------- | ---------------------------------------- | ------------------------------- |
| `apiKey`          | required                                 | DeepSeek API key (`sk-...`)     |
| `baseUrl`         | `https://api.deepseek.com/v1`            | API endpoint                    |
| `model`           | `deepseek-chat`                          | Default model                   |
| `contextLimit`    | `65536`                                  | Context window (tokens)         |
| `capabilities`    | streaming/toolCalling/thinking/structuredOutput | Capability flags (overridable) |
| `retry`           | base provider default                    | Retry/backoff policy            |