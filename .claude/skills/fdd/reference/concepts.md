# FDD 核心概念

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

## Origin（来源）

| Origin | 说明 | Gate 检查 |
|--------|------|-----------|
| `deductive` | 演绎 Pit - 来自 AI 预判 | evidence/regression/edge 可选 |
| `inductive` | 归纳 Pit - 来自真实错误 | evidence/regression/edge 必填 |

## Scope（生命周期）

| Type | 说明 | 示例 |
|------|------|------|
| `permanent` | 长期 - 项目级约束 | 安全规则、架构约束 |
| `temporary` | 临时 - 有终止条件 | 日期/分支/里程碑 |

### Temporary 过期条件

```json
{
  "scope": {
    "type": "temporary",
    "expires": "2024-03-01",
    "reason": "v2.0 发布后移除",
    "milestone": "v2.0"
  }
}
```

## TRAV 协议

每个 Pit 包含四部分：

| 部分 | 含义 | 问什么 |
|------|------|--------|
| **T**rigger | 如何检测 | 什么模式/条件触发？ |
| **R**eplay | 根因分析 | 为什么会发生？ |
| **A**ction | 如何修复 | 正确做法是什么？ |
| **V**erify | 如何验证 | 怎么确认修复了？ |

## 目录结构

```
.fdd/
├── specs/{feature}/    # 规划文档（Interview 产出）
│   ├── SPEC.md         # 索引
│   ├── stories.md      # 用户故事
│   ├── flows.md        # 核心流程
│   ├── context.md      # 技术决策
│   └── constraints.md  # 约束 + Non-Goals
└── pits/               # Pit 文件
    └── PIT-xxx-{slug}.md
```

## 核心原则

- **精简**：不损失信息的前提下，最小化 token
- **完整**：Interview 后无模棱两可
- **纠偏**：只有高代价偏差才生成 Pit（对抗过滤）
