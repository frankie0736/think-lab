# 技术上下文

## 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| AI 调用 | TanStack AI + OpenAI | 已有基础设施 |
| 交互形式 | interview tool (AskUserQuestion) | 结构化选择，降低用户认知负担 |
| 推理模型 | gpt-5.x with reasoning | 支持复杂思考链 |
| 产出形式 | System Prompt | 单文件，易于维护和迭代 |

## 核心约束

### interview tool 限制
- 每次调用 1-4 个问题
- 每个问题 2-4 个选项
- 用户可自由输入"其他"（前端自动添加）
- multiSelect 支持多选

### AI 行为约束
- 所有阶段统一使用 interview tool（不用自由对话）
- 阶段导航必须显式呈现给用户
- 回溯需要征求用户确认
- 深度由 AI 自动判断

## 理论依据

基于 dialogs.md 的 6 阶段思考模型：

```
界定 → 发散 → 结构化 → 收敛 → 检验 → 反思（循环）
```

来源：
- 设计思维 (Design Thinking)
- Guilford 的发散/收敛思维模型
- OODA Loop
