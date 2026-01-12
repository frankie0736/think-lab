# Interview Tool

AI 驱动的结构化问答工具，通过多步骤表单深入了解用户需求。

## 功能特性

- **步骤式交互**：一次显示一个问题，单选点击直接进入下一题，多选需确认
- **进度指示器**：显示当前问题进度
- **自定义输入**：每个问题支持"其他"选项
- **循环追问**：AI 根据答案判断是否需要继续追问
- **类型安全**：完整的 TypeScript + Zod schema 定义

## 文件结构

```
src/
├── lib/
│   └── interview-tool.ts           # 工具定义 + Zod schema
├── components/
│   └── interview-ui.tsx            # 步骤式表单 UI 组件
├── routes/demo/
│   ├── api.interview-chat.ts       # API 路由
│   └── interview.tsx               # Demo 页面
└── __tests__/
    └── interview-tool.test.ts      # 测试
```

## 使用方式

### 1. 访问 Demo

```
http://localhost:3000/demo/interview
```

### 2. API 路由配置

```typescript
// src/routes/demo/api.interview-chat.ts
import { interviewToolDef } from "@/lib/interview-tool";

const stream = chat({
  adapter: createOpenaiChat(model, apiKey, { baseURL }),
  tools: [interviewToolDef],  // 传递工具定义，不执行
  systemPrompts: [SYSTEM_PROMPT],
  messages,
});
```

### 3. 前端渲染

```typescript
// 检测 tool-call 并渲染 InterviewUI
if (part.type === "tool-call" && part.name === "interview") {
  const input = JSON.parse(part.arguments);
  return (
    <InterviewUI
      input={input}
      onSubmit={(output) => addToolResult({ toolCallId, tool: "interview", output })}
    />
  );
}
```

## Schema 定义

### 输入 (AI → Frontend)

```typescript
interface InterviewInput {
  questions: Array<{
    question: string;      // 问题文本
    header: string;        // 标签 (≤12字符)
    multiSelect: boolean;  // 是否多选
    options: Array<{
      label: string;       // 选项标签
      description: string; // 选项说明
    }>;  // 2-4 个选项
  }>;  // 1-4 个问题
}
```

### 输出 (Frontend → AI)

```typescript
interface InterviewOutput {
  answers: Record<string, string | string[]>;
  // key: 问题文本, value: 选中的 label 或自定义输入
}
```

## 环境变量

```env
# .env.local
OPENAI_BASE_URL="https://your-api-provider.com/v1"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4.1"
```

## 交互流程

```
用户提问 → AI 调用 interview 工具 → 前端渲染步骤式表单
    ↓
用户逐个回答问题 → 最后一题完成自动提交
    ↓
AI 收到答案 → 判断是否信息充足
    ↓
不足 → 继续调用 interview 追问
充足 → 输出最终方案
```

## FDD 规格文档

详细的需求分析和设计决策见：`.fdd/specs/interview/`
