# ThinkLab

AI 驱动的结构化思考辅助工具。通过 5 阶段对话流程，帮助你从模糊想法到清晰决策。

## 特性

- **5 阶段思考流程** - 界定 → 发散 → 结构化 → 收敛 → 检验
- **结构化问答** - AI 通过选择题引导深度思考，避免开放式问题的认知负担
- **Claude Extended Thinking** - 支持 Claude 模型的深度思考模式
- **多模型适配** - 支持 OpenAI、Claude 及兼容 API
- **Context Patches** - 动态 prompt 注入，根据对话内容自动加载领域知识

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 18 (可选，如不使用 Bun)

### 安装

```bash
git clone https://github.com/yansir/thinklab.git
cd thinklab
bun install
```

### 配置

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# OpenAI 兼容 API（必填）
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4"

# 可选：使用 Chat Completions API（默认使用 Responses API）
USE_COMPLETIONS_API="true"
```

**支持的 API 提供商**：
- OpenAI
- Claude (Anthropic)
- [AiHubMix](https://aihubmix.com)、[OpenRouter](https://openrouter.ai) 等聚合服务

### 运行

```bash
# 开发模式
bun dev

# 生产构建
bun run build
bun run preview
```

访问 http://localhost:3000

## 5 阶段思考流程

| 阶段 | 目标 | 核心问题 |
|------|------|----------|
| **界定** | 把模糊想法变成可处理的问题 | 我到底在想什么？为什么重要？ |
| **发散** | 扩大可能性空间 | 我没看到什么？ |
| **结构化** | 让混乱可操作 | 这些东西之间是什么关系？ |
| **收敛** | 做选择，明确代价 | 选择意味着放弃什么？ |
| **检验** | 攻击自己的决策 | 这个选择可能怎么错？ |

## 技术栈

- **框架**: [TanStack Start](https://tanstack.com/start)
- **路由**: [TanStack Router](https://tanstack.com/router)
- **AI**: [TanStack AI](https://tanstack.com/ai) + 自定义适配器
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **组件**: [Radix UI](https://radix-ui.com/)
- **运行时**: [Bun](https://bun.sh/)

## 项目结构

```
src/
├── routes/           # 页面路由
│   ├── index.tsx     # 主聊天页面
│   └── api.chat.ts   # Chat API 端点
├── components/
│   ├── chat/         # 聊天相关组件
│   └── interview/    # 问答交互组件
├── lib/
│   ├── adapters/     # AI 模型适配器
│   ├── prompts/      # 系统提示词
│   └── context-patches.ts  # 动态 prompt 注入
└── hooks/            # React Hooks
```

## 开发

```bash
# 类型检查
bun run typecheck

# 格式化 & Lint
bun run check
bun run lint:fix

# 测试
bun run test
```

## Context Patches

支持动态加载领域特定的 prompt 片段。在 `patches/` 目录下创建 `.md` 文件：

```markdown
---
name: my-domain
triggers:
  - type: keyword
    value: "特定关键词"
---

这里是当检测到关键词时注入的额外 prompt 内容。
```

## 许可证

[MIT](./LICENSE)

## 致谢

- [TanStack](https://tanstack.com/) - 优秀的 React 生态工具集
- [Anthropic](https://anthropic.com/) - Claude 模型的深度思考能力
