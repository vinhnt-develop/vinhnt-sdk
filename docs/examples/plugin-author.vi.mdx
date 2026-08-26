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

Plugin là một package npm xuất ra định nghĩa plugin và manifest.

```
my-plugin/
├── package.json
├── manifest.json
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
    "@vinhnt-sdk/core": "^0.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

## manifest.json

```json
{
  "name": "weather",
  "version": "1.0.0",
  "description": "Công cụ tra cứu thời tiết cho vinhnt-sdk agents",
  "author": "ten-cua-ban",
  "hooks": ["onInit", "onToolRegister", "onToolExecute"],
  "tools": ["get_weather", "get_forecast"],
  "config": {
    "apiKey": {
      "type": "string",
      "required": true,
      "description": "Khóa API OpenWeatherMap"
    }
  }
}
```

## Mã Nguồn Plugin (src/index.ts)

```typescript
import { definePlugin, defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const WEATHER_API = "https://api.openweathermap.org/data/2.5";

export const plugin = definePlugin({
  name: "weather",
  version: "1.0.0",
  description: "Công cụ tra cứu thời tiết",

  hooks: {
    onInit: async (ctx) => {
      console.log(`[weather] Plugin đã khởi tạo cho tenant ${ctx.tenantId}`);
    },

    onToolRegister: async (ctx) => {
      ctx.registerTool(defineTool({
        name: "get_weather",
        description: "Lấy thời tiết hiện tại của thành phố",
        risk: "low",
        input: z.object({
          city: z.string().describe("Tên thành phố"),
        }),
        execute: async (input) => {
          const apiKey = ctx.getConfig("apiKey");
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
      }));

      ctx.registerTool(defineTool({
        name: "get_forecast",
        description: "Lấy dự báo 5 ngày cho thành phố",
        risk: "low",
        input: z.object({ city: z.string() }),
        execute: async (input) => {
          const apiKey = ctx.getConfig("apiKey");
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
      }));
    },

    onToolExecute: async (ctx, toolName, input, output) => {
      console.log(`[weather] Công cụ ${toolName} đã thực thi`);
    },
  },
});
```

## Hàm Setup Plugin

```typescript
import { definePlugin } from "@vinhnt-sdk/core";

export const plugin = definePlugin({
  name: "weather",
  version: "1.0.0",

  setup: async (api) => {
    // Đăng ký công cụ
    api.registerTool(weatherTool);
    api.registerTool(forecastTool);

    // Đăng ký hook
    api.onInit(async (ctx) => {
      console.log("Plugin thời tiết sẵn sàng");
    });

    api.onToolExecute(async (ctx, toolName, input, output) => {
      // Ghi nhật ký hoặc chuyển đổi kết quả
    });

    // Truy cập cấu hình plugin
    const apiKey = api.getConfig("apiKey");
    console.log(`Khóa API đã cấu hình: ${!!apiKey}`);
  },
});
```

## Kiểm Tra Plugin

```typescript
import { describe, it, expect, vi } from "vitest";
import { plugin } from "../src/index";

describe("plugin weather", () => {
  it("đăng ký công cụ khi setup", async () => {
    const registeredTools: string[] = [];
    const mockApi = {
      registerTool: (tool: any) => registeredTools.push(tool.name),
      onInit: vi.fn(),
      onToolExecute: vi.fn(),
      getConfig: vi.fn().mockReturnValue("test-key"),
    };

    await plugin.setup!(mockApi);
    expect(registeredTools).toContain("get_weather");
    expect(registeredTools).toContain("get_forecast");
  });

  it("trả về dữ liệu thời tiết", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        name: "Hanoi",
        main: { temp: 28 },
        weather: [{ main: "Sunny" }],
      }),
    });
    global.fetch = mockFetch;

    const tool = plugin.hooks.onToolRegister;
    expect(tool).toBeDefined();
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
import { AgentKernel, NullRunEventStore, loadPluginFromNpm } from "@vinhnt-sdk/core";

const model = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request) {
    // Triển khai với SDK AI ưa thích
  },
};

// Tải plugin từ npm
const weatherPlugin = await loadPluginFromNpm("@vinhnt-sdk/plugin-weather", {
  config: { apiKey: process.env.WEATHER_API_KEY },
});

const kernel = new AgentKernel({
  model,
  plugins: [weatherPlugin],
  store: new NullRunEventStore(),
});

const result = await kernel.run("Thời tiết ở Hà Nội như thế nào?");
console.log(result);
```

## Vòng Đời Plugin

```mermaid
sequenceDiagram
    participant A as Agent Kernel
    participant P as Plugin
    participant T as Tools

    A->>P: loadPluginFromNpm()
    A->>P: onInit(ctx)
    A->>P: onToolRegister(ctx)
    P->>T: registerTool(weather)
    P->>T: registerTool(forecast)
    A->>A: Agent sẵn sàng với công cụ
    A->>P: onToolExecute(ctx, toolName, input, output)
```
