---
title: "@vinhnt-sdk/event"
description: "Bus sự kiện có kiểu với khả năng phát lại bền bỉ cho workflow agent"
version: "0.4.5"
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

### `defineEvent`

Định nghĩa (và đăng ký) một loại sự kiện; loại trùng lặp sẽ ném lỗi.

```ts
import { defineEvent } from "@vinhnt-sdk/event";
import { z } from "zod";

const UserCreated = defineEvent({
  type: "user.created",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

// Sự kiện durable có thể phát lại từ event store
const OrderCompleted = defineEvent({
  type: "order.completed",
  durable: { version: 1, aggregate: "order" },
});
```

**Chữ ký:** `defineEvent<T>(def: EventDefinition<T>): EventDefinition<T>`

---

### `InMemoryEventBus`

Bus sự kiện trong bộ đầy đủ tính năng, triển khai giao diện `EventBus`.

```ts
import { InMemoryEventBus, defineEvent } from "@vinhnt-sdk/event";

const bus = new InMemoryEventBus();

const UserCreated = defineEvent({ type: "user.created" });

// Xuất — trình xử lý nhận TypedEvent<T>
bus.publish(UserCreated, { id: "123", name: "Alice" });

// Băng — trình xử lý có kiểu
const unsub = bus.subscribe(UserCreated, (event) => {
  console.log("Người dùng đã tạo:", event.data);
});

// Hủy băng
unsub();
```

**Phương thức:**
- `publish(def, data, meta?)` — Phát sự kiện đến tất cả người nghe phù hợp. `meta` nhận `traceId` / `aggregateId`.
- `subscribe(def, handler)` — Lắng nghe một định nghĩa sự kiện cụ thể. Trả về hàm hủy băng.
- `subscribeAll(handler, namespace?)` — Lắng nghe tất cả loại sự kiện.
- `project(def, handler)` — Đăng ký trình xử lý projection cho một định nghĩa sự kiện.
- `stream(def, signal?)` — Async iterable tạo ra sự kiện khi chúng được xuất.
- `streamWithReplay(def, aggregateId, after?, signal?)` — Phát lại lịch sử của một aggregate, sau đó trộn sự kiện trực tiếp.
- `durable(def, aggregateId, after?)` — Async iterable cho một định nghĩa durable, tiếp tục từ số sequence.

---

### `GlobalEventBus`

Instance `InMemoryEventBus` singleton được chia sẻ trong toàn ứng dụng.

```ts
import { GlobalEventBus, defineEvent } from "@vinhnt-sdk/event";

const AppStarted = defineEvent({ type: "app.started" });

GlobalEventBus.publish(AppStarted, {});
GlobalEventBus.subscribe(AppStarted, () => console.log("Ứng dụng đã khởi động"));
```

Hữu ích cho việc phân phối sự kiện toàn ứng dụng mà không cần khởi tạo thủ công.

---

## Tham chiếu Phương thức

### `publish(def, data, meta?)`

Phát sự kiện có kiểu đến tất cả người nghe phù hợp. Đồng bộ — trình xử lý thực thi ngay lập tức.

```ts
const OrderPlaced = defineEvent({ type: "order.placed" });

bus.publish(OrderPlaced, { orderId: "abc", total: 99.99 });
```

### `subscribe(def, handler)`

Đăng ký trình xử lý cho một định nghĩa sự kiện cụ thể. Trả về hàm hủy băng.

```ts
const unsub = bus.subscribe(OrderPlaced, (event) => {
  processOrder(event.data.orderId);
});

// Sau đó
unsub();
```

### `subscribeAll(handler, namespace?)`

Đăng ký trình xử lý sẽ kích hoạt cho mọi sự kiện bất kể loại.

```ts
bus.subscribeAll((event) => {
  logger.debug(`Sự kiện: ${event.type}`, event.data);
});
```

### `stream(def, signal?)`

Trả về `AsyncIterable` sẽ tạo ra sự kiện theo thời gian thực. Chờ đợi cho đến khi sự kiện tiếp theo đến.

```ts
for await (const event of bus.stream(UserCreated)) {
  handleUpdate(event.data);
}
```

### `streamWithReplay(def, aggregateId, after?, signal?)`

Trả về `AsyncIterable` trước tiên phát lại các sự kiện lịch sử của một aggregate từ kho lưu trữ bền bỉ, sau đó tạo ra sự kiện trực tiếp.

```ts
for await (const event of bus.streamWithReplay(OrderCompleted, "order-123", lastSeen)) {
  processOrder(event.data);
}
```

- `aggregateId` — Aggregate cần phát lại lịch sử.
- `after` — Số sequence bắt đầu phát lại (mặc định: `-1`).

### `durable(def, aggregateId, after?)`

Tạo luồng bền bỉ lưu vị trí. Tiếp tục từ số sequence cuối cùng đã xác nhận.

```ts
for await (const event of bus.durable(OrderCompleted, "order-123", lastSeenSequence)) {
  await processTask(event.data);
  lastSeenSequence = event.sequence;
}
```

---

## Các kiểu dữ liệu

### `EventBus`

Giao diện cốt lõi cho tất cả triển khai bus sự kiện.

```ts
interface EventBus {
  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void;
  subscribe<T>(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe;
  subscribeAll(handler: EventHandler, namespace?: string): Unsubscribe;
  project<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe;
  stream<T>(def: EventDefinition<T>, signal?: AbortSignal): AsyncIterable<TypedEvent<T>>;
  streamWithReplay<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
    signal?: AbortSignal,
  ): AsyncIterable<TypedEvent<T>>;
  durable<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
  ): AsyncIterable<TypedEvent<T>>;
}
```

### `EventDefinition`

Metadata mô tả loại sự kiện tĩnh, được tạo qua `defineEvent`.

```ts
interface EventDefinition<TData = unknown> {
  readonly type: string;
  readonly description?: string;
  readonly durable?: {
    readonly version: number;
    readonly aggregate: string;
  };
  readonly schema?: ZodSchema<TData>;
}
```

### `TypedEvent`

Instance sự kiện đã được hiện thị đầy đủ, phát cho một aggregate.

```ts
interface TypedEvent<TData = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly sequence: number;
  readonly aggregateId: string;
  readonly data: TData;
}
```

### `EventHandler`

Hàm gọi lại cho người nghe sự kiện.

```ts
type EventHandler<T = unknown> = (event: TypedEvent<T>) => void;
```

### `Unsubscribe`

Hàm được trả về bởi các phương thức băng để ngắt trình xử lý.

```ts
type Unsubscribe = () => void;
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — Cung cấp xác thực sự kiện dựa Zod và kiểu `TypedEvent`.
