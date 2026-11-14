// Devin Connect 适配器：dsh GenerateOptions → Devin RPC → StreamChunk。
// 实现 dsh-llm 0.2 的 LlmAdapter 接口，注册为 `devin` provider route。
//
// Devin Connect 协议要点：
//   - GetChatMessage metadata.os = 'mac'，GetCascadeModelConfigs = 'win'
//   - tool definition 的 description 回填工具名（上游把它当分类提示），
//     真正的工具说明经 system prompt 的 <tool> 段注入
//   - 图片只挂「当前轮」（最后一条 assistant 之后的 user/tool 消息），
//     历史图降级为文本占位，否则上游 invalid_argument
//   - assistant 历史带 thinking + signature（从 replayState 恢复）

import { createClient } from '@connectrpc/connect'
import { create } from '@bufbuild/protobuf'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  LlmAdapter,
  LlmError,
  ReasoningEffortId,
  offloadedImageText,
  resolveRetryPolicy,
  type ContentBlock,
  type GenerateOptions,
  type LlmDiscoveredModel,
  type LlmModelInfo,
  type LlmProviderInfo,
  type LlmResolvedModelInfo,
  type PreparedAdapterCall,
  type ReplayEnvelope,
  type RequestMessage,
  type ResolvedRetryPolicy,
  type RetryPolicyConfig,
  type StreamChunk,
  type ToolSchema,
} from '@deepseek-ai/dsh-llm'
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment'
import {
  ApiServerService,
  ChatMessageRequestType,
  ExaChatPb_ChatMessagePromptSchema,
  ExaChatPb_ChatToolDefinitionSchema,
  ExaCodeiumCommonPb_ChatMessageSource,
  ExaCodeiumCommonPb_ChatToolCallSchema,
  ExaCodeiumCommonPb_CompletionConfigurationSchema,
  ExaCodeiumCommonPb_ImageDataSchema,
  ExaCodeiumCommonPb_ConversationalPlannerMode,
  ExaCodeiumCommonPb_MetadataSchema,
  ExaCortexPb_CortexStepType,
  ExaCortexPb_CortexTrajectoryReferenceSchema,
  ExaCortexPb_CortexTrajectoryType,
  GetCascadeModelConfigsRequestSchema,
  GetChatMessageRequestSchema,
} from '../proto/gen/devin_pb.ts'
import type {
  ExaChatPb_ChatMessagePrompt,
  ExaChatPb_ChatToolDefinition,
  GetChatMessageRequest,
} from '../proto/gen/devin_pb.ts'
import { createDevinTransport } from './transport.ts'
import { DevinStreamDecoder, wrapConnectError } from './decoder.ts'
import { findRateLimitFailure, originalMessage } from './rate-limit.ts'
import type { RateLimitWatcher } from './rate-limit-watch.ts'

const CLIENT_NAME = 'chisel'
const CLIENT_VERSION = '3000.2.17'

/**
 * 输出 token 上限。catalog 的 `maxTokens` 字段实际是 context window（262k），
 * 不是输出上限；请求侧以此为天花板，更小值照常放行。
 */
const MAX_OUTPUT_TOKENS = 128_000

// ─── 配置类型 ───────────────────────────────────────────────────────────────

export interface DevinCatalogModel {
  id: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  supportsImages?: boolean
  /** 模型系列标签（如 "GLM-5.2", "SWE-1.7"），从 model_family_metadata 提取。 */
  family?: string
  /** family metadata 中的推理档位名（小写，如 "high"/"max"/"none"）。 */
  effort?: string
  /** family metadata "fast mode" 标记；lightning 变体不参与档位解析。 */
  fastMode?: boolean
  /** 是否该 family 的默认档位（is_default_model_in_family）。 */
  isDefaultInFamily?: boolean
  /** family 档位表：effort id → 上游真实 model_uid（采纳时持久化）。 */
  tiers?: Record<string, string>
  /** family 默认档位的 effort id（如 "high"）；dsh 滑块默认值。 */
  defaultEffort?: string
  /** 是否需要付费 plan。 */
  isPremium?: boolean
  /** 是否当前处于促销期（promo_status.is_active）。 */
  isPromo?: boolean
  /** 信用倍率，用于排序和展示。 */
  creditMultiplier?: number
}

export interface DevinConnectionOptions {
  baseUrl: string
  /** 会话 token；空串表示未配置（元数据路径照常工作，发起请求时抛 AUTH）。 */
  token: string
  proxy?: string
  forceHttp1: boolean
  models: readonly DevinCatalogModel[]
  /** 设置页关掉的模型 id；picker 不显示，解析/调用不受影响。 */
  hiddenModels?: readonly string[]
  defaultContextWindow: number
  defaultMaxTokens: number
  retryPolicy?: RetryPolicyConfig
  /** 可选的 attachment 读取器，用于获取图片字节 */
  readImage?: (ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>
}

export interface DevinAdapterOptions {
  /** 当前连接配置；每次操作时调用以获取最新快照。 */
  options: () => DevinConnectionOptions
  /** 可选：限流到点提醒 / 自动继续；缺省时把限流当普通失败抛出。 */
  rateLimit?: RateLimitWatcher
}

// ─── DevinAdapter ───────────────────────────────────────────────────────────

const PROVIDER = 'devin'

// ─── Reasoning effort → model_uid 映射 ──────────────────────────────────────
//
// Devin 的 model_uid 已包含 effort（glm-5-2=High, glm-5-2-max=Max,
// glm-5-2-none=No Thinking, swe-1-7=Max, swe-1-7-medium=Medium）。
// 插件对外只暴露基础 model id（glm-5-2, swe-1-7），通过 dsh 的 reasoning
// effort 滑块在内部映射到实际 model_uid：
//   1) 优先按目录的 family metadata 档位表（effort 名 → uid）解析
//   2) 目录缺失时回退到内置后缀映射

/** dsh effort id → Devin model_uid 候选后缀（目录不可用时的回退，按序尝试）。 */
const EFFORT_SUFFIX: Record<string, readonly string[]> = {
  none: ['-none'],
  minimal: ['-minimal'],
  low: ['-low'],
  medium: ['-medium'],
  high: ['', '-high'],       // glm-5-2=High / swe-2-high
  xhigh: ['-xhigh'],
  max: ['-max'],
}

/** dsh reasoning effort 列表（目录不可用时展示的全部滑块档位）。 */
const REASONING_EFFORTS = [
  { id: ReasoningEffortId('none'), name: 'No Thinking' },
  { id: ReasoningEffortId('minimal'), name: 'Minimal' },
  { id: ReasoningEffortId('low'), name: 'Low' },
  { id: ReasoningEffortId('medium'), name: 'Medium' },
  { id: ReasoningEffortId('high'), name: 'High' },
  { id: ReasoningEffortId('xhigh'), name: 'Extra High' },
  { id: ReasoningEffortId('max'), name: 'Max' },
] as const

/** 规范化 catalog effort 名到 dsh effort id（"No Thinking" → "none"）。 */
function normalizeEffortName(name: string): string {
  const lower = name.trim().toLowerCase()
  return lower === 'no thinking' ? 'none' : lower
}

/** 从目录构建 family → effort id → model_uid 的档位表（跳过 fast mode 变体）。 */
function familyTiers(models: readonly DevinCatalogModel[]): Map<string, Map<string, string>> {
  const tiers = new Map<string, Map<string, string>>()
  for (const m of models) {
    if (!m.family || !m.effort || m.fastMode) continue
    const effort = normalizeEffortName(m.effort)
    let tier = tiers.get(m.family)
    if (!tier) {
      tier = new Map()
      tiers.set(m.family, tier)
    }
    if (!tier.has(effort)) tier.set(effort, m.id)
  }
  return tiers
}

/**
 * 把动态目录按 family 合并：每个 family 取一个代表成员（默认档 > promo > 首个），
 * 并汇总成员档位表（effort id → uid，跳过 fast mode 变体）。
 */
function mergeFamilies(models: readonly DevinCatalogModel[]): {
  member: DevinCatalogModel
  tiers: Record<string, string>
  defaultEffort?: string
}[] {
  const byFamily = new Map<string, DevinCatalogModel[]>()
  for (const m of models) {
    const fam = m.family ?? m.id
    const list = byFamily.get(fam) ?? []
    list.push(m)
    byFamily.set(fam, list)
  }
  return [...byFamily.values()].map((members) => {
    const tiers: Record<string, string> = {}
    for (const m of members) {
      if (!m.effort || m.fastMode) continue
      const e = normalizeEffortName(m.effort)
      if (!tiers[e]) tiers[e] = m.id
    }
    const member = members.find((m) => m.isDefaultInFamily && !m.fastMode)
      ?? members.find((m) => m.isPromo && !m.fastMode)
      ?? members.find((m) => !m.fastMode)
      ?? members[0]!
    return {
      member,
      tiers,
      ...member.effort ? { defaultEffort: normalizeEffortName(member.effort) } : {},
    }
  })
}

/**
 * 把 base model id + reasoningEffort 映射到 Devin 实际 model_uid。
 * 如 swe-2 + max → swe-2-max，swe-1-7 + medium → swe-1-7-medium。
 * 优先用采纳时持久化的 tiers 表（effort id → uid），其次 family 成员档位表，
 * 最后回退内置后缀映射；都不命中用 base id。
 */
function resolveModelUid(baseId: string, effort: string | undefined, models: readonly DevinCatalogModel[]): string {
  // options.model 理论上是不带 provider 前缀的裸 id；防御性剥掉 "xxx/" 前缀，
  // 避免路由形态变化时把 "devin/swe-2-high" 原样发给上游。
  const bareId = baseId.includes('/') ? baseId.slice(baseId.lastIndexOf('/') + 1) : baseId
  const configured = models.find((m) => m.id === bareId)
  // 兼容旧版采纳的档位 uid 条目（如 swe-2-high 作为模型 id 存进配置）。
  const legacy = configured ?? models.find((m) => toBaseModelId(m.id) === bareId)
  if (effort) {
    const e = normalizeEffortName(effort)
    const tierUid = configured?.tiers?.[e]
      ?? (legacy?.family ? familyTiers(models).get(legacy.family)?.get(e) : undefined)
      ?? EFFORT_SUFFIX[e]?.map((suffix) => `${bareId}${suffix}`).find((id) => models.some((m) => m.id === id))
    if (tierUid) return tierUid
  }
  // base id 非真实 uid（如 swe-2 只有 swe-2-high/medium/max 档位）：
  // 落回持久化档位的默认档 / family 默认档 / 裸 id。
  if (configured?.tiers) {
    return configured.tiers[configured.defaultEffort ?? 'high']
      ?? configured.tiers['high']
      ?? Object.values(configured.tiers)[0]!
  }
  if (models.some((m) => m.id === bareId)) return bareId
  if (legacy?.family) {
    const def = models.find((m) => m.family === legacy.family && m.isDefaultInFamily && !m.fastMode)
    if (def) return def.id
  }
  return bareId
}

/**
 * family 默认成员的 uid 减去自身 effort 后缀得到对外暴露的 base model id。
 * 如 swe-2-high（effort=high）→ swe-2；swe-1-7（effort=max，无后缀）→ swe-1-7。
 */
function familyBaseId(member: DevinCatalogModel): string {
  let id = member.id
  if (member.effort) {
    const suffix = `-${normalizeEffortName(member.effort)}`
    if (id.toLowerCase().endsWith(suffix)) id = id.slice(0, -suffix.length)
  }
  return id.replace(/-1m$/i, '')
}

/** 从 label 解析 effort 标签（如 "GLM-5.2 High" → "High"），目录缺 family metadata 时回退。 */
function parseEffortFromLabel(label: string): string | undefined {
  const match = label.match(/\b(Max|High|Medium|Low|No Thinking|Lightning)\b/i)
  return match?.[0]
}

/**
 * 把 model_uid 去掉 effort 后缀，得到 base model id。
 * 如 glm-5-2-max → glm-5-2, swe-1-7-medium → swe-1-7, glm-5-2-none-1m → glm-5-2。
 */
function toBaseModelId(uid: string): string {
  return uid
    .replace(/-1m$/i, '')
    .replace(/-none$/i, '')
    .replace(/-max$/i, '')
    .replace(/-medium$/i, '')
    .replace(/-low$/i, '')
    .replace(/-lightning$/i, '')
}

/** 格式化 discovered model 的显示名，带 family/effort/free 标记。 */
function formatDiscoveredName(m: DevinCatalogModel): string {
  const parts: string[] = []
  if (m.name) parts.push(m.name)
  if (m.isPromo) parts.push('[Promo]')
  else if (m.isPremium) parts.push('[Premium]')
  if (m.creditMultiplier && m.creditMultiplier > 0) parts.push(`(${m.creditMultiplier}x)`)
  return parts.join(' ')
}

export class DevinAdapter extends LlmAdapter {
  private readonly config: DevinAdapterOptions
  /** 限流到点提醒与自动继续的运行时（可选）。 */
  private readonly rateLimit: RateLimitWatcher | undefined
  // transport/client 缓存：配置变更时重建
  private cachedClient: ReturnType<typeof createClient<typeof ApiServerService>> | null = null
  private cachedClientKey = ''
  private catalogCache: { key: string; at: number; models: DevinCatalogModel[] } | null = null

  constructor(options: DevinAdapterOptions) {
    super()
    this.config = options
    this.rateLimit = options.rateLimit
  }

  /** 当前连接配置（每次调用读取最新快照）。 */
  private conn(): DevinConnectionOptions {
    return this.config.options()
  }

  /** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
  private client(c: DevinConnectionOptions): ReturnType<typeof createClient<typeof ApiServerService>> {
    if (!c.token) {
      const hint = process.platform === 'win32'
        ? '%APPDATA%\\devin\\credentials.toml'
        : '~/.local/share/devin/credentials.toml'
      throw new LlmError(
        `devin-bridge: no Devin session token found. Either:\n` +
        `  1. Set token in the settings panel to a "devin-session-token$..." value, or\n` +
        `  2. Run "devin auth login" to create ${hint}, or\n` +
        `  3. Set DEVIN_CREDENTIALS_PATH to a custom credentials.toml path`,
        'MISSING_CREDENTIAL',
      )
    }
    const key = `${c.baseUrl}\0${c.token}\0${c.proxy ?? ''}\0${c.forceHttp1}`
    if (this.cachedClient !== null && this.cachedClientKey === key) {
      return this.cachedClient
    }
    const transport = createDevinTransport({
      baseUrl: c.baseUrl,
      token: c.token,
      proxy: c.proxy,
      forceHttp1: c.forceHttp1,
    })
    this.cachedClient = createClient(ApiServerService, transport)
    this.cachedClientKey = key
    return this.cachedClient
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Devin' }
  }

  override providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined {
    return resolveRetryPolicy(this.conn().retryPolicy, `llm: provider "${provider}" retryPolicy`)
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const conn = this.conn()
    const hidden = new Set(conn.hiddenModels ?? [])
    return conn.models.filter((m) => !hidden.has(m.id)).map((m) => ({
      provider,
      id: m.id,
      name: m.name ?? m.id,
      ...m.description ? { description: m.description } : {},
      inputModalities: m.supportsImages ? ['text' as const, 'image' as const] : ['text' as const],
    }))
  }

  override async resolveModel(
    provider: string,
    model: string,
    _signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    return this.modelInfo(this.conn(), provider, model)
  }

  /** 一次 adapter 生成（连接配置快照）下的 model metadata。 */
  private modelInfo(c: DevinConnectionOptions, provider: string, model: string): LlmResolvedModelInfo {
    const configured = c.models.find((m) => m.id === model)
    const contextWindow = configured?.contextWindow ?? c.defaultContextWindow
    // 优先用采纳时持久化的 tiers；其次按 family 成员推；缺目录信息给全部四个档位
    const tierSet = configured?.tiers
      ? new Set(Object.keys(configured.tiers))
      : configured?.family
        ? familyTiers(c.models).get(configured.family)
        : undefined
    const efforts = tierSet && tierSet.size > 0
      ? REASONING_EFFORTS.filter((e) => tierSet.has(e.id as unknown as string))
      : REASONING_EFFORTS
    return {
      provider,
      id: model,
      name: configured?.name ?? model,
      ...configured?.description ? { description: configured.description } : {},
      inputModalities: configured?.supportsImages ? ['text' as const, 'image' as const] : ['text' as const],
      context: { contextWindow },
      defaultMaxTokens: Math.min(configured?.maxTokens ?? c.defaultMaxTokens, MAX_OUTPUT_TOKENS),
      // 暴露 effort 滑块给 dsh；插件内部在 stream 时映射到实际 model_uid
      reasoning: {
        efforts,
        defaultEffort: ReasoningEffortId(configured?.defaultEffort ?? 'high'),
      },
    }
  }

  /**
   * 绑定 model metadata 与 dispatch 到同一配置快照：
   * settings 在 prepare 与 stream 之间变更不会把两代配置混进一次调用。
   */
  override async prepareCall(provider: string, model: string, _signal?: AbortSignal): Promise<PreparedAdapterCall> {
    const c = this.conn()
    return {
      model: this.modelInfo(c, provider, model),
      stream: (options) => this.streamWithConn(options, c),
    }
  }

  // ─── 模型发现（供设置页 "Fetch available models" 使用）─────────────────────

  /**
   * 从 Devin 服务器拉取可用模型列表，供设置页的
   * "Fetch available models" 按钮调用。
   *
   * 同 family 的多个 effort 变体合并为一个基础模型（取 family default），
   * effort 走 dsh 的 reasoning effort 滑块控制，插件内部映射到实际 model_uid。
   */
  /**
   * @param draft - 可选的一次性端点/凭证（设置页草稿 interrogation），
   *   给出时覆盖持久配置；harness 不会存储这些值。
   */
  async discoverModels(
    draft?: { baseURL?: string; apiKey?: string },
    signal?: AbortSignal,
  ): Promise<LlmDiscoveredModel[]> {
    const c = this.conn()
    const conn: DevinConnectionOptions = draft && (draft.baseURL || draft.apiKey)
      ? { ...c, baseUrl: draft.baseURL ?? c.baseUrl, token: draft.apiKey ?? c.token }
      : c
    const dynamic = await this.fetchModelCatalog(conn, signal)
    return mergeFamilies(dynamic).map(({ member: m }) => ({
      // 对外暴露 base id + family 名；effort 走 dsh 滑块
      id: familyBaseId(m),
      name: formatDiscoveredName(m.family ? { ...m, name: m.family } : m),
      ...m.contextWindow ? { contextWindow: m.contextWindow } : {},
      ...m.maxTokens ? { maxTokens: m.maxTokens } : {},
      inputModalities: m.supportsImages ? ['text' as const, 'image' as const] : ['text' as const],
    }))
  }

  /**
   * 供 remote.devin 使用：family 合并后的完整目录条目，
   * 带 tiers（effort→uid）与 defaultEffort，供设置页采纳进配置。
   */
  async catalog(signal?: AbortSignal): Promise<DevinCatalogModel[]> {
    const dynamic = await this.fetchModelCatalog(this.conn(), signal)
    return mergeFamilies(dynamic).map(({ member: m, tiers, defaultEffort }) => ({
      id: familyBaseId(m),
      name: m.family ?? m.name ?? m.id,
      ...m.description ? { description: m.description } : {},
      ...m.contextWindow ? { contextWindow: m.contextWindow } : {},
      ...m.maxTokens ? { maxTokens: m.maxTokens } : {},
      supportsImages: m.supportsImages,
      ...m.family ? { family: m.family } : {},
      ...Object.keys(tiers).length > 0 ? { tiers } : {},
      ...defaultEffort ? { defaultEffort } : {},
      isPremium: m.isPremium,
      isPromo: m.isPromo,
      ...m.creditMultiplier !== undefined ? { creditMultiplier: m.creditMultiplier } : {},
    }))
  }

  /**
   * 惰性目录兜底：解析出来仍是裸 id、且配置里没有可信的真实-uid 条目时，
   * 拉一次上游 family 目录合并后再走 resolveModelUid。
   * 覆盖 models 为空（新环境从未采纳目录）和条目缺 tiers（旧版/手写配置）
   * 两种把裸 base id（如 swe-2、swe-2-flash）直接发给上游的场景——
   * 上游不存在这些 uid，会报 permission_denied。
   */
  private async withResolvableModel(options: GenerateOptions, c: DevinConnectionOptions): Promise<DevinConnectionOptions> {
    const bare = options.model.includes('/') ? options.model.slice(options.model.lastIndexOf('/') + 1) : options.model
    const uid = resolveModelUid(options.model, options.reasoningEffort as unknown as string | undefined, c.models)
    if (uid !== bare) return c
    const entry = c.models.find((m) => m.id === bare)
    // 无 tiers/family/effort 的条目视为真实 uid（如 kimi-k2-6），直接信任
    if (entry && !entry.tiers && !entry.family && !entry.effort) return c
    try {
      const dynamic = await this.dynamicCatalog(c, options.signal)
      const merged = [...dynamic, ...c.models.filter((m) => !dynamic.some((d) => d.id === m.id))]
      return { ...c, models: merged }
    } catch {
      return c
    }
  }

  /** family 合并目录，按连接缓存 5 分钟；catalog() 是用户主动刷新，不走这里。 */
  private async dynamicCatalog(c: DevinConnectionOptions, signal?: AbortSignal): Promise<DevinCatalogModel[]> {
    const key = `${c.baseUrl}\0${c.token}`
    if (this.catalogCache?.key === key && Date.now() - this.catalogCache.at < 300_000) {
      return this.catalogCache.models
    }
    const dynamic = await this.fetchModelCatalog(c, signal)
    const models = mergeFamilies(dynamic).map(({ member: m, tiers, defaultEffort }) => ({
      id: familyBaseId(m),
      name: m.family ?? m.name ?? m.id,
      ...m.description ? { description: m.description } : {},
      ...m.contextWindow ? { contextWindow: m.contextWindow } : {},
      ...m.maxTokens ? { maxTokens: m.maxTokens } : {},
      supportsImages: m.supportsImages,
      ...m.family ? { family: m.family } : {},
      ...Object.keys(tiers).length > 0 ? { tiers } : {},
      ...defaultEffort ? { defaultEffort } : {},
      isPremium: m.isPremium,
      isPromo: m.isPromo,
      ...m.creditMultiplier !== undefined ? { creditMultiplier: m.creditMultiplier } : {},
    }))
    this.catalogCache = { key, at: Date.now(), models }
    return models
  }

  // ─── 动态模型目录（内部，仅 discoverModels 使用）──────────────────────────

  /**
   * 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
   * 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens /
   * description / family / effort / fastMode / defaultInFamily / isPremium /
   * isPromo / creditMultiplier。
   */
  private async fetchModelCatalog(c: DevinConnectionOptions, signal?: AbortSignal): Promise<DevinCatalogModel[]> {
    const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
      apiKey: c.token,
      extensionName: CLIENT_NAME,
      extensionVersion: CLIENT_VERSION,
      ideName: CLIENT_NAME,
      ideVersion: CLIENT_VERSION,
      locale: 'en',
      os: 'win',
    })
    const request = create(GetCascadeModelConfigsRequestSchema, { metadata })
    const response = await this.client(c).getCascadeModelConfigs(request, { signal })

    const models: DevinCatalogModel[] = []
    const seen = new Set<string>()
    for (const config of response.clientModelConfigs) {
      if (config.disabled) continue
      const uid = config.modelUid || config.modelOrAlias?.modelUid || ''
      if (!uid || seen.has(uid)) continue
      seen.add(uid)
      const familyMeta = config.modelFamilyMetadata
      const family = familyMeta?.modelFamilyLabel || undefined
      // effort / fastMode 从 family metadata entries 读，label 解析作回退
      let effort: string | undefined
      let fastMode = false
      for (const entry of familyMeta?.entries ?? []) {
        const key = entry.key.toLowerCase()
        if (key === 'reasoning effort' || key === 'effort' || key === 'thinking') {
          effort = entry.value?.name?.toLowerCase()
        } else if (key === 'fast mode') {
          fastMode = (entry.value?.order ?? 0n) > 0n
        }
      }
      effort ??= parseEffortFromLabel(config.label)?.toLowerCase()
      const isDefaultInFamily = config.isDefaultModelInFamily || familyMeta?.isDefaultModelInFamily === true
      const isPromo = config.promoStatus?.isActive === true
      models.push({
        id: uid,
        ...config.label ? { name: config.label } : {},
        ...config.description ? { description: config.description } : {},
        ...config.maxTokens > 0 ? { contextWindow: config.maxTokens, maxTokens: MAX_OUTPUT_TOKENS } : {},
        supportsImages: config.supportsImages,
        ...family ? { family } : {},
        ...effort ? { effort } : {},
        ...fastMode ? { fastMode: true } : {},
        ...isDefaultInFamily ? { isDefaultInFamily: true } : {},
        isPremium: config.isPremium,
        ...isPromo ? { isPromo: true } : {},
        ...config.creditMultiplier > 0 ? { creditMultiplier: config.creditMultiplier } : {},
      })
    }
    return models
  }

  // ─── 流式调用 ─────────────────────────────────────────────────────────────

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    yield* this.streamWithConn(options, this.conn())
  }

  private async *streamWithConn(
    options: GenerateOptions,
    conn: DevinConnectionOptions,
  ): AsyncIterable<StreamChunk> {
    const c = await this.withResolvableModel(options, conn)
    // 构建 Devin 请求
    let protoRequest: GetChatMessageRequest
    try {
      protoRequest = await this.buildRequest(options, c)
    } catch (err) {
      if (err instanceof LlmError) throw err
      throw new LlmError(
        `Devin request build failed: ${err instanceof Error ? err.message : String(err)}`,
        'INVALID_REQUEST',
        { cause: err as Error },
      )
    }

    try {
      yield* this.streamAttempt(options, c, protoRequest)
    } catch (err) {
      const failure = err instanceof LlmError ? err : wrapConnectError(err)
      // 只登记提醒，不在这里等待/重试：等待与重放统一由 llm/stream
      // 瀑布上的 rateLimitStream 负责，避免两处重试叠乘。
      this.reportRateLimit(failure)
      throw failure
    }
  }

  /** 单次尝试：连接 + 解码；限流失败转成 LlmError 抛出，由上层瀑布等待重放。 */
  private async *streamAttempt(
    options: GenerateOptions,
    c: DevinConnectionOptions,
    protoRequest: GetChatMessageRequest,
  ): AsyncIterable<StreamChunk> {
    // 调用 Devin RPC
    let serverStream: AsyncIterable<import('../proto/gen/devin_pb.ts').GetChatMessageResponse>
    try {
      serverStream = await this.client(c).getChatMessage(protoRequest, { signal: options.signal })
    } catch (err) {
      throw wrapConnectError(err)
    }

    // 解码响应
    const decoder = new DevinStreamDecoder()
    const iterator = serverStream[Symbol.asyncIterator]()
    let upstreamError: Error | null = null

    try {
      while (true) {
        let result
        try {
          result = await iterator.next()
        } catch (err) {
          upstreamError = err instanceof Error ? err : new Error(String(err))
          break
        }
        if (result.done) break
        if (result.value) {
          yield* decoder.decode(result.value)
        }
      }
    } finally {
      if (typeof iterator.return === 'function') {
        try { await iterator.return() } catch { /* abort teardown */ }
      }
    }

    const tail = decoder.finish(upstreamError)
    // 流内到达的限流失败：配置了 watcher 时改为抛出，让上层登记提醒/等待重置。
    // 不配置 watcher 时保持原行为（finish 块原样下发）。
    const limit = this.rateLimit ? findRateLimitFailure(tail) : undefined
    if (limit) throw new LlmError(limit.message, 'RATE_LIMIT')
    yield* tail
  }

  /** 限流失败登记到点提醒（解析失败不影响原始错误上报）。 */
  private reportRateLimit(failure: LlmError): void {
    const watcher = this.rateLimit
    if (!watcher || failure.code !== 'RATE_LIMIT') return
    try {
      // 去掉适配器前缀，通知里保留上游原文；解析基准用 watcher 的时钟。
      watcher.report(watcher.parse(originalMessage(failure.message)))
    } catch {
      // 解析/登记失败只影响提醒，不改变生成结果。
    }
  }

  // ─── buildRequest ─────────────────────────────────────────────────────────

  private async buildRequest(options: GenerateOptions, c: DevinConnectionOptions): Promise<GetChatMessageRequest> {
    const fingerprint = randomHex(366)
    const trajectoryID = randomUUID()
    const cascadeID = randomUUID()
    const executionID = randomUUID()

    const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
      apiKey: c.token,
      extensionName: CLIENT_NAME,
      extensionVersion: CLIENT_VERSION,
      ideName: CLIENT_NAME,
      ideVersion: CLIENT_VERSION,
      locale: 'en',
      os: 'mac',
      f: fingerprint,
    })

    // 把 base model id + reasoningEffort 映射到 Devin 实际 model_uid
    const actualModelUid = resolveModelUid(options.model, options.reasoningEffort as unknown as string | undefined, c.models)

    // 拆出 system prompt：options.system + 开头的 system 消息
    const parts: string[] = []
    if (options.system) parts.push(options.system)
    let startIndex = 0
    while (startIndex < options.messages.length && options.messages[startIndex]!.role === 'system') {
      const text = flattenText(options.messages[startIndex]!.content)
      if (text) parts.push(text)
      startIndex++
    }
    const systemPrompt = parts.join('\n\n')
    const messages = options.messages.slice(startIndex)

    const result = create(GetChatMessageRequestSchema, {
      metadata,
      prompt: sanitizeSystemPrompt(withToolDescriptions(systemPrompt, options.tools)),
      chatModelUid: actualModelUid,
      requestType: ChatMessageRequestType.CASCADE,
      configuration: create(ExaCodeiumCommonPb_CompletionConfigurationSchema, {
        numCompletions: 1n,
        maxTokens: BigInt(Math.min(options.maxTokens ?? c.defaultMaxTokens, MAX_OUTPUT_TOKENS)),
        maxNewlines: 400n,
        temperature: options.temperature ?? 1,
        topK: 40n,
        topP: 0.95,
      }),
      trajectoryReference: create(ExaCortexPb_CortexTrajectoryReferenceSchema, {
        trajectoryId: trajectoryID,
        trajectoryType: ExaCortexPb_CortexTrajectoryType.ExaCortexPb_CortexTrajectoryType_CORTEX_TRAJECTORY_TYPE_CASCADE,
        stepType: ExaCortexPb_CortexStepType.ExaCortexPb_CortexStepType_CORTEX_STEP_TYPE_USER_INPUT,
      }),
      cascadeId: cascadeID,
      plannerMode: ExaCodeiumCommonPb_ConversationalPlannerMode.ExaCodeiumCommonPb_ConversationalPlannerMode_CONVERSATIONAL_PLANNER_MODE_DEFAULT,
      executionId: executionID,
    })

    // 当前轮 = 最后一条 assistant 之后的所有 user/tool 消息（Devin 只可靠接受当前轮图片）
    let lastAssistantIndex = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i]!.role === 'assistant') {
        lastAssistantIndex = i
      }
    }

    for (let i = 0; i < messages.length; i++) {
      const converted = await this.convertMessage(
        messages[i]!,
        i > lastAssistantIndex,
        c,
        options.signal,
      )
      result.chatMessagePrompts.push(...converted)
    }

    if (options.tools) {
      for (const tool of options.tools) {
        result.tools.push(convertToolDefinition(tool))
      }
    }

    return result
  }

  // ─── 消息转换 ─────────────────────────────────────────────────────────────

  private async convertMessage(
    message: RequestMessage,
    attachImages: boolean,
    c: DevinConnectionOptions,
    signal?: AbortSignal,
  ): Promise<ExaChatPb_ChatMessagePrompt[]> {
    switch (message.role) {
      case 'system': {
        // 历史中间的 system 消息：Devin 没有 system 历史角色，
        // 包成 <system-reminder> 的 user 提示（与官方 pi-ai adapter 一致）。
        const content = flattenText(message.content)
        const prompt = await this.promptForContent(
          ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_USER,
          [],
          attachImages,
          c,
          signal,
        )
        prompt.prompt = `<system-reminder>\n${content.replaceAll('</system-reminder>', '<\\/system-reminder>')}\n</system-reminder>`
        return [prompt]
      }
      case 'developer':
        // projectToolUpdates 已在 runtime 层剥离 developer 消息；
        // 防御性兜底：只把文本块以 user 提示形式下发。
        return [await this.promptForContent(
          ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_USER,
          message.content.filter((b) => b.type === 'text'),
          attachImages,
          c,
          signal,
        )]
      case 'tool': {
        const prompt = await this.promptForContent(
          ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_TOOL,
          message.content,
          attachImages,
          c,
          signal,
        )
        prompt.toolCallId = message.toolCallId as string
        prompt.toolResultIsError = message.isError === true
        return [prompt]
      }
      case 'assistant': {
        const prompt = await this.promptForContent(
          ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_SYSTEM,
          message.content,
          false,
          c,
          signal,
        )
        // replayState 里恢复 thinking signature（Devin prompt 只有一个 signature 槽，取最后一个非空）
        const replay = message.source.replayState as ReplayEnvelope | undefined
        for (const block of message.content) {
          if (block.type === 'tool-call') {
            prompt.toolCalls.push(create(ExaCodeiumCommonPb_ChatToolCallSchema, {
              id: block.id as string,
              name: block.name,
              argumentsJson: block.arguments,
            }))
          }
        }
        if (replay?.blocks) {
          for (let i = 0; i < message.content.length; i++) {
            if (message.content[i]!.type !== 'reasoning') continue
            const meta = replay.blocks[i] as { signature?: string; redacted?: boolean } | undefined
            if (meta?.signature) prompt.signature = meta.signature
            if (meta?.redacted) prompt.thinkingRedacted = true
          }
        }
        return [prompt]
      }
      default:
        // user（含 RequestUserInput）→ user source
        return [await this.promptForContent(
          ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_USER,
          message.content,
          attachImages,
          c,
          signal,
        )]
    }
  }

  private async promptForContent(
    source: ExaCodeiumCommonPb_ChatMessageSource,
    content: readonly ContentBlock[],
    attachImages: boolean,
    c: DevinConnectionOptions,
    signal?: AbortSignal,
  ): Promise<ExaChatPb_ChatMessagePrompt> {
    const prompt = create(ExaChatPb_ChatMessagePromptSchema, {
      messageId: randomUUID(),
      source,
    })

    let text = ''
    for (const block of content) {
      switch (block.type) {
        case 'text':
          text += block.text
          break
        case 'reasoning':
          // 多个 reasoning 块拼接到同一个 thinking 槽
          prompt.thinking += block.text
          break
        case 'image':
          if (block.offloaded) {
            // offload 过的历史图：发送占位文本而不是字节
            if (text.length > 0) text += '\n'
            text += offloadedImageText(block.attachment)
            break
          }
          if (!attachImages) {
            if (text.length > 0) text += '\n'
            text += '[Image omitted from history]'
            break
          }
          if (!c.readImage) {
            throw new LlmError(
              'Devin adapter received an image but no attachment store is available',
              'UNSUPPORTED_CONTENT',
            )
          }
          try {
            const stored = await c.readImage(block.attachment, signal)
            const base64 = Buffer.from(stored.data).toString('base64')
            const mimeType = stored.ref.mediaType
            prompt.images.push(
              create(ExaCodeiumCommonPb_ImageDataSchema, { base64Data: base64, mimeType }),
            )
          } catch (err) {
            throw new LlmError(
              `Failed to read image attachment: ${err instanceof Error ? err.message : String(err)}`,
              'INVALID_REQUEST',
              { cause: err as Error },
            )
          }
          break
        case 'file':
          // runtime 已把 file 块投影为文本；防御性占位
          if (text.length > 0) text += '\n'
          text += `[File: ${block.attachment.name ?? 'attachment'}]`
          break
        default:
          // tool-call / tool-addition / tool-removal 在各自消息处理中单独处理
          break
      }
    }
    prompt.prompt = text
    return prompt
  }
}

// ─── 工具定义转换 ───────────────────────────────────────────────────────────

function convertToolDefinition(tool: ToolSchema): ExaChatPb_ChatToolDefinition {
  const schema = stripSchemaAnnotations(tool.parameters)
  return create(ExaChatPb_ChatToolDefinitionSchema, {
    name: tool.name,
    // 上游把 description 当工具分类提示 — 只回填工具名；
    // 真正的说明通过 system prompt 的 <tool> 段注入（withToolDescriptions）。
    description: tool.name,
    jsonSchemaString: schema,
  })
}

function stripSchemaAnnotations(schema: Record<string, unknown>): string {
  try {
    const cleaned = stripSchemaValueAnnotations(schema, false)
    return JSON.stringify(cleaned)
  } catch {
    return JSON.stringify(schema)
  }
}

function stripSchemaValueAnnotations(value: unknown, propertyNames: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripSchemaValueAnnotations(item, false))
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isNaturalLanguageAnnotation(key) && !propertyNames) continue
      if (isSchemaLiteral(key) && !propertyNames) {
        cleaned[key] = child
        continue
      }
      cleaned[key] = stripSchemaValueAnnotations(child, key === 'properties')
    }
    return cleaned
  }
  return value
}

function isSchemaLiteral(key: string): boolean {
  return ['const', 'default', 'enum', 'example', 'examples'].includes(key)
}

function isNaturalLanguageAnnotation(key: string): boolean {
  if (['description', 'title', '$comment'].includes(key)) return true
  return key.toLowerCase().startsWith('x-')
}

// ─── 系统提示词清洗 ─────────────────────────────────────────────────────────

const IDENTITY_REPLACEMENTS: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /You are Claude Code, Anthropic's official CLI for Claude/gi, replace: 'You are an AI coding assistant' },
  { pattern: /Claude Code is available as a CLI in the terminal, desktop app/gi, replace: 'The assistant is available as a CLI in the terminal, desktop tool' },
  { pattern: /Fast mode for Claude Code uses Claude Opus/gi, replace: 'Fast mode uses the faster output model' },
  { pattern: /The most recent Claude models are the Claude 5 family/gi, replace: 'The most recent models are the latest family' },
  { pattern: /default to the latest and most capable Claude models/gi, replace: 'default to the latest and most capable models' },
  {
    pattern: /IMPORTANT: Assist with authorized security testing[\s\S]*?defensive use cases/g,
    replace: 'IMPORTANT: Assist with authorized security testing and educational contexts. Refuse harmful requests. Dual-use tools require clear authorization context',
  },
]

function sanitizeSystemPrompt(prompt: string): string {
  for (const { pattern, replace } of IDENTITY_REPLACEMENTS) {
    prompt = prompt.replace(pattern, replace)
  }
  return prompt
}

function withToolDescriptions(systemPrompt: string, tools?: readonly ToolSchema[]): string {
  if (!tools || tools.length === 0) return systemPrompt
  let section = ''
  for (const tool of tools) {
    const description = tool.description.trim()
    if (!description) continue
    if (!section) section = '# tools descriptions'
    section += `\n<tool name="${escapeXMLAttribute(tool.name)}">\n`
    section += escapeXMLText(description)
    section += '\n</tool>'
  }
  if (!section) return systemPrompt
  const trimmed = systemPrompt.replace(/[\r\n]+$/, '')
  if (!trimmed.trim()) return section
  return `${trimmed}\n\n${section}`
}

function escapeXMLAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeXMLText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

function flattenText(content: readonly ContentBlock[]): string {
  let text = ''
  for (const block of content) {
    if (block.type === 'text') text += block.text
  }
  return text
}

function randomHex(size: number): string {
  return randomBytes(size).toString('hex')
}
