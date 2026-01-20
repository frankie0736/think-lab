# ACF Product Planner

> 帮助外贸学员梳理产品线，产出 ACF 规划文档

## Intent

将 think-lab 从通用思考辅助工具改造为 **外贸 B2B 建站 ACF 产品规划工具**。

核心价值：让不懂技术的外贸学员，通过引导式问答，产出清晰的 ACF 数据结构规划。

## 文档索引

| 文档 | 内容 |
|------|------|
| [stories.md](stories.md) | 用户故事、痛点、目标 |
| [flows.md](flows.md) | 核心流程：产品线概览 → 分类结构 → 字段规划 → 输出 |
| [context.md](context.md) | 技术决策：保留架构，改造 prompt/阶段/输出 |
| [constraints.md](constraints.md) | MVP 范围 + Non-Goals |

## MVP 范围

- [x] Post Type 设计引导
- [x] Taxonomy 设计引导
- [x] Field Group 规划
- [x] Repeater 使用引导
- [x] 结构化文档输出

## 关键决策

| 决策 | 选择 |
|------|------|
| 架构 | 保留现有，改造 3 块 |
| 交互 | 引导式问答（interview 工具） |
| 阶段 | ACF 专用流程，借鉴通用 5 阶段思维 |
| 输出 | Markdown（喂给 ACF JSON 生成器） |
| 行业模板 | 不做 |

## Unresolved

暂无。

## Related Pits

无。评审后决定不创建 Pit，偏差通过提示词约束解决。

## 评审记录

评审团提出 10+ 个质疑，关键澄清：
- JSON 生成器：团队已有工具，学员提交文档即可
- 一次性完成：接受，学员应一口气梳理完
- 概念引导：用例子而非术语
- 复杂度分类：AI 自动判断，不强制学员选择
- 输出确认：可选
