// Devin protobuf 响应帧 → dsh StreamChunk 转换。
// Devin 流式响应解码器，输出 dsh-llm 0.2 的 StreamChunk 协议。
//
// 行为要点：
//   - thinking 到达时先收尾打开的 text 块
//   - delta_signature 累计进 thinking 签名，随 finish.replayState 回传给 history
//   - 无 stop reason 且无任何内容时按 EMPTY_RESPONSE 失败
//   - usage.totalTokens = input + output + cacheRead + cacheWrite

import type { GetChatMessageResponse } from '../proto/gen/devin_pb.ts'
import {
  ExaCodeiumCommonPb_StopReason,
} from '../proto/gen/devin_pb.ts'
import {
  LlmError,
  ToolCallId,
  type BuiltinLlmFailureCode,
  type ContentBlock,
  type FinishReason,
  type ReplayEnvelope,
  type StreamChunk,
  type TokenUsage,
} from '@deepseek-ai/dsh-llm'

interface ToolState {
  callId: ToolCallId
  name: string
  arguments: string
  blockIndex: number
  started: boolean
  ended: boolean
}

/** 每个已发出 block 的 replay 元数据（与 content block 按下标对齐）。 */
interface BlockMeta {
  type: 'text' | 'reasoning' | 'tool-call'
  signature?: string
  redacted?: boolean
}

export class DevinStreamDecoder {
  private nextIndex = 0
  private textIndex = -1
  private textStarted = false
  private textBuilder = ''
  private reasoningIndex = -1
  private reasoningStarted = false
  private reasoningBuilder = ''
  private signatureBuilder = ''
  private reasoningRedacted = false
  private tools: ToolState[] = []
  private blockMeta: (BlockMeta | undefined)[] = []
  private messageId = ''
  private requestId = ''
  private actualModelUid = ''
  private hasContent = false
  private currentUsage: TokenUsage | null = null
  private hasStopReason = false
  private stopReason: ExaCodeiumCommonPb_StopReason = ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_UNSPECIFIED
  private finished = false

  decode(response: GetChatMessageResponse): StreamChunk[] {
    const chunks: StreamChunk[] = []
    if (!response || this.finished) return chunks

    if (response.messageId) this.messageId = response.messageId
    if (response.requestId) this.requestId = response.requestId
    if (response.actualModelUid) this.actualModelUid = response.actualModelUid

    const usage = response.usage
    if (usage) {
      const u: TokenUsage = {
        inputTokens: Number(usage.inputTokens),
        outputTokens: Number(usage.outputTokens),
      }
      if (usage.cacheReadTokens) u.cacheReadTokens = Number(usage.cacheReadTokens)
      if (usage.cacheWriteTokens) u.cacheWriteTokens = Number(usage.cacheWriteTokens)
      u.totalTokens = u.inputTokens + u.outputTokens + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0)
      this.currentUsage = u
    }

    if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
      // thinking 到达时收尾打开的 text 块
      chunks.push(...this.endText())
      if (!this.reasoningStarted) {
        this.reasoningIndex = this.nextIndex++
        this.reasoningStarted = true
        this.reasoningBuilder = ''
        this.signatureBuilder = ''
        this.reasoningRedacted = false
        chunks.push({ type: 'block-start', index: this.reasoningIndex, blockType: 'reasoning' })
      }
      if (response.deltaThinking) {
        this.reasoningBuilder += response.deltaThinking
        chunks.push({ type: 'reasoning-delta', index: this.reasoningIndex, text: response.deltaThinking })
      }
      if (response.deltaSignature) {
        this.signatureBuilder += response.deltaSignature
      }
      if (response.thinkingRedacted) this.reasoningRedacted = true
      this.hasContent = true
    }

    if (response.deltaText) {
      chunks.push(...this.endReasoning())
      if (!this.textStarted) {
        this.textIndex = this.nextIndex++
        this.textStarted = true
        this.textBuilder = ''
        chunks.push({ type: 'block-start', index: this.textIndex, blockType: 'text' })
      }
      this.textBuilder += response.deltaText
      chunks.push({ type: 'text-delta', index: this.textIndex, text: response.deltaText })
      this.hasContent = true
    }

    for (const delta of response.deltaToolCalls) {
      chunks.push(...this.endReasoning())
      chunks.push(...this.endText())

      let state = this.findTool(delta.id)
      if (!state) {
        state = {
          callId: ToolCallId(delta.id || `call_${this.tools.length}`),
          name: delta.name || '',
          arguments: '',
          blockIndex: this.nextIndex++,
          started: false,
          ended: false,
        }
        this.tools.push(state)
      }
      if (delta.id) state.callId = ToolCallId(delta.id)
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
      this.hasContent = true
    }

    if (response.stopReason !== ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_UNSPECIFIED) {
      this.hasStopReason = true
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
            code: connectErrorCode(upstreamError.message || String(upstreamError)),
          },
        },
      })
      return chunks
    }

    // 无 stop reason 且没有任何内容 → 空响应
    if (!this.hasStopReason && !this.hasContent) {
      chunks.push({
        type: 'finish',
        reason: {
          kind: 'error',
          failure: { message: 'Devin stream ended without generated content', code: 'EMPTY_RESPONSE' },
        },
      })
      return chunks
    }

    chunks.push(...this.endReasoning())
    chunks.push(...this.endText())
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

    chunks.push({
      type: 'finish',
      reason: mapFinishReason(this.stopReason, this.hasStopReason),
      replayState: this.replayEnvelope(),
    })
    return chunks
  }

  private endText(): StreamChunk[] {
    if (!this.textStarted) return []
    this.textStarted = false
    this.blockMeta[this.textIndex] = { type: 'text' }
    return [{ type: 'block-end', index: this.textIndex, block: { type: 'text', text: this.textBuilder } }]
  }

  private endReasoning(): StreamChunk[] {
    if (!this.reasoningStarted) return []
    this.reasoningStarted = false
    this.blockMeta[this.reasoningIndex] = {
      type: 'reasoning',
      ...this.signatureBuilder ? { signature: this.signatureBuilder } : {},
      ...this.reasoningRedacted ? { redacted: true } : {},
    }
    return [{ type: 'block-end', index: this.reasoningIndex, block: { type: 'reasoning', text: this.reasoningBuilder } }]
  }

  /** finish 时把 response 级与 block 级 replay 元数据打信封给 assembler。 */
  private replayEnvelope(): ReplayEnvelope | undefined {
    const response: Record<string, string> = {}
    if (this.requestId) response.requestId = this.requestId
    if (this.messageId) response.messageId = this.messageId
    if (this.actualModelUid) response.actualModelUid = this.actualModelUid
    const hasMeta = this.blockMeta.some((m) => m !== undefined)
    if (Object.keys(response).length === 0 && !hasMeta) return undefined
    return {
      response,
      ...hasMeta ? { blocks: this.blockMeta } : {},
    }
  }

  private findTool(id: string): ToolState | undefined {
    if (id) return this.tools.find((t) => t.callId === (id as ToolCallId))
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

function mapFinishReason(reason: ExaCodeiumCommonPb_StopReason, hasStopReason: boolean): FinishReason {
  if (reason === ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_ERROR) {
    return {
      kind: 'error',
      failure: { message: 'Devin stopped with an error', code: 'SERVER' },
    }
  }
  if (!hasStopReason) return { kind: 'stop' }
  switch (reason) {
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_MAX_TOKENS:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_INCOMPLETE:
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_PARTIAL:
      return { kind: 'max-tokens' }
    case ExaCodeiumCommonPb_StopReason.ExaCodeiumCommonPb_StopReason_STOP_REASON_FUNCTION_CALL:
      return { kind: 'tool-calls' }
    default:
      return { kind: 'stop' }
  }
}

function connectErrorCode(message: string): BuiltinLlmFailureCode {
  // Connect 错误消息格式："[permission_denied] ..." 或 "unavailable: ..."
  const bracket = message.match(/^\[([a-z_]+)\]/)
  const colonIdx = message.indexOf(':')
  const code = (bracket?.[1] ?? (colonIdx > 0 ? message.slice(0, colonIdx).trim() : '')).toLowerCase()
  const known: Record<string, BuiltinLlmFailureCode> = {
    invalid_argument: 'INVALID_REQUEST',
    failed_precondition: 'INVALID_REQUEST',
    out_of_range: 'INVALID_REQUEST',
    unimplemented: 'INVALID_REQUEST',
    unauthenticated: 'AUTH',
    // 上游 permission_denied 多为"该账号无权使用此模型"，不是密钥失效；
    // 映射成 MODEL_UNSUPPORTED 让原始消息透出（聊天 UI 对 AUTH 会
    // 强制改写为“API 密钥无效”）。
    permission_denied: 'MODEL_UNSUPPORTED',
    not_found: 'UNKNOWN_MODEL',
    resource_exhausted: 'RATE_LIMIT',
    deadline_exceeded: 'TIMEOUT',
    unavailable: 'SERVER',
    internal: 'SERVER',
    unknown: 'SERVER',
  }
  return known[code] ?? 'TRANSPORT'
}

export function wrapConnectError(err: unknown): LlmError {
  if (err instanceof LlmError) return err
  const message = err instanceof Error ? err.message : String(err)
  return new LlmError(`Devin API: ${message}`, connectErrorCode(message), { cause: err as Error })
}
