// 限流重置解析与提醒行为的回归测试。
// 运行：pnpm test（node --test，Node 24 直接执行 TypeScript）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RATE_LIMIT_MESSAGE,
  backoffDelay,
  describeWait,
  formatResetLocal,
  formatResetUtc,
  originalMessage,
  parseRateLimitReset,
} from '../src/adapter/rate-limit.ts'
import { RateLimitWatcher, type RateLimitNotice } from '../src/adapter/rate-limit-watch.ts'

/** 本轮失败的真实文案（相对时长 + UTC 钟点）。 */
const FAILURE =
  `[resource_exhausted] Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).`

test('原始报错文案原样保留', () => {
  assert.equal(
    RATE_LIMIT_MESSAGE,
    'Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model.',
  )
  const parsed = parseRateLimitReset(FAILURE, { now: Date.UTC(2026, 10, 14, 19, 13) })
  assert.ok(parsed.message.includes(RATE_LIMIT_MESSAGE))
  assert.equal(parsed.code, 'resource_exhausted')
})

test('解析相对时长 1 小时 48 分钟', () => {
  const parsed = parseRateLimitReset(FAILURE, { now: Date.UTC(2026, 10, 14, 19, 13) })
  assert.equal(parsed.relativeMs, (1 * 60 + 48) * 60_000)
  assert.equal(parsed.guessed, false)
})

test('解析绝对钟点 21:01 UTC 并对齐到最近的同一天', () => {
  const now = Date.UTC(2026, 10, 14, 19, 13)
  const parsed = parseRateLimitReset(FAILURE, { now })
  assert.equal(parsed.resetAt, Date.UTC(2026, 10, 14, 21, 1))
  assert.equal(parsed.absoluteUtc, '21:01 UTC')
  assert.equal(parsed.waitMs, (1 * 60 + 48) * 60_000)
})

test('只有相对时长时按其计算，只有绝对钟点时按钟点计算', () => {
  const now = Date.UTC(2026, 10, 14, 19, 13)
  const relativeOnly = parseRateLimitReset('[resource_exhausted] reset in 30 minutes', { now })
  assert.equal(relativeOnly.resetAt, now + 30 * 60_000)
  const absoluteOnly = parseRateLimitReset('[resource_exhausted] reset (at 21:01 UTC)', { now })
  assert.equal(absoluteOnly.resetAt, Date.UTC(2026, 10, 14, 21, 1))
})

test('两者都没有时用兜底时长并标记 guessed', () => {
  const now = Date.UTC(2026, 10, 14, 19, 13)
  const parsed = parseRateLimitReset('[resource_exhausted] slow down', { now, fallbackMs: 600_000 })
  assert.equal(parsed.guessed, true)
  assert.equal(parsed.resetAt, now + 600_000)
})

test('已过点的绝对钟点回退到次日', () => {
  // 22:30 UTC 收到「21:01 UTC」→ 应指第二天
  const now = Date.UTC(2026, 10, 14, 22, 30)
  const parsed = parseRateLimitReset('[resource_exhausted] (at 21:01 UTC)', { now })
  assert.equal(parsed.resetAt, Date.UTC(2026, 10, 15, 21, 1))
})

test('重置时间换算成本地时间（Asia/Shanghai）与 UTC', () => {
  const resetAt = Date.UTC(2026, 10, 14, 21, 1)
  assert.equal(formatResetUtc(resetAt), '2026-11-14 21:01:00 UTC')
  assert.equal(formatResetLocal(resetAt, { timeZone: 'Asia/Shanghai' }), '2026-11-15 05:01:00 UTC+8')
})

test('剥离适配器前缀后与上游原文一致', () => {
  assert.equal(originalMessage(`Devin API: ${FAILURE}`), FAILURE)
  assert.equal(originalMessage(FAILURE), FAILURE)
})

test('describeWait 输出中文时长', () => {
  assert.equal(describeWait(((1 * 60 + 48) * 60_000)), '1 小时 48 分钟')
  assert.equal(describeWait(45_000), '45 秒')
})

test('退避按指数增长并封顶', () => {
  const plan = { initialDelayMs: 1_000, maxDelayMs: 8_000, jitterRatio: 0 }
  assert.equal(backoffDelay(1, plan, () => 0.5), 1_000)
  assert.equal(backoffDelay(2, plan, () => 0.5), 2_000)
  assert.equal(backoffDelay(3, plan, () => 0.5), 4_000)
  assert.equal(backoffDelay(5, plan, () => 0.5), 8_000)
})

/** 假时钟 + 假定时器：手动推进时间并触发到点回调。 */
function fakeClock(start: number): {
  now: () => number
  schedule: (callback: () => void, delayMs: number) => () => void
  advance: (ms: number) => void
  pending: () => number
} {
  let current = start
  let seq = 0
  const timers = new Map<number, { at: number; callback: () => void }>()
  return {
    now: () => current,
    schedule: (callback, delayMs) => {
      const id = ++seq
      timers.set(id, { at: current + delayMs, callback })
      return () => {
        timers.delete(id)
      }
    },
    advance: (ms) => {
      const target = current + ms
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        const [id, timer] = due
        timers.delete(id)
        current = timer.at
        timer.callback()
      }
      current = target
    },
    pending: () => timers.size,
  }
}

test('到点前发预告、到点发「可以重新运行」提醒', () => {
  const start = Date.UTC(2026, 10, 14, 19, 13)
  const cycle = fakeClock(start)
  const notices: RateLimitNotice[] = []
  const watcher = new RateLimitWatcher({
    reminderLeadMs: 5 * 60_000,
    now: cycle.now,
    schedule: cycle.schedule,
    notify: (notice) => notices.push(notice),
  })
  const limit = parseRateLimitReset(FAILURE, { now: start })
  watcher.report(limit)

  assert.equal(watcher.status().active, true)
  assert.equal(watcher.status().resetAtLocal, '2026-11-15 05:01:00 UTC+8')

  // 距重置还有 5 分钟时才发预告
  cycle.advance(limit.resetAt - start - 6 * 60_000)
  assert.equal(notices.length, 0)
  cycle.advance(60_000)
  assert.equal(notices.length, 1)
  assert.equal(notices[0]!.kind, 'reminder')
  assert.equal(notices[0]!.code, 'resource_exhausted')
  assert.equal(notices[0]!.resetAtUtc, '2026-11-14 21:01:00 UTC')

  // 到点提醒
  cycle.advance(5 * 60_000)
  assert.equal(notices.length, 2)
  assert.equal(notices[1]!.kind, 'reset')
  assert.deepEqual(notices[1]!.message, FAILURE)
  assert.equal(watcher.status().active, false)
})

test('reminderLeadMs = 0 时只在到点发一次', () => {
  const start = Date.UTC(2026, 10, 14, 19, 13)
  const cycle = fakeClock(start)
  const notices: RateLimitNotice[] = []
  const watcher = new RateLimitWatcher({ reminderLeadMs: 0, now: cycle.now, schedule: cycle.schedule, notify: (n) => notices.push(n) })
  const limit = parseRateLimitReset(FAILURE, { now: start })
  watcher.report(limit)
  cycle.advance(limit.resetAt - start)
  assert.deepEqual(notices.map((n) => n.kind), ['reset'])
})

test('waitUntilReset 到点 resolve，取消时 reject AbortError', async () => {
  const start = Date.UTC(2026, 10, 14, 19, 13)
  const cycle = fakeClock(start)
  const watcher = new RateLimitWatcher({ now: cycle.now, schedule: cycle.schedule })
  const limit = parseRateLimitReset(FAILURE, { now: start })

  let settled = false
  const waiting = watcher.waitUntilReset(limit, undefined, 1).then(() => {
    settled = true
  })
  await Promise.resolve()
  assert.equal(settled, false)
  cycle.advance(limit.resetAt - start)
  await waiting
  assert.equal(settled, true)

  // 尚未到点的等待在取消时必须以 AbortError 结束（换一条还早的重置时间）
  const fresh = fakeClock(start)
  const pendingWatcher = new RateLimitWatcher({ now: fresh.now, schedule: fresh.schedule })
  const controller = new AbortController()
  const cancelled = pendingWatcher.waitUntilReset(limit, controller.signal, 1)
  controller.abort()
  await assert.rejects(cancelled, (error: Error) => error.name === 'AbortError')
})

test('取消周期会拒绝所有等待者', async () => {
  const start = Date.UTC(2026, 10, 14, 19, 13)
  const cycle = fakeClock(start)
  const watcher = new RateLimitWatcher({ now: cycle.now, schedule: cycle.schedule })
  const limit = parseRateLimitReset(FAILURE, { now: start })
  const waiting = watcher.waitUntilReset(limit, undefined, 1)
  watcher.cancel()
  await assert.rejects(waiting, (error: Error) => error.name === 'AbortError')
  assert.equal(watcher.status().active, false)
})

test('已到点的限流立即返回，不挂计时器', async () => {
  const start = Date.UTC(2026, 10, 14, 19, 13)
  const cycle = fakeClock(start)
  const watcher = new RateLimitWatcher({ now: cycle.now, schedule: cycle.schedule })
  const limit = parseRateLimitReset('[resource_exhausted] (at 21:01 UTC)', { now: start })
  await watcher.waitUntilReset({ ...limit, resetAt: start - 1 }, undefined, 1)
  assert.equal(cycle.pending(), 0)
})

test('configure 调整提前提醒量与尝试上限', () => {
  const watcher = new RateLimitWatcher({ reminderLeadMs: 5 * 60_000, maxResumeAttempts: 3 })
  watcher.configure({ reminderLeadMs: 0, maxResumeAttempts: 5 })
  assert.equal(watcher.maxAttempts, 5)
  assert.equal(watcher.status().maxResumeAttempts, 5)
})

test('重置点已过时按指数退避重试，且封顶', async () => {
  const cycle = fakeClock(Date.UTC(2026, 10, 14, 21, 30))
  const watcher = new RateLimitWatcher({
    now: cycle.now,
    schedule: cycle.schedule,
    backoff: { initialDelayMs: 1_000, maxDelayMs: 4_000, jitterRatio: 0 },
  })
  assert.equal(watcher.retryDelay(1), 1_000)
  assert.equal(watcher.retryDelay(2), 2_000)
  assert.equal(watcher.retryDelay(4), 4_000)

  let done = false
  const waiting = watcher.waitBackoff(2).then(() => {
    done = true
  })
  await Promise.resolve()
  assert.equal(done, false)
  cycle.advance(2_000)
  await waiting
  assert.equal(done, true)
})

test('退避等待可被取消信号打断', async () => {
  const watcher = new RateLimitWatcher({ schedule: () => () => {} })
  const controller = new AbortController()
  const waiting = watcher.waitBackoff(1, controller.signal)
  controller.abort()
  await assert.rejects(waiting, (error: Error) => error.name === 'AbortError')
})

test('autoResume 默认关闭，函数形式可热更新', () => {
  const flag = { value: false }
  const watcher = new RateLimitWatcher({ autoResume: () => flag.value })
  assert.equal(watcher.autoResume, false)
  flag.value = true
  assert.equal(watcher.autoResume, true)
})
