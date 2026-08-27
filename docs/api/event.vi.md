---
title: "@vinhnt-sdk/event"
description: "Bus sự kiện có kiểu với khả năng phát lại bền bỉ cho workflow agent"
version: "0.1.3"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "event"
---

# @vinhnt-sdk/event

Bus sự kiện xuất/băng có kiểu với hỗ trợ phát lại bền bỉ, phát trực tuyến và truy cập singleton toàn cục.

## Cài đặt

```bash
npm install @vinhnt-sdk/event
```

## Các xuất (Exports)

### `InMemoryEventBus`

Bus sự kiện trong bộ đầy đủ tính năng, triển khai giao diện `EventBus`. Hỗ trợ xuất, băng, phát trực tuyến và phát lại bền bỉ.

```ts
import { InMemoryEventBus } from "@vinhnt-sdk/event";

const bus = new InMemoryEventBus();

// Xuất một sự kiện
bus.publish({ type: "user.created", payload: { id: "123", name: "Alice" } });

// Băng sự kiện
const unsub = bus.subscribe("user.created", (event) => {
  console.log("Người dùng đã tạo:", event.payload);
});

// Hủy băng
unsub();
```

**Phương thức:**
- `publish(event: TypedEvent): void` — Phát sự kiện đến tất cả người nghe.
- `subscribe(type: string, handler: EventHandler): Unsubscribe` — Lắng nghe một loại sự kiện cụ thể. Trả về hàm hủy băng.
- `subscribeAll(handler: EventHandler): Unsubscribe` — Lắng nghe tất cả loại sự kiện.
- `stream(type?: string): AsyncIterable<TypedEvent>` — Trả về iterator bất đồng bộ sẽ tạo ra sự kiện khi chúng xảy ra.
- `streamWithReplay(type?: string, options?: ReplayOptions): AsyncIterable<TypedEvent>` — Phát trực tuyến với phát lại lịch sử trước sự kiện trực tiếp.
- `durable(subscriberId: string, type?: string): DurableSubscription` — Tạo đăng ký bền bỉ theo dõi vị trí và hỗ trợ phát lại.

---

### `GlobalEventBus`

Instance `InMemoryEventBus` singleton được chia sẻ trong toàn ứng dụng.

```ts
import { GlobalEventBus } from "@vinhnt-sdk/event";

GlobalEventBus.publish({ type: "app.started", payload: {} });
GlobalEventBus.subscribe("app.started", () => console.log("Ứng dụng đã khởi động"));
```

Hữu ích cho việc phân phối sự kiện toàn ứng dụng mà không cần khởi tạo thủ công.

---

### `createEventDefinition`

Hàm nhà máy để định nghĩa sự kiện có kiểu mạnh với schema Zod.

```ts
import { createEventDefinition } from "@vinhnt-sdk/event";
import { z } from "zod";

const UserCreated = createEventDefinition("user.created", z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
}));

// Xuất có kiểu
bus.publish(UserCreated.create({ id: "1", name: "Alice", email: "alice@example.com" }));

// Băng có kiểu
bus.subscribe(UserCreated.type, (event) => {
  // event.payload có kiểu { id: string; name: string; email: string }
});
```

**Ký hiệu:** `createEventDefinition<T>(type: string, schema: ZodSchema<T>): EventDefinition<T>`

---

## Tham chiếu Phương thức

### `publish(event)`

Phát sự kiện có kiểu đến tất cả người nghe phù hợp. Đồng bộ — trình xử lý thực thi ngay lập tức.

```ts
bus.publish({ type: "order.placed", payload: { orderId: "abc", total: 99.99 } });
```

### `subscribe(type, handler)`

Đăng ký trình xử lý cho một loại sự kiện cụ thể. Trả về hàm hủy băng.

```ts
const unsub = bus.subscribe("order.placed", (event) => {
  processOrder(event.payload.orderId);
});

// Sau đó
unsub();
```

### `subscribeAll(handler)`

Đăng ký trình xử lý sẽ kích hoạt cho mọi sự kiện bất kể loại.

```ts
bus.subscribeAll((event) => {
  logger.debug(`Sự kiện: ${event.type}`, event.payload);
});
```

### `stream(type?)`

Trả về `AsyncIterable` sẽ tạo ra sự kiện theo thời gian thực. Chờ đợi cho đến khi sự kiện tiếp theo đến.

```ts
for await (const event of bus.stream("user.updated")) {
  handleUpdate(event.payload);
}
```

### `streamWithReplay(type?, options?)`

Trả về `AsyncIterable` trước tiên phát lại các sự kiện lịch sử từ cửa hàng, sau đó tạo ra sự kiện trực tiếp.

```ts
for await (const event of bus.streamWithReplay("order.placed", { maxReplay: 50 })) {
  processOrder(event.payload);
}
```

**Tùy chọn:**
- `maxReplay?: number` — Số sự kiện lịch sử tối đa để phát lại (mặc định: 100).
- `since?: Date` — Phát lại sự kiện sau mốc thời gian này.

### `durable(subscriberId, type?)`

Tạo đăng ký bền bỉ lưu vị trí. Hỗ trợ phát lại từ vị trí cuối cùng đã xác nhận.

```ts
const durable = bus.durable("worker-1", "task.completed");

for await (const event of durable.stream()) {
  await processTask(event.payload);
  durable.ack(event.id);
}
```

---

### `streamWithReplayMixin`

Mixin chung thêm khả năng `streamWithReplay` cho bất kỳ triển khai bus sự kiện nào.

```ts
import { streamWithReplayMixin } from "@vinhnt-sdk/event";

class CustomEventBus {
  // ... triển khai các phương thức cốt lõi EventBus
}

// Thêm hỗ trợ phát lại
Object.assign(CustomEventBus.prototype, streamWithReplayMixin);
```

---

## Các kiểu dữ liệu

### `EventBus`

Giao diện cốt lõi cho tất cả triển khai bus sự kiện.

```ts
interface EventBus {
  publish(event: TypedEvent): void;
  subscribe(type: string, handler: EventHandler): Unsubscribe;
  subscribeAll(handler: EventHandler): Unsubscribe;
  stream(type?: string): AsyncIterable<TypedEvent>;
  streamWithReplay(type?: string, options?: ReplayOptions): AsyncIterable<TypedEvent>;
  durable(subscriberId: string, type?: string): DurableSubscription;
}
```

### `EventDefinition`

Định nghĩa sự kiện có kiểu được tạo qua `createEventDefinition`.

```ts
interface EventDefinition<T> {
  type: string;
  schema: ZodSchema<T>;
  create(payload: T): TypedEvent<T>;
}
```

### `TypedEvent`

Đại diện cho một sự kiện đã xuất.

```ts
interface TypedEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: Date;
}
```

### `EventHandler`

Hàm gọi lại cho người nghe sự kiện.

```ts
type EventHandler = (event: TypedEvent) => void | Promise<void>;
```

### `Unsubscribe`

Hàm được trả về bởi các phương thức băng để ngắt trình xử lý.

```ts
type Unsubscribe = () => void;
```

### `EventBusOptions`

Tùy chọn cấu hình cho việc tạo bus sự kiện.

```ts
interface EventBusOptions {
  maxEvents?: number;       // Số sự kiện tối đa giữ lại (mặc định: 1000)
  enableReplay?: boolean;   // Bật lưu trữ phát lại (mặc định: true)
  storage?: EventStorage;   // Backend lưu trữ tùy chỉnh
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — Cung cấp xác thực sự kiện dựa Zod và kiểu `TypedEvent`.
