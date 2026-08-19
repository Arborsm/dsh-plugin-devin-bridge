// OpenAI Chat Completions 请求 → 中间 RequestMessages。
// 翻译自 devin-2api/internal/api/openai/chat/request.go + internal/api/common/content.go。

import type {
  Content,
  ImageContent,
  Message,
  RequestMessages,
  ToolDefinition,
} from '../../llm/types.ts'

export interface ChatRequestOptions {
  stream: boolean
  includeUsage: boolean
}

export interface DecodedChatRequest {
  context: RequestMessages
  options: ChatRequestOptions
}

interface ChatMessage {
  role: string
  content: unknown
  name?: string
  tool_calls?: ChatToolCall[]
  tool_call_id?: string
}

interface ChatToolCall {
  id: string
  type: string
  function: { name: string; arguments: string }
}

interface ChatTool {
  type: string
  function: { name: string; description: string; parameters: unknown }
}

interface ChatRequestBody {
  model: string
  messages: ChatMessage[]
  tools?: ChatTool[]
  stream?: boolean
  stream_options?: { include_usage?: boolean }
}

export function decodeChatRequest(body: string): DecodedChatRequest {
  let request: ChatRequestBody
  try {
    request = JSON.parse(body)
  } catch (e) {
    throw new Error(`decode chat request: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!request.model) throw new Error('chat request model is required')
  if (!request.messages || request.messages.length === 0) {
    throw new Error('chat request messages are required')
  }

  const context: RequestMessages = {
    model: request.model,
    systemPrompt: '',
    messages: [],
    tools: [],
  }

  for (let i = 0; i < request.messages.length; i++) {
    appendMessage(context, request.messages[i]!, i)
  }

  if (request.tools) {
    for (const tool of request.tools) {
      if (tool.type !== 'function') continue
      const schema = tool.function.parameters
      const schemaStr = schema ? JSON.stringify(schema) : '{"type":"object"}'
      context.tools.push({
        name: tool.function.name,
        description: tool.function.description,
        inputSchema: schemaStr,
      } satisfies ToolDefinition)
    }
  }

  return {
    context,
    options: {
      stream: !!request.stream,
      includeUsage: !!request.stream_options?.include_usage,
    },
  }
}

function appendMessage(context: RequestMessages, message: ChatMessage, index: number): void {
  switch (message.role) {
    case 'system':
    case 'developer': {
      const text = contentToText(message.content)
      if (context.systemPrompt && text) context.systemPrompt += '\n'
      context.systemPrompt += text
      break
    }
    case 'user': {
      const content = decodeUserContent(message.content)
      context.messages.push({ role: 'user', content, timestampMS: Date.now() })
      break
    }
    case 'assistant': {
      const content = decodeAssistantContent(message)
      context.messages.push({
        role: 'assistant',
        content,
        api: '',
        provider: '',
        model: '',
        responseModel: '',
        responseID: '',
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
        stopReason: 'pending',
        errorMessage: '',
        timestampMS: Date.now(),
      })
      break
    }
    case 'tool': {
      if (!message.tool_call_id) throw new Error(`message[${index}]: tool message requires tool_call_id`)
      const content = decodeContent(message.content)
      const name = findToolName(context.messages, message.tool_call_id)
      context.messages.push({
        role: 'toolResult',
        toolCallID: message.tool_call_id,
        toolName: name,
        content,
        isError: false,
        timestampMS: Date.now(),
      })
      break
    }
    default:
      // 忽略未知角色
      break
  }
}

function decodeUserContent(raw: unknown): Content[] {
  if (raw === null || raw === undefined) return [{ type: 'text', text: '' }]
  return decodeContent(raw)
}

function decodeAssistantContent(message: ChatMessage): Content[] {
  const content: Content[] = []
  if (message.content !== null && message.content !== undefined) {
    content.push(...decodeContent(message.content))
  }
  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      if (call.type && call.type !== 'function') continue
      let args = call.function.arguments
      if (!isJSONObject(args)) args = '{}'
      content.push({ type: 'toolCall', id: call.id, name: call.function.name, arguments: args })
    }
  }
  return content
}

// ─── 内容解码（支持 string 和 part 数组） ───────────────────────────────────

function decodeContent(raw: unknown): Content[] {
  if (typeof raw === 'string') {
    return [{ type: 'text', text: sanitizeText(raw) }]
  }
  if (!Array.isArray(raw)) {
    throw new Error('decode message content: expected string or array')
  }

  const content: Content[] = []
  for (let i = 0; i < raw.length; i++) {
    const part = raw[i] as Record<string, unknown>
    const type = part.type as string
    switch (type) {
      case 'input_text':
      case 'output_text':
      case 'text':
        content.push({ type: 'text', text: sanitizeText(String(part.text ?? '')) })
        break
      case 'input_image':
      case 'image_url':
      case 'image':
        content.push(decodeImagePart(part))
        break
      default:
        // 忽略未知 part
        break
    }
  }
  return content
}

function contentToText(raw: unknown): string {
  const content = decodeContent(raw)
  return content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
}

// ─── 图片解码 ───────────────────────────────────────────────────────────────

function decodeImagePart(part: Record<string, unknown>): ImageContent {
  if (part.file_id) {
    throw new Error('file_id images are not supported; use base64 data URL in image_url')
  }

  const candidates = [part.image_url, part.image, part.source]
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue
    try {
      return decodeImageValue(candidate)
    } catch (e) {
      if (!(e instanceof ImageShapeError)) throw e
    }
  }

  if (typeof part.url === 'string') return decodeDataImage(part.url)
  if (typeof part.data === 'string') return decodeDataImage(part.data)

  throw new Error('image part missing image_url/url/data (base64 data URL required)')
}

class ImageShapeError extends Error {
  constructor() {
    super('unrecognized image value shape')
  }
}

function decodeImageValue(raw: unknown): ImageContent {
  if (typeof raw === 'string') return decodeDataImage(raw)
  if (raw === null || typeof raw !== 'object') throw new ImageShapeError()

  const obj = raw as Record<string, unknown>
  if (obj.file_id) {
    throw new Error('file_id images are not supported; use base64 data URL')
  }
  if (typeof obj.url === 'string') return decodeDataImage(obj.url)

  let encoded = ''
  if (typeof obj.data === 'string') encoded = obj.data
  if (!encoded && typeof obj.base64 === 'string') encoded = obj.base64
  if (!encoded && typeof obj.b64_json === 'string') encoded = obj.b64_json
  if (!encoded) throw new ImageShapeError()

  let mimeType = ''
  if (typeof obj.mime_type === 'string') mimeType = obj.mime_type
  if (!mimeType && typeof obj.media_type === 'string') mimeType = obj.media_type

  if (encoded.startsWith('data:')) return decodeDataImage(encoded)
  if (!mimeType) mimeType = sniffImageMIME(encoded)
  if (!mimeType) {
    throw new Error('image base64 requires mime_type/media_type or data URL prefix')
  }
  return decodeRawBase64(encoded, mimeType)
}

function decodeDataImage(value: string): ImageContent {
  value = value.trim()
  if (!value) throw new Error('image url/data is empty')
  if (value.startsWith('http://') || value.startsWith('https://')) {
    throw new Error('http(s) image URLs are not fetched yet; embed as data:image/...;base64,...')
  }
  if (!value.startsWith('data:')) {
    const mimeType = sniffImageMIME(value)
    if (mimeType) return decodeRawBase64(value, mimeType)
    throw new Error('only data URL or raw base64 images are supported')
  }

  const commaIdx = value.indexOf(',')
  if (commaIdx < 0) throw new Error('image must be a base64 data URL')
  const meta = value.slice(5, commaIdx) // 去掉 "data:"
  const encoded = value.slice(commaIdx + 1)

  let isBase64 = meta.includes(';base64') || !meta.includes(';')
  if (meta.includes(';base64')) isBase64 = true

  let mimeType = meta
  const semiIdx = mimeType.indexOf(';')
  if (semiIdx >= 0) mimeType = mimeType.slice(0, semiIdx)
  mimeType = mimeType.trim() || 'image/png'

  if (!isBase64) throw new Error('image data URL must be base64 encoded')
  return decodeRawBase64(encoded, mimeType)
}

function decodeRawBase64(encoded: string, mimeType: string): ImageContent {
  encoded = encoded.replace(/[\n\r \t]/g, '')
  // 验证 base64 可解码
  let data: Buffer
  try {
    data = Buffer.from(encoded, 'base64')
  } catch {
    try {
      data = Buffer.from(encoded, 'base64url')
    } catch {
      throw new Error('decode image data: invalid base64')
    }
  }
  if (data.length === 0) throw new Error('image data is empty')
  // 重新用标准 base64 编码，确保格式一致
  return { type: 'image', data: data.toString('base64'), mimeType }
}

function sniffImageMIME(encoded: string): string {
  encoded = encoded.replace(/[\n\r \t]/g, '')
  let raw: Buffer
  try {
    raw = Buffer.from(encoded, 'base64')
  } catch {
    try {
      raw = Buffer.from(encoded, 'base64url')
    } catch {
      return ''
    }
  }
  if (raw.length < 4) return ''
  if (raw.length >= 3 && raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff) return 'image/jpeg'
  if (raw.length >= 8 && raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47) return 'image/png'
  if (raw.length >= 6 && raw[0] === 0x47 && raw[1] === 0x49 && raw[2] === 0x46) return 'image/gif'
  if (raw.length >= 12 && raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46 &&
      raw[8] === 0x57 && raw[9] === 0x45 && raw[10] === 0x42 && raw[11] === 0x50) return 'image/webp'
  return ''
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

const CODEX_PERMISSIONS_BLOCK = /<permissions instructions>[\s\S]*?<\/permissions instructions>/g

function sanitizeText(text: string): string {
  return text.replace(CODEX_PERMISSIONS_BLOCK, '')
}

function isJSONObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function findToolName(messages: Message[], callID: string): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.role !== 'assistant') continue
    for (const block of msg.content) {
      if (block.type === 'toolCall' && block.id === callID) return block.name
    }
  }
  throw new Error(`tool message references unknown tool_call_id "${callID}"`)
}
