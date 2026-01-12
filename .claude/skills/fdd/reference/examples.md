# Pitfall 示例

## 归纳 Pit（来自真实错误）

### 示例 1: 代码检查 (external + biome)

```json
{
  "title": "Use biome to prevent console.log in production",
  "origin": "inductive",
  "scope": {"type": "permanent"},
  "severity": "medium",
  "tags": ["code-quality"],
  "evidence": {"error_snippet": "console.log found in production build"},
  "trigger": [{"kind": "external", "tool": "biome", "ref": "biome.json#noConsoleLog", "strength": "strong"}],
  "replay": {"root_cause": "Debug logs left in code"},
  "action": [{"level": "low", "kind": "run", "steps": ["Remove console.log", "Run biome check"]}],
  "verify": {"level": "V0", "checks": ["bun lint"]},
  "regression": {"repro": ["Add console.log", "Run lint"], "expected": "Biome should catch it"},
  "edge": {"negative_case": ["console.error for actual errors"], "expected": "console.error is allowed"}
}
```

### 示例 2: Git Hook 检查 (external + husky)

```json
{
  "title": "Version check before push",
  "origin": "inductive",
  "scope": {"type": "permanent"},
  "severity": "high",
  "tags": ["workflow", "release"],
  "evidence": {"error_snippet": "Published old version to npm"},
  "trigger": [{"kind": "external", "tool": "husky", "ref": ".husky/pre-push", "strength": "strong"}],
  "replay": {"root_cause": "Forgot to update version before push"},
  "action": [{"level": "low", "kind": "run", "steps": ["Update version", "git add", "git commit --amend"]}],
  "verify": {"level": "V0", "checks": ["git push"]},
  "regression": {"repro": ["Push without version update"], "expected": "Pre-push hook blocks"},
  "edge": {"negative_case": ["Version already updated"], "expected": "Push succeeds"}
}
```

### 示例 3: Schema 变更检测 (change)

```json
{
  "title": "Schema change requires migration",
  "origin": "inductive",
  "scope": {"type": "permanent"},
  "severity": "high",
  "tags": ["database", "migration"],
  "evidence": {"error_snippet": "Column does not exist", "command": "npm run db:push"},
  "trigger": [{"kind": "change", "when_changed": ["db/schema.*", "migrations/**"], "strength": "strong"}],
  "replay": {"root_cause": "Schema modified but migration not generated"},
  "action": [{"level": "medium", "kind": "run", "steps": ["npm run db:generate", "npm run db:migrate"]}],
  "verify": {"level": "V0", "checks": ["npm run db:check"]},
  "regression": {"repro": ["Modify schema", "Run app without migration"], "expected": "Should fail with column not found"},
  "edge": {"negative_case": ["Adding comments to schema"], "expected": "Comments don't require migration"}
}
```

### 示例 4: 危险命令拦截 (command)

```json
{
  "title": "Block production database direct access",
  "origin": "inductive",
  "scope": {"type": "permanent"},
  "severity": "critical",
  "tags": ["safety", "database"],
  "evidence": {"error_snippet": "Accidentally deleted production data", "command": "db-cli exec prod"},
  "trigger": [{"kind": "command", "pattern": "db-cli\\s+exec\\s+prod", "action": "block", "message": "Direct production access blocked", "strength": "strong"}],
  "replay": {"root_cause": "Raw SQL executed on production without safety checks"},
  "action": [{"level": "low", "kind": "transform", "steps": ["Use safe query wrapper instead"]}],
  "verify": {"level": "V1", "checks": ["Command should be blocked"]},
  "regression": {"repro": ["Run: db-cli exec prod"], "expected": "Command should be blocked"},
  "edge": {"negative_case": ["db-cli exec dev"], "expected": "Dev operations allowed"}
}
```

---

## 演绎 Pit（预防性约束）

### 示例 5: 技术栈约定 (inject-context)

```json
{
  "title": "Use project date library",
  "origin": "deductive",
  "scope": {"type": "permanent"},
  "severity": "medium",
  "tags": ["convention"],
  "trigger": [{"kind": "inject-context", "when_touching": ["src/**"], "context": "Use dayjs for dates, not moment. Format: YYYY/MM/DD", "strength": "strong"}],
  "replay": {"root_cause": "AI may use wrong date library"},
  "action": [{"level": "low", "kind": "read", "doc": "See context.md for date handling"}],
  "verify": {"level": "V3", "fallback": {"level": "V3", "self_proof": ["Preventive constraint"]}}
}
```

### 示例 6: Non-Goal 阻止 (command)

```json
{
  "title": "OAuth not in v1.0 scope",
  "origin": "deductive",
  "scope": {"type": "temporary", "reason": "Product decision", "milestone": "v2.0"},
  "severity": "medium",
  "tags": ["non-goal"],
  "trigger": [{"kind": "command", "pattern": "npm install.*(passport|oauth)", "action": "block", "message": "Non-Goal: OAuth not in v1.0", "strength": "strong"}],
  "replay": {"root_cause": "Preventive: product decision"},
  "action": [{"level": "low", "kind": "read", "doc": "Wait for v2.0"}],
  "verify": {"level": "V3", "fallback": {"level": "V3", "self_proof": ["Product decision"]}}
}
```

### 示例 7: 文件保护 (protect)

```json
{
  "title": "Protect production config",
  "origin": "deductive",
  "scope": {"type": "permanent"},
  "severity": "high",
  "tags": ["safety"],
  "trigger": [{"kind": "protect", "paths": ["config/prod.*", ".env.production"], "permissions": {"update": "deny", "delete": "deny"}, "message": "Production config is protected", "strength": "strong"}],
  "replay": {"root_cause": "Prevent accidental production config changes"},
  "action": [{"level": "low", "kind": "read", "doc": "Use staging config for testing"}],
  "verify": {"level": "V3", "fallback": {"level": "V3", "self_proof": ["Safety constraint"]}}
}
```
