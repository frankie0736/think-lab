---
id: PIT-003
title: "[示例] Schema 变更后运行测试"
origin: deductive
severity: medium
tags: [example, change]
created: 2024-01-01

trigger:
  - kind: change
    when_changed:
      - "src/lib/schema.ts"
    message: "schema.ts 已变更，请运行 bun test 确保验证逻辑正确"
    strength: strong

replay:
  root_cause: "schema.ts 定义了 Pit 的数据结构验证，变更后需要确保测试通过"

action:
  - steps:
      - "运行 bun test 验证所有测试通过"
      - "检查是否需要更新相关文档"

verify:
  level: V0
  checks:
    - "bun test"
---

# [示例] change 触发器

> 此示例展示如何检测 git 文件变更。首次运行 `fdd add` 时会自动删除。

## 使用场景

- 数据库 schema 变更后提醒跑迁移
- 配置文件变更后提醒重启服务
- API 定义变更后提醒更新文档
