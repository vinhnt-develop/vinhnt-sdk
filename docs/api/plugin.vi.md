---
title: "@vinhnt-sdk/plugin"
description: "Hook plugin và vòng đời"
version: "0.4.2"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "plugin"
---

# @vinhnt-sdk/plugin

Định nghĩa hệ thống plugin cho vinhnt-sdk. Cung cấp tiện ích để tạo plugin với hook vòng đời.

## Nhập

```ts
import {
  definePlugin,
} from "@vinhnt-sdk/plugin";
```

---

## definePlugin

Định nghĩa plugin với manifest và hàm thiết lập chứa các hook vòng đời.

```ts
import { definePlugin } from "@vinhnt-sdk/plugin";

export default definePlugin(
  {
    name: "my-plugin",
    version: "1.0.0",
    description: "Plugin tùy chỉnh",
    author: "developer",
    dependencies: [],
  },
  (manifest) => ({
    async onInit(ctx) {
      console.log("Plugin đã khởi tạo");
    },

    async onStart(ctx) {
      console.log("Plugin đã bắt đầu");
    },

    async onStop(ctx) {
      console.log("Plugin đã dừng");
    },

    async onToolRegister(ctx) {
      return [
        {
          name: "my_tool",
          description: "Công cụ tùy chỉnh",
          parameters: { input: { type: "string" } },
        },
      ];
    },

    async onToolExecute(ctx, toolName, params) {
      if (toolName === "my_tool") {
        return { result: `Đã xử lý: ${params.input}` };
      }
    },

    async onModelCall(ctx, request) {
      return request;
    },

    async onPermissionCheck(ctx, permission) {
      return { allowed: true };
    },

    async onSessionCreate(ctx, session) {
      console.log("Phiên đã tạo:", session.id);
    },

    async onSessionDestroy(ctx, session) {
      console.log("Phiên đã hủy:", session.id);
    },
  })
);
```

---

## Kiểu

### Plugin

```ts
interface Plugin {
  manifest: PluginManifest;
  hooks: PluginHooks;
}
```

### PluginManifest

Siêu dữ liệu mô tả plugin.

```ts
interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}
```

### PluginHooks

Chín hook vòng đời có sẵn cho plugin:

```ts
interface PluginHooks {
  onInit?: (ctx: PluginContext) => Promise<void>;
  onStart?: (ctx: PluginContext) => Promise<void>;
  onStop?: (ctx: PluginContext) => Promise<void>;
  onToolRegister?: (ctx: PluginContext) => Promise<ToolDefinition[]>;
  onToolExecute?: (
    ctx: PluginContext,
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<unknown>;
  onModelCall?: (
    ctx: PluginContext,
    request: ModelRequest
  ) => Promise<ModelRequest>;
  onPermissionCheck?: (
    ctx: PluginContext,
    permission: PermissionRequest
  ) => Promise<PermissionResult>;
  onSessionCreate?: (
    ctx: PluginContext,
    session: Session
  ) => Promise<void>;
  onSessionDestroy?: (
    ctx: PluginContext,
    session: Session
  ) => Promise<void>;
}
```

### Mô tả hook

| Hook | Thời điểm kích hoạt | Trường hợp sử dụng |
|------|---------------------|-------------------|
| `onInit` | Plugin được tải và xác thực | Thiết lập cấu hình, kết nối dịch vụ |
| `onStart` | Kernel agent bắt đầu | Đăng ký lắng nghe sự kiện, làm nóng bộ nhớ đệm |
| `onStop` | Kernel agent tắt | Giải phóng tài nguyên, đóng kết nối |
| `onToolRegister` | Trong quá trình đăng ký công cụ | Cung cấp thêm công cụ |
| `onToolExecute` | Trước khi công cụ thực thi | Chặn, sửa đổi hoặc xử lý lệnh gọi công cụ |
| `onModelCall` | Trước khi gửi yêu cầu LLM | Sửa đổi prompt, thêm ngữ cảnh, bộ nhớ đệm |
| `onPermissionCheck` | Khi có yêu cầu quyền | Cấp hoặc từ chối quyền động |
| `onSessionCreate` | Phiên agent mới được tạo | Khởi tạo trạng thái phiên |
| `onSessionDestroy` | Phiên agent kết thúc | Lưu dữ liệu phiên, dọn dẹp |

---

## Các phụ thuộc

| Gói | Mục đích |
|-----|----------|
| `@vinhnt-sdk/core` | Ngữ cảnh plugin, registry công cụ, tích hợp kernel |

---

## Ví dụ: Plugin với công cụ tùy chỉnh

```ts
import { definePlugin } from "@vinhnt-sdk/plugin";
import { defineTool } from "@vinhnt-sdk/core";

export default definePlugin(
  {
    name: "math-tools",
    version: "1.0.0",
  },
  () => ({
    async onToolRegister() {
      return [
        defineTool({
          name: "add",
          description: "Cộng hai số",
          parameters: {
            a: { type: "number" },
            b: { type: "number" },
          },
          execute: async ({ a, b }) => ({ result: a + b }),
        }),
      ];
    },
  })
);
```

