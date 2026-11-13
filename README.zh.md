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
    defaultMaxTokens: 65536  # 可选：默认最大输出 token
    models:  # 可选；默认 swe-2 和 swe-2-flash
      - id: "swe-2"
        name: "SWE-2"
        contextWindow: 262000
        maxTokens: 65536
        supportsImages: true
      - id: "swe-2-flash"
        name: "SWE-2 Flash"
        contextWindow: 262144
        maxTokens: 65536
        supportsImages: false
    retryPolicy:  # 可选
      mode: normal
      maxRetries: 3
      backoff:
        initialDelayMs: 500
        maxDelayMs: 10000
        jitterRatio: 0.1
```

当 dsh settings 服务可用时，以上所有字段都可以在 插件详情页（插件 → dsh-plugin-devin-bridge）的 **Devin Bridge** 卡片 里运行时动态调整——全部字段都是 `volatile`，写入即时生效且不会 remount。`token` 字段标记为 `role('secret')`，在返回给 wire surface 的 settings descriptor 中自动脱敏。

插件的 settings namespace 等于 composition entry id（`cordis.patch.yml` 中的 `devin-bridge`）；用其他 entry id 组合该插件时，namespace 也随之变化。

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
│   ├── transport.ts      # Connect transport，注入 auth + proxy
│   └── credentials.ts    # Devin CLI credentials.toml 自动检测
└── proto/
    ├── devin.proto       # 裁剪后的 protobuf 定义
    └── gen/              # @bufbuild/protobuf 生成代码
```

## 许可证

MIT
