# dsh-plugin-devin-bridge

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that proxies [Devin Connect](https://codeium.com/) (`GetChatMessage` / `GetCascadeModelConfigs` RPC) behind an OpenAI Chat Completions compatible HTTP API. It lets any OpenAI-compatible client (openai-python, Continue, Cline, …) talk to Devin models such as `glm-5.2` and `swe-1.7` through your local Harness profile.

## What it does

- Registers `/v1/chat/completions` and `/v1/models` on the Harness built-in web server.
- Translates OpenAI Chat Completions requests into Devin Connect protobuf RPC calls.
- Streams Devin responses back as SSE chunks (`text/event-stream`) or returns a single non-streaming JSON response.
- Maps Devin thinking deltas to `reasoning_content` (DeepSeek-style extension).
- Supports tool calling (`tools` + `tool_choice`), system prompts, multi-turn history, and image inputs (base64 data URL) for vision-capable models.
- Only the **current round** of images is sent upstream; older images in history are replaced with `[Image omitted from history]` to avoid Devin rejecting the request.
- Sanitizes Codex `<permissions instructions>` blocks and Claude identity strings from system prompts so Devin's content policy does not reject the request.
- Optional `apiKey` protects the `/v1/*` endpoints with `Authorization: Bearer <key>`.
- Optional outbound proxy (`http://`, `https://`, `socks5://`, `socks5h://`) for environments that need it.

## Install

```sh
git clone https://github.com/Arborsm/dsh-plugin-devin-bridge.git
cd dsh-plugin-devin-bridge
pnpm install
pnpm run check          # typecheck + build
dsh plugin --profile devin add .
dsh --profile devin --dump-config | grep devin-bridge
dsh --profile devin
```

Then point your OpenAI client at the Harness web server:

```sh
export OPENAI_BASE_URL=http://127.0.0.1:<dsh-port>/v1
export OPENAI_API_KEY=<apiKey configured in cordis.patch.yml, or any value if apiKey is empty>
```

## Configuration

Edit `cordis.patch.yml` in the repository (or the copy installed in your profile) and fill in your Devin session token:

```yaml
- insert:
    - id: devin-bridge
      name: dsh-plugin-devin-bridge
      config:
        baseUrl: "https://server.codeium.com"
        token: "devin-session-token$..."   # required
        model: "glm-5-2"                    # default model uid
        proxy: ""                           # optional outbound proxy
        forceHttp1: true                    # force HTTP/1.1 to Devin
        apiKey: ""                          # optional /v1/* access key
```

| field       | required | description                                                                 |
|-------------|----------|-----------------------------------------------------------------------------|
| `baseUrl`   | yes      | Devin Connect endpoint, usually `https://server.codeium.com`.               |
| `token`     | yes      | Devin session token, format `devin-session-token$<...>`.                    |
| `model`     | no       | Default model uid when the request does not specify one. Defaults to `glm-5-2`. |
| `proxy`     | no       | Outbound proxy URL. Supports `http://`, `https://`, `socks5://`, `socks5h://`. |
| `forceHttp1`| no       | Force HTTP/1.1 to Devin. Defaults to `true`.                                |
| `apiKey`    | no       | Protect `/v1/*` with `Authorization: Bearer <apiKey>`. Empty = no auth.     |

## Usage

Once the profile is running, any OpenAI-compatible client works:

```python
from openai import OpenAI
client = OpenAI(
    base_url="http://127.0.0.1:<dsh-port>/v1",
    api_key="<apiKey or any value>",
)
resp = client.chat.completions.create(
    model="glm-5-2",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="")
```

List available models:

```sh
curl http://127.0.0.1:<dsh-port>/v1/models \
  -H "Authorization: Bearer <apiKey>"
```

## Project layout

```text
src/
  index.ts              # Cordis plugin entry (apply + Config schema)
  gateway.ts            # /v1/chat/completions + /v1/models routes, auth, errors
  adapter/
    transport.ts        # Connect transport, Basic auth header, proxy agent
    devin.ts            # RequestMessages -> Devin RPC (buildRequest + Stream + ListModels)
    decoder.ts          # GetChatMessageResponse frames -> ResponseEvent stream
  api/chat/
    decode.ts           # OpenAI Chat request JSON -> intermediate RequestMessages
    encode.ts           # ResponseEvent -> SSE chunks / non-streaming JSON
  llm/
    types.ts            # LLM-agnostic message/content/event types
    validate.ts         # request validation
  proto/
    devin.proto         # trimmed protobuf definitions
    gen/devin_pb.ts     # generated TypeScript bindings (protoc-gen-es v2)
cordis.patch.yml        # plugin registration + schemastery config
package.json            # dsh bundle manifest + dependencies
tsdown.config.ts        # build config
tsconfig.json           # typecheck config
```

## Build

```sh
pnpm install
pnpm run proto:gen       # regenerate src/proto/gen/devin_pb.ts from devin.proto
pnpm run typecheck       # tsc --noEmit
pnpm run build           # tsdown -> lib/index.js
```

`protoc` + `@bufbuild/protoc-gen-es` are required for `proto:gen`. The committed `src/proto/gen/devin_pb.ts` is checked in so end users do not need protoc to build the plugin.

## Compatibility notes

- Thinking content is emitted as `reasoning_content` on both streaming deltas and the final non-streaming message object (DeepSeek-style extension, not part of the official OpenAI spec).
- `tool_calls` are supported in both directions. Tool results must be sent back as `role: "tool"` messages with `tool_call_id`.
- HTTP(S) image URLs are not fetched; embed images as `data:image/...;base64,...` or raw base64 with an explicit `mime_type`.
- The `/v1/models` endpoint merges models advertised by Devin's `GetCascadeModelConfigs` with the configured default `model`, so a misconfigured upstream still exposes the configured model.

## License

MIT
