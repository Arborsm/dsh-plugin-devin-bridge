// dsh-plugin-devin-bridge 入口（dsh 0.2）。
// 注册 DevinAdapter 为 dsh LLM 的 `devin` provider route，
// 让 dsh 内部的 agent loop 能使用 Devin 的 glm-5.2 / swe-1.7 模型。
//
// Token 解析优先级：
//   1. settings 面板用户配置（token 字段，volatile 热更新）
//   2. composition entry config.token（显式配置）
//   3. Devin CLI credentials.toml（`devin auth login` 写入）
//   4. 环境变量 DEVIN_CREDENTIALS_PATH 指定的自定义路径
//
// dsh 0.2 起配置字段全部为 volatile：用户层写入直接提交到运行中的 fiber，
// 不触发 remount；adapter 每次操作都通过 thunk 读取最新快照。

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { isVolatile, type Volatile } from '@deepseek-ai/cosmokit'
import { RetryPolicySchema, type RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment'
import { DevinAdapter, type DevinAdapterOptions, type DevinCatalogModel, type DevinConnectionOptions } from './adapter/devin.ts'
import { readDevinSession, DEFAULT_API_SERVER_URL } from './adapter/credentials.ts'

export const name = 'dsh-plugin-devin-bridge'
export const inject = ['llm']

const PROVIDER = 'devin'

// ─── 默认模型 ───────────────────────────────────────────────────────────────

const DEFAULT_MODELS: DevinCatalogModel[] = [
  {
    id: 'swe-2',
    name: 'SWE-2',
    description: 'Devin-hosted SWE-2 coding model. Effort (high/medium/max) selectable via dsh reasoning slider.',
    contextWindow: 262_000,
    maxTokens: 262_000,
    supportsImages: true,
    family: 'SWE-2',
    creditMultiplier: 9,
  },
  {
    id: 'swe-2-flash',
    name: 'SWE-2 Flash',
    description: 'Devin-hosted SWE-2 Flash fast coding model. Effort (medium/high/max) selectable via dsh reasoning slider.',
    contextWindow: 262_144,
    maxTokens: 262_144,
    supportsImages: false,
    family: 'SWE-2 Flash',
    isPromo: true,
    creditMultiplier: 4,
  },
]

// ─── 配置 schema ────────────────────────────────────────────────────────────

/**
 * 用户可编辑的配置值（schema 解析后的 plain 形状）。
 * 运行时这些字段都是 volatile：Loader 传入的 config 里每个字段是
 * `Volatile<T>` 引用，`get()` 返回当前不可变快照。
 */
export interface DevinBridgeConfig {
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
  /** 重试策略；未配置时走 dsh 默认 normal 策略。 */
  retryPolicy?: RetryPolicyConfig
}

const catalogModel = z.object({
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

export const Config = z.object({
  token: z.string().role('secret').default('').volatile(),
  baseUrl: z.string().default(DEFAULT_API_SERVER_URL).volatile(),
  proxy: z.string().default('').volatile(),
  forceHttp1: z.boolean().default(true).volatile(),
  defaultContextWindow: z.number().step(1).min(1).default(128_000).volatile(),
  defaultMaxTokens: z.number().step(1).min(1).default(16_384).volatile(),
  models: z.array(catalogModel).default(DEFAULT_MODELS).volatile(),
  retryPolicy: RetryPolicySchema.volatile(),
})

/** Loader 传入的 config：volatile 字段是稳定引用而非裸值。 */
export type Config = {
  readonly [K in keyof DevinBridgeConfig]: DevinBridgeConfig[K] | Volatile<DevinBridgeConfig[K]>
}

/** 取 volatile 字段的当前快照；裸值（测试/直接构造）原样返回。 */
function readVolatile<T>(value: T | Volatile<T>): T | undefined {
  return (isVolatile(value) ? value.get() : value) as T | undefined
}

// ─── Token 解析 ─────────────────────────────────────────────────────────────

interface ResolvedConnection {
  token: string
  baseUrl: string
}

// ─── 插件入口 ───────────────────────────────────────────────────────────────

export function apply(ctx: Context, config: Config): void {
  // 本插件由客户端 card（settings.plugins.tab 里的 Devin tab）承担设置 UI，
  // 关闭自动生成页。
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  // volatile 字段的 settings namespace = loader entry id（cordis.patch.yml
  // 里的 `id: devin-bridge`）；可配置 provider 目录与模型发现按此键关联。
  const settingsNs = ctx.fiber.entry?.options.id ?? 'devin-bridge'

  // 当前配置快照：每次调用解析 volatile 引用，返回不可变 plain 值。
  const source = (): DevinBridgeConfig => ({
    token: readVolatile(config.token) ?? '',
    baseUrl: readVolatile(config.baseUrl) ?? DEFAULT_API_SERVER_URL,
    proxy: readVolatile(config.proxy) ?? '',
    forceHttp1: readVolatile(config.forceHttp1) ?? true,
    defaultContextWindow: readVolatile(config.defaultContextWindow) ?? 128_000,
    defaultMaxTokens: readVolatile(config.defaultMaxTokens) ?? 16_384,
    models: [...(readVolatile(config.models) ?? DEFAULT_MODELS)],
    retryPolicy: readVolatile(config.retryPolicy),
  })

  // attachment store（用于读取图片）— 在插件加载时获取一次
  const attachments = ctx.get('attachments')
  const readImage: ((ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>) | undefined =
    attachments
      ? (ref, signal) => attachments.readImage(ref, signal)
      : undefined

  // 缓存 token 解析结果：credentials.toml 只在配置变更时读一次，避免每请求读文件。
  // 找不到 token 时返回空串而非抛错 — providerRetryPolicy/listModels/resolveModel
  // 在注册与目录枚举时被立即调用，只有真正发起请求（client）才校验 token。
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
    const baseUrl = c.baseUrl === DEFAULT_API_SERVER_URL && session
      ? session.apiServerUrl
      : c.baseUrl
    const conn = { token: session?.apiKey ?? '', baseUrl }
    // 只缓存有 token 的结果：空结果每次都重查，
    // 让用户 `devin auth login` 或写 credentials 后立即生效
    if (conn.token) {
      cachedConn = conn
      cachedConnKey = key
    }
    return conn
  }

  // DevinAdapter 持有连接配置 thunk，每次操作时读取最新快照
  const adapter = new DevinAdapter({
    options: (): DevinConnectionOptions => {
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
        retryPolicy: c.retryPolicy,
        ...readImage ? { readImage } : {},
      }
    },
  } satisfies DevinAdapterOptions)

  // 注册 configurable provider 目录 + adapter route + model discovery
  ctx.llm.registerConfigurableProviders([
    {
      provider: PROVIDER,
      displayName: 'Devin',
      settingsNs,
      settingsPath: [],
      defaultBaseURL: DEFAULT_API_SERVER_URL,
    },
  ])
  const registration = ctx.llm.registerAdapter([PROVIDER], adapter)

  // providerRetryPolicy 只在注册生成时被 LlmRuntime 捕获一次：
  // volatile 配置变更时重新生成路由，让 retryPolicy 更新生效
  ctx.on('loader/volatile-update', () => {
    try {
      registration.replace([PROVIDER])
    } catch (error) {
      ctx.logger.error('devin-bridge: provider route refresh failed')
      ctx.logger.error(error)
    }
  })
  ctx.llm.registerModelDiscovery(settingsNs, (request, signal) =>
    // 一次性凭证（草稿 interrogation）优先于持久配置
    adapter.discoverModels(
      request.baseURL || request.apiKey
        ? { baseURL: request.baseURL, apiKey: request.apiKey }
        : undefined,
      signal,
    ),
  )
}

export { DevinAdapter } from './adapter/devin.ts'
export type { DevinCatalogModel, DevinAdapterOptions, DevinConnectionOptions } from './adapter/devin.ts'
export { readDevinSession, devinCredentialsPath, type DevinSession } from './adapter/credentials.ts'
