---
title: "Plugins"
description: "Xây dựng và sử dụng plugins"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 4
---

# Plugins

Plugins mở rộng chức năng của agent mà không sửa đổi mã gốc. Chúng hooked vào vòng đời agent và cung cấp khả năng tái sử dụng.

## Plugins là gì

Plugin là một mô-đun độc lập:

- Đăng ký hooks tại các thời điểm vòng đời cụ thể
- Cung cấp tools, middleware hoặc dịch vụ
- Có thể chia sẻ qua NPM giữa các dự án

## Định nghĩa Plugin

Sử dụng `definePlugin` để tạo plugin với hooks có kiểu dữ liệu:

```typescript
import { definePlugin } from "vinhnt-sdk";

export const myPlugin = definePlugin({
  name: "my-plugin",
  version: "1.0.0",
  hooks: {
    onInit: async (kernel) => {
      console.log("Plugin đã khởi tạo");
    },
    onMessage: async (message, next) => {
      // Xử lý tin nhắn trước
      return next(message);
    },
  },
});
```

## Các Hooks có sẵn

| Hook | Mô tả | Thời điểm gọi |
|------|-------|---------------|
| `onInit` | Khởi tạo plugin | Kernel khởi động |
| `onReady` | Kernel sẵn sàng xử lý | Sau khi init hoàn tất |
| `onMessage` | Xử lý tin nhắn đến | Trước khi gọi LLM |
| `onToolCall` | Chặn lời gọi tool | Trước khi thực thi tool |
| `onToolResult` | Xử lý kết quả tool | Sau khi thực thi tool |
| `onResponse` | Sửa đổi phản hồi LLM | Sau khi LLM tạo ra |
| `onError` | Xử lý lỗi | Khi có lỗi |
| `onShutdown` | Dọn dẹp tài nguyên | Kernel tắt |
| `onConfig` | Sửa đổi cấu hình | Khi tải cấu hình |

## Đăng ký Plugin

Đăng ký plugin sử dụng `DefaultPluginManager`:

```typescript
import { Kernel, DefaultPluginManager } from "vinhnt-sdk";

const pluginManager = new DefaultPluginManager();
pluginManager.register(myPlugin);

const kernel = new Kernel({
  plugins: pluginManager.getPlugins(),
});
```

## NPM Loader cho Plugin bên ngoài

Tự động tải plugin từ gói NPM:

```typescript
import { NpmPluginLoader } from "vinhnt-sdk";

const loader = new NpmPluginLoader();
const plugins = await loader.load([
  "vinhnt-plugin-weather",
  "vinhnt-plugin-database",
]);

const kernel = new Kernel({ plugins });
```

## Xuất bản Plugin

Xuất plugin dưới dạng export mặc định:

```typescript
// index.ts
import { definePlugin } from "vinhnt-sdk";

export default definePlugin({
  name: "my-awesome-plugin",
  version: "1.0.0",
  hooks: { /* ... */ },
});
```

Xuất bản lên NPM:

```bash
npm publish
```

## Vòng đời Plugin

Plugins tuân theo vòng đời dự đoán được:

1. **Đăng ký** — Plugin được thêm vào plugin manager
2. **Khởi tạo** — `onInit` được gọi khi kernel khởi động
3. **Sẵn sàng** — `onReady` báo hiệu plugin đang hoạt động
4. **Xử lý** — Các hook tin nhắn và tool thực thi theo thứ tự
5. **Tắt** — `onCleanup` giải phóng tài nguyên

Plugins thực thi theo thứ tự đăng ký. Sử dụng hàm `next` để kiểm soát luồng qua chuỗi hook.
