# Interview Tool Spec

> AI Tool：让 AI 通过结构化问答澄清模糊需求

## Index

| 文档 | 内容 |
|------|------|
| [stories.md](stories.md) | 用户故事 |
| [flows.md](flows.md) | 核心流程 |
| [context.md](context.md) | 技术决策 |
| [constraints.md](constraints.md) | 范围约束 |
| [handoff.md](handoff.md) | 开发记录与交接 |

## Intent

**问题**：用户输入的需求往往是压缩的、模糊的，AI 基于错误假设实现会导致返工。

**方案**：提供一个结构化问答工具，让 AI 在执行前主动澄清。

**不是**：
- 不是表单生成器（问题由 AI 动态生成）
- 不是问卷系统（目的是澄清，不是收集）

## 接口定义

```typescript
// 工具输入（AI → Frontend）
interface InterviewInput {
  questions: Array<{
    question: string      // 完整问题，以问号结尾
    header: string        // 简短标签，≤12 字符
    multiSelect: boolean  // 是否多选
    options: Array<{
      label: string       // 选项标签，1-5 词
      description: string // 选项说明
    }>  // 2-4 个选项
  }>  // 1-4 个问题
}

// 工具输出（Frontend → AI）
interface InterviewOutput {
  answers: Record<string, string | string[]>
  // key: question, value: 选中的 label 或自定义输入
}
```

## 实现清单

- [ ] `src/lib/interview-tool.ts` - 工具定义 + Zod schema
- [ ] `src/components/interview-ui.tsx` - 示例 UI 组件
- [ ] System prompt 片段 - 告诉 AI 何时调用

## Related Pits

无。评审团提出的问题通过以下方式处理：
- AI 判断时机 → 信任 AI，MVP 先验证
- 选项覆盖不足 → 依赖"其他"兜底
- 字段长度 → 不约束，有问题再迭代

## Status

✅ Interview 完成 (2026-01-07)
