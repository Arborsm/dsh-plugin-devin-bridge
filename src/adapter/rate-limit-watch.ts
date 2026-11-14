// 限流重置监视器：到点提醒 + 到点自动继续，跑在 Host 进程。
//
// 调用方（llm/stream 瀑布上的 rateLimitStream、DevinAdapter 内的
// resumeOnRateLimit）撞上 RATE_LIMIT 后调用 report()：
//   - report() 安排「到点前预告」与「到点」两条通知（reminderLeadMs = 0 时
//     只在到点发一次）。通知本身不阻塞生成请求。
//   - 自动继续开启时，调用方接着 await waitUntilReset() 等到重置点再重放请求；
//     重置点已过则用 waitBackoff() 退避，次数受 maxResumeAttempts 限制。
//
// 定时器与时钟都可注入，便于用假时钟验证「21:01 UTC 到点」的行为。

import {
  backoffDelay,
  describeWait,
  formatResetLocal,
  formatResetUtc,
  parseRateLimitReset,
  type BackoffPlan,
  type RateLimitReset,
} from './rate-limit.ts'

/** 通知载荷：原始错误码、原文、重置时刻与本地换算。 */
export interface RateLimitNotice extends RateLimitReset {
  /** 重置时刻 UTC 展示，如 2026-11-14 21:01:00 UTC。 */
  resetAtUtc: string
  /** 重置时刻本地展示，如 2026-11-15 05:01:00 UTC+08:00。 */
  resetAtLocal: string
  /** reminder = 到点前预告；reset = 已到点。 */
  kind: 'reminder' | 'reset'
}

/** remote.devin.rateLimit() 返回的状态快照。 */
export interface RateLimitStatus {
  /** 是否还在等重置（含等待中的自动继续）。 */
  active: boolean
  code?: string
  message?: string
  resetAt?: number
  resetAtUtc?: string
  resetAtLocal?: string
  /** 距重置还剩多少毫秒；已到点为 0。 */
  remainingMs?: number
  /** 到点提醒是否开启（读实时配置）。 */
  reminderEnabled: boolean
  /** 现在是否开启自动继续（读实时配置）。 */
  autoResume: boolean
  /** 自动继续上限。 */
  maxResumeAttempts: number
  /** 本周期已进行的自动继续次数。 */
  resumeAttempts: number
  lastNotice?: 'reminder' | 'reset'
  lastNoticeAt?: number
}

export interface RateLimitWatchOptions {
  /** 到点前多少毫秒先发提醒；0 = 只在到点发，默认 5 分钟。 */
  reminderLeadMs?: number
  /** 到点提醒是否开启；可传函数读取实时配置。默认开启。 */
  enabled?: boolean | (() => boolean)
  /**
   * 重置点已过（或上游没给时间）时的退避计划。
   * 默认 5s 起、封顶 60s、±10% 抖动，避免连续撞限流。
   */
  backoff?: BackoffPlan
  /** 自动继续是否开启；可传函数读取实时配置。默认关闭。 */
  autoResume?: boolean | (() => boolean)
  /** 自动继续最大次数（含首轮），默认 3。 */
  maxResumeAttempts?: number
  /** 通知发送；Index 注入（日志 / webhook / 客户端状态）。 */
  notify?: (notice: RateLimitNotice) => void
  log?: (level: 'info' | 'warn' | 'error', message: string) => void
  /** 测试注入时钟，默认 Date.now。 */
  now?: () => number
  /** 测试注入定时器，默认 setTimeout / clearTimeout。 */
  schedule?: (callback: () => void, delayMs: number) => () => void
}

const DEFAULT_BACKOFF: BackoffPlan = { initialDelayMs: 5_000, maxDelayMs: 60_000, jitterRatio: 0.1 }

interface Waiter {
  resolve: () => void
  reject: (error: Error) => void
  signal?: AbortSignal
  onAbort?: () => void
}

interface Cycle {
  limit: RateLimitReset
  waiters: Waiter[]
  cancelTimers: Array<() => void>
  /** 预告通知是否已发出（重复上报重排计时器时不重发）。 */
  reminded: boolean
}

/** 退避等待句柄：不挂在 cycle 上，由 disposeCycle 统一取消。 */
interface PendingWait {
  cancel: () => void
}

/** 到点提醒 + 到点自动继续的运行时。 */
export class RateLimitWatcher {
  private leadMs: number
  private maxResumeAttempts: number
  private readonly backoff: BackoffPlan
  private readonly options: RateLimitWatchOptions
  private cycle: Cycle | null = null
  private readonly pendingWaits = new Set<PendingWait>()
  private lastNotice: 'reminder' | 'reset' | undefined
  private lastNoticeAt: number | undefined
  private attempts = 0

  constructor(options: RateLimitWatchOptions = {}) {
    this.options = options
    this.leadMs = Math.max(0, options.reminderLeadMs ?? 5 * 60_000)
    this.maxResumeAttempts = Math.max(1, options.maxResumeAttempts ?? 3)
    this.backoff = options.backoff ?? DEFAULT_BACKOFF
  }

  get autoResume(): boolean {
    const value = this.options.autoResume
    return typeof value === 'function' ? value() === true : value === true
  }

  /** 到点提醒当前是否开启（支持配置热更新）。 */
  get reminderEnabled(): boolean {
    const value = this.options.enabled
    return typeof value === 'function' ? value() !== false : value !== false
  }

  get maxAttempts(): number {
    return this.maxResumeAttempts
  }

  /** 本运行时的当前时刻（epoch 毫秒），与内部定时器同一时钟。 */
  now(): number {
    return this.clock()
  }

  /** 用本运行时的时钟解析一条限流报错（测试与生产共用同一时间基准）。 */
  parse(message: string): RateLimitReset {
    return parseRateLimitReset(message, { now: this.clock() })
  }

  /** 第 attempt 次自动继续前的退避延迟（毫秒），指数增长并封顶。 */
  retryDelay(attempt: number): number {
    return backoffDelay(attempt, this.backoff)
  }

  /**
   * 退避等待；signal 取消时以 AbortError 结束。
   * 用于重置时刻已过、或上游没给可解析时间的情况。
   */
  waitBackoff(attempt: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError())
    this.attempts = attempt
    return new Promise<void>((resolve, reject) => {
      const cancelTimer = this.scheduleFn()(() => {
        finish(() => resolve())
      }, this.retryDelay(attempt))
      const finish = (done: () => void): void => {
        signal?.removeEventListener('abort', onAbort)
        this.pendingWaits.delete(entry)
        done()
      }
      const onAbort = (): void => {
        cancelTimer()
        finish(() => reject(abortError()))
      }
      const entry: PendingWait = {
        cancel: () => {
          cancelTimer()
          finish(() => reject(abortError()))
        },
      }
      this.pendingWaits.add(entry)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * 调整提前提醒量与自动继续上限（配置热更新时调用）。
   * 已排好的预告计时器不会重排，下一个限流周期生效。
   */
  configure(next: { reminderLeadMs?: number; maxResumeAttempts?: number }): void {
    if (next.reminderLeadMs !== undefined) this.leadMs = Math.max(0, next.reminderLeadMs)
    if (next.maxResumeAttempts !== undefined) this.maxResumeAttempts = Math.max(1, next.maxResumeAttempts)
  }

  /** 当前限流状态；没有周期时 active=false。 */
  status(): RateLimitStatus {
    const base: RateLimitStatus = {
      active: false,
      reminderEnabled: this.reminderEnabled,
      autoResume: this.autoResume,
      maxResumeAttempts: this.maxResumeAttempts,
      resumeAttempts: this.attempts,
      ...this.lastNotice && this.lastNoticeAt !== undefined
        ? { lastNotice: this.lastNotice, lastNoticeAt: this.lastNoticeAt }
        : {},
    }
    if (!this.cycle) return base
    const remainingMs = Math.max(0, this.cycle.limit.resetAt - this.clock())
    return {
      ...base,
      active: remainingMs > 0,
      code: this.cycle.limit.code,
      message: this.cycle.limit.message,
      resetAt: this.cycle.limit.resetAt,
      resetAtUtc: formatResetUtc(this.cycle.limit.resetAt),
      resetAtLocal: formatResetLocal(this.cycle.limit.resetAt),
      remainingMs,
    }
  }

  /**
   * 登记一次限流：安排预告与到点通知。同一重置时刻重复上报只重置计时器，
   * 不会重复发同一条通知。
   */
  report(limit: RateLimitReset): void {
    // 同一重置时刻的重复上报（多会话、或多层监听同时撞限流）复用同一周期：
    // 更新数据并按新重置点重排计时器；通知由计时器发出，不会重复。
    // 相对时长换算出的毫秒可能相差几毫秒，因此给 60 秒容差。
    // 注意：watcher 只跟踪一个周期——重置点相距超过容差的上报会中止
    // 旧周期的等待者（多会话并发限流时以最新上报为准）。
    if (this.cycle && Math.abs(this.cycle.limit.resetAt - limit.resetAt) <= 60_000) {
      this.cycle.limit = limit
      this.armTimers(this.cycle)
      return
    }
    this.disposeCycle()
    const cycle: Cycle = { limit, waiters: [], cancelTimers: [], reminded: false }
    this.cycle = cycle
    this.armTimers(cycle)
  }

  /** 按 cycle.limit 排预告与到点计时器；已到点则立即通知并唤醒等待者。 */
  private armTimers(cycle: Cycle): void {
    for (const cancel of cycle.cancelTimers) cancel()
    cycle.cancelTimers.length = 0
    const remaining = cycle.limit.resetAt - this.clock()
    if (remaining <= 0) {
      this.emit(cycle.limit, 'reset')
      this.settle(cycle, null)
      if (this.cycle === cycle) this.cycle = null
      return
    }
    const lead = Math.min(this.leadMs, remaining)
    if (!cycle.reminded && lead > 0 && lead < remaining) {
      cycle.cancelTimers.push(this.scheduleFn()(() => {
        cycle.reminded = true
        this.emit(cycle.limit, 'reminder')
      }, remaining - lead))
    }
    cycle.cancelTimers.push(this.scheduleFn()(() => {
      this.emit(cycle.limit, 'reset')
      this.settle(cycle, null)
      this.attempts = 0
      if (this.cycle === cycle) this.cycle = null
    }, remaining))
  }

  /**
   * 等到重置点。已过点立即返回；signal 取消时以 AbortError 拒绝。
   * @param limit - 本次限流信息。
   * @param signal - 本轮生成请求的取消信号。
   * @param attempt - 第几次自动继续（1 起），用于状态展示。
   */
  waitUntilReset(limit: RateLimitReset, signal?: AbortSignal, attempt = 1): Promise<void> {
    this.attempts = attempt
    if (this.cycle === null || this.cycle.limit.resetAt !== limit.resetAt) this.report(limit)
    const cycle = this.cycle
    if (cycle === null) return Promise.resolve()
    if (signal?.aborted) return Promise.reject(abortError())
    const remaining = limit.resetAt - this.clock()
    if (remaining <= 0) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal }
      if (signal) {
        waiter.onAbort = () => {
          this.removeWaiter(cycle, waiter)
          reject(abortError())
        }
        signal.addEventListener('abort', waiter.onAbort, { once: true })
      }
      cycle.waiters.push(waiter)
    })
  }

  /** 取消当前周期：关闭自动继续或插件卸载时调用。 */
  cancel(): void {
    this.disposeCycle()
  }

  /** 一条可直接展示给用户的提醒文案（错误码 + 重置时间 + 可重跑）。 */
  describe(limit: RateLimitReset, kind: RateLimitNotice['kind'] = 'reset'): string {
    const resetUtc = formatResetUtc(limit.resetAt)
    const resetLocal = formatResetLocal(limit.resetAt)
    const head = kind === 'reset' ? '限流已重置，可以重新运行' : '限流即将重置，可以准备重新运行'
    const left = kind === 'reset' ? '' : `（还剩 ${describeWait(limit.resetAt - this.clock())}）`
    return `[${limit.code}] ${head} · 重置时间 ${resetUtc} · 本地 ${resetLocal}${left}`
  }

  private settle(cycle: Cycle, error: Error | null): void {
    const waiters = cycle.waiters.splice(0)
    for (const waiter of waiters) {
      if (waiter.signal && waiter.onAbort) waiter.signal.removeEventListener('abort', waiter.onAbort)
      if (error) waiter.reject(error)
      else waiter.resolve()
    }
  }

  private removeWaiter(cycle: Cycle, waiter: Waiter): void {
    const index = cycle.waiters.indexOf(waiter)
    if (index >= 0) cycle.waiters.splice(index, 1)
  }

  private disposeCycle(): void {
    // 退避等待不挂在 cycle 上：单独清掉，保证 cancel()/新周期/插件卸载都能中断它。
    for (const pending of [...this.pendingWaits]) pending.cancel()
    this.attempts = 0
    if (!this.cycle) return
    for (const cancel of this.cycle.cancelTimers) cancel()
    this.settle(this.cycle, abortError())
    this.cycle = null
  }

  private emit(limit: RateLimitReset, kind: RateLimitNotice['kind']): void {
    // 提醒关掉时仍然记录状态（设置页能看重置时间），只是不发任何通知。
    if (!this.reminderEnabled) return
    const notice: RateLimitNotice = {
      ...limit,
      resetAtUtc: formatResetUtc(limit.resetAt),
      resetAtLocal: formatResetLocal(limit.resetAt),
      kind,
    }
    this.lastNotice = kind
    this.lastNoticeAt = this.clock()
    try {
      this.options.notify?.(notice)
    } catch (error) {
      this.log('error', `devin-bridge: 限流通知发送失败：${error instanceof Error ? error.message : String(error)}`)
    }
    this.log('info', `devin-bridge: ${this.describe(limit, kind)}｜${limit.message}`)
  }

  private clock(): number {
    return (this.options.now ?? Date.now)()
  }

  private scheduleFn(): (callback: () => void, delayMs: number) => () => void {
    return this.options.schedule ?? ((callback, delayMs) => {
      const handle = setTimeout(callback, delayMs)
      return () => clearTimeout(handle)
    })
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    this.options.log?.(level, message)
  }
}

function abortError(): Error {
  const error = new Error('devin-bridge: rate-limit wait aborted')
  error.name = 'AbortError'
  return error
}
