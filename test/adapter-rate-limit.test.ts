// 适配器层：流内限流失败如何被识别与登记（纯函数，不发起网络请求）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findRateLimitFailure, originalMessage, parseRateLimitReset } from '../src/adapter/rate-limit.ts'
import { RateLimitWatcher } from '../src/adapter/rate-limit-watch.ts'

const FAILURE =
  'Devin API: [resource_exhausted] Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).'

const finishChunk = (code: string, message: string) => ([{
  type: 'finish',
  reason: { kind: 'error', failure: { code, message } },
}])

test('解码器尾块中的 RATE_LIMIT 被识别为限流失败', () => {
  const limit = findRateLimitFailure(finishChunk('RATE_LIMIT', FAILURE))
  assert.equal(limit?.code, 'RATE_LIMIT')
  assert.ok(limit!.message.includes('Reached free model rate limit.'))
})

test('其他失败码与正常结束都不当作限流', () => {
  assert.equal(findRateLimitFailure(finishChunk('SERVER', 'boom')), undefined)
  assert.equal(findRateLimitFailure([{ type: 'finish', reason: { kind: 'stop' } }]), undefined)
  assert.equal(findRateLimitFailure([{ type: 'text-delta' }]), undefined)
})

test('适配器前缀不影响解析与通知文案', () => {
  const stripped = originalMessage(FAILURE)
  assert.ok(stripped.startsWith('[resource_exhausted]'))
  const parsed = parseRateLimitReset(stripped, { now: Date.UTC(2026, 10, 14, 19, 13) })
  assert.equal(parsed.resetAt, Date.UTC(2026, 10, 14, 21, 1))
  assert.deepEqual(parsed.message, stripped)
})

test('未开启自动继续：登记提醒但不阻塞（status.active 表示在等重置）', () => {
  const watcher = new RateLimitWatcher({ autoResume: false, now: () => Date.UTC(2026, 10, 14, 19, 13) })
  const limit = parseRateLimitReset(FAILURE, { now: Date.UTC(2026, 10, 14, 19, 13) })
  watcher.report(limit)
  assert.equal(watcher.status().active, true)
  assert.equal(watcher.autoResume, false)
  watcher.cancel()
  assert.equal(watcher.status().active, false)
})

test('关闭提醒后仍记录状态，只是不发通知', () => {
  const now = Date.UTC(2026, 10, 14, 19, 13)
  const notices: unknown[] = []
  const watcher = new RateLimitWatcher({
    enabled: false,
    now: () => now,
    schedule: () => () => {},
    notify: (notice) => notices.push(notice),
  })
  watcher.report(parseRateLimitReset(FAILURE, { now }))
  assert.equal(notices.length, 0)
  assert.equal(watcher.status().reminderEnabled, false)
  assert.equal(watcher.status().resetAtUtc, '2026-11-14 21:01:00 UTC')
})
