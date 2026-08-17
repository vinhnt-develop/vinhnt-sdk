# @vinhnt-sdk/provider-ollama

Ollama model provider tip for VNT Agent — a thin wrapper over
[`@vinhnt-sdk/provider-openai-compatible`](https://github.com/vinhnt-develop/vinhnt-sdk)
pointed at a **local Ollama server** (`http://localhost:11434/v1`, no API key).
No shared implementation with other tips.

## Usage

```ts
import { createOllamaProvider } from "@vinhnt-sdk/provider-ollama";

const provider = createOllamaProvider({ model: "llama3.2" });

// Defaults: baseUrl http://localhost:11434/v1, model llama3.2, context 128K, no auth
```

> Make sure the model is pulled first: `ollama pull llama3.2`

## Options

| Option            | Default                     | Description                            |
| ----------------- | --------------------------- | -------------------------------------- |
| `baseUrl`         | `http://localhost:11434/v1` | Local server endpoint                  |
| `model`           | `llama3.2`                  | Default model                          |
| `contextLimit`    | `128000`                    | Context window (tokens)                |
| `capabilities`    | streaming/toolCalling/imageInput/thinking/structuredOutput | Capability flags (model-dependent, overridable) |
| `retry`           | base provider default       | Retry/backoff policy                   |