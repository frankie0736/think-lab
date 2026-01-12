# Interview Tool - Handoff 文档

> 记录开发过程中的发现、决策和待办事项

## 最后更新

2026-01-07

---

## 已完成功能

### 1. Thinking Stream 支持

**文件**: `src/routes/demo/interview.tsx`, `src/routes/demo/api.interview-chat.ts`

- 支持 OpenAI gpt-5.x 的 reasoning 模式
- 需要显式启用 `modelOptions.reasoning`（gpt-5.x 默认禁用）
- 前端 `ThinkingMessage` 组件渲染思考内容
- 默认展开显示，支持折叠

```typescript
// api.interview-chat.ts
modelOptions: {
  reasoning: {
    effort: "medium",  // none | minimal | low | medium | high
    summary: "auto",   // auto | detailed
  },
},
```

### 2. Interview Skeleton 加载状态

**文件**: `src/routes/demo/interview.tsx`

- `InterviewSkeleton` 组件：模拟表单骨架的 pulse 动画
- 使用 `StreamPhase` 状态机追踪流式阶段
- 在 thinking 期间和等待 tool_call 时显示 skeleton

```typescript
type StreamPhase = "idle" | "thinking" | "tool-streaming" | "complete";
```

### 3. System Prompt 优化

**文件**: `src/routes/demo/api.interview-chat.ts`

- 禁止 AI 生成"其他"选项（前端自动添加）
- 要求每个问题 2-4 个具体选项

---

## 关键发现

### TanStack AI Tool Call 状态

从 `@tanstack/ai-client` 的类型定义：

```typescript
type ToolCallState =
  | 'awaiting-input'      // 模型打算调用但参数未到
  | 'input-streaming'     // 参数流式传输中
  | 'input-complete'      // 参数完整，可执行
  | 'approval-requested'  // 等待用户审批
  | 'approval-responded'  // 用户已响应审批
```

### StreamChunk 类型

```typescript
chunk.type 可能的值:
- "thinking"    // AI 思考内容
- "content"     // 文本内容
- "tool_call"   // 工具调用
- "done"        // 完成
- "error"       // 错误
- "tool_result" // 工具结果
- "tool-input-available" // 工具输入就绪
```

### OpenAI Reasoning 模型的行为

**实际观察的 chunk 顺序**:
```
[Chunk] thinking (多次，流式传输)
↓
长时间等待（AI 在服务端处理，无 chunk）
↓
[Chunk] tool_call       ← 一瞬间全部到达
[Chunk] done
[Interview] state: input-complete
[Chunk] tool-input-available
```

**问题**: thinking 结束后到 tool_call 到达之间有明显延迟，这期间没有任何 chunk。这是 OpenAI API 的设计，不是 TanStack AI 的问题。

**解决方案**: 在 `streamPhase === "thinking"` 时就显示 skeleton，利用 `onChunk` 回调检测 chunk 类型。

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/routes/demo/interview.tsx` | 添加 ThinkingMessage、InterviewSkeleton、StreamPhase 状态机 |
| `src/routes/demo/api.interview-chat.ts` | 启用 reasoning、优化 system prompt |
| `docs/interview-tool.md` | 功能文档 |

---

## 待优化 / 已知问题

### 1. Skeleton 显示时机

- [x] Skeleton 逻辑正确（showSkeleton: true）
- [x] 自动滚动到 skeleton 位置
- [ ] 需要用户确认 skeleton 是否可见

### 2. 可能的进一步优化

1. **非 reasoning 模型体验更好**：gpt-4.1 等模型的 tool_call 参数是真正流式的
2. **中间状态提示**：可在 system prompt 要求 AI 调用 tool 前先说一句话
3. **Skeleton 样式优化**：可以更接近真实 InterviewUI 的布局

---

## 相关文档

- [TanStack AI Streaming Guide](https://tanstack.com/ai/latest/docs/guides/streaming)
- [TanStack AI Client Tools](https://tanstack.com/ai/latest/docs/guides/client-tools)
- [StreamProcessor Events](https://tanstack.com/ai/latest/docs/reference/classes/StreamProcessor)

---

## 下一步建议

1. 确认 skeleton 是否正常显示
2. 考虑是否需要在 thinking 结束后显示更明确的"正在准备问题..."提示
3. 测试非 reasoning 模型（如 gpt-4.1）的体验差异

---

## Thinking Framework（2026-01-07）

### 规划完成

通过 FDD Interview 流程，完成了"通用思考辅助工具"的规划：

**Spec 文档**: `.fdd/specs/thinking-framework/`
- SPEC.md - 索引
- stories.md - 用户故事
- flows.md - 6 阶段流程
- context.md - 技术上下文
- constraints.md - Scope + 取舍

### 核心决策

| 维度 | 决策 |
|------|------|
| 目标 | 帮助任何人把一件事想清楚 |
| 流程 | 6 阶段单向推进（界定→发散→结构化→收敛→检验→反思） |
| 交互 | 统一使用 interview tool（每轮 1-4 个问题） |
| 阶段转换 | AI 自行判断，无回溯 |
| 导航 | 文字标签（如 "[发散] ..."） |
| 文档输出 | 反思结束后由 AI 输出 Markdown |

### System Prompt 已更新

**文件**: `src/routes/demo/api.interview-chat.ts`

- 从"需求分析助手"改为"思考辅助助手"
- 实现 6 阶段流程
- 添加文字标签导航
- 定义最终 Markdown 文档格式
- maxIterations 从 5 增加到 20（支持更长的对话）

### 待测试

1. 完整 6 阶段流程是否顺畅
2. AI 是否正确判断阶段转换
3. 最终文档输出格式是否正确
4. 简单问题（如"今晚吃什么"）的体验
