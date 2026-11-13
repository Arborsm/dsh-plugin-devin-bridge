/**
 * 会话输入区右侧的 Devin 额度胶囊（conversation.input.right）。
 *
 * 只在当前会话选中了 `devin` provider 的模型时显示，形如 "日 82% · 周 91%"，
 * 圆点颜色随剩余量变化；点击跳过 Host 缓存立刻问一次上游。
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { DevinQuotaPayload } from './remote.ts'

interface ModelDirectoryStore {
  getSnapshot: () => { current?: { provider?: string; model?: string } | null } | null
  subscribe: (listener: () => void) => () => void
}

export interface QuotaPillProps {
  /** modelDirectories.directoryFor(sessionId).store；未绑定时为 undefined。 */
  directory?: ModelDirectoryStore
  /** remote.devin.quota；未挂载时为 null。 */
  quota: (() => Promise<RemoteResult<DevinQuotaPayload>>) | null
  refreshQuota: (() => Promise<RemoteResult<DevinQuotaPayload>>) | null
}

const PROVIDER_ID = 'devin'
const REFRESH_MS = 60_000
const EMPTY_STORE: ModelDirectoryStore = { getSnapshot: () => null, subscribe: () => () => {} }

function toneOf(percent: number | undefined): string {
  if (percent === undefined) return 'var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))'
  if (percent <= 10) return 'var(--dsw-alias-state-error-primary, #e5484d)'
  if (percent <= 30) return 'var(--dsw-alias-state-warn-primary, #f5a524)'
  return 'var(--dsw-alias-state-success-primary, #30a46c)'
}

export function QuotaPill({ directory, quota, refreshQuota }: QuotaPillProps): ReactNode {
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

  const [data, setData] = useState<DevinQuotaPayload | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(
    async (fresh: boolean) => {
      const call = fresh ? refreshQuota : quota
      if (!call) {
        if (alive.current) setData(null)
        return
      }
      try {
        const result = await call()
        if (alive.current) setData(result.ok ? result.value : null)
      } catch {
        if (alive.current) setData(null)
      }
    },
    [quota, refreshQuota],
  )

  useEffect(() => {
    if (!active) {
      setData(null)
      return undefined
    }
    void load(false)
    const timer = setInterval(() => void load(false), REFRESH_MS)
    return () => clearInterval(timer)
  }, [active, load])

  if (!active || data === null) return null

  const daily = data.dailyRemainingPercent
  const weekly = data.weeklyRemainingPercent
  const segments: Array<{ key: string; text: string; tone: string }> = []
  if (typeof daily === 'number') segments.push({ key: 'd', text: `日 ${daily}%`, tone: toneOf(daily) })
  if (typeof weekly === 'number') segments.push({ key: 'w', text: `周 ${weekly}%`, tone: toneOf(weekly) })
  if (segments.length === 0) segments.push({ key: 'x', text: '额度', tone: toneOf(undefined) })

  const parts = [`Devin${data.plan ? ` ${data.plan}` : ''}`]
  if (typeof current?.model === 'string') parts.push(current.model)
  if (typeof daily === 'number') parts.push(`今日剩余 ${daily}%`)
  if (typeof weekly === 'number') parts.push(`本周剩余 ${weekly}%`)
  if (data.stale) parts.push('（缓存快照）')
  parts.push('点击立即刷新')
  const label = parts.join(' · ')

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      onClick={() => void load(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.35))',
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
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: segment.tone, display: 'inline-block' }} />
          <span>{segment.text}</span>
        </span>
      ))}
    </div>
  )
}
