# Core Flow

## 请求处理流程

```
用户发送消息
  → API 收到 messages
  → 加载所有 patch 文件
  → LLM 判断哪些 patch 匹配
  → 匹配的 patch 内容追加到 System Prompt
  → 调用主模型生成回复
```

## Patch 匹配流程

```
读取 patches/context/*.md
  → 提取每个 patch 的 trigger 描述
  → 构造判断 prompt: "用户消息是否涉及以下领域？"
  → LLM 返回匹配的 patch ID 列表
  → 加载匹配 patch 的 content
  → 变量替换（如 {{topic}}）
  → 合并到 System Prompt
```

## Patch 文件结构

```
patches/context/
├── acf.md          # ACF 相关 patch
└── (future).md     # 未来可扩展
```
