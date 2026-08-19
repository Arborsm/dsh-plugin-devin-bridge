// Devin protobuf 响应帧 → 中间 ResponseEvent 转换。
// 翻译自 devin-2api/internal/adapter/devin/response_decoder.go。

import { create } from '@bufbuild/protobuf'
import type { GetChatMessageResponse } from '../proto/gen/devin_pb.ts'
import {
  ExaCodeiumCommonPb_StopReason,
  type ExaCodeiumCommonPb_ChatToolCall,
} from '../proto/gen/devin_pb.ts'
import type {
  AssistantMessage,
  Content,
  ResponseEvent,
  ResponseStream,
  StopReason,
  TextContent,
  ThinkingContent,
  ToolCall,
} from '../llm/types.ts'

// ─── 工具调用累计状态 ───────────────────────────────────────────────────────

interface ToolState {
  call: ToolCall
  contentIdx: number
  arguments: string
  emitted: boolean
}

// ─── 响应解码器 ─────────────────────────────────────────────────────────────

export class ResponseDecoder {
  private readonly model: string
  private partial: AssistantMessage
  private text: TextContent | null = null
  private textBuilder = ''
  private textIdx = 0
  private textOpen = false
  private thinking: ThinkingContent | null = null
  private thinkingBuilder = ''
  private thinkingSigBuilder = ''
  private thinkIdx = 0
  private thinkingOpen = false
  private tools: ToolState[] = []
  private started = false
  private finished = false
  private hasStopReason = false
  private stopReason: StopReason = 'pending'

  constructor(model: string) {
    this.model = model
    this.partial = emptyPartial(model)
  }

  start(): ResponseEvent[] {
    if (this.started || this.finished) return []
    this.started = true
    return [{ ...emptyEvent('start'), partial: this.partial }]
  }

  decode(response: GetChatMessageResponse): ResponseEvent[] {
    if (!response || this.finished) return []
    this.updateMetadata(response)

    const events: ResponseEvent[] = []

    if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
      events.push(...this.endText())
      events.push(...this.decodeThinking(response))
    }
    if (response.deltaText) {
      events.push(...this.endThinking())
      events.push(...this.decodeText(response.deltaText))
    }
    for (const delta of response.deltaToolCalls) {
      events.push(...this.endThinking())
      events.push(...this.endText())
      events.push(...this.decodeTool(delta))
    }
    if (response.stopReason !== ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_UNSPECIFIED) {
      this.hasStopReason = true
      this.stopReason = mapStopReason(response.stopReason)
    }
    return events
  }

  finish(upstreamErr: Error | null): ResponseEvent[] {
    if (this.finished) return []
    if (upstreamErr) {
      return this.fail(upstreamErr.message || String(upstreamErr))
    }
    if (!this.hasStopReason && this.partial.content.length === 0 && this.tools.length === 0) {
      return this.fail('Devin stream ended without generated content')
    }
    let reason = this.stopReason
    if (!this.hasStopReason) reason = 'stop'
    if (reason === 'error') return this.fail('Devin stopped with an error')
    return this.complete(reason)
  }

  // ─── 内部方法 ─────────────────────────────────────────────────────────────

  private updateMetadata(response: GetChatMessageResponse): void {
    if (response.messageId) this.partial.responseID = response.messageId
    if (response.actualModelUid) this.partial.responseModel = response.actualModelUid
    if (response.timestamp) {
      this.partial.timestampMS = Number(response.timestamp.seconds) * 1000 + Math.floor(response.timestamp.nanos / 1e6)
    }
    const usage = response.usage
    if (usage) {
      if (!this.partial.responseModel && usage.modelUid) {
        this.partial.responseModel = usage.modelUid
      }
      this.partial.usage.input = Number(usage.inputTokens)
      this.partial.usage.output = Number(usage.outputTokens)
      this.partial.usage.cacheRead = Number(usage.cacheReadTokens)
      this.partial.usage.cacheWrite = Number(usage.cacheWriteTokens)
      this.partial.usage.totalTokens =
        this.partial.usage.input +
        this.partial.usage.output +
        this.partial.usage.cacheRead +
        this.partial.usage.cacheWrite
    }
  }

  private decodeThinking(response: GetChatMessageResponse): ResponseEvent[] {
    const events: ResponseEvent[] = []
    if (!this.thinkingOpen) {
      this.thinking = { type: 'thinking', thinking: '', thinkingSignature: '', redacted: response.thinkingRedacted }
      this.thinkingBuilder = ''
      this.thinkingSigBuilder = ''
      this.partial.content.push(this.thinking)
      this.thinkIdx = this.partial.content.length - 1
      this.thinkingOpen = true
      events.push({ ...emptyEvent('thinking_start'), contentIndex: this.thinkIdx, partial: this.partial })
    }
    if (response.deltaThinking) this.thinkingBuilder += response.deltaThinking
    if (response.deltaSignature) this.thinkingSigBuilder += response.deltaSignature
    if (this.thinking) {
      this.thinking.redacted = this.thinking.redacted || response.thinkingRedacted
      this.thinking.thinkingSignature = this.thinkingSigBuilder
      this.partial.content[this.thinkIdx] = this.thinking
    }
    if (response.deltaThinking) {
      events.push({
        ...emptyEvent('thinking_delta'),
        contentIndex: this.thinkIdx,
        delta: response.deltaThinking,
        partial: this.partial,
      })
    }
    return events
  }

  private decodeText(delta: string): ResponseEvent[] {
    const events: ResponseEvent[] = []
    if (!this.textOpen) {
      this.text = { type: 'text', text: '' }
      this.textBuilder = ''
      this.partial.content.push(this.text)
      this.textIdx = this.partial.content.length - 1
      this.textOpen = true
      events.push({ ...emptyEvent('text_start'), contentIndex: this.textIdx, partial: this.partial })
    }
    this.textBuilder += delta
    events.push({
      ...emptyEvent('text_delta'),
      contentIndex: this.textIdx,
      delta,
      partial: this.partial,
    })
    return events
  }

  private decodeTool(delta: ExaCodeiumCommonPb_ChatToolCall): ResponseEvent[] {
    const events: ResponseEvent[] = []
    let state = this.findTool(delta.id)
    if (!state) {
      state = {
        call: { type: 'toolCall', id: delta.id, name: delta.name, arguments: '{}' },
        contentIdx: -1,
        arguments: '',
        emitted: false,
      }
      this.tools.push(state)
    }
    if (delta.id) state.call.id = delta.id
    if (delta.name) state.call.name = delta.name
    const fragment = delta.argumentsJson
    const hasFragment = !!delta.argumentsJson
    if (hasFragment) state.arguments += fragment

    if (!state.emitted) {
      state.contentIdx = this.partial.content.length
      state.emitted = true
      this.partial.content.push(state.call)
      events.push({
        ...emptyEvent('toolcall_start'),
        contentIndex: state.contentIdx,
        toolCallID: state.call.id,
        toolName: state.call.name,
        partial: this.partial,
      })
    }
    if (hasFragment) {
      events.push({
        ...emptyEvent('toolcall_delta'),
        contentIndex: state.contentIdx,
        toolCallID: state.call.id,
        delta: fragment,
        partial: this.partial,
      })
    }
    return events
  }

  private endThinking(): ResponseEvent[] {
    if (!this.thinkingOpen || !this.thinking) return []
    this.thinkingOpen = false
    this.thinking.thinking = this.thinkingBuilder
    this.thinking.thinkingSignature = this.thinkingSigBuilder
    this.partial.content[this.thinkIdx] = this.thinking
    return [{
      ...emptyEvent('thinking_end'),
      contentIndex: this.thinkIdx,
      content: this.thinking.thinking,
      partial: this.partial,
    }]
  }

  private endText(): ResponseEvent[] {
    if (!this.textOpen || !this.text) return []
    this.textOpen = false
    this.text.text = this.textBuilder
    this.partial.content[this.textIdx] = this.text
    return [{
      ...emptyEvent('text_end'),
      contentIndex: this.textIdx,
      content: this.text.text,
      partial: this.partial,
    }]
  }

  private findTool(id: string): ToolState | undefined {
    if (id) return this.tools.find((t) => t.call.id === id)
    if (this.tools.length > 0) return this.tools[this.tools.length - 1]
    return undefined
  }

  private complete(reason: StopReason): ResponseEvent[] {
    if (this.finished) return []
    const events: ResponseEvent[] = []
    this.partial.stopReason = reason
    events.push(...this.endThinking())
    events.push(...this.endText())
    for (const state of this.tools) {
      if (!state.emitted) continue
      state.call.arguments = isJSONObject(state.arguments) ? state.arguments : '{}'
      this.partial.content[state.contentIdx] = state.call
      events.push({
        ...emptyEvent('toolcall_end'),
        contentIndex: state.contentIdx,
        toolCall: state.call,
        partial: this.partial,
      })
    }
    events.push({ ...emptyEvent('done'), reason, message: this.partial })
    this.finished = true
    return events
  }

  private fail(message: string): ResponseEvent[] {
    if (this.finished) return []
    this.partial.stopReason = 'error'
    this.partial.errorMessage = message
    this.finished = true
    return [{ ...emptyEvent('error'), reason: 'error', error: this.partial }]
  }
}

// ─── 响应流：包装 Connect ServerStreaming ────────────────────────────────────

import type { ConnectRouter } from '@connectrpc/connect'
import type { StreamResponse } from '@connectrpc/connect'

export class DevinResponseStream implements ResponseStream {
  private decoder: ResponseDecoder
  private upstream: AsyncIterable<GetChatMessageResponse>
  private iterator: AsyncIterator<GetChatMessageResponse> | null = null
  private queue: ResponseEvent[] = []
  private started = false
  private finished = false
  private upstreamError: Error | null = null

  constructor(model: string, upstream: AsyncIterable<GetChatMessageResponse>) {
    this.decoder = new ResponseDecoder(model)
    this.upstream = upstream
  }

  async *recv(): AsyncIterable<ResponseEvent> {
    if (!this.started) {
      this.started = true
      yield* this.decoder.start()
    }

    if (!this.iterator) this.iterator = this.upstream[Symbol.asyncIterator]()

    while (!this.finished) {
      const { done, value, error } = await safeNext(this.iterator)
      if (error) {
        this.upstreamError = error
        this.finished = true
        yield* this.decoder.finish(error)
        return
      }
      if (done) {
        this.finished = true
        yield* this.decoder.finish(this.upstreamError)
        return
      }
      if (value) yield* this.decoder.decode(value)
    }
  }
}

async function safeNext<T>(iter: AsyncIterator<T>): Promise<{ done: boolean; value: T | null; error: Error | null }> {
  try {
    const result = await iter.next()
    return { done: result.done ?? false, value: result.value ?? null, error: null }
  } catch (e) {
    return { done: true, value: null, error: e instanceof Error ? e : new Error(String(e)) }
  }
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

function emptyPartial(model: string): AssistantMessage {
  return {
    role: 'assistant',
    content: [],
    api: 'connect',
    provider: 'devin',
    model,
    responseModel: '',
    responseID: '',
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
    stopReason: 'pending',
    errorMessage: '',
    timestampMS: Date.now(),
  }
}

function emptyEvent(type: ResponseEvent['type']): ResponseEvent {
  return {
    type,
    contentIndex: 0,
    delta: '',
    content: '',
    partial: null,
    toolCallID: '',
    toolName: '',
    toolCall: null,
    reason: 'pending',
    message: null,
    error: null,
  }
}

function isJSONObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function mapStopReason(reason: ExaCodeiumCommonPb_StopReason): StopReason {
  switch (reason) {
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_MAX_TOKENS:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_INCOMPLETE:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_PARTIAL:
      return 'length'
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_FUNCTION_CALL:
      return 'toolUse'
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_ERROR:
      return 'error'
    default:
      return 'stop'
  }
}
