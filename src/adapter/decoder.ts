// Devin protobuf 响应帧 → dsh StreamChunk 转换。
// 翻译自 devin-2api 的 response decoder，但输出 dsh-llm 的 StreamChunk 协议。

import type { GetChatMessageResponse } from '../proto/gen/devin_pb.ts'
import {
  ExaCodeiumCommonPb_StopReason,
} from '../proto/gen/devin_pb.ts'
import type {
  CallId,
  ContentBlock,
  FinishReason,
  StreamChunk,
  TokenUsage,
} from '@deepseek-ai/dsh-llm'
import { CallId as CallIdFn, LlmError } from '@deepseek-ai/dsh-llm'

interface ToolState {
  callId: CallId
  name: string
  arguments: string
  blockIndex: number
  started: boolean
  ended: boolean
}

export class DevinStreamDecoder {
  private nextIndex = 0
  private textIndex = -1
  private textStarted = false
  private textBuilder = ''
  private reasoningIndex = -1
  private reasoningStarted = false
  private reasoningBuilder = ''
  private tools: ToolState[] = []
  private currentUsage: TokenUsage | null = null
  private stopReason: ExaCodeiumCommonPb_StopReason = ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_UNSPECIFIED
  private finished = false

  decode(response: GetChatMessageResponse): StreamChunk[] {
    const chunks: StreamChunk[] = []
    if (!response || this.finished) return chunks

    const usage = response.usage
    if (usage) {
      const u: TokenUsage = {
        inputTokens: Number(usage.inputTokens),
        outputTokens: Number(usage.outputTokens),
      }
      if (usage.cacheReadTokens) u.cacheReadTokens = Number(usage.cacheReadTokens)
      if (usage.cacheWriteTokens) u.cacheWriteTokens = Number(usage.cacheWriteTokens)
      this.currentUsage = u
    }

    if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
      if (!this.reasoningStarted) {
        this.reasoningIndex = this.nextIndex++
        this.reasoningStarted = true
        this.reasoningBuilder = ''
        chunks.push({ type: 'block-start', index: this.reasoningIndex, blockType: 'reasoning' })
      }
      if (response.deltaThinking) {
        this.reasoningBuilder += response.deltaThinking
        chunks.push({ type: 'reasoning-delta', index: this.reasoningIndex, text: response.deltaThinking })
      }
    }

    if (response.deltaText) {
      if (this.reasoningStarted) {
        chunks.push({ type: 'block-end', index: this.reasoningIndex, block: { type: 'reasoning', text: this.reasoningBuilder } })
        this.reasoningStarted = false
      }
      if (!this.textStarted) {
        this.textIndex = this.nextIndex++
        this.textStarted = true
        this.textBuilder = ''
        chunks.push({ type: 'block-start', index: this.textIndex, blockType: 'text' })
      }
      this.textBuilder += response.deltaText
      chunks.push({ type: 'text-delta', index: this.textIndex, text: response.deltaText })
    }

    for (const delta of response.deltaToolCalls) {
      if (this.reasoningStarted) {
        chunks.push({ type: 'block-end', index: this.reasoningIndex, block: { type: 'reasoning', text: this.reasoningBuilder } })
        this.reasoningStarted = false
      }
      if (this.textStarted) {
        chunks.push({ type: 'block-end', index: this.textIndex, block: { type: 'text', text: this.textBuilder } })
        this.textStarted = false
      }

      let state = this.findTool(delta.id)
      if (!state) {
        state = {
          callId: CallIdFn(delta.id || `call_${this.tools.length}`),
          name: delta.name || '',
          arguments: '',
          blockIndex: this.nextIndex++,
          started: false,
          ended: false,
        }
        this.tools.push(state)
      }
      if (delta.id) state.callId = CallIdFn(delta.id)
      if (delta.name) state.name = delta.name

      if (!state.started) {
        state.started = true
        chunks.push({ type: 'block-start', index: state.blockIndex, blockType: 'tool-call' })
        chunks.push({
          type: 'tool-call-delta',
          index: state.blockIndex,
          id: state.callId,
          name: state.name,
          argumentsDelta: '',
        })
      }
      if (delta.argumentsJson) {
        state.arguments += delta.argumentsJson
        chunks.push({
          type: 'tool-call-delta',
          index: state.blockIndex,
          id: state.callId,
          argumentsDelta: delta.argumentsJson,
        })
      }
    }

    if (response.stopReason !== ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_UNSPECIFIED) {
      this.stopReason = response.stopReason
    }

    return chunks
  }

  finish(upstreamError: Error | null): StreamChunk[] {
    const chunks: StreamChunk[] = []
    if (this.finished) return chunks
    this.finished = true

    if (upstreamError) {
      chunks.push({
        type: 'finish',
        reason: {
          kind: 'error',
          failure: {
            message: upstreamError.message || String(upstreamError),
            code: 'TRANSPORT',
          },
        },
      })
      return chunks
    }

    if (this.reasoningStarted) {
      chunks.push({ type: 'block-end', index: this.reasoningIndex, block: { type: 'reasoning', text: this.reasoningBuilder } })
    }
    if (this.textStarted) {
      chunks.push({ type: 'block-end', index: this.textIndex, block: { type: 'text', text: this.textBuilder } })
    }
    for (const state of this.tools) {
      if (!state.ended) {
        state.ended = true
        const block: ContentBlock = {
          type: 'tool-call',
          id: state.callId,
          name: state.name,
          arguments: isJSONObject(state.arguments) ? state.arguments : '{}',
        }
        chunks.push({ type: 'block-end', index: state.blockIndex, block })
      }
    }

    if (this.currentUsage) {
      chunks.push({ type: 'usage', usage: this.currentUsage })
    }

    chunks.push({ type: 'finish', reason: mapFinishReason(this.stopReason) })
    return chunks
  }

  private findTool(id: string): ToolState | undefined {
    if (id) return this.tools.find((t) => t.callId === id)
    if (this.tools.length > 0) return this.tools[this.tools.length - 1]
    return undefined
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

function mapFinishReason(reason: ExaCodeiumCommonPb_StopReason): FinishReason {
  switch (reason) {
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_MAX_TOKENS:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_INCOMPLETE:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_PARTIAL:
      return { kind: 'max-tokens' }
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_FUNCTION_CALL:
      return { kind: 'tool-calls' }
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_ERROR:
      return {
        kind: 'error',
        failure: { message: 'Devin stopped with an error', code: 'SERVER' },
      }
    default:
      return { kind: 'stop' }
  }
}

export function connectErrorCode(message: string): string {
  const colonIdx = message.indexOf(':')
  if (colonIdx >= 0) {
    const code = message.slice(0, colonIdx).trim()
    const known: Record<string, string> = {
      invalid_argument: 'INVALID_REQUEST',
      failed_precondition: 'INVALID_REQUEST',
      out_of_range: 'INVALID_REQUEST',
      unimplemented: 'INVALID_REQUEST',
      unauthenticated: 'AUTH',
      permission_denied: 'AUTH',
      not_found: 'NOT_FOUND',
      resource_exhausted: 'RATE_LIMIT',
      deadline_exceeded: 'TIMEOUT',
      unavailable: 'SERVER',
      internal: 'SERVER',
      unknown: 'SERVER',
    }
    if (known[code]) return known[code]!
  }
  return 'TRANSPORT'
}

export function wrapConnectError(err: unknown): LlmError {
  if (err instanceof LlmError) return err
  const message = err instanceof Error ? err.message : String(err)
  return new LlmError(`Devin API: ${message}`, connectErrorCode(message), { cause: err as Error })
}
