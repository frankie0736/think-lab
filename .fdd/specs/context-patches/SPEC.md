# Context Patches - 动态 Prompt 注入

> 根据话题自动注入领域特定的 prompt 补充

## 索引

| 文档 | 内容 |
|------|------|
| [stories.md](stories.md) | 用户故事 |
| [flows.md](flows.md) | 核心流程 |
| [context.md](context.md) | 技术决策 |
| [constraints.md](constraints.md) | 范围约束 |

## Intent

**问题**：思考助手在特定领域（如 WordPress ACF）缺乏专业引导，用户可能遗漏关键要素。

**方案**：基于语义检测，当话题涉及特定领域时，自动注入该领域的输出要求模板。

**价值**：确保 AI 输出覆盖领域关键点，无需用户记住所有要素。

## 核心流程

```
用户消息 → LLM 检测话题 → 匹配 patch → 注入 System Prompt → AI 输出
```

## Related Pits

| Pit | 纠正什么 |
|-----|----------|
| (暂无) | - |

## Unresolved

(无)
