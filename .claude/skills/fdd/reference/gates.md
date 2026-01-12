# Gate Checks

每个 Pit 必须通过质量门禁。**演绎 Pit 的门禁更宽松。**

## 演绎 vs 归纳

| Gate | 归纳 Pit | 演绎 Pit |
|------|----------|----------|
| Gate 1: Evidence | **必填** | 可选 |
| Gate 2: Regression | **必填或 waiver** | 可选 |
| Gate 3: Edge | **必填或 waiver** | 可选 |
| Gate 4-8 | 必填 | 必填 |

## Gate 1-3: 仅归纳 Pit

### Evidence（Gate 1）

`error_snippet` 或 `command` 至少一个：

```json
{"evidence": {"error_snippet": "TypeError: ...", "command": "bun test"}}
```

### Regression（Gate 2）

复现步骤：

```json
{"regression": {"repro": ["步骤1", "步骤2"], "expected": "预期结果"}}
```

### Edge（Gate 3）

负面案例：

```json
{"edge": {"negative_case": ["不触发场景"], "expected": "原因"}}
```

### Waiver 格式（Gate 2/3 通用）

无法提供时使用：

```json
{"repro": [], "expected": "", "waiver": true, "waiver_reason": "原因"}
```

**演绎 Pit 可以省略 evidence/regression/edge。**

## Gate 4: Weak Trigger Marking

弱触发器必须标记 `strength: weak`。

## Gate 5: Trigger Field Validation

| kind | 必填字段 |
|------|----------|
| rule | pattern |
| command | pattern |
| dynamic | must_run |
| change | when_changed |
| protect | paths |
| inject-context | when_touching, context |

## Gate 6: Replay Required

所有 Pit 必须包含 `replay.root_cause`。

## Gate 7: Action Required

所有 Pit 必须包含至少一个 action。

## Gate 8: Verify Required

| Level | 必填 |
|-------|------|
| V0, V1 | checks |
| V2 | evidence 存在 |
| V3 | fallback.self_proof |

### Verify Levels

| Level | 说明 | 示例 |
|-------|------|------|
| V0 | test/type/build | `bun test` |
| V1 | lint/grep/AST | `bun lint` |
| V2 | evidence 存在 | 有日志 |
| V3 | 结构化自证 | 人工确认 |

### V3 自证格式

```json
{"verify": {"level": "V3", "fallback": {"level": "V3", "self_proof": ["确认理由"]}}}
```

## Trigger 优先原则

按成本效益排序：rule > change > protect > command > dynamic > inject-context
