/**
 * 会话输入区右侧的限流状态胶囊（conversation.input.right）。
 *
 * 只在当前会话选中了 `devin` provider 的模型、且有挂起的限流周期时显示，
 * 形如「限流 · 1 小时 43 分钟后重置」，自动继续开启时追加尝试进度；
 * 倒计时每秒本地递减，点击立即刷新。
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { DevinRateLimitStatus } from './remote.ts'
import { describeMs } from './format.ts'

interface ModelDirectoryStore {
  getSnapshot: () => { current?: { provider?: string; model?: string } | null } | null
  subscribe: (listener: () => void) => () => void
}

export interface RateLimitPillProps {
  /** modelDirectories.directoryFor(sessionId).store；未绑定时为 undefined。 */
  directory?: ModelDirectoryStore
  /** remote.devin.rateLimit；未挂载时为 null。 */
  status: (() => Promise<RemoteResult<DevinRateLimitStatus>>) | null
}

const PROVIDER_ID = 'devin'
const REFRESH_MS = 15_000
const EMPTY_STORE: ModelDirectoryStore = { getSnapshot: () => null, subscribe: () => () => {} }
const WARN = 'var(--dsw-alias-state-warn-primary, #f5a524)'

export function RateLimitPill({ directory, status }: RateLimitPillProps): ReactNode {
  const usable =
    directory !== null &&
    directory !== undefined &&
    typeof directory.subscribe === 'function' &&
    typeof directory.getSnapshot === 'function'
  const modelState = useSyncExternalStore(
    usable ? directory.subscribe : EMPTY_STORE.subscribe,
    usable ? directory.getSnapshot : EMPTY_STORE.getSnapshot,
    usable ? directory.getSnapshot : EMPTY_STORE.getSnapshot,
  )
  const current = modelState?.current ?? null
  const active = current?.provider === PROVIDER_ID

  const [data, setData] = useState<DevinRateLimitStatus | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!status) {
      if (alive.current) setData(null)
      return
    }
    try {
      const result = await status()
      if (alive.current) setData(result.ok ? result.value : null)
    } catch {
      if (alive.current) setData(null)
    }
  }, [status])

  useEffect(() => {
    if (!active) {
      setData(null)
      return undefined
    }
    void load()
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [active, load])

  // 倒计时只在有限流挂起时逐秒递减，平时不挂 timer。
  const pending = data?.active === true && typeof data.resetAt === 'number'
  useEffect(() => {
    if (!pending) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [pending])

  if (!active || !pending) return null

  const remaining = Math.max(0, (data?.resetAt ?? now) - now)
  const segments: Array<{ key: string; text: string }> = [
    { key: 'wait', text: `限流 · ${describeMs(remaining)}后重置` },
  ]
  if (data?.autoResume) {
    segments.push({ key: 'auto', text: `自动 ${data.resumeAttempts ?? 0}/${data.maxResumeAttempts ?? 0}` })
  }

  const parts = [`Devin${current?.model ? ` ${current.model}` : ''} 触发限流` ]
  if (data?.code) parts[0] += `（${data.code}）`
  if (data?.resetAtLocal) parts.push(`${data.resetAtLocal} 重置`)
  parts.push(data?.autoResume ? '自动继续已开启' : '仅提醒')
  parts.push('点击立即刷新')

  return (
    <div
      role="status"
      aria-label={parts.join(' · ')}
      title={parts.join(' · ')}
      onClick={() => void load()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1px solid var(--dsw-alias-state-warn-primary, #f5a524)',
        color: 'inherit',
        fontSize: 11,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {segments.map((segment, index) => (
        <span key={segment.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {index === 0 ? null : (
            <span
              aria-hidden
              style={{ width: 1, height: 10, display: 'inline-block', background: 'var(--dsw-alias-border, rgba(128,128,128,0.35))' }}
            />
          )}
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: WARN, display: 'inline-block' }} />
          <span>{segment.text}</span>
        </span>
      ))}
    </div>
  )
}
