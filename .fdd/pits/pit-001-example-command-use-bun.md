---
id: PIT-001
title: "[示例] 强制使用 bun"
origin: deductive
severity: medium
tags: [example, command]
created: 2024-01-01

trigger:
  - kind: command
    pattern: "^npm\\s+(install|i|ci|run|exec)"
    action: block
    message: "本项目使用 bun，请用 bun install / bun run 代替 npm"
    strength: strong

replay:
  root_cause: "项目使用 bun 作为包管理器，使用 npm 会产生 package-lock.json 导致冲突"

action:
  - steps:
      - "将 npm install 改为 bun install"
      - "将 npm run xxx 改为 bun run xxx"

verify:
  level: V3
  fallback:
    self_proof:
      - "command hook 会在 AI 执行 npm 命令时自动拦截"
---

# [示例] command 触发器

> 此示例展示如何拦截特定 shell 命令。首次运行 `fdd add` 时会自动删除。

## 使用场景

- 强制使用特定包管理器（bun/pnpm/yarn）
- 阻止危险命令（rm -rf /、git push --force）
- 提醒使用正确的命令格式
