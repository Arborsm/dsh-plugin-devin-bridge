// Devin Connect 适配器：dsh GenerateOptions → Devin RPC → StreamChunk。
// 实现 dsh-llm 的 LlmAdapter 接口，注册为 `devin` provider route。

import { createClient } from '@connectrpc/connect'
import { create } from '@bufbuild/protobuf'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  LlmAdapter,
  LlmError,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmProviderInfo,
  type LlmResolvedModelInfo,
  type Message,
  type StreamChunk,
  type ToolSchema,
  type ContentBlock,
  ReasoningEffortId,
} from '@deepseek-ai/dsh-llm'
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment'
import {
  ApiServerService,
  ChatMessageRequestType,
  ExaChatPb_ChatMessagePromptSchema,
  ExaChatPb_ChatToolDefinitionSchema,
  ExaCodeiumCommonPb_ChatMessageSource,
  ExaCodeiumCommonPb_CompletionConfigurationSchema,
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
  ExaCodeiumCommonPb_ImageData,
  GetChatMessageRequest,
} from '../proto/gen/devin_pb.ts'
import { createDevinTransport } from './transport.ts'
import { DevinStreamDecoder, wrapConnectError } from './decoder.ts'

const CLIENT_NAME = 'chisel'
const CLIENT_VERSION = '3000.2.17'

// ─── 配置类型 ───────────────────────────────────────────────────────────────

export interface DevinCatalogModel {
  id: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  supportsImages?: boolean
}

export interface DevinConnectionOptions {
  baseUrl: string
  token: string
  proxy?: string
  forceHttp1: boolean
  models: readonly DevinCatalogModel[]
  defaultContextWindow: number
  defaultMaxTokens: number
  /** 可选的 attachment 读取器，用于获取图片字节 */
  readImage?: (ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>
}

export interface DevinAdapterOptions {
  /** 当前连接配置；每次操作时调用以获取最新值。 */
  options: () => DevinConnectionOptions
}

// ─── DevinAdapter ───────────────────────────────────────────────────────────

const PROVIDER = 'devin'

const REASONING_EFFORTS = [
  { id: ReasoningEffortId('off'), name: 'Off' },
  { id: ReasoningEffortId('low'), name: 'Low' },
  { id: ReasoningEffortId('high'), name: 'High' },
  { id: ReasoningEffortId('max'), name: 'Max' },
] as const

export class DevinAdapter extends LlmAdapter {
  private readonly config: DevinAdapterOptions
  // transport/client 缓存：配置变更时重建
  private cachedClient: ReturnType<typeof createClient<typeof ApiServerService>> | null = null
  private cachedClientKey = ''
  // 动态模型目录缓存（5 分钟 TTL，与原始 devin-2api 一致）
  private cachedModels: readonly DevinCatalogModel[] | null = null
  private modelsExpiry = 0
  private static readonly MODELS_CACHE_TTL_MS = 5 * 60 * 1000

  constructor(options: DevinAdapterOptions) {
    super()
    this.config = options
  }

  /** 当前连接配置（每次调用读取最新值）。 */
  private conn(): DevinConnectionOptions {
    return this.config.options()
  }

  /** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
  private client(): ReturnType<typeof createClient<typeof ApiServerService>> {
    const c = this.conn()
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
    // 连接事实变了，模型目录缓存失效
    this.cachedModels = null
    this.modelsExpiry = 0
    return this.cachedClient
  }

  override providerInfo(_provider: string): LlmProviderInfo {
    return { id: PROVIDER, name: 'Devin' }
  }

  override async listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    const catalog = await this.resolveModelCatalog()
    const models: LlmModelInfo[] = catalog.map((m) => ({
      provider: PROVIDER,
      id: m.id,
      name: m.name ?? m.id,
      ...m.description ? { description: m.description } : {},
      ...m.supportsImages
        ? { inputModalities: ['text' as const, 'image' as const] }
        : { inputModalities: ['text' as const] },
    }))
    return models
  }

  override async resolveModel(
    _provider: string,
    model: string,
    _signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const c = this.conn()
    const catalog = await this.resolveModelCatalog()
    const configured = catalog.find((m) => m.id === model)
    const contextWindow = configured?.contextWindow ?? c.defaultContextWindow
    return {
      provider: PROVIDER,
      id: model,
      name: configured?.name ?? model,
      ...configured?.description ? { description: configured.description } : {},
      ...configured?.supportsImages
        ? { inputModalities: ['text' as const, 'image' as const] }
        : { inputModalities: ['text' as const] },
      context: { contextWindow },
      defaultMaxTokens: configured?.maxTokens ?? c.defaultMaxTokens,
      reasoning: {
        efforts: REASONING_EFFORTS,
        defaultEffort: ReasoningEffortId('high'),
      },
    }
  }

  // ─── 动态模型目录 ─────────────────────────────────────────────────────────

  /**
   * 解析当前可用的模型目录。
   *
   * 优先从 Devin 服务器动态获取（GetCascadeModelConfigs），带 5 分钟 TTL 缓存；
   * 网络失败时 fallback 到配置的静态模型列表。
   * 用户显式配置的 model 即使不在服务器返回的列表中也会被合并进来。
   */
  private async resolveModelCatalog(): Promise<readonly DevinCatalogModel[]> {
    // 缓存命中
    if (this.cachedModels !== null && Date.now() < this.modelsExpiry) {
      return this.cachedModels
    }

    const c = this.conn()
    // 尝试动态获取
    try {
      const dynamic = await this.fetchModelCatalog()
      // 合并用户配置的模型（即使不在服务器列表中也保留）
      const seen = new Set(dynamic.map((m) => m.id))
      const merged = [...dynamic]
      for (const configured of c.models) {
        if (!seen.has(configured.id)) {
          merged.push(configured)
        }
      }
      this.cachedModels = merged
      this.modelsExpiry = Date.now() + DevinAdapter.MODELS_CACHE_TTL_MS
      return merged
    } catch {
      // 网络失败：fallback 到静态配置，短缓存避免频繁重试
      this.cachedModels = c.models
      this.modelsExpiry = Date.now() + 30_000
      return c.models
    }
  }

  /**
   * 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
   * 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens / description。
   */
  private async fetchModelCatalog(): Promise<DevinCatalogModel[]> {
    const c = this.conn()
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
    const response = await this.client().getCascadeModelConfigs(request)

    const models: DevinCatalogModel[] = []
    const seen = new Set<string>()
    for (const config of response.clientModelConfigs) {
      if (config.disabled) continue
      const uid = config.modelUid
      if (!uid || seen.has(uid)) continue
      seen.add(uid)
      models.push({
        id: uid,
        ...config.label ? { name: config.label } : {},
        ...config.description ? { description: config.description } : {},
        ...config.maxTokens > 0 ? { maxTokens: config.maxTokens } : {},
        supportsImages: config.supportsImages,
      })
    }
    return models
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // 构建 Devin 请求
    let protoRequest: GetChatMessageRequest
    try {
      protoRequest = await this.buildRequest(options)
    } catch (err) {
      throw new LlmError(
        `Devin request build failed: ${err instanceof Error ? err.message : String(err)}`,
        'INVALID_REQUEST',
        { cause: err as Error },
      )
    }

    // 调用 Devin RPC
    let serverStream: AsyncIterable<import('../proto/gen/devin_pb.ts').GetChatMessageResponse>
    try {
      serverStream = await this.client().getChatMessage(protoRequest)
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

    yield* decoder.finish(upstreamError)
  }

  // ─── buildRequest ─────────────────────────────────────────────────────────

  private async buildRequest(options: GenerateOptions): Promise<GetChatMessageRequest> {
    const c = this.conn()
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
      os: 'win',
      f: fingerprint,
    })

    const result = create(GetChatMessageRequestSchema, {
      metadata,
      prompt: sanitizeSystemPrompt(withToolDescriptions(options.system ?? '', options.tools)),
      chatModelUid: options.model,
      requestType: ChatMessageRequestType.CASCADE,
      configuration: create(ExaCodeiumCommonPb_CompletionConfigurationSchema, {
        numCompletions: 1n,
        maxTokens: BigInt(options.maxTokens ?? c.defaultMaxTokens),
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

    // 当前轮 = 最后一条 assistant 之后的所有 user/tool 消息
    let lastAssistantIndex = -1
    for (let i = 0; i < options.messages.length; i++) {
      if (options.messages[i]!.role === 'assistant') {
        lastAssistantIndex = i
      }
    }

    for (let i = 0; i < options.messages.length; i++) {
      const converted = await this.convertMessage(
        options.messages[i]!,
        i > lastAssistantIndex,
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
    message: Message,
    attachImages: boolean,
    signal?: AbortSignal,
  ): Promise<ExaChatPb_ChatMessagePrompt[]> {
    // dsh Message.role 只有 'system' | 'user' | 'assistant'
    // 用 source.kind 区分 user / model / tool / plugin
    const source = message.source

    if (source.kind === 'tool') {
      // tool result
      const prompt = await this.promptForContent(
        ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_TOOL,
        message.content,
        attachImages,
        signal,
      )
      prompt.toolCallId = source.callId
      // 检查是否有 isError 标记
      for (const block of message.content) {
        if (block.type === 'tool-result' && block.isError) {
          prompt.toolResultIsError = true
        }
      }
      return [prompt]
    }

    if (source.kind === 'model') {
      // assistant message
      const prompt = await this.promptForContent(
        ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_SYSTEM,
        message.content,
        false,
        signal,
      )
      for (const block of message.content) {
        if (block.type === 'tool-call') {
          prompt.toolCalls.push({
            id: block.id,
            name: block.name,
            argumentsJson: block.arguments,
          } as never)
        }
      }
      return [prompt]
    }

    // user or plugin → user source
    const prompt = await this.promptForContent(
      ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_USER,
      message.content,
      attachImages,
      signal,
    )
    return [prompt]
  }

  private async promptForContent(
    source: ExaCodeiumCommonPb_ChatMessageSource,
    content: readonly ContentBlock[],
    attachImages: boolean,
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
          prompt.thinking = block.text
          prompt.thinkingRedacted = false
          break
        case 'image':
          if (!attachImages) {
            if (text.length > 0) text += '\n'
            text += '[Image omitted from history]'
            break
          }
          const readImage = this.conn().readImage
          if (!readImage) {
            throw new LlmError(
              'Devin adapter received an image but no attachment store is available',
              'INVALID_REQUEST',
            )
          }
          try {
            const stored = await readImage(block.attachment, signal)
            const base64 = Buffer.from(stored.data).toString('base64')
            const mimeType = stored.ref.mediaType
            prompt.images.push({ base64Data: base64, mimeType } as ExaCodeiumCommonPb_ImageData)
          } catch (err) {
            throw new LlmError(
              `Failed to read image attachment: ${err instanceof Error ? err.message : String(err)}`,
              'INVALID_REQUEST',
              { cause: err as Error },
            )
          }
          break
        case 'tool-call':
          // assistant 消息中的工具调用在 convertMessage 中单独处理
          break
        case 'tool-result':
          // tool result 的文本内容
          for (const sub of block.content) {
            if (sub.type === 'text') text += sub.text
          }
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
    description: tool.description || tool.name,
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

function randomHex(size: number): string {
  return randomBytes(size).toString('hex')
}
