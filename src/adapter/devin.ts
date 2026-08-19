// Devin Connect 适配器：RequestMessages → Devin RPC，返回 ResponseStream。
// 翻译自 devin-2api/internal/adapter/devin/devin.go 的 buildRequest / Stream / ListModels。

import { createClient } from '@connectrpc/connect'
import { create } from '@bufbuild/protobuf'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  ApiServerService,
} from '../proto/gen/devin_pb.ts'
import {
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
  ExaCodeiumCommonPb_ChatToolCall,
  ExaCodeiumCommonPb_ImageData,
  ExaCodeiumCommonPb_Metadata,
  GetChatMessageRequest,
} from '../proto/gen/devin_pb.ts'
import type {
  Content,
  Message,
  ModelInfo,
  RequestMessages,
  ResponseStream,
  ToolDefinition,
  ToolCall,
} from '../llm/types.ts'
import { validateRequest } from '../llm/validate.ts'
import { createDevinTransport } from './transport.ts'
import { DevinResponseStream } from './decoder.ts'

const CLIENT_NAME = 'chisel'
const CLIENT_VERSION = '3000.2.17'
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000

export interface DevinConfig {
  baseUrl: string
  token: string
  model: string
  proxy?: string
  forceHttp1: boolean
}

export class DevinAdapter {
  private config: DevinConfig
  private client: ReturnType<typeof createClient<typeof ApiServerService>>
  private modelsCache: ModelInfo[] | null = null
  private modelsExpiry = 0

  constructor(config: DevinConfig) {
    this.config = config
    const transport = createDevinTransport({
      baseUrl: config.baseUrl,
      token: config.token,
      proxy: config.proxy,
      forceHttp1: config.forceHttp1,
    })
    this.client = createClient(ApiServerService, transport)
  }

  async stream(request: RequestMessages): Promise<ResponseStream> {
    const validationError = validateRequest(request)
    if (validationError) {
      throw new Error(`validate Devin request: ${validationError}`)
    }

    let model = request.model.trim()
    if (!model) model = this.config.model

    const imageError = validateImagesForModel(request, model)
    if (imageError) throw imageError

    const cfg: DevinConfig = { ...this.config, model }
    const protoRequest = buildRequest(request, cfg)

    try {
      const serverStream = await this.client.getChatMessage(protoRequest)
      return new DevinResponseStream(model, serverStream)
    } catch (err) {
      throw connectError(err)
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (this.modelsCache && Date.now() < this.modelsExpiry) {
      return this.modelsCache
    }

    const metadata = buildMetadata(this.config.token)
    const request = create(GetCascadeModelConfigsRequestSchema, { metadata })
    const response = await this.client.getCascadeModelConfigs(request)

    const now = Math.floor(Date.now() / 1000)
    const models: ModelInfo[] = []
    const seen = new Set<string>()

    for (const c of response.clientModelConfigs) {
      if (c.disabled) continue
      const uid = c.modelUid
      if (!uid) continue
      if (seen.has(uid)) continue
      seen.add(uid)

      let ownedBy = 'devin'
      const providerName = c.provider !== 0 ? String(c.provider) : ''
      if (providerName) {
        const idx = providerName.lastIndexOf('_')
        if (idx >= 0 && idx + 1 < providerName.length) {
          ownedBy = providerName.slice(idx + 1).toLowerCase()
        }
      }

      models.push({
        id: uid,
        created: now,
        ownedBy,
        supportsImages: c.supportsImages,
      })
    }

    // 用户显式配置的 model 即使不在上游列表中也应可被发现
    const configured = this.config.model.trim()
    if (configured && !seen.has(configured)) {
      models.push({
        id: configured,
        created: now,
        ownedBy: 'devin',
        // 配置模型无法从上游获取图片能力，默认按支持图片处理更友好
        supportsImages: true,
      })
    }

    this.modelsCache = models
    this.modelsExpiry = Date.now() + MODELS_CACHE_TTL_MS
    return models
  }
}

// ─── buildRequest ───────────────────────────────────────────────────────────

function buildRequest(request: RequestMessages, config: DevinConfig): GetChatMessageRequest {
  const fingerprint = randomHex(366)
  const trajectoryID = randomUUID()
  const cascadeID = randomUUID()
  const executionID = randomUUID()

  const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
    apiKey: config.token,
    extensionName: CLIENT_NAME,
    extensionVersion: CLIENT_VERSION,
    ideName: CLIENT_NAME,
    ideVersion: CLIENT_VERSION,
    locale: 'en',
    os: 'mac',
    f: fingerprint,
  })

  const result = create(GetChatMessageRequestSchema, {
    metadata,
    prompt: sanitizeSystemPrompt(withToolDescriptions(request.systemPrompt, request.tools)),
    chatModelUid: config.model,
    requestType: ChatMessageRequestType.CASCADE,
    configuration: create(ExaCodeiumCommonPb_CompletionConfigurationSchema, {
      numCompletions: 1n,
      maxTokens: 128000n,
      maxNewlines: 400n,
      temperature: 1,
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

  // 当前轮 = 最后一条 AssistantMessage 之后的所有 user/tool 消息
  let lastAssistantIndex = -1
  for (let i = 0; i < request.messages.length; i++) {
    if (request.messages[i]!.role === 'assistant') {
      lastAssistantIndex = i
    }
  }

  for (let i = 0; i < request.messages.length; i++) {
    const converted = convertMessage(request.messages[i]!, i > lastAssistantIndex)
    result.chatMessagePrompts.push(...converted)
  }

  for (const tool of request.tools) {
    result.tools.push(convertToolDefinition(tool))
  }

  return result
}

// ─── 消息转换 ───────────────────────────────────────────────────────────────

function convertMessage(message: Message, attachImages: boolean): ExaChatPb_ChatMessagePrompt[] {
  switch (message.role) {
    case 'user':
      return [promptForContent(ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_USER, message.content, attachImages)]
    case 'assistant': {
      const prompt = promptForContent(ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_SYSTEM, message.content, false)
      for (const block of message.content) {
        if (block.type === 'toolCall') {
          prompt.toolCalls.push({
            id: block.id,
            name: block.name,
            argumentsJson: block.arguments,
          } as ExaCodeiumCommonPb_ChatToolCall)
        }
      }
      return [prompt]
    }
    case 'toolResult': {
      const prompt = promptForContent(ExaCodeiumCommonPb_ChatMessageSource.ExaCodeiumCommonPb_ChatMessageSource_CHAT_MESSAGE_SOURCE_TOOL, message.content, attachImages)
      prompt.toolCallId = message.toolCallID
      prompt.toolResultIsError = message.isError
      return [prompt]
    }
    default:
      throw new Error(`unsupported message type: ${(message as Message).role}`)
  }
}

function promptForContent(
  source: ExaCodeiumCommonPb_ChatMessageSource,
  content: Content[],
  attachImages: boolean,
): ExaChatPb_ChatMessagePrompt {
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
      case 'thinking':
        prompt.thinking = block.thinking
        if (block.thinkingSignature) prompt.signature = block.thinkingSignature
        prompt.thinkingRedacted = block.redacted
        break
      case 'image':
        if (!attachImages) {
          if (text.length > 0) text += '\n'
          text += '[Image omitted from history]'
          break
        }
        // 纯 base64（无 data: 前缀）+ mime_type
        let data = block.data
        if (data.startsWith('data:')) {
          const commaIdx = data.indexOf(',')
          if (commaIdx >= 0) data = data.slice(commaIdx + 1)
        }
        const mimeType = block.mimeType || 'image/png'
        prompt.images.push({ base64Data: data, mimeType } as ExaCodeiumCommonPb_ImageData)
        break
      case 'toolCall':
        // 助手消息中的工具调用在 convertMessage 中单独处理
        break
    }
  }
  prompt.prompt = text
  return prompt
}

// ─── 工具定义转换 ───────────────────────────────────────────────────────────

function convertToolDefinition(tool: ToolDefinition): ExaChatPb_ChatToolDefinition {
  const schema = stripSchemaAnnotations(tool.inputSchema)
  return create(ExaChatPb_ChatToolDefinitionSchema, {
    name: tool.name,
    description: tool.name,
    jsonSchemaString: schema,
  })
}

function stripSchemaAnnotations(schemaStr: string): string {
  try {
    const value = JSON.parse(schemaStr)
    const cleaned = stripSchemaValueAnnotations(value, false)
    return JSON.stringify(cleaned)
  } catch {
    return schemaStr
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

function withToolDescriptions(systemPrompt: string, tools: ToolDefinition[]): string {
  let section = ''
  for (const tool of tools) {
    const description = tool.description.trim()
    if (!description) continue
    if (!section) section = '# tools descriptions'
    section += `\n<tool name="${escapeXMLAttribute(tool.name)}">\n`
    section += escapeXMLText(formatToolDescription(description))
    section += '\n</tool>'
  }
  if (!section) return systemPrompt
  const trimmed = systemPrompt.replace(/[\r\n]+$/, '')
  if (!trimmed.trim()) return section
  return `${trimmed}\n\n${section}`
}

function formatToolDescription(description: string): string {
  return description.trim()
}

function escapeXMLAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeXMLText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── 图片校验 ───────────────────────────────────────────────────────────────

function validateImagesForModel(request: RequestMessages, model: string): Error | null {
  if (!requestHasImages(request)) return null
  if (!modelLikelySupportsImages(model)) {
    return new Error(
      `model "${model}" does not support image inputs (supports_images=false); use a vision-capable model or remove images`,
    )
  }
  return null
}

function requestHasImages(request: RequestMessages): boolean {
  for (const message of request.messages) {
    if (message.role !== 'user' && message.role !== 'toolResult') continue
    for (const block of message.content) {
      if (block.type === 'image') return true
    }
  }
  return false
}

function modelLikelySupportsImages(model: string): boolean {
  const m = model.toLowerCase().trim()
  if (!m) return true
  // glm 系列不支持图片；swe 系列支持
  const noVisionPrefixes = ['glm-5-2', 'glm-5', 'glm-4.7', 'glm-4-7', 'glm-4', 'deepseek', 'kimi-k2', 'qwen3-coder']
  for (const p of noVisionPrefixes) {
    if (m === p || m.startsWith(p + '-') || m.startsWith(p + '_')) return false
  }
  if (m.startsWith('o1') || m.startsWith('o3-mini') || m.startsWith('o4-mini')) return false
  return true
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

function buildMetadata(token: string): ExaCodeiumCommonPb_Metadata {
  return create(ExaCodeiumCommonPb_MetadataSchema, {
    apiKey: token,
    extensionName: CLIENT_NAME,
    extensionVersion: CLIENT_VERSION,
    ideName: CLIENT_NAME,
    ideVersion: CLIENT_VERSION,
    locale: 'en',
    os: 'win',
    f: randomHex(32),
  })
}

function randomHex(size: number): string {
  return randomBytes(size).toString('hex')
}

function connectError(err: unknown): Error {
  if (err === null || err === undefined) return new Error('unknown error')
  // Connect 错误有 code + message
  const e = err as { code?: string; message?: string; rawMessage?: string }
  if (e.code) {
    const msg = (e.message || e.rawMessage || '').trim() || String(err)
    return new Error(`${e.code}: ${msg}`)
  }
  if (err instanceof Error) return err
  return new Error(String(err))
}
