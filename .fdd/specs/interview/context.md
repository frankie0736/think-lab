# Technical Context

## 技术栈

| 层 | 选择 |
|-----|------|
| AI 框架 | TanStack AI |
| 前端 | React 19 |
| 类型 | TypeScript + Zod |
| 项目 | issue-lab |

## 设计决策

| 决策 | 理由 |
|------|------|
| 作为 AI Tool 实现 | 复用 TanStack AI 的 tool 机制，无需自建协议 |
| UI 由消费方实现 | 解耦，工具只负责数据结构 |
| 用 Zod 定义 schema | TanStack AI 原生支持，自动类型推导 |

## 与 AskUserQuestion 的关系

- **相同**：交互模式（问题 + 选项 + 单选/多选）
- **不同**：AskUserQuestion 是 Claude Code 内置工具，interview 是自定义工具
- **本质**：用自定义 tool 复现 AskUserQuestion 的能力
