# dsh-plugin-devin-bridge

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，把 [Devin Connect](https://codeium.com/) 的 `GetChatMessage` / `GetCascadeModelConfigs` RPC 反代为 OpenAI Chat Completions 兼容的 HTTP API。任何兼容 OpenAI 的客户端（openai-python、Continue、Cline 等）都能通过本地 Harness profile 调用 Devin 模型，例如 `glm-5.2` 和 `swe-1.7`。

## 功能

- 在 Harness 内置 web server 上注册 `/v1/chat/completions` 和 `/v1/models`。
- 把 OpenAI Chat Completions 请求翻译为 Devin Connect protobuf RPC 调用。
- 把 Devin 响应以 SSE 流（`text/event-stream`）或单条非流式 JSON 返回。
- Devin thinking 增量映射为 `reasoning_content`（DeepSeek 风格扩展）。
- 支持工具调用（`tools` + `tool_choice`）、system prompt、多轮历史和图片输入（base64 data URL，仅视觉模型）。
- 只发送**当前轮**图片；历史中的旧图片替换为 `[Image omitted from history]`，避免 Devin 拒绝请求。
- 清洗 Codex `<permissions instructions>` 块和 Claude 身份字符串，避免触发 Devin 内容策略。
- 可选 `apiKey` 用 `Authorization: Bearer <key>` 保护 `/v1/*` 接口。
- 可选出站代理（`http://`、`https://`、`socks5://`、`socks5h://`）。

## 安装

```sh
git clone https://github.com/Arborsm/dsh-plugin-devin-bridge.git
cd dsh-plugin-devin-bridge
pnpm install
pnpm run check          # 类型检查 + 构建
dsh plugin --profile devin add .
dsh --profile devin --dump-config | grep devin-bridge
dsh --profile devin
```

然后把 OpenAI 客户端指向 Harness web server：

```sh
export OPENAI_BASE_URL=http://127.0.0.1:<dsh-port>/v1
export OPENAI_API_KEY=<cordis.patch.yml 中配置的 apiKey，留空时任意值>
```

## 配置

编辑仓库中的 `cordis.patch.yml`（或 profile 中已安装的副本），填入 Devin session token：

```yaml
- insert:
    - id: devin-bridge
      name: dsh-plugin-devin-bridge
      config:
        baseUrl: "https://server.codeium.com"
        token: "devin-session-token$..."   # 必填
        model: "glm-5-2"                    # 默认模型 uid
        proxy: ""                           # 可选出站代理
        forceHttp1: true                    # 强制 HTTP/1.1
        apiKey: ""                          # 可选 /v1/* 访问密钥
```

| 字段        | 必填 | 说明                                                                          |
|-------------|------|-------------------------------------------------------------------------------|
| `baseUrl`   | 是   | Devin Connect 端点，通常 `https://server.codeium.com`。                       |
| `token`     | 是   | Devin session token，格式 `devin-session-token$<...>`。                       |
| `model`     | 否   | 请求未指定模型时使用的默认 uid，默认 `glm-5-2`。                                |
| `proxy`     | 否   | 出站代理 URL，支持 `http://`、`https://`、`socks5://`、`socks5h://`。          |
| `forceHttp1`| 否   | 强制 HTTP/1.1 连接 Devin，默认 `true`。                                        |
| `apiKey`    | 否   | 用 `Authorization: Bearer <apiKey>` 保护 `/v1/*`，留空不鉴权。                  |

## 使用

profile 启动后，任何兼容 OpenAI 的客户端都能用：

```python
from openai import OpenAI
client = OpenAI(
    base_url="http://127.0.0.1:<dsh-port>/v1",
    api_key="<apiKey 或任意值>",
)
resp = client.chat.completions.create(
    model="glm-5-2",
    messages=[{"role": "user", "content": "你好"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="")
```

列出可用模型：

```sh
curl http://127.0.0.1:<dsh-port>/v1/models \
  -H "Authorization: Bearer <apiKey>"
```

## 项目结构

```text
src/
  index.ts              # Cordis 插件入口（apply + Config schema）
  gateway.ts            # /v1/chat/completions + /v1/models 路由、鉴权、错误处理
  adapter/
    transport.ts        # Connect transport、Basic auth 注入、代理 agent
    devin.ts            # RequestMessages -> Devin RPC（buildRequest + Stream + ListModels）
    decoder.ts          # GetChatMessageResponse 帧 -> ResponseEvent 流式解码
  api/chat/
    decode.ts           # OpenAI Chat 请求 JSON -> 中间 RequestMessages
    encode.ts           # ResponseEvent -> SSE chunks / 非流式 JSON
  llm/
    types.ts            # LLM 无关的 message/content/event 类型
    validate.ts         # 请求校验
  proto/
    devin.proto         # 裁剪后的 protobuf 定义
    gen/devin_pb.ts     # 生成的 TS 绑定（protoc-gen-es v2）
cordis.patch.yml        # 插件注册 + schemastery 配置
package.json            # dsh bundle manifest + 依赖
tsdown.config.ts        # 构建配置
tsconfig.json           # 类型检查配置
```

## 构建

```sh
pnpm install
pnpm run proto:gen       # 从 devin.proto 重新生成 src/proto/gen/devin_pb.ts
pnpm run typecheck       # tsc --noEmit
pnpm run build           # tsdown -> lib/index.js
```

`proto:gen` 需要 `protoc` + `@bufbuild/protoc-gen-es`。仓库已提交生成的 `src/proto/gen/devin_pb.ts`，最终用户构建插件时不需要 protoc。

## 兼容性说明

- thinking 内容以 `reasoning_content` 输出（流式增量与非流式最终消息均包含），这是 DeepSeek 风格扩展，不属于 OpenAI 官方规范。
- 双向支持 `tool_calls`。工具结果必须以 `role: "tool"` + `tool_call_id` 回传。
- 不下载 HTTP(S) 图片 URL；请用 `data:image/...;base64,...` 或带 `mime_type` 的裸 base64。
- `/v1/models` 合并 Devin `GetCascadeModelConfigs` 返回的模型与配置的默认 `model`，上游配置异常时也能暴露配置模型。

## 许可证

MIT
