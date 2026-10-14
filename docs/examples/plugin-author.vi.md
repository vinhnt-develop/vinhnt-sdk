---
title: "Tạo Plugin"
description: "Xây dựng và xuất bản plugin"
lang: "vi"
type: "example"
category: "Examples"
sidebarPosition: 6
---

# Tạo Plugin

> Xây dựng, kiểm tra và xuất bản plugin tái sử dụng cho vinhnt-sdk agents.

---

## Cấu Trúc Plugin

Plugin là một package npm có default export là một `Plugin` xây bằng `definePlugin` (manifest + hooks + lifecycle khai báo trong code — không có file manifest riêng).

```
my-plugin/
├── package.json
├── src/
│   └── index.ts
├── tsconfig.json
└── README.md
```

## package.json

```json
{
  "name": "@vinhnt-sdk/plugin-weather",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@vinhnt-sdk/core": "^0.10.9",
    "@vinhnt-sdk/plugin": "^0.4.2"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

## Mã Nguồn Plugin (src/index.ts)

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const WEATHER_API = "https://api.openweathermap.org/data/2.5";

const getWeatherTool = defineTool({
  name: "get_weather",
  description: "Lấy thời tiết hiện tại của thành phố",
  risk: "external",
  input: z.object({
    city: z.string().describe("Tên thành phố"),
  }),
  execute: async (input) => {
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `${WEATHER_API}/weather?q=${encodeURIComponent(input.city)}&appid=${apiKey}`
    );
    if (!response.ok) return { error: "Không tìm thấy thành phố" };
    const data = await response.json();
    return {
      city: data.name,
      temp: data.main.temp,
      condition: data.weather[0].main,
    };
  },
});

const getForecastTool = defineTool({
  name: "get_forecast",
  description: "Lấy dự báo 5 ngày cho thành phố",
  risk: "external",
  input: z.object({ city: z.string() }),
  execute: async (input) => {
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `${WEATHER_API}/forecast?q=${encodeURIComponent(input.city)}&appid=${apiKey}`
    );
    const data = await response.json();
    return {
      city: data.city.name,
      forecast: data.list.slice(0, 5).map((item: any) => ({
        time: item.dt_txt,
        temp: item.main.temp,
        condition: item.weather[0].main,
      })),
    };
  },
});

export const plugin = definePlugin(
  {
    id: "weather",
    name: "Weather",
    version: "1.0.0",
    description: "Công cụ tra cứu thời tiết",
    metadata: {
      tools: ["get_weather", "get_forecast"],
      configEnv: ["WEATHER_API_KEY"],
    },
  },
  {
    hooks: {
      onRunStarted: async ({ prompt }) => {
        console.log(`[weather] run bắt đầu: ${prompt.slice(0, 40)}`);
      },
      onToolCompleted: async ({ toolName, output }) => {
        console.log(`[weather] ${toolName} hoàn tất`);
      },
    },
    activate: async (ctx) => {
      ctx.registerTool(getWeatherTool);
      ctx.registerTool(getForecastTool);
    },
    deactivate: async () => {
      console.log("[weather] plugin đã deactivate");
    },
  }
);
```

## Hooks

Hook quan sát chỉ đọc; hook biến đổi trả về `{ modified: value }` hoặc `null` để giữ nguyên giá trị.

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";

export const plugin = definePlugin(
  { id: "weather", name: "Weather", version: "1.0.0" },
  {
    hooks: {
      // Quan sát thực thi tool (chỉ đọc)
      onAfterToolExecution: async ({ toolName, output }) => {
        console.log(`[weather] ${toolName} ->`, output);
      },

      // Biến đổi request gửi tới model
      onBeforeModelCall: async ({ request }) => ({ modified: { request } }),

      // Trả lời prompt quyền hạn từ plugin (hoặc null để chuyển tiếp)
      onPermissionAsk: async ({ resource, reason }) =>
        resource.startsWith("weather.") ? { modified: { reply: "once" } } : null,
    },
  }
);
```

Các hook khả dụng: `onRunStarted`, `onStepStarted`, `onTokenStreamed`, `onToolCompleted`, `onToolFailed`, `onContextCompressed`, `onStepCompleted`, `onStepFailed`, `onRunCompleted`, `onToolInvoked`, `onPermissionAsk`, `onChatParams`, `onShellEnv`, `onBeforeModelCall`, `onAfterModelCall`, `onBeforeToolExecution`, `onAfterToolExecution`.

## Kiểm Tra Plugin

```typescript
import { describe, it, expect } from "vitest";
import type { PluginContext } from "@vinhnt-sdk/core";
import { plugin } from "../src/index";

describe("plugin weather", () => {
  it("đăng ký công cụ khi activate", async () => {
    const registered: string[] = [];
    const ctx = {
      registerTool: (tool: { name: string }) => {
        registered.push(tool.name);
        return { dispose: async () => {} };
      },
    } as unknown as PluginContext;

    await plugin.activate(ctx);
    expect(registered).toContain("get_weather");
    expect(registered).toContain("get_forecast");
  });

  it("expose manifest", () => {
    expect(plugin.manifest.id).toBe("weather");
    expect(plugin.manifest.version).toBe("1.0.0");
  });
});
```

## Xuất Bản lên npm

```bash
# Build plugin
npm run build

# Chạy kiểm tra
npm test

# Đăng nhập npm (nếu cần)
npm login

# Xuất bản với scope công khai
npm publish --access public
```

## Sử Dụng Plugin

```typescript
import {
  AgentKernel,
  DefaultPluginManager,
  InMemoryAgentRegistry,
  InMemoryEventBus,
  createToolProviderRegistry,
} from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import weatherPlugin from "./dist/index.js";

const model = {
  provider: "openai",
  model: "gpt-4o",
  contextLimit: 128_000,
  capabilities: {
    streaming: true,
    toolCalling: true,
    imageInput: false,
    thinking: false,
    structuredOutput: true,
  },
  async generate(request) {
    // Triển khai với SDK AI ưa thích
    throw new Error("implement me");
  },
};

const toolProviderRegistry = await createToolProviderRegistry({
  workspaceRoot: process.cwd(),
  shell: { workspaceRoot: process.cwd(), defaultTimeoutMs: 30_000 },
});

const manager = new DefaultPluginManager({
  agentRegistry: new InMemoryAgentRegistry(),
  toolProviderRegistry,
  eventBus: new InMemoryEventBus(),
});

// Đăng ký plugin bạn vừa build
await manager.register(weatherPlugin);
await manager.activate(weatherPlugin.manifest.id);

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  pluginManager: manager,
});

const handle = kernel.run("Thời tiết ở Hà Nội như thế nào?", {
  requestId: "req-1",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "tenant-1",
});
await handle.completed;
```

## Vòng Đời Plugin

```mermaid
sequenceDiagram
    participant A as Agent Kernel
    participant P as Plugin
    participant T as Tools

    A->>P: import("./dist/index.js")
    A->>P: manager.register + activate(ctx)
    P->>T: ctx.registerTool(get_weather)
    P->>T: ctx.registerTool(get_forecast)
    A->>A: Agent sẵn sàng với công cụ
    A->>P: onRunStarted / onToolCompleted hooks
```
