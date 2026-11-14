# dsh-plugin-devin-bridge

[English](README.md) | [中文](README.zh.md)

一个 [dsh](https://github.com/deepseek-ai/deepseek-harness) LLM 适配器插件，将 [Devin](https://devin.ai) 的 Connect RPC API 桥接到 dsh 模型提供者系统，让 dsh 内部的 agent loop 能够使用 Devin 托管的模型（`glm-5.2`、`swe-1.7` 及 Devin 暴露的其他模型）作为后端。

> **dsh 0.2+**：本版本面向 dsh 0.2 插件架构（volatile 配置、`configForms`、Typert remote、`plugins.bundle.config`），要求 `dsh >= 0.2.0-rc.1`；dsh 0.1 主机请使用 `0.1.x` 版本。

## 工作原理

插件通过 dsh LLM seam（`LlmAdapter`）在 `ctx.llm` 上注册 `devin` provider route。当 dsh 的 agent loop 把请求路由到 `provider: devin` 时，适配器会：

1. 把 dsh 的 `GenerateOptions`（消息、工具、系统提示词、图片）翻译成 Devin 的 `GetChatMessageRequest` protobuf
2. 从 Devin 的 Connect RPC 端点流式获取响应
3. 把每个 `GetChatMessageResponse` 帧解码为 dsh 的 `StreamChunk` 协议（文本增量、推理增量、工具调用增量、token 用量、结束原因）

## 安装

```bash
pnpm add https://github.com/Arborsm/dsh-plugin-devin-bridge.git
```

## Token 解析

适配器需要 Devin session token（格式：`devin-session-token$<...>`）进行认证。按以下优先级解析：

1. **设置面板** — 在 dsh 设置 UI 中填写 `token`（标记为 secret，wire 响应自动脱敏）
2. **Entry config** — 插件组合层的 `config.token`
3. **Devin CLI 凭证** — 自动从 `devin auth login` 创建的 `credentials.toml` 读取：
   - Windows：`%APPDATA%\devin\credentials.toml`
   - macOS/Linux：`~/.local/share/devin/credentials.toml`（或 `$XDG_DATA_HOME/devin/credentials.toml`）
   - 通过 `DEVIN_CREDENTIALS_PATH` 环境变量覆盖路径

如果都没找到，插件在启动时抛出带有明确指引的错误。

## 配置

所有字段均可选——只要有 token（通过设置面板、entry config 或 credentials.toml），插件即可开箱即用。

```yaml
- id: devin-bridge
  name: dsh-plugin-devin-bridge
  config:
    token: ""  # 可选：显式 token；留空则从 credentials.toml 自动检测
    baseUrl: "https://server.codeium.com"  # 可选：Devin Connect 端点
    proxy: ""  # 可选：出站代理 URL（http/https/socks5）
    forceHttp1: true  # 可选：强制 HTTP/1.1（默认 true）
    defaultContextWindow: 128000  # 可选：默认上下文窗口
    defaultMaxTokens: 128000  # 可选：默认最大输出 token
    models:  # 可选；默认 swe-2 和 swe-2-flash
      - id: "swe-2"
        name: "SWE-2"
        contextWindow: 262000
        maxTokens: 128000
        supportsImages: true
      - id: "swe-2-flash"
        name: "SWE-2 Flash"
        contextWindow: 262144
        maxTokens: 128000
        supportsImages: false
    retryPolicy:  # 可选
      mode: normal
      maxRetries: 3
      backoff:
        initialDelayMs: 500
        maxDelayMs: 10000
        jitterRatio: 0.1
    rateLimitReminder: true  # 可选：限流到点提醒（默认开启）
    rateLimitReminderLeadMinutes: 5  # 可选：提前多少分钟提醒；0 = 只在到点提醒
    rateLimitAutoResume: false  # 可选：重置到点后自动继续（默认关闭）
    rateLimitMaxResumeAttempts: 3  # 可选：自动继续的最大尝试次数
    rateLimitNotifyUrl: ""  # 可选：webhook，POST 一条 JSON；留空只写 Host 日志
```

当 dsh settings 服务可用时，以上所有字段都可以在 插件详情页（插件 → dsh-plugin-devin-bridge）的 **Devin Bridge** 卡片 里运行时动态调整——全部字段都是 `volatile`，写入即时生效且不会 remount。`token` 字段标记为 `role('secret')`，在返回给 wire surface 的 settings descriptor 中自动脱敏。

插件的 settings namespace 等于 composition entry id（`cordis.patch.yml` 中的 `devin-bridge`）；用其他 entry id 组合该插件时，namespace 也随之变化。

## 限流提醒与自动继续

免费模型触发限流时，上游返回的报错形如：

```text
[resource_exhausted] Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).
```

插件解析其中的**相对时长**（1 小时 48 分钟）与**绝对钟点**（21:01 UTC）：以绝对钟点为准（同一天有今/明/昨三个候选，用相对时长对齐），再换算成本地时间展示。

| 字段 | 示例 |
| --- | --- |
| 错误码 | `resource_exhausted` |
| 原始文案 | 完整保留，不做改写 |
| 重置时间 (UTC) | `2026-11-14 21:01:00 UTC` |
| 重置时间 (本地) | `2026-11-15 05:01:00 UTC+8`（Asia/Shanghai） |

**提醒**：默认在重置前 5 分钟发一条预告，到点再发一条「可以重新运行」；内容含错误码、UTC 与本地重置时间、原始文案。渠道按可用性降级：Host 日志（默认）→ 可选 webhook；设置页「限流提醒」卡会实时显示错误码、UTC 与本地重置时间、剩余时长。`rateLimitReminder: false` 可整体关闭通知（重置时间仍显示在设置页）。

**自动继续**（默认关闭，三种开启方式）：

1. 设置页 → Devin →「限流提醒」卡 → 出现限流时点「开启自动继续」；
2. 配置 `rateLimitAutoResume: true`；
3. 程序化调用 `remote.devin.enableRateLimitAutoResume()`。

开启后，撞限流且本次尝试尚未产出任何内容时，插件等到重置点再重放同一请求；重置点已过或原文没给可解析时间时按指数退避（5s 起、封顶 60s、±10% 抖动），最多 `rateLimitMaxResumeAttempts` 次。已经产出文本/推理/工具调用则不重放，只登记提醒并原样上报限流错误，避免把两段回答拼进同一条消息。

手动控制：`remote.devin.cancelRateLimit()` 取消挂起的提醒与等待；`remote.devin.disableRateLimitAutoResume()` 关闭自动继续；`remote.devin.rateLimit()` 读取当前状态（`active`/`resetAtUtc`/`resetAtLocal`/`remainingMs`）。

### 验证提醒

```bash
# 用固定时钟复现本次失败：19:13 UTC 收到「1 小时 48 分钟后、21:01 UTC」的重置
node scripts/rate-limit-probe.ts --at 2026-11-14T19:13:00Z
```

输出给出 UTC 与本地（Asia/Shanghai 为 2026-11-15 05:01:00 UTC+8）的重置时刻，以及预告/到点两次通知的本地时间。真实到点触发由 `pnpm test` 的假时钟用例覆盖：`test/rate-limit.test.ts` 的「到点前发预告、到点发『可以重新运行』提醒」。

## 使用方式

配置完成后，dsh 的模型选择器会显示 `Devin` provider 及可用模型。在 dsh UI 中选择任一模型，或通过 `provider: devin` 编程式路由。

## 功能特性

- **动态模型目录**：通过 `GetCascadeModelConfigs` RPC 从 Devin 服务器实时拉取可用模型列表，读取 `model_family_metadata` 将推理档位（`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`）合并为同一基础模型，并识别 fast-mode 变体、promo/premium 标记、信用倍率和图片支持。
- **推理档位滑块**：适配器在每个模型上暴露 dsh 的 `reasoning.efforts`，通过目录档位表把选中的 effort 解析为具体的 Devin `model_uid`（目录缺失时回退内置后缀映射）。
- **文本流式输出**：完整的文本增量流式传输与索引化 block 组装
- **推理/思考**：推理内容映射到 dsh 的 `reasoning` block 类型；thinking 签名经 `finish.replayState` 往返保存，assistant 历史回放时携带有效签名。
- **工具调用**：Devin 工具调用增量翻译为 dsh 的 `tool-call` block；工具 schema 剥离自然语言注解，真正的描述经 system prompt 注入（上游把 wire `description` 字段当路由提示）。
- **图片支持**：有视觉能力的模型通过 dsh 的 attachment 系统接受图片输入。遵循上游约定，图片只挂在当前轮（最后一条 assistant 之后）；历史图片降级为文本占位。
- **Token 用量**：输入/输出/缓存 token 计量上报给 dsh
- **重试策略**：provider 级 `retryPolicy` 配置经 dsh `resolveRetryPolicy` 解析（normal/always 模式）
- **限流提醒与自动继续**：解析 `[resource_exhausted]` 报错里的相对时长与 UTC 钟点，换算本地时间后到点提醒；可选在重置到点后按退避自动继续（默认关闭，可手动开关/取消）
- **系统提示词清洗**：跨模型兼容的身份无关系统提示词重写
- **代理支持**：可选的出站 HTTP/HTTPS/SOCKS5 代理
- **volatile 设置**：通过插件详情页运行时调整配置，写入即时生效
- **凭证自动检测**：未显式配置 token 时自动读取 `devin auth login` 的凭证

## 架构

```
src/
├── index.ts              # Cordis 插件入口：volatile Config schema、provider/adapter/discovery 注册
├── client/               # 浏览器端：bundle 详情页 plugins.bundle.config 卡片（configForms + remote.llm）
├── adapter/
│   ├── devin.ts          # DevinAdapter：GenerateOptions → Devin RPC → StreamChunk
│   ├── decoder.ts        # GetChatMessageResponse → StreamChunk 转换
│   ├── rate-limit.ts     # 解析相对时长 + UTC 钟点，换算本地重置时间
│   ├── rate-limit-watch.ts   # 到点提醒、退避等待、状态快照
│   ├── rate-limit-observe.ts # llm/stream 瀑布上的全局限流兜底与自动继续
│   ├── rate-limit-notify.ts  # 可选 webhook 通知渠道
│   ├── transport.ts      # Connect transport，注入 auth + proxy
│   └── credentials.ts    # Devin CLI credentials.toml 自动检测
└── proto/
    ├── devin.proto       # 裁剪后的 protobuf 定义
    └── gen/              # @bufbuild/protobuf 生成代码
```

## 许可证

MIT
