# FDD (Feedforward & Feedback Driven Development)

> 前馈驱动 + 反馈驱动开发

## 双 F 模型

```
FDD = Feedforward + Feedback

Feedforward（前馈/演绎）
  来源：AI 元认知 —— "我知道未来的我不知道"
  时机：开发前
  产出：specs/ 文档 + 演绎 Pit

Feedback（反馈/归纳）
  来源：真实错误
  时机：Bug 修复后
  产出：归纳 Pit
```

## Directory Structure

```
.fdd/
├── specs/        # 规划文档（Interview 产出）
│   └── {feature}/
│       ├── SPEC.md
│       ├── stories.md
│       ├── flows.md
│       ├── context.md
│       ├── constraints.md
│       └── unresolved.md
├── pits/         # Pit 文件（TRAV 协议）
└── config.yaml   # 配置

.claude/
└── skills/fdd/   # FDD skill for Claude Code
```

## TRAV Protocol

Each pitfall must contain:

- **Trigger** — How to detect this issue
- **Replay** — How the issue occurred (root cause)
- **Action** — How to fix it
- **Verify** — How to verify the fix succeeded

## Origin

| Origin | 说明 | Gate 检查 |
|--------|------|-----------|
| `deductive` | 演绎 Pit - 来自 AI 预判 | evidence/regression/edge 可选 |
| `inductive` | 归纳 Pit - 来自真实错误 | evidence/regression/edge 必填 |

## Commands

- `fdd add --json` — Create pitfall via JSON input
- `fdd list` — List all pitfalls
- `fdd check` — Run triggers to detect issues
- `fdd validate` — Validate pitfalls against gate checks
