---
name: fdd
description: FDD 前馈反馈开发。开发前用 Interview 厘清需求，Bug 后创建 Pit 防复发。当用户提到 Interview、看到 [FDD] 消息、或要求记录 Pit 时触发。
---

# FDD

## 入口

| 触发 | 读 |
|------|-----|
| 用户说"开始 Interview" | [workflows/interview.md](workflows/interview.md) |
| 看到 `[FDD]` 消息 | [workflows/record.md](workflows/record.md) |
| 用户说"记录 Pit" | 先分流，再读 [workflows/record.md](workflows/record.md) |

## "记录 Pit" 分流

用 AskUserQuestion 问来源：

| 选项 | origin |
|------|--------|
| 刚修复了一个 bug | `inductive`（归纳） |
| 想预防某个问题 | `deductive`（演绎） |

## 参考

概念解释、触发器详情、示例等按需读取：

- [reference/concepts.md](reference/concepts.md) - 双F模型、Origin、Scope
- [reference/triggers.md](reference/triggers.md) - 6种触发器
- [reference/gates.md](reference/gates.md) - Gate 检查
- [reference/examples.md](reference/examples.md) - 完整示例
