// 全局限流瀑布：非 devin provider 的免费模型撞限流时的兜底行为。
// 用假 chunk 流和假时钟，不发网络请求。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { rateLimitStream, resumeOnRateLimit } from '../src/adapter/rate-limit-observe.ts'
import { RateLimitWatcher } from '../src/adapter/rate-limit-watch.ts'

const FAILURE =
  'Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).'

const rateLimitFinish = (): StreamChunk[] => [{
  type: 'finish',
  reason: { kind: 'error', failure: { code: 'RATE_LIMIT', message: `[resource_exhausted] ${FAILURE}` } },
}] as never

const serverErrorFinish = (): StreamChunk[] => [{
  type: 'finish',
  reason: { kind: 'error', failure: { code: 'SERVER', message: 'boom' } },
}] as never

function fakeClock(start: number): {
  now: () => number
  schedule: (callback: () => void, delayMs: number) => () => void
  advance: (ms: number) => void
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
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        const [id, timer] = due
        timers.delete(id)
        current = timer.at
        timer.callback()
      }
      current = target
    },
  }
}

/** 会按脚本依次给出 fail / ok 的流工厂。 */
function scriptedStream(script: Array<'fail' | 'ok'>): () => AsyncIterable<StreamChunk> {
  let round = 0
  return () => {
    const roundNo = Math.min(round++, script.length - 1)
    const kind = script[roundNo]!
    return (async function* (): AsyncIterable<StreamChunk> {
      if (kind === 'ok') {
        yield { type: 'block-start', index: 0, blockType: 'text' } as never
        yield { type: 'text-delta', index: 0, text: 'hello' } as never
        yield { type: 'finish', reason: { kind: 'stop' } } as never
        return
      }
      yield* rateLimitFinish()
    })()
  }
}

test('关闭自动继续：只登记提醒，把限流错误抛出', async () => {
  const cycle = fakeClock(Date.UTC(2026, 10, 14, 19, 13))
  const watcher = new RateLimitWatcher({ autoResume: false, now: cycle.now, schedule: cycle.schedule })
  const stream = rateLimitStream(scriptedStream(['fail', 'ok']), watcher)
  await assert.rejects(
    (async () => {
      for await (const _ of stream) void _
    })(),
    (error: Error) => (error as Error & { code?: string }).code === 'RATE_LIMIT',
  )
  assert.equal(watcher.status().active, true)
  assert.deepEqual(watcher.status().resetAtUtc, '2026-11-14 21:01:00 UTC')
})

test('瀑布层只观察：自动继续开启时 next 也只调一次，不重放', async () => {
  // cordis waterfall 的 next 是一次性的：rateLimitStream 必须只调用一次，
  // 否则生产环境会抛 next() called multiple times。
  const cycle = fakeClock(Date.UTC(2026, 10, 14, 19, 13))
  const watcher = new RateLimitWatcher({ autoResume: true, now: cycle.now, schedule: cycle.schedule })
  let calls = 0
  const stream = rateLimitStream(() => {
    calls++
    return scriptedStream(['fail', 'ok'])()
  }, watcher)
  await assert.rejects(
    (async () => {
      for await (const _ of stream) void _
    })(),
    (error: Error) => (error as Error & { code?: string }).code === 'RATE_LIMIT',
  )
  assert.equal(calls, 1)
  assert.equal(watcher.status().active, true)
})

test('开启自动继续：等重置点后重放成功，只产出一份内容', async () => {
  const cycle = fakeClock(Date.UTC(2026, 10, 14, 19, 13))
  const watcher = new RateLimitWatcher({ autoResume: true, now: cycle.now, schedule: cycle.schedule })
  const stream = resumeOnRateLimit(scriptedStream(['fail', 'ok']), watcher)
  const chunks: StreamChunk[] = []
  let finished = false
  const done = (async () => {
    for await (const chunk of stream) chunks.push(chunk)
    finished = true
  })()
  // 生成器要跑过「读首帧 → 登记 → 等重置」才挂上计时器：
  // 反复让出事件循环并小步推进假时钟，直到它完成。
  for (let i = 0; i < 100 && !finished; i++) {
    await new Promise((resolve) => setImmediate(resolve))
    cycle.advance(5 * 60_000)
  }
  await done
  const texts = chunks.filter((c): c is Extract<StreamChunk, { type: 'text-delta' }> => c.type === 'text-delta')
  assert.equal(texts.length, 1)
  assert.equal(texts[0]!.text, 'hello')
  assert.equal(watcher.status().active, false)
})

test('已经产出内容后撞限流：不重放，原样抛出', async () => {
  const cycle = fakeClock(Date.UTC(2026, 10, 14, 19, 13))
  const watcher = new RateLimitWatcher({ autoResume: true, now: cycle.now, schedule: cycle.schedule })
  let round = 0
  const factory = (): AsyncIterable<StreamChunk> => {
    const roundNo = round++
    return (async function* (): AsyncIterable<StreamChunk> {
      if (roundNo === 0) {
        yield { type: 'text-delta', index: 0, text: 'partial' } as never
        yield* rateLimitFinish()
        return
      }
      throw new Error('should not retry after emission')
    })()
  }
  const stream = resumeOnRateLimit(factory, watcher)
  const chunks: StreamChunk[] = []
  await assert.rejects(
    (async () => {
      for await (const chunk of stream) chunks.push(chunk)
    })(),
    (error: Error) => (error as Error & { code?: string }).code === 'RATE_LIMIT',
  )
  assert.equal(chunks.length, 1)
})

test('非限流错误原样透传，不登记状态', async () => {
  const watcher = new RateLimitWatcher({ now: () => Date.UTC(2026, 10, 14, 19, 13), schedule: () => () => {} })
  const stream = rateLimitStream(serverErrorFinish, watcher)
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  assert.equal(chunks.length, 1)
  assert.equal(chunks[0]!.type, 'finish')
  assert.equal(watcher.status().active, false)
})
