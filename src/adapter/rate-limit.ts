// 限流重置解析：把上游错误里的「1 小时 48 分钟」相对时长与
// 「(at 21:01 UTC)」绝对钟点统一成一个 epoch 毫秒的重置时刻，
// 并换算成本地时间展示。纯函数；定时与通知在 rate-limit-watch.ts。

/** 免费模型限流的原始报错文案：原样保留，方便用户与上游提示对照。 */
export const RATE_LIMIT_MESSAGE =
  'Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model.'

/** 解析失败时的兜底等待：上游通常按小时级窗口限流。 */
export const DEFAULT_RESET_MS = 60 * 60_000

const UNIT_MS: Record<string, number> = {
  hour: 3_600_000,
  hr: 3_600_000,
  h: 3_600_000,
  minute: 60_000,
  min: 60_000,
  m: 60_000,
  second: 1_000,
  sec: 1_000,
  s: 1_000,
}

const CODE_BRACKET = /\[([a-z][a-z0-9_]*)\]/i
/** 「reset in 1 hour 48 minutes」之后的时长片段。 */
const DURATION_TAIL = /reset(?:s|ting)?\s+in\s+([^().;]+)/i
const DURATION_TOKEN = /(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|h|m|s)\b/gi
/** 「(at 21:01 UTC)」。 */
const ABSOLUTE_CLOCK_UTC = /\(?\bat\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*UTC\b/i
/** ISO 形式「2026-11-14T21:01:00Z」。 */
const ABSOLUTE_ISO_UTC = /\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?Z\b/

export interface RateLimitReset {
  /** 上游错误码（括号里的名字），如 resource_exhausted。 */
  code: string
  /** 原始报错全文，不做任何改写。 */
  message: string
  /** 相对时长（毫秒）；原文没给相对时长时缺省。 */
  relativeMs?: number
  /** 重置时刻（epoch 毫秒）。 */
  resetAt: number
  /** 原文给出的 UTC 钟点（HH:MM:SS 或 ISO），便于核对。 */
  absoluteUtc?: string
  /** resetAt 距解析时刻的毫秒数（可能为负：已过点）。 */
  waitMs: number
  /** 原文没给出可解析的时间，用了兜底时长。 */
  guessed: boolean
}

export interface ParseRateLimitOptions {
  /** 解析基准时刻，默认 Date.now()。 */
  now?: number
  /** 原文没有可解析时间时的兜底等待，默认 {@link DEFAULT_RESET_MS}。 */
  fallbackMs?: number
}

/** 适配器前缀（wrapConnectError 加的），通知前剥掉以还原上游原文。 */
const ADAPTER_PREFIX = 'Devin API: '

/**
 * 还原上游原始报错：只去掉适配器自己加的 "Devin API: " 前缀，
 * 正文一字不改，方便用户按原文搜索 / 对照上游提示。
 */
export function originalMessage(message: string): string {
  return message.startsWith(ADAPTER_PREFIX) ? message.slice(ADAPTER_PREFIX.length) : message
}

/** 从报错文本里取上游错误码；没有括号码时回退 resource_exhausted。 */
export function extractErrorCode(message: string): string {
  return message.match(CODE_BRACKET)?.[1] ?? 'resource_exhausted'
}

/** 解析「1 hour 48 minutes」这类相对时长；没有则返回 undefined。 */
export function parseRelativeMs(message: string): number | undefined {
  const tail = message.match(DURATION_TAIL)?.[1]
  const scope = tail ?? message
  let total = 0
  let matched = false
  DURATION_TOKEN.lastIndex = 0
  for (let m = DURATION_TOKEN.exec(scope); m !== null; m = DURATION_TOKEN.exec(scope)) {
    const amount = Number(m[1])
    // 正则按整词匹配（"minutes"/"hours"），查表前去掉复数 s。
    const name = m[2]!.toLowerCase().replace(/s$/, '')
    const unit = UNIT_MS[name]
    if (!Number.isFinite(amount) || unit === undefined) continue
    total += amount * unit
    matched = true
  }
  return matched ? total : undefined
}

/**
 * 解析绝对 UTC 钟点。同一天有今/明/昨三个候选：
 *   - 给了相对时长时取离 now + 相对时长最近的一个（两者互为校验）；
 *   - 只有钟点时取不早于 now 的最近一个（已过点即次日）。
 * @param message - 上游报错全文。
 * @param nowMs - 解析基准时刻。
 * @param target - 有相对时长时传入 now + 相对时长；否则传 undefined。
 */
export function parseAbsoluteUtcMs(
  message: string,
  nowMs: number,
  target?: number,
): { at: number; text: string } | undefined {
  const iso = message.match(ABSOLUTE_ISO_UTC)
  if (iso) {
    const at = Date.UTC(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4]),
      Number(iso[5]),
      Number(iso[6] ?? 0),
    )
    return Number.isFinite(at) ? { at, text: iso[0] } : undefined
  }
  const clock = message.match(ABSOLUTE_CLOCK_UTC)
  if (!clock) return undefined
  const hour = Number(clock[1])
  const minute = Number(clock[2])
  const second = Number(clock[3] ?? 0)
  if (hour > 23 || minute > 59 || second > 59) return undefined
  const day = 86_400_000
  const base = new Date(nowMs)
  const today = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, minute, second)
  const candidates = [today - day, today, today + day]
  let best: number
  if (target !== undefined) {
    best = candidates.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a))
  } else {
    // 只有钟点：取不早于 now 的最近一个；都已过点则取次日。
    best = candidates.find((candidate) => candidate >= nowMs) ?? today + day
  }
  return { at: best, text: clock[0].replace(/^\(?at\s+/i, '').replace(/\)$/, '') }
}

/**
 * 解析一条限流报错：同时支持相对时长与绝对 UTC 钟点。
 * 绝对时间优先（它由服务端给出，不受本机时钟漂移影响），相对时长用于
 * 对齐跨天候选项；两者都没有时用 fallbackMs 兜底并标 guessed。
 */
export function parseRateLimitReset(message: string, options: ParseRateLimitOptions = {}): RateLimitReset {
  const now = options.now ?? Date.now()
  const relativeMs = parseRelativeMs(message)
  const absolute = parseAbsoluteUtcMs(message, now, relativeMs !== undefined ? now + relativeMs : undefined)
  const guessed = absolute === undefined && relativeMs === undefined
  const resetAt = absolute?.at ?? (relativeMs !== undefined ? now + relativeMs : now + (options.fallbackMs ?? DEFAULT_RESET_MS))
  return {
    code: extractErrorCode(message),
    message,
    ...relativeMs !== undefined ? { relativeMs } : {},
    resetAt,
    ...absolute ? { absoluteUtc: absolute.text } : {},
    waitMs: resetAt - now,
    guessed,
  }
}

/** 毫秒数 → 「1 小时 48 分钟」风格的中文时长。 */
export function describeWait(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} 小时`)
  if (minutes > 0) parts.push(`${minutes} 分钟`)
  if (parts.length === 0) parts.push(`${seconds} 秒`)
  return parts.join(' ')
}

interface ClockParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
  zone: string
}

function clockParts(at: number, timeZone?: string, locale?: string): ClockParts {
  const formatter = new Intl.DateTimeFormat(locale ?? 'en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  })
  const parts = formatter.formatToParts(new Date(at))
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
    zone: pick('timeZoneName').replace('GMT', 'UTC'),
  }
}

/** 重置时刻 → 本地时间字符串，如 2026-11-14 05:01:00 UTC+08:00。 */
export function formatResetLocal(
  resetAt: number,
  options: { timeZone?: string; locale?: string } = {},
): string {
  if (!Number.isFinite(resetAt)) return '—'
  const p = clockParts(resetAt, options.timeZone, options.locale)
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.zone}`.trim()
}

/** 重置时刻 → UTC 字符串，如 2026-11-14 21:01:00 UTC。 */
export function formatResetUtc(resetAt: number): string {
  if (!Number.isFinite(resetAt)) return '—'
  const p = clockParts(resetAt, 'UTC')
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} UTC`
}

/** 尾块里找到的限流失败（只带必要字段，避免 adapter 依赖）。 */
export interface RateLimitFailure {
  /** 上游错误码，固定为 RATE_LIMIT。 */
  code: string
  /** 原始失败信息。 */
  message: string
}

/** finish 块的形状（结构类型，避免引入 dsh-llm 运行时依赖）。 */
interface FinishedChunk {
  type: string
  reason?: {
    kind?: string
    failure?: { code?: string; message?: string }
  }
}

/**
 * 从解码器尾块里找限流失败（finish.reason.kind === 'error' 且 code 为 RATE_LIMIT）。
 * 纯函数：不构造 LlmError，调用方按自己的错误类型重抛。
 */
export function findRateLimitFailure(chunks: readonly FinishedChunk[]): RateLimitFailure | undefined {
  for (const chunk of chunks) {
    if (chunk.type !== 'finish') continue
    const reason = chunk.reason
    if (!reason || reason.kind !== 'error') continue
    if (reason.failure?.code !== 'RATE_LIMIT') continue
    return { code: 'RATE_LIMIT', message: reason.failure.message ?? '' }
  }
  return undefined
}

export interface BackoffPlan {
  /** 首次重试的本地延迟（毫秒）。 */
  initialDelayMs: number
  /** 单次延迟上限（毫秒）。 */
  maxDelayMs: number
  /** 对称抖动比例，0.1 表示 ±10%。 */
  jitterRatio: number
}

export const DEFAULT_BACKOFF: BackoffPlan = { initialDelayMs: 500, maxDelayMs: 10_000, jitterRatio: 0.1 }

/** 第 attempt 次（1 起）退避延迟：指数增长 + 对称抖动，封顶 maxDelayMs。 */
export function backoffDelay(attempt: number, plan: BackoffPlan = DEFAULT_BACKOFF, random: () => number = Math.random): number {
  const step = Math.max(0, attempt - 1)
  const base = Math.min(plan.maxDelayMs, plan.initialDelayMs * 2 ** Math.min(step, 16))
  const jitter = 1 + (random() * 2 - 1) * Math.max(0, plan.jitterRatio)
  return Math.max(0, Math.min(plan.maxDelayMs, Math.round(base * jitter)))
}
