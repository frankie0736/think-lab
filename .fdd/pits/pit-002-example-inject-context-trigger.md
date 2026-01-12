---
id: PIT-002
title: "[示例] 触发器开发规范提醒"
origin: deductive
severity: low
tags: [example, inject-context]
created: 2024-01-01

trigger:
  - kind: inject-context
    when_touching:
      - "src/lib/trigger/**"
    context: |
      触发器开发规范：
      1. 每个触发器在 src/lib/trigger/{kind}.ts 实现
      2. 在 src/lib/trigger/types.ts 添加类型
      3. 在 src/lib/schema.ts 添加 Zod schema
      4. 添加单元测试 src/__tests__/trigger/{kind}.test.ts
    strength: strong

replay:
  root_cause: "新增或修改触发器时需要遵循固定的代码组织规范"

action:
  - steps:
      - "阅读 .claude/rules/triggers.md 了解完整规范"
      - "确保新触发器在所有必要位置注册"

verify:
  level: V3
  fallback:
    self_proof:
      - "inject-context hook 会在编辑触发器代码时自动提醒"
---

# [示例] inject-context 触发器

> 此示例展示如何在编辑特定文件时注入上下文。首次运行 `fdd add` 时会自动删除。

## 使用场景

- 提醒历史 bug（曾有 SQL 注入的文件）
- 注入架构约束（某模块的设计原则）
- 传递团队经验（特定领域的最佳实践）
