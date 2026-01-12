# 记录 Pit

> **⚠️ 必须使用 CLI 创建 Pit，禁止直接写入 `.fdd/pits/` 目录**
>
> ```bash
> fdd add --json '<JSON>'
> ```

## 入口判断

| 来源 | origin | 特点 |
|------|--------|------|
| `[FDD]` 消息触发 | 通常 `inductive` | 刚修复 bug，有上下文 |
| 用户说"刚修复了 bug" | `inductive` | 归纳，需要 evidence |
| 用户说"想预防某问题" | `deductive` | 演绎，evidence 可选 |

---

## 第一步：判断价值

**能帮未来没有当前 context 的 AI 避坑？**

- 能 → 继续
- 不能 → 静默跳过，不解释

---

## 第二步：确定 origin

如果来自 `[FDD]` 消息，默认 `inductive`。

如果用户主动请求但未明确，用 AskUserQuestion 问：

```
这条 Pit 的来源？
├─ 刚修复了一个 bug（归纳）
└─ 想预防某个问题（演绎）
```

---

## 第三步：AI 准备

AI 根据上下文准备：

| 字段 | 归纳 | 演绎 |
|------|------|------|
| Replay（root_cause） | 必填 | 必填 |
| Action（修复步骤） | 必填 | 必填 |
| Evidence | **必填** | 可选 |
| Lifecycle | 建议 | 建议 |

---

## 第四步：用户决策

用 AskUserQuestion **一次性**问（不要碎片化）：

### 归纳 Pit

```
1. Trigger 类型？
   - rule（代码匹配）
   - change（文件变更）
   - inject-context（上下文提醒）
   - protect（文件保护）

2. 匹配范围？（如 src/**/*.ts）

3. 验证方式？
   - V0: test/type/build
   - V1: lint/grep
   - V3: 人工确认
```

### 演绎 Pit

可简化，只问 Trigger 类型。Scope 和 Verify 可用默认值。

---

## 第五步：最终确认

展示完整 TRAV，让用户确认：

```
## Trigger
{触发器配置}

## Replay
{根因分析}

## Action
{修复步骤}

## Verify
{验证方式}
```

用户确认后，使用 Bash 工具执行：

```bash
fdd add --json '{"title": "...", ...完整JSON...}'
```

**禁止直接写入 `.fdd/pits/` 目录！** CLI 会自动处理：
- 验证 JSON 格式
- 生成 Pit ID
- 创建 `.md` 文件
- 同步 Claude Code hooks

---

## 第六步：关联 Spec（如有）

检查 `.fdd/specs/` 下是否有相关的 spec 目录。

**如果有**：更新该 spec 的 `SPEC.md` 的 `## Related Pits` 表格：

```markdown
| Pit | 纠正什么 |
|-----|----------|
| [PIT-xxx-slug](../../pits/pit-xxx-slug.md) | 简述偏差 |
```

**判断标准**：
- 这个 Pit 是否与某个功能的开发相关？
- 修复的 bug 是否属于某个已规划的 feature？

**如果没有关联的 spec**：跳过此步骤。

---

## JSON 格式（传给 `fdd add --json` 的参数）

> 这是 CLI 参数格式，不是文件格式。CLI 会自动转换为 `.md` 文件。

### 归纳 Pit

```json
{
  "title": "简短描述",
  "origin": "inductive",
  "scope": {"type": "permanent"},
  "severity": "high",
  "evidence": {"error_snippet": "...", "diff_summary": "..."},
  "trigger": [{"kind": "rule", "pattern": "...", "scope": ["src/**"]}],
  "replay": {"root_cause": "..."},
  "action": [{"steps": ["..."]}],
  "verify": {"level": "V0", "checks": ["bun test"]},
  "regression": {"repro": ["步骤"], "expected": "预期"},
  "edge": {"negative_case": ["不触发场景"], "expected": "原因"}
}
```

### 演绎 Pit

```json
{
  "title": "简短描述",
  "origin": "deductive",
  "scope": {"type": "permanent"},
  "trigger": [{"kind": "inject-context", "when_touching": ["src/**"], "context": "..."}],
  "replay": {"root_cause": "..."},
  "verify": {"level": "V3", "fallback": {"self_proof": ["..."]}}
}
```

---

## 参考

- 触发器详情：[../reference/triggers.md](../reference/triggers.md)
- Gate 检查：[../reference/gates.md](../reference/gates.md)
- 完整示例：[../reference/examples.md](../reference/examples.md)
