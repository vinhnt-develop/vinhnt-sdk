---
"@vinhnt-sdk/tools": patch
---

Thêm trường `label` (tên hiển thị thân thiện, off-wire) cho `ToolDefinition` và tất cả built-in tools (read_file → "Read File", write_file → "Write File", …). WebUI render `label` thay vì wire `name` snake_case; giữ `id`/wire name không đổi khi gọi tool để tránh lỗi `400 invalid_request_error: cannot contain whitespace in its name` từ provider OpenAI-compatible.
