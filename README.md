# dsh-plugin-devin-bridge

[English](README.md) | [中文](README.zh.md)

A [dsh](https://github.com/deepseek-ai/deepseek-harness) LLM adapter plugin that bridges [Devin](https://devin.ai)'s Connect RPC API into the dsh model provider system, enabling dsh's internal agent loop to use Devin-hosted models (`glm-5.2`, `swe-1.7`, and any other model Devin exposes) as backends.

> **dsh 0.2+**: this release targets the dsh 0.2 plugin architecture (volatile config, `configForms`, Typert remotes, `plugins.bundle.config`). It requires `dsh >= 0.2.0-rc.1`; for dsh 0.1 hosts use the `0.1.x` line.

## How it works

The plugin registers a `devin` provider route on `ctx.llm` via the dsh LLM seam (`LlmAdapter`). When dsh's agent loop routes a request to `provider: devin`, the adapter:

1. Translates dsh's `GenerateOptions` (messages, tools, system prompt, images) into Devin's `GetChatMessageRequest` protobuf
2. Streams the response from Devin's Connect RPC endpoint
3. Decodes each `GetChatMessageResponse` frame into dsh's `StreamChunk` protocol (text deltas, reasoning deltas, tool-call deltas, usage, finish)

## Installation

```bash
pnpm add https://github.com/Arborsm/dsh-plugin-devin-bridge.git
```

## Token resolution

The adapter needs a Devin session token (format: `devin-session-token$<...>`) to authenticate. It resolves the token in priority order:

1. **Settings panel** — set `token` in the dsh settings UI (marked as secret, auto-redacted in wire responses)
2. **Entry config** — `config.token` in the plugin composition
3. **Devin CLI credentials** — automatically read from `credentials.toml` created by `devin auth login`:
   - Windows: `%APPDATA%\devin\credentials.toml`
   - macOS/Linux: `~/.local/share/devin/credentials.toml` (or `$XDG_DATA_HOME/devin/credentials.toml`)
   - Override path with `DEVIN_CREDENTIALS_PATH` environment variable

If no token is found, the plugin throws at startup with a actionable error message.

## Configuration

All fields are optional — the plugin works out of the box once a token is available (via settings panel, entry config, or credentials.toml).

```yaml
- id: devin-bridge
  name: dsh-plugin-devin-bridge
  config:
    token: ""  # optional: explicit token; empty = auto-detect from credentials.toml
    baseUrl: "https://server.codeium.com"  # optional: Devin Connect endpoint
    proxy: ""  # optional: outbound proxy URL (http/https/socks5)
    forceHttp1: true  # optional: force HTTP/1.1 (default true)
    defaultContextWindow: 128000  # optional: fallback context window
    defaultMaxTokens: 128000  # optional: fallback max output tokens
    models:  # optional; defaults to swe-2 and swe-2-flash
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
    retryPolicy:  # optional
      mode: normal
      maxRetries: 3
      backoff:
        initialDelayMs: 500
        maxDelayMs: 10000
        jitterRatio: 0.1
    rateLimitReminder: true  # optional: reset reminder (on by default)
    rateLimitReminderLeadMinutes: 5  # optional: lead time in minutes; 0 = only at reset
    rateLimitAutoResume: false  # optional: resume after the reset instant (off by default)
    rateLimitMaxResumeAttempts: 3  # optional: cap on automatic resume attempts
    rateLimitNotifyUrl: ""  # optional: webhook POSTing a JSON notice; empty = Host log only
```

When the dsh settings service is available, all of the above can be adjusted at runtime in the **Devin Bridge** card on the plugin's detail page (Plugins → dsh-plugin-devin-bridge) — every field is `volatile`, so writes land on the running plugin without a remount. The `token` field is marked `role('secret')` so it is automatically redacted in settings descriptors returned to wire surfaces.

The plugin's settings namespace equals its composition entry id (`devin-bridge` in `cordis.patch.yml`); if you compose the plugin under a different entry id, that id becomes the namespace.

## Rate-limit reminder and auto-resume

When a free model hits its limit, upstream returns:

```text
[resource_exhausted] Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).
```

The plugin parses both the **relative duration** (1 hour 48 minutes) and the **absolute clock** (21:01 UTC), preferring the clock (three same-day candidates, disambiguated by the duration), then renders the reset instant in local time:

| Field | Example |
| --- | --- |
| Failure code | `resource_exhausted` |
| Original text | Preserved verbatim |
| Reset (UTC) | `2026-11-14 21:01:00 UTC` |
| Reset (local) | `2026-11-15 05:01:00 UTC+8` (Asia/Shanghai) |

**Reminder**: by default one heads-up 5 minutes before the reset and one "you can run again" notice at the reset instant, carrying the failure code, both reset times, and the original text. Channels degrade gracefully: Host log (default) → optional webhook; the settings "限流提醒" card shows the failure code, both reset times, and the remaining wait. Set `rateLimitReminder: false` to mute notifications (the reset time still shows in settings).

**Auto-resume** (off by default, three ways to enable):

1. Settings → Devin → the "限流提醒" card → "开启自动继续" while a limit is pending;
2. `rateLimitAutoResume: true` in config;
3. Programmatically via `remote.devin.enableRateLimitAutoResume()`.

Once enabled, an attempt that is rate-limited before emitting any chunk waits for the reset instant and replays the same request. If the instant already passed (or upstream gave no parseable time) it backs off exponentially (5s initial, 60s cap, ±10% jitter) up to `rateLimitMaxResumeAttempts` times. Attempts that already emitted text, reasoning, or tool calls are never replayed — the reminder is recorded and the rate-limit error is rethrown unchanged, so two answers never merge into one message.

Manual control: `remote.devin.cancelRateLimit()` cancels a pending reminder/wait, `remote.devin.disableRateLimitAutoResume()` turns auto-resume off, and `remote.devin.rateLimit()` returns the current state (`active`/`resetAtUtc`/`resetAtLocal`/`remainingMs`).

### Verifying the reminder

```bash
# Reproduce this failure with a fixed clock: 19:13 UTC, reset "in 1h48m (at 21:01 UTC)"
node scripts/rate-limit-probe.ts --at 2026-11-14T19:13:00Z
```

The output prints the reset instant in UTC and local time (2026-11-15 05:01:00 UTC+8 for Asia/Shanghai) plus the local times of the heads-up and reset notices. Actual firing is covered by the fake-clock case "到点前发预告、到点发「可以重新运行」提醒" in `test/rate-limit.test.ts`.

## Usage

Once configured, dsh's model selector will show `Devin` as a provider with available models. Select any model in the dsh UI or route to it programmatically with `provider: devin`.

## Features

- **Dynamic model catalog**: Fetches the live model list from Devin via `GetCascadeModelConfigs` RPC, reading `model_family_metadata` to group reasoning-effort tiers (`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`) under one base model and to detect fast-mode variants, promo flags, premium flags, credit multipliers, and image support.
- **Reasoning effort slider**: The adapter exposes dsh's `reasoning.efforts` on each model and resolves the selected effort to a concrete Devin `model_uid` via the catalog tier table (with a suffix-mapping fallback when catalog metadata is unavailable).
- **Text streaming**: Full text delta streaming with indexed block assembly
- **Reasoning/thinking**: Reasoning content mapped to dsh's `reasoning` block type; thinking signatures are round-tripped through `finish.replayState` so assistant history replays with valid signatures.
- **Tool calls**: Devin tool-call deltas translated to dsh's `tool-call` blocks; tool schemas are stripped of natural-language annotations and the true descriptions are injected into the system prompt (upstream treats the wire `description` field as a routing hint).
- **Image support**: Vision-capable models accept image inputs via dsh's attachment system. Following the upstream contract, images are attached only to the current turn (after the last assistant message); historical images degrade to text placeholders.
- **Token usage**: Input/output/cache token accounting reported to dsh
- **Rate-limit reminder and auto-resume**: Parses the relative duration and UTC clock out of `[resource_exhausted]` failures, converts them to local time for a reset reminder, and can optionally resume after the reset instant with bounded backoff (off by default; can be toggled and cancelled)
- **System prompt sanitization**: Identity-agnostic system prompt rewriting for cross-model compatibility
- **Proxy support**: Optional outbound HTTP/HTTPS/SOCKS5 proxy
- **Volatile settings**: Runtime-adjustable configuration via the Plugins settings page; writes apply live
- **Credential auto-detection**: Reads `devin auth login` credentials when no explicit token is configured

## Architecture

```
src/
├── index.ts              # Cordis plugin entry: volatile Config schema, provider/adapter/discovery registration
├── client/               # Browser half: plugins.bundle.config card on the bundle detail page (configForms + remote.llm)
├── adapter/
│   ├── devin.ts          # DevinAdapter: GenerateOptions → Devin RPC → StreamChunk
│   ├── decoder.ts        # GetChatMessageResponse → StreamChunk translation
│   ├── rate-limit.ts     # Parse relative duration + UTC clock into a local reset instant
│   ├── rate-limit-watch.ts   # Reset reminders, backoff waits, status snapshot
│   ├── rate-limit-observe.ts # Global llm/stream rate-limit fallback and auto-resume
│   ├── rate-limit-notify.ts  # Optional webhook notification channel
│   ├── transport.ts      # Connect transport with auth + proxy injection
│   └── credentials.ts    # Devin CLI credentials.toml auto-detection
└── proto/
    ├── devin.proto       # Trimmed protobuf definitions
    └── gen/              # @bufbuild/protobuf generated code
```

## License

MIT
