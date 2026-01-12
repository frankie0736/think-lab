---
id: PIT-004
title: "[示例] Biome 代码检查"
origin: deductive
severity: low
tags: [example, external]
created: 2024-01-01

trigger:
  - kind: external
    tool: biome
    ref: "biome.json#noConsoleLog"
    message: "项目使用 Biome 禁止 console.log，运行 bun lint 查看问题"
    strength: strong

replay:
  root_cause: "项目配置了 Biome 进行 lint 和格式化，需要遵循统一代码风格"

action:
  - steps:
      - "运行 bun lint 查看代码问题"
      - "运行 bun lint:fix 自动修复"

verify:
  level: V1
  checks:
    - "bun lint"
---

# [示例] external 触发器

> 此示例展示如何引用现有的检查工具。首次运行 `fdd add` 时会自动删除。

## 使用场景

- 引用 husky Git hooks（.husky/pre-commit）
- 引用 Biome/ESLint 规则
- 引用 package.json scripts
