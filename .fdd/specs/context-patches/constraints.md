# Constraints

## Scope (MVP)

- [x] Patch 文件存储 (`patches/context/*.md`)
- [x] Frontmatter 解析（id, trigger）
- [x] LLM 语义匹配检测
- [x] System Prompt 末尾注入
- [x] 简单变量替换 `{{topic}}`
- [x] ACF patch 模板

## Non-Goals

| 不做 | 原因 |
|------|------|
| UI 管理界面 | 文件管理足够，避免过度设计 |
| Patch 优先级/依赖 | MVP 场景不需要，全部注入即可 |
| 跨项目复用 | 先解决当前项目需求 |
| 检测结果缓存 | 增加复杂度，收益不明显 |
| 独立检测模型 | 避免额外配置，复用主模型 |

## 边界条件

- 没有匹配的 patch → 不注入任何内容
- 所有 patch 都匹配 → 全部注入（按文件名排序）
- Patch 文件格式错误 → 跳过该文件，记录警告
- 变量未定义 → 保留原样 `{{undefined}}`
