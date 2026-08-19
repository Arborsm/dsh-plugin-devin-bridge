// OpenAI Chat Completions 响应编码：ResponseEvent → SSE chunks / final JSON。
// 翻译自 devin-2api/internal/api/openai/chat/response.go。

import { randomBytes } from 'node:crypto'
import type {
  AssistantMessage,
  ResponseEvent,
  StopReason,
  Usage,
} from '../../llm/types.ts'

export interface SSEEvent {
  name: string
  data: string
}

// ─── 流式编码器 ─────────────────────────────────────────────────────────────

interface ToolCallState {
  index: number
  id: string
  name: string
  arguments: string
  done: boolean
}

export class ChatStreamEncoder {
  private model: string
  private responseID: string
  private createdAt: number
  private includeUsage: boolean
  private textStarted = false
  private thinkingStarted = false
  private toolCalls: ToolCallState[] = []
  private finished = false
  private finalUsage: Usage | null = null

  constructor(model: string, includeUsage: boolean) {
    this.model = model
    this.responseID = newChatResponseID()
    this.createdAt = Math.floor(Date.now() / 1000)
    this.includeUsage = includeUsage
  }

  encode(event: ResponseEvent): SSEEvent[] {
    if (this.finished) throw new Error('chat completion stream is already done')
    switch (event.type) {
      case 'start': return [this.startChunk()]
      case 'text_start': this.textStarted = true; return []
      case 'text_delta': return this.textDelta(event)
      case 'text_end': this.textStarted = false; return []
      case 'thinking_start': this.thinkingStarted = true; return []
      case 'thinking_delta': return this.thinkingDelta(event)
      case 'thinking_end': this.thinkingStarted = false; return []
      case 'toolcall_start': return this.startToolCall(event)
      case 'toolcall_delta': return this.toolCallDelta(event)
      case 'toolcall_end': return this.endToolCall(event)
      case 'done': return this.finish(event)
      case 'error': return this.failed(event)
      default: throw new Error(`unsupported response event type "${event.type}"`)
    }
  }

  private startChunk(): SSEEvent {
    return this.chunk({
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
    })
  }

  private textDelta(event: ResponseEvent): SSEEvent[] {
    if (!this.textStarted) this.textStarted = true
    if (!event.delta) return []
    return [this.chunk({
      choices: [{ index: 0, delta: { content: event.delta }, finish_reason: null }],
    })]
  }

  private thinkingDelta(event: ResponseEvent): SSEEvent[] {
    if (!this.thinkingStarted) this.thinkingStarted = true
    if (!event.delta) return []
    return [this.chunk({
      choices: [{ index: 0, delta: { reasoning_content: event.delta }, finish_reason: null }],
    })]
  }

  private startToolCall(event: ResponseEvent): SSEEvent[] {
    const state: ToolCallState = {
      index: this.toolCalls.length,
      id: event.toolCallID,
      name: event.toolName,
      arguments: '',
      done: false,
    }
    this.toolCalls.push(state)
    return [this.chunk({
      choices: [{
        index: 0,
        delta: {
          tool_calls: [{
            index: state.index,
            id: state.id,
            type: 'function',
            function: { name: state.name, arguments: '' },
          }],
        },
        finish_reason: null,
      }],
    })]
  }

  private toolCallDelta(event: ResponseEvent): SSEEvent[] {
    const state = this.findTool(event.toolCallID, event.contentIndex)
    if (!state) return []
    state.arguments += event.delta
    return [this.chunk({
      choices: [{
        index: 0,
        delta: {
          tool_calls: [{
            index: state.index,
            function: { arguments: event.delta },
          }],
        },
        finish_reason: null,
      }],
    })]
  }

  private endToolCall(event: ResponseEvent): SSEEvent[] {
    const state = this.findToolByIndex(event.contentIndex)
    if (!state) return []
    state.done = true
    if (event.toolCall) {
      state.id = event.toolCall.id
      state.name = event.toolCall.name
      state.arguments = event.toolCall.arguments
    }
    return []
  }

  private finish(event: ResponseEvent): SSEEvent[] {
    this.finished = true
    if (event.message) {
      this.finalUsage = event.message.usage
    }
    const reason = finishReason(event.reason)
    const events: SSEEvent[] = [this.chunk({
      choices: [{ index: 0, delta: {}, finish_reason: reason }],
    })]
    if (this.includeUsage) {
      events.push(this.chunk({
        choices: [],
        usage: chatUsage(this.finalUsage),
      }))
    }
    events.push({ name: '[DONE]', data: '[DONE]' })
    return events
  }

  private failed(event: ResponseEvent): SSEEvent[] {
    this.finished = true
    const message = event.error?.errorMessage || 'chat completion stream failed'
    const data = JSON.stringify({
      id: this.responseID,
      object: 'chat.completion.chunk',
      created: this.createdAt,
      model: this.model,
      choices: [],
      usage: null,
      error: {
        message,
        type: openAIErrorType(message),
        code: null,
        param: null,
      },
    })
    return [{ name: '', data }]
  }

  private findTool(id: string, contentIndex: number): ToolCallState | undefined {
    return this.toolCalls.find((t) => (id && t.id === id) || t.index === contentIndex)
  }

  private findToolByIndex(contentIndex: number): ToolCallState | undefined {
    return this.toolCalls.find((t) => t.index === contentIndex)
  }

  private chunk(payload: Record<string, unknown>): SSEEvent {
    payload.id = this.responseID
    payload.object = 'chat.completion.chunk'
    payload.created = this.createdAt
    payload.model = this.model
    if (!('usage' in payload)) payload.usage = null
    return { name: '', data: JSON.stringify(payload) }
  }
}

// ─── 非流式编码 ─────────────────────────────────────────────────────────────

export function encodeChatResponse(message: AssistantMessage): string {
  if (!message) throw new Error('response message is nil')
  let model = message.responseModel || message.model || 'devin'

  const { messageObj, toolCalls } = messageToChat(message)
  const response: Record<string, unknown> = {
    id: newChatResponseID(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: messageObj,
      finish_reason: finishReason(message.stopReason),
    }],
    usage: chatUsage(message.usage),
  }
  if (toolCalls.length > 0) {
    (response.choices as Record<string, unknown>[])[0]!.message = { ...messageObj, tool_calls: toolCalls }
  }
  return JSON.stringify(response)
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

function messageToChat(message: AssistantMessage): { messageObj: Record<string, unknown>; toolCalls: unknown[] } {
  const textParts: string[] = []
  const reasoningParts: string[] = []
  const toolCalls: unknown[] = []

  for (const block of message.content) {
    switch (block.type) {
      case 'text':
        textParts.push(block.text)
        break
      case 'thinking':
        reasoningParts.push(block.thinking)
        break
      case 'toolCall':
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: { name: block.name, arguments: block.arguments },
        })
        break
    }
  }

  const messageObj: Record<string, unknown> = {
    role: 'assistant',
    content: textParts.join(''),
  }
  if (reasoningParts.length > 0) {
    messageObj.reasoning_content = reasoningParts.join('')
  }
  if (toolCalls.length > 0) {
    messageObj.tool_calls = toolCalls
    messageObj.content = null
  }
  return { messageObj, toolCalls }
}

function chatUsage(usage: Usage | null): Record<string, unknown> {
  if (!usage) {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  }
  const inputTokens = usage.input + usage.cacheRead + usage.cacheWrite
  let total = usage.totalTokens
  if (total === 0) total = inputTokens + usage.output
  return {
    prompt_tokens: inputTokens,
    completion_tokens: usage.output,
    total_tokens: total,
    prompt_tokens_details: { cached_tokens: usage.cacheRead },
    completion_tokens_details: { reasoning_tokens: 0 },
  }
}

function finishReason(reason: StopReason): string | null {
  switch (reason) {
    case 'toolUse': return 'tool_calls'
    case 'length': return 'length'
    case 'stop': return 'stop'
    case 'error':
    case 'aborted': return 'content_filter'
    default: return null
  }
}

function newChatResponseID(): string {
  return 'chatcmpl-' + randomBytes(16).toString('hex')
}

// ─── 错误类型映射 ───────────────────────────────────────────────────────────

const OPENAI_ERROR_TYPES: Record<string, string> = {
  invalid_argument: 'invalid_request_error',
  failed_precondition: 'invalid_request_error',
  out_of_range: 'invalid_request_error',
  unimplemented: 'invalid_request_error',
  unauthenticated: 'authentication_error',
  permission_denied: 'permission_error',
  not_found: 'not_found_error',
  resource_exhausted: 'rate_limit_error',
  deadline_exceeded: 'timeout_error',
  unavailable: 'server_error',
  internal: 'server_error',
  unknown: 'server_error',
}

export function openAIErrorType(message: string): string {
  const colonIdx = message.indexOf(':')
  if (colonIdx >= 0) {
    const code = message.slice(0, colonIdx).trim()
    if (OPENAI_ERROR_TYPES[code]) return OPENAI_ERROR_TYPES[code]!
  }
  return 'server_error'
}

// ─── SSE 格式化 ─────────────────────────────────────────────────────────────

export function formatSSE(event: SSEEvent): string {
  if (event.name === '[DONE]') return 'data: [DONE]\n\n'
  return `data: ${event.data}\n\n`
}
