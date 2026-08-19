// dsh-plugin-devin-bridge 入口。
// 注册 DevinAdapter 为 dsh LLM 的 `devin` provider route，
// 让 dsh 内部的 agent loop 能使用 Devin 的 glm-5.2 / swe-1.7 模型。
//
// Token 解析优先级：
//   1. settings 面板用户配置（token 字段）
//   2. composition entry config.token（显式配置）
//   3. Devin CLI credentials.toml（`devin auth login` 写入）
//   4. 环境变量 DEVIN_CREDENTIALS_PATH 指定的自定义路径
//
// 当 settings 服务存在时，所有连接事实（token / baseUrl / proxy / retryPolicy 等）
// 通过 settings 面板动态可调，变更即时生效（`live` applies）。

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  resolveRetryPolicy,
  RetryPolicySchema,
  type RetryPolicyConfig,
  type ResolvedRetryPolicy,
} from '@deepseek-ai/dsh-llm'
import { installSettingsSection, settingsNamespace, type SettingsSectionHooks } from '@deepseek-ai/dsh-settings'
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment'
import { DevinAdapter, type DevinCatalogModel } from './adapter/devin.ts'
import { readDevinSession, DEFAULT_API_SERVER_URL } from './adapter/credentials.ts'

export const name = 'dsh-plugin-devin-bridge'
export const inject = ['llm']

const PROVIDER = 'devin'
const SETTINGS_NS = settingsNamespace(name)

// ─── 默认模型 ───────────────────────────────────────────────────────────────

const DEFAULT_MODELS: DevinCatalogModel[] = [
  {
    id: 'glm-5-2',
    name: 'GLM-5.2',
    description: 'Devin-hosted GLM-5.2 reasoning model. Effort (high/medium/max/none) selectable via dsh reasoning slider.',
    contextWindow: 200_000,
    maxTokens: 200_000,
    supportsImages: false,
    family: 'GLM-5.2',
    isPromo: true,
    creditMultiplier: 1.5,
  },
  {
    id: 'swe-1-7',
    name: 'SWE-1.7',
    description: 'Devin-hosted SWE-1.7 coding model (Kimi K2.7 Code base). Effort (high/medium/max/none) selectable via dsh reasoning slider.',
    contextWindow: 262_000,
    maxTokens: 262_000,
    supportsImages: true,
    family: 'SWE-1.7',
    creditMultiplier: 9,
  },
]

// ─── 配置 schema ────────────────────────────────────────────────────────────

export interface Config {
  /**
   * Devin session token，格式 devin-session-token$<...>。
   * 留空时自动从 Devin CLI 的 credentials.toml 读取（`devin auth login` 写入）。
   */
  token: string
  /** Devin Connect 端点，默认 https://server.codeium.com。 */
  baseUrl: string
  /** 可选出站代理 URL（http/https/socks5）。 */
  proxy: string
  /** 强制 HTTP/1.1 连接 Devin，默认 true。 */
  forceHttp1: boolean
  /** 默认上下文窗口，默认 128000。 */
  defaultContextWindow: number
  /** 默认最大输出 token，默认 16384。 */
  defaultMaxTokens: number
  /** 可用模型列表。 */
  models: DevinCatalogModel[]
  /** 重试策略。 */
  retryPolicy: RetryPolicyConfig
}

const catalogModel: z<DevinCatalogModel> = z.object({
  id: z.string().required(),
  name: z.string(),
  description: z.string(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
  supportsImages: z.boolean(),
  family: z.string(),
  isPremium: z.boolean(),
  isPromo: z.boolean(),
  creditMultiplier: z.number().step(0.01),
})

export const Config: z<Config> = z.object({
  token: z.string().role('secret').default(''),
  baseUrl: z.string().default('https://server.codeium.com'),
  proxy: z.string().default(''),
  forceHttp1: z.boolean().default(true),
  defaultContextWindow: z.number().step(1).min(1).default(128_000),
  defaultMaxTokens: z.number().step(1).min(1).default(16_384),
  models: z.array(catalogModel).default(DEFAULT_MODELS),
  retryPolicy: RetryPolicySchema,
})

// ─── Token 解析 ─────────────────────────────────────────────────────────────

interface ResolvedConnection {
  token: string
  baseUrl: string
}

// ─── 插件入口 ───────────────────────────────────────────────────────────────

export function apply(ctx: Context, config: Config): void {
  // attachment store（用于读取图片）— 在插件加载时获取一次
  const attachments = ctx.get('attachments')
  const readImage: ((ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>) | undefined =
    attachments
      ? (ref, signal) => attachments.readImage(ref, signal)
      : undefined

  // 当前权威配置源 — settings 服务存在时指向 resolved scope，否则指向 entry config
  let current: Config = config
  const source: () => Config = () => current

  // 缓存 token 解析结果：credentials.toml 只在配置变更时读一次，避免每请求读文件
  let cachedConn: ResolvedConnection | null = null
  let cachedConnKey = ''
  const resolveConn = (): ResolvedConnection => {
    const c = source()
    // token 非空时直接用，不缓存（settings 可能动态改 token）
    if (c.token) return { token: c.token, baseUrl: c.baseUrl }
    // token 为空时从 credentials.toml 读取，按 baseUrl 缓存
    const key = c.baseUrl
    if (cachedConn !== null && cachedConnKey === key) return cachedConn
    const session = readDevinSession()
    if (session) {
      const baseUrl = c.baseUrl === DEFAULT_API_SERVER_URL
        ? session.apiServerUrl
        : c.baseUrl
      cachedConn = { token: session.apiKey, baseUrl }
      cachedConnKey = key
      return cachedConn
    }
    // 每次都抛 — 不缓存错误，让用户配置 token 后立即生效
    const hint = process.platform === 'win32'
      ? '%APPDATA%\\devin\\credentials.toml'
      : '~/.local/share/devin/credentials.toml'
    throw new Error(
      `devin-bridge: no Devin session token found. Either:\n` +
      `  1. Set token in the settings panel to a "devin-session-token$..." value, or\n` +
      `  2. Run "devin auth login" to create ${hint}, or\n` +
      `  3. Set DEVIN_CREDENTIALS_PATH to a custom credentials.toml path`,
    )
  }

  // DevinAdapter 持有连接配置 thunk，每次操作时读取最新值
  const adapter = new DevinAdapter({
    options: () => {
      const c = source()
      const { token, baseUrl } = resolveConn()
      return {
        token,
        baseUrl,
        proxy: c.proxy || undefined,
        forceHttp1: c.forceHttp1,
        models: c.models,
        defaultContextWindow: c.defaultContextWindow,
        defaultMaxTokens: c.defaultMaxTokens,
        ...readImage ? { readImage } : {},
      }
    },
  })

  // 注册 configurable provider 目录 + adapter route + model discovery
  // registration handle 在重新注册时先释放旧的
  let directoryHandle: (() => void) | null = null
  let adapterHandle: ((() => void) & { replace?: (p: string[]) => void }) | null = null
  let discoveryHandle: (() => void) | null = null

  const register = (): void => {
    // 解析当前 retryPolicy — 注册时捕获，变更需重新注册
    const retryPolicy: ResolvedRetryPolicy = resolveRetryPolicy(
      source().retryPolicy,
      `llm: provider "${PROVIDER}" retryPolicy`,
    )
    // 覆盖 adapter 的 providerRetryPolicy，让注册时捕获最新策略
    ;(adapter as unknown as {
      providerRetryPolicy: (_provider: string) => ResolvedRetryPolicy | undefined
    }).providerRetryPolicy = () => retryPolicy

    if (!directoryHandle) {
      directoryHandle = ctx.llm.registerConfigurableProviders([
        { provider: PROVIDER, displayName: 'Devin', settingsNs: SETTINGS_NS, settingsPath: [] },
      ])
    }
    if (!adapterHandle) {
      adapterHandle = ctx.llm.registerAdapter([PROVIDER], adapter) as never
    }
    if (!discoveryHandle) {
      discoveryHandle = ctx.llm.registerModelDiscovery(SETTINGS_NS, (request) =>
        adapter.discoverModels(request.signal),
      )
    }
  }

  const unregister = (): void => {
    if (discoveryHandle) {
      try { discoveryHandle() } catch { /* already disposed */ }
      discoveryHandle = null
    }
    if (adapterHandle) {
      try { adapterHandle() } catch { /* already disposed */ }
      adapterHandle = null
    }
    if (directoryHandle) {
      try { directoryHandle() } catch { /* already disposed */ }
      directoryHandle = null
    }
  }

  // settings 面板接入：settings 服务存在时，配置通过面板动态可调
  const hooks: SettingsSectionHooks<Config> = {
    setSource(thunk: () => Config): void {
      current = thunk()
    },
    onChange(): void {
      // 重新注册以捕获最新的 retryPolicy
      unregister()
      register()
    },
  }

  installSettingsSection(ctx, SETTINGS_NS, Config, config, hooks)

  // 即使没有 settings 服务，也要注册一次（fallback 到 entry config）
  register()

  // 插件卸载时清理
  ctx.effect(() => () => unregister())
}

export { DevinAdapter } from './adapter/devin.ts'
export type { DevinCatalogModel, DevinAdapterOptions, DevinConnectionOptions } from './adapter/devin.ts'
export { readDevinSession, devinCredentialsPath, type DevinSession } from './adapter/credentials.ts'
