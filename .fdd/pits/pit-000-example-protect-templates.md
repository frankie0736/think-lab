---
id: PIT-000
title: "[示例] 保护 templates 构建产物"
origin: deductive
severity: medium
tags: [example, protect]
created: 2024-01-01

trigger:
  - kind: protect
    paths:
      - "templates/**"
    permissions:
      create: deny
      update: deny
      delete: deny
    message: "templates/ 是构建产物，请修改 src/templates/ 后运行 bun build"
    strength: strong

replay:
  root_cause: "templates/ 目录是从 src/templates/ 复制的构建产物，不应直接编辑"

action:
  - steps:
      - "修改 src/templates/ 下的源文件"
      - "运行 bun build 重新生成 templates/"

verify:
  level: V3
  fallback:
    self_proof:
      - "protect hook 会在 AI 尝试写入时自动拦截"
---

# [示例] protect 触发器

> 此示例展示如何保护构建产物不被直接修改。首次运行 `fdd add` 时会自动删除。

## 使用场景

- 保护构建产物（dist/、build/、templates/）
- 保护配置文件（.env、secrets）
- 保护核心代码不被意外修改
