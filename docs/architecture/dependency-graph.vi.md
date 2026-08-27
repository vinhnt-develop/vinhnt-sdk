---
title: "Đồ thị phụ thuộc"
description: "Mối quan hệ phụ thuộc giữa các package"
lang: "vi"
type: "concept"
category: "Architecture"
sidebarPosition: 2
---

# Đồ thị phụ thuộc

## Tổng quan

vinhnt-sdk bao gồm **18 package** được tổ chức theo kiến trúc phân lớp chặt chẽ. Đồ thị phụ thuộc tuân theo cấu trúc Directed Acyclic Graph (DAG) không có phụ thuộc vòng.

```mermaid
graph TD
    subgraph Core["Lớp Core"]
        core["core"]
        plugin["plugin"]
        lsp["lsp"]
    end

    subgraph Extension["Lớp Extension"]
        step-executor["step-executor"]
        provider-openai-compatible["provider-openai-compatible"]
        knowledge["knowledge"]
        mcp["mcp"]
    end

    subgraph Feature["Lớp Feature"]
        config["config"]
        llm["llm"]
        tools["tools"]
        sandbox["sandbox"]
        guard["guard"]
        session["session"]
        permission["permission"]
        event["event"]
        security["security"]
        trace["trace"]
    end

    subgraph Foundation["Lớp Foundation"]
        schema["schema"]
    end

    schema --> config
    schema --> llm
    schema --> tools
    schema --> sandbox
    schema --> guard
    schema --> session
    schema --> permission
    schema --> event
    schema --> security
    schema --> trace

    schema --> core
    config --> core
    llm --> core
    tools --> core
    sandbox --> core
    guard --> core
    session --> core
    permission --> core
    step-executor --> core
    event --> core
    knowledge --> core
    security --> core

    schema --> step-executor
    llm --> step-executor
    tools --> step-executor
    sandbox --> step-executor
    guard --> step-executor
    session --> step-executor
    permission --> step-executor

    schema --> provider-openai-compatible
    config --> provider-openai-compatible
    llm --> provider-openai-compatible

    schema --> knowledge
    tools --> knowledge

    schema --> mcp
    tools --> mcp

    schema --> lsp
    tools --> lsp
    core --> lsp

    core --> plugin

    style Core fill:#2196F3,color:#fff
    style Extension fill:#4CAF50,color:#fff
    style Feature fill:#FF9800,color:#fff
    style Foundation fill:#9C27B0,color:#fff
```

## Chú thích lớp

| Lớp | Màu | Mô tả |
|-----|-----|-------|
| Foundation | Tím | `schema` — định dạng type được chia sẻ bởi tất cả package |
| Feature | Cam | Các package phụ thuộc đơn lẻ cung cấp khả năng cô lập |
| Extension | Xanh lá | Các package đa phụ thuộc tổng hợp các package feature |
| Core | Xanh dương | Các package tổng hợp có phạm vi phụ thuộc rộng |

## Tóm tắt số lượng package

- **Foundation**: 1 package
- **Feature**: 12 package
- **Extension**: 4 package
- **Core**: 3 package (bao gồm `plugin`)
- **Tổng cộng**: 18 package

## Xác minh DAG

Đồ thị phụ thuộc được xác minh là DAG tại CI sử dụng `ts-prune` và kiểm tra vòng lặp tùy chỉnh. Không có phụ thuộc vòng:

- Mọi cạnh phụ thuộc đều chảy từ lớp thấp hơn đến lớp cao hơn
- `schema` là package duy nhất không có phụ thuộc inbound
- `core` có phạm vi phụ thuộc inbound rộng nhất (12 package)
- Không có package ở lớp N nào phụ thuộc vào package ở lớp N+1 hoặc cao hơn

## Bảng phụ thuộc package

| Package | Các phụ thuộc |
|---------|--------------|
| `schema` | _(không có)_ |
| `config` | `schema` |
| `llm` | `schema` |
| `tools` | `schema` |
| `sandbox` | `schema` |
| `guard` | `schema` |
| `session` | `schema` |
| `permission` | `schema` |
| `event` | `schema` |
| `security` | `schema` |
| `trace` | `schema` |
| `knowledge` | `schema`, `tools` |
| `mcp` | `schema`, `tools` |
| `provider-openai-compatible` | `schema`, `config`, `llm` |
| `step-executor` | `schema`, `llm`, `tools`, `sandbox`, `guard`, `session`, `permission` |
| `core` | `schema`, `config`, `llm`, `tools`, `sandbox`, `guard`, `session`, `permission`, `step-executor`, `event`, `knowledge`, `security` |
| `lsp` | `schema`, `tools`, `core` |
| `plugin` | `core` |

## Cách mở rộng

Để thêm package mới vào vinhnt-sdk:

1. Tạo thư mục package mới trong `packages/`
2. Chỉ thêm `schema` làm phụ thuộc trong `package.json`
3. Nhập types từ `@vinhnt-sdk/schema` cho tất cả interfaces chung
4. Nếu package cần tính năng orchestration, hãy phụ thuộc vào `core` thay vào đó
5. Đăng ký package trong `package.json` gốc workspace
6. Thêm package vào kiểm tra đồ thị phụ thuộc CI

```jsonc
// packages/my-new-package/package.json
{
  "name": "@vinhnt-sdk/my-new-package",
  "dependencies": {
    "@vinhnt-sdk/schema": "workspace:*"
  }
}
```

Điều này đảm bảo package của bạn được tách biệt khỏi phần còn lại của SDK và có thể được sử dụng độc lập.
