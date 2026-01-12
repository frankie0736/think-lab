# Core Flows

## 主流程

```
用户输入模糊需求
  → AI 识别需要澄清
  → AI 调用 interview 工具（生成 1-4 个问题）
  → 前端渲染选择 UI
  → 用户选择（单选/多选）
  → 结果返回 AI
  → AI 判断是否足够
    → 不够：再次调用 interview（追问）
    → 足够：继续执行任务
```

## 数据流

```
AI → tool_call { questions: [...] } → Frontend
Frontend → tool_result { answers: {...} } → AI
```

## 追问循环

```
round 1: 核心方向
  → round 2: 细节确认（如需）
  → round N: 边界情况（如需）
  → 终止：AI 判断信息完整
```
