# 触发器类型

FDD 支持 5 种触发器。

## external - 外部工具集成

```json
{
  "kind": "external",
  "tool": "husky",
  "ref": ".husky/pre-push",
  "strength": "strong"
}
```

**支持的工具**：
- `husky`: Git hooks（ref 格式：`.husky/{hook-name}`）
- `biome`: Lint 规则（ref 格式：`biome.json#{rule-name}`）
- `scripts`: npm scripts（ref 格式：`package.json#scripts.{name}`）

**特点**：
- 不参与 `fdd check`（由外部工具自己执行）
- `fdd validate` 检查 ref 有效性
- 创建 Pit 时检测工具是否安装

**适用**：代码检查、Git hooks、自动化脚本

## change - Git 文件变更

```json
{
  "kind": "change",
  "when_changed": ["db/schema.*", "migrations/**"],
  "strength": "strong"
}
```

**适用**：Schema 变更验证、配置变更检查、依赖更新测试

## command - 命令拦截

```json
{
  "kind": "command",
  "pattern": "rm\\s+-rf\\s+/",
  "action": "block",
  "message": "Dangerous command blocked",
  "strength": "strong"
}
```

**action**：`block`（阻止）| `warn`（警告）

**适用**：阻止危险操作、防止误删、拦截生产敏感命令

## protect - 文件保护

```json
{
  "kind": "protect",
  "paths": ["config/prod.*", ".env.production"],
  "permissions": {"create": "deny", "update": "deny", "delete": "deny"},
  "message": "Protected file",
  "strength": "strong"
}
```

**permissions**：`create` | `update` | `delete`，值：`allow` | `deny`

**适用**：保护 Pit 文件、生产配置、关键文件

## inject-context - AI 上下文注入

```json
{
  "kind": "inject-context",
  "when_touching": ["src/db/**", "src/auth/**"],
  "context": "This area had security issues. Use parameterized queries.",
  "strength": "strong"
}
```

**适用**：提醒历史问题、注入架构约束、传递团队经验

## strength

- `strong`：可靠的程序化检测
- `weak`：仅字符串匹配，可能误报

弱触发器应标记 TODO 说明如何升级。
