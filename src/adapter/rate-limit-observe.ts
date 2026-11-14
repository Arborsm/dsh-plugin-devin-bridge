// 全局限流兜底：包住 dsh-llm 的 llm/stream 瀑布，让任何经 dsh-llm 路由的
// 模型（含其他 provider 的免费模型）都能享受「到点提醒 + 可选自动继续」。
//
// 自动继续的安全边界：只在本次尝试**没有产出任何 chunk** 时重放。限流通常
// 在首帧之前就被拒绝，此时重放不会产生重复内容；一旦已经下发过文本/推理/
// 工具调用，只登记提醒并原样抛出，避免把两段回答拼进同一条消息。

import { LlmError, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { findRateLimitFailure, originalMessage } from './rate-limit.ts'
import type { RateLimitWatcher } from './rate-limit-watch.ts'

/** 观察器日志钩子（只在诊断时需要）。 */
export type RateLimitLog = (level: 'info' | 'warn', message: string) => void

/**
 * 把下游 chunk 流包一层限流处理：
 *   - 撞限流即登记到点提醒（无论自动继续是否开启）；
 *   - 自动继续开启、未取消、未超次数，且本次尝试没有产出时，
 *     等到重置点（已过点则指数退避）后重新调用 next()。
 * @param next - 瀑布的下一环；可重复调用以获得新的 chunk 流。
 * @param watcher - 共享的限流运行时。
 * @param log - 可选日志。
 */
export function rateLimitStream(
  next: () => AsyncIterable<StreamChunk>,
  watcher: RateLimitWatcher,
  log?: RateLimitLog,
  signal?: AbortSignal,
): AsyncIterable<StreamChunk> {
  return (async function* stream(): AsyncIterable<StreamChunk> {
    const maxAttempts = watcher.autoResume ? watcher.maxAttempts : 1
    for (let attempt = 1; ; attempt++) {
      let emitted = false
      let failure: { code: string; message: string } | undefined
      try {
        for await (const chunk of next()) {
          // finish 错误块：限流时不透传给用户，交给等待逻辑；其他错误原样透传。
          if (chunk.type === 'finish' && chunk.reason?.kind === 'error') {
            const limit = findRateLimitFailure([chunk])
            if (limit) {
              failure = limit
              break
            }
          }
          emitted = true
          yield chunk
        }
      } catch (error) {
        failure = toRateLimitFailure(error)
        if (!failure) throw error
      }

      if (!failure) return

      // 已经产出内容：登记提醒后把限流错误原样抛出，不重放。
      const limit = watcher.parse(originalMessage(failure.message))
      try {
        watcher.report(limit)
      } catch (error) {
        log?.('warn', `devin-bridge: 限流观察器登记失败：${error instanceof Error ? error.message : String(error)}`)
      }
      if (emitted || !watcher.autoResume || signal?.aborted || attempt >= maxAttempts) {
        throw rateLimitError(limit.message)
      }

      try {
        if (limit.resetAt > watcher.now()) await watcher.waitUntilReset(limit, signal, attempt)
        else await watcher.waitBackoff(attempt, signal)
      } catch (error) {
        // 调用方自己的取消信号：透传 AbortError，不伪装成限流失败；
        // 周期被取消（cancelRateLimit/新周期/插件卸载）才回退为原始限流失败。
        if (signal?.aborted) throw error
        throw rateLimitError(limit.message)
      }
      log?.('info', `devin-bridge: 限流窗口已重置，即将进行第 ${attempt + 1}/${maxAttempts} 次尝试`)
    }
  })()
}

/** 从抛出的错误里识别限流（Connect/gRPC 风格的消息）。 */
function toRateLimitFailure(error: unknown): { code: string; message: string } | undefined {
  if (error === null || error === undefined) return undefined
  const record = error as { code?: unknown; message?: unknown }
  const code = typeof record.code === 'string' ? record.code : ''
  const message = typeof record.message === 'string' ? record.message : String(error)
  const isRateLimit = code === 'RATE_LIMIT' || /\brate[\s_-]?limit|resource_exhausted|too many requests/i.test(message)
  if (!isRateLimit) return undefined
  return { code: code || 'RATE_LIMIT', message: originalMessage(message) }
}

/** 限流终止错误：用 dsh-llm 的 LlmError，保住 RATE_LIMIT 码供上层重试策略识别。 */
function rateLimitError(message: string): LlmError {
  return new LlmError(message, 'RATE_LIMIT')
}
