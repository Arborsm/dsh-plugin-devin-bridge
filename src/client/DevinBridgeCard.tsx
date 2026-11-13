/**
 * Devin Bridge 设置面板（settings.section 独立页 + plugins.bundle.config 内嵌）。
 *
 * 布局对齐 dsh-devin2api 的面板：
 * - 顶栏：连接状态点 + 端点 + 刷新按钮
 * - 「额度」卡：套餐名、日/周剩余百分比进度条、重置时间（remote.devin）
 * - 「模型目录」卡：搜索 + 全开/全关 + 每模型开关（写 hiddenModels）
 * - 「连接设置」卡：token / baseUrl / proxy / forceHttp1
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { DevinQuotaPayload } from './remote.ts'

/** 插件配置类型。 */
export interface DevinBridgeConfig {
  token: string
  baseUrl: string
  proxy: string
  forceHttp1: boolean
  defaultContextWindow: number
  defaultMaxTokens: number
  hiddenModels: string[]
  models: Array<{
    id: string
    name?: string
    description?: string
    contextWindow?: number
    maxTokens?: number
    supportsImages?: boolean
    family?: string
    tiers?: Record<string, string>
    defaultEffort?: string
    isPremium?: boolean
    isPromo?: boolean
    creditMultiplier?: number
  }>
}

/** 从 remote.devin.catalog 返回的候选模型（family 已合并）。 */
interface DiscoveredModel {
  id: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  inputModalities?: readonly string[]
  supportsImages?: boolean
  family?: string
  tiers?: Record<string, string>
  defaultEffort?: string
  isPremium?: boolean
  isPromo?: boolean
  creditMultiplier?: number
}

export interface QuotaSource {
  quota(): Promise<RemoteResult<DevinQuotaPayload>>
  refreshQuota(): Promise<RemoteResult<DevinQuotaPayload>>
}

export interface DevinBridgeCardProps {
  /** 插件管理器传入的视图模式；bundle 配置页固定 'page'。 */
  view?: 'summary' | 'page'
  /** true = 插件详情页内嵌卡片（可折叠）；false = 设置侧栏独立页面。 */
  embedded?: boolean
  form: ConfigForm<DevinBridgeConfig>
  /** Host 端注册的模型发现。 */
  discover: () => Promise<RemoteResult<DiscoveredModel[]>>
  /** remote.devin 命名空间；未挂载时为 null（额度卡显示占位）。 */
  remote?: QuotaSource | null
}

const REFRESH_MS = 60_000

/** 剩余百分比 → 圆点/进度条颜色。 */
function toneOf(percent: number | undefined): string {
  if (percent === undefined) return 'var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))'
  if (percent <= 10) return 'var(--dsw-alias-state-error-primary, #e5484d)'
  if (percent <= 30) return 'var(--dsw-alias-state-warn-primary, #f5a524)'
  return 'var(--dsw-alias-state-success-primary, #30a46c)'
}

/** unix 秒 → "周三 14:00" 风格的重置标签。 */
function resetLabel(unix: number | undefined): string {
  if (!unix) return ''
  const date = new Date(unix * 1000)
  if (Number.isNaN(date.getTime())) return ''
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${days[date.getDay()]} ${hh}:${mm}`
}

interface Polling<T> {
  data: T | null
  error: Error | null
}

/** 每 REFRESH_MS 轮询一次；fresh=true 走 refreshQuota 跳过 Host 缓存。 */
function useQuota(remote: QuotaSource | null | undefined): [Polling<DevinQuotaPayload>, () => void] {
  const [state, setState] = useState<Polling<DevinQuotaPayload>>({ data: null, error: null })
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const load = useCallback(
    async (fresh: boolean) => {
      if (!remote) {
        setState({ data: null, error: null })
        return
      }
      try {
        const result = fresh ? await remote.refreshQuota() : await remote.quota()
        if (!alive.current) return
        if (result.ok) setState({ data: result.value, error: null })
        else setState({ data: null, error: new Error(result.error?.message ?? 'quota failed') })
      } catch (error) {
        if (alive.current) setState({ data: null, error: error instanceof Error ? error : new Error(String(error)) })
      }
    },
    [remote],
  )
  useEffect(() => {
    void load(false)
    const timer = setInterval(() => void load(false), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])
  return [state, useCallback(() => void load(true), [load])]
}

/** 一行标题 + 数值。 */
function Row({ label, value, tone }: { label: string; value: string; tone?: string }): ReactNode {
  return (
    <div className="dbp-row">
      <span className="dbp-row-label">{label}</span>
      <span className="dbp-row-value" style={tone ? { color: tone } : undefined}>{value}</span>
    </div>
  )
}

/** 剩余额度进度条。 */
function Bar({ percent }: { percent: number | undefined }): ReactNode {
  const width = typeof percent === 'number' ? Math.max(0, Math.min(100, percent)) : 0
  return (
    <div className="dbp-bar">
      <div className="dbp-bar-fill" style={{ width: `${width}%`, background: toneOf(percent) }} />
    </div>
  )
}

/** 最小开关。 */
function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`dbp-toggle${checked ? ' dbp-toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="dbp-toggle-knob" />
    </button>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="dbp-card">
      <h4 className="dbp-card-title">{title}</h4>
      {children}
    </section>
  )
}

/** 模型行副标题：family / 图片 / 倍率 / 上下文。 */
function modelMeta(entry: DevinBridgeConfig['models'][number]): string {
  const parts: string[] = []
  if (entry.family) parts.push(entry.family)
  if (entry.supportsImages) parts.push('图片')
  if (typeof entry.creditMultiplier === 'number') parts.push(`${entry.creditMultiplier}x`)
  if (typeof entry.contextWindow === 'number' && entry.contextWindow > 0) {
    parts.push(`${Math.round(entry.contextWindow / 1000)}k ctx`)
  }
  return parts.join(' · ')
}

/**
 * 模型目录卡：列出 config.models，开关写 hiddenModels。
 * 目录为空时给"拉取可用模型"入口。
 */
function ModelCatalog(props: {
  models: DevinBridgeConfig['models']
  hidden: string[]
  disabled: boolean
  onSetHidden: (next: string[]) => void
  onFetch: () => void
  fetching: boolean
  fetchError: string | null
}): ReactNode {
  const { models, hidden, disabled, onSetHidden, onFetch, fetching, fetchError } = props
  const [filter, setFilter] = useState('')
  const hiddenSet = new Set(hidden)
  const visible = models.filter((m) => !hiddenSet.has(m.id))
  const query = filter.trim().toLowerCase()
  const rows = query === '' ? models : models.filter((m) => m.id.toLowerCase().includes(query) || (m.name ?? '').toLowerCase().includes(query))

  if (models.length === 0) {
    return (
      <Card title="模型目录">
        <p className="dbp-hint">还没有模型。点下面的按钮从 Devin 服务器拉取可用模型目录。</p>
        <div>
          <button type="button" className="dbp-btn" disabled={fetching || disabled} onClick={onFetch}>
            {fetching ? '拉取中…' : '拉取可用模型'}
          </button>
        </div>
        {fetchError ? <p className="dbp-error">{fetchError}</p> : null}
      </Card>
    )
  }

  return (
    <Card title={`模型目录 · 已启用 ${visible.length}/${models.length}`}>
      <div className="dbp-toolbar">
        <input
          type="search"
          value={filter}
          placeholder="搜索模型…"
          aria-label="搜索模型"
          className="dbp-search"
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="dbp-btn" disabled={disabled} onClick={() => onSetHidden([])}>全开</button>
        <button
          type="button"
          className="dbp-btn"
          disabled={disabled}
          onClick={() => onSetHidden(models.map((m) => m.id))}
        >
          全关
        </button>
        <button type="button" className="dbp-btn" disabled={fetching || disabled} onClick={onFetch}>
          {fetching ? '拉取中…' : '刷新目录'}
        </button>
      </div>
      {fetchError ? <p className="dbp-error">{fetchError}</p> : null}
      <div className="dbp-list">
        {rows.length === 0 ? (
          <p className="dbp-hint">没有匹配的模型。</p>
        ) : (
          rows.map((entry) => {
            const meta = modelMeta(entry)
            return (
              <label key={entry.id} className="dbp-model-row">
                <span className="dbp-model-text">
                  <span className="dbp-model-id">{entry.id}</span>
                  {meta ? <span className="dbp-model-meta">{meta}</span> : null}
                </span>
                <Toggle
                  checked={!hiddenSet.has(entry.id)}
                  disabled={disabled}
                  label={`${entry.id} 是否出现在模型选择器里`}
                  onChange={(next) => {
                    const merged = new Set(hiddenSet)
                    if (next) merged.delete(entry.id)
                    else merged.add(entry.id)
                    onSetHidden([...merged])
                  }}
                />
              </label>
            )
          })
        )}
      </div>
      {models.length > 0 && visible.length === 0 ? (
        <p className="dbp-hint">全部关闭时模型选择器将为空，至少保留一个。</p>
      ) : null}
      <p className="dbp-hint">
        {`其中 ${models.filter((m) => m.supportsImages).length} 个支持图片输入。开关立即写入配置，模型选择器随之更新。`}
      </p>
    </Card>
  )
}

/** 可编辑字段行（连接设置卡）。 */
function FieldRow(props: {
  label: string
  hint?: string
  type?: 'text' | 'password' | 'number' | 'checkbox'
  placeholder?: string
  value: unknown
  disabled: boolean
  onSave: (value: unknown) => void
}): ReactNode {
  if (props.type === 'checkbox') return <CheckboxRow {...props} />
  return <TextRow {...props} />
}

function CheckboxRow(props: Parameters<typeof FieldRow>[0]): ReactNode {
  const { label, hint, value, disabled, onSave } = props
  return (
    <label className="dbp-field">
      <span className="dbp-field-head">
        <span className="dbp-field-label">{label}</span>
        <Toggle checked={value === true} disabled={disabled} label={label} onChange={onSave} />
      </span>
      {hint ? <span className="dbp-field-hint">{hint}</span> : null}
    </label>
  )
}

function TextRow(props: Parameters<typeof FieldRow>[0]): ReactNode {
  const { label, hint, type = 'text', placeholder, value, disabled, onSave } = props
  const [draft, setDraft] = useState(value === undefined || value === null ? '' : String(value))
  useEffect(() => {
    setDraft(value === undefined || value === null ? '' : String(value))
  }, [value])
  const dirty = draft !== (value === undefined || value === null ? '' : String(value))
  return (
    <label className="dbp-field">
      <span className="dbp-field-head">
        <span className="dbp-field-label">{label}</span>
        <span className="dbp-field-input">
          <input
            type={type}
            value={draft}
            placeholder={placeholder}
            disabled={disabled}
            className="dbp-search"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(type === 'number' ? Number(draft) : draft)
            }}
          />
          {dirty ? (
            <button type="button" className="dbp-btn" disabled={disabled} onClick={() => onSave(type === 'number' ? Number(draft) : draft)}>
              保存
            </button>
          ) : null}
        </span>
      </span>
      {hint ? <span className="dbp-field-hint">{hint}</span> : null}
    </label>
  )
}

/**
 * Devin Bridge 面板主体。
 */
export function DevinBridgeCard({ form, discover, remote, embedded = true }: DevinBridgeCardProps): ReactNode {
  const snapshot = useSyncExternalStore(
    (listener) => form.subscribe(listener),
    () => form.getSnapshot(),
    () => form.getSnapshot(),
  )

  const [open, setOpen] = useState(!embedded)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [quota, refreshQuota] = useQuota(remote)

  const value = snapshot.value
  const disabled = !snapshot.writable || saving

  // 顶栏状态：额度已返回 → 已连接；报错 → 额度查询失败（附原因）；
  // 还在加载 → 连接中。token 来源一并标出。
  const baseUrl = value?.baseUrl?.trim() || 'server.codeium.com'
  const tokenSource = value?.token?.trim() ? 'settings token' : 'credentials.toml'
  const status = quota.data !== null
    ? { tone: 'ok' as const, text: `已连接 · ${baseUrl} · ${quota.data.plan ?? tokenSource}` }
    : quota.error !== null
      ? { tone: 'error' as const, text: `额度查询失败 · ${baseUrl} · ${tokenSource}` }
      : { tone: 'loading' as const, text: `连接中… · ${baseUrl} · ${tokenSource}` }

  const save = useCallback(
    async (field: string, fieldValue: unknown) => {
      if (!snapshot.writable) return
      setSaving(true)
      setError(null)
      try {
        const accepted = fieldValue === '' || fieldValue === undefined || fieldValue === null
          ? await form.unset(field)
          : await form.set(field, fieldValue)
        if (!accepted) setError('设置写入被 Host 拒绝。')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [form, snapshot.writable],
  )

  const fetchModels = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const result = await discover()
      if (!result.ok) {
        setFetchError(result.error?.message ?? '拉取模型目录失败')
        return
      }
      const candidates = result.value ?? []
      const existing = new Map((value?.models ?? []).map((m) => [m.id, m]))
      const adopted = candidates.map((c) => {
        const prev = existing.get(c.id)
        return {
          id: c.id,
          name: c.name ?? prev?.name ?? c.id,
          ...c.description ?? prev?.description ? { description: c.description ?? prev?.description } : {},
          contextWindow: c.contextWindow ?? prev?.contextWindow ?? 0,
          maxTokens: c.maxTokens ?? prev?.maxTokens ?? 65536,
          supportsImages: c.supportsImages ?? c.inputModalities?.includes('image') ?? prev?.supportsImages ?? false,
          ...c.isPromo ?? prev?.isPromo ? { isPromo: true } : {},
          ...c.isPremium ?? prev?.isPremium ? { isPremium: true } : {},
          ...c.creditMultiplier ?? prev?.creditMultiplier ? { creditMultiplier: c.creditMultiplier ?? prev?.creditMultiplier } : {},
          ...c.family ? { family: c.family } : {},
          ...c.tiers ? { tiers: c.tiers } : {},
          ...c.defaultEffort ? { defaultEffort: c.defaultEffort } : {},
        }
      })
      const accepted = await form.set('models', adopted)
      if (!accepted) setFetchError('设置写入被 Host 拒绝。')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }, [discover, form, value?.models])

  if (snapshot.status === 'loading') {
    return (
      <div className={embedded ? 'dbp-card-wrap' : 'dbp-page'}>
        <p className="dbp-hint">加载中…</p>
        {STYLES}
      </div>
    )
  }
  if (snapshot.status === 'unavailable') {
    return (
      <div className={embedded ? 'dbp-card-wrap' : 'dbp-page'}>
        <p className="dbp-hint">设置服务不可用（内存模式）。</p>
        {STYLES}
      </div>
    )
  }

  const body = (
    <div className="dbp-body">
      {/* 顶栏：连接状态 + 刷新 */}
      <div className="dbp-topbar">
        <div className="dbp-topbar-left">
          <span
            className="dbp-dot"
            style={{
              background:
                status.tone === 'ok'
                  ? 'var(--dsw-alias-state-success-primary, #30a46c)'
                  : status.tone === 'error'
                    ? 'var(--dsw-alias-state-error-primary, #e5484d)'
                    : 'var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))',
            }}
          />
          <span className="dbp-topbar-text">{status.text}</span>
        </div>
        <button type="button" className="dbp-btn" onClick={refreshQuota}>刷新</button>
      </div>

      {!snapshot.writable ? <p className="dbp-hint">当前设置只读。</p> : null}
      {quota.error ? (
        <p className="dbp-hint">{`额度不可用：${quota.error.message}`}</p>
      ) : null}

      {/* 额度卡 */}
      <Card title={`额度${quota.data?.plan ? ` · ${quota.data.plan}` : ''}${quota.data?.stale ? ' · 缓存快照' : ''}`}>
        {remote == null ? (
          <p className="dbp-hint">额度服务未挂载。</p>
        ) : (
          <>
            <Row
              label="今日剩余"
              value={typeof quota.data?.dailyRemainingPercent === 'number' ? `${quota.data.dailyRemainingPercent}%` : '—'}
              tone={toneOf(quota.data?.dailyRemainingPercent)}
            />
            <Bar percent={quota.data?.dailyRemainingPercent} />
            <Row label="今日重置" value={resetLabel(quota.data?.dailyResetAt) || '—'} tone="var(--dsw-alias-label-secondary, #8a8a8a)" />
            <Row
              label="本周剩余"
              value={typeof quota.data?.weeklyRemainingPercent === 'number' ? `${quota.data.weeklyRemainingPercent}%` : '—'}
              tone={toneOf(quota.data?.weeklyRemainingPercent)}
            />
            <Bar percent={quota.data?.weeklyRemainingPercent} />
            <Row label="本周重置" value={resetLabel(quota.data?.weeklyResetAt) || '—'} tone="var(--dsw-alias-label-secondary, #8a8a8a)" />
          </>
        )}
      </Card>

      {/* 模型目录卡 */}
      <ModelCatalog
        models={value?.models ?? []}
        hidden={value?.hiddenModels ?? []}
        disabled={disabled}
        onSetHidden={(next) => void save('hiddenModels', next)}
        onFetch={() => void fetchModels()}
        fetching={fetching}
        fetchError={fetchError}
      />

      {/* 连接设置卡 */}
      <Card title="连接设置">
        <FieldRow
          label="Token"
          hint="Devin session token。留空自动读取 credentials.toml。"
          type="password"
          placeholder="devin-session-token$..."
          value={value?.token}
          disabled={disabled}
          onSave={(v) => void save('token', v)}
        />
        <FieldRow
          label="Base URL"
          hint="Connect API 端点，默认 https://server.codeium.com。"
          placeholder="https://server.codeium.com"
          value={value?.baseUrl}
          disabled={disabled}
          onSave={(v) => void save('baseUrl', v)}
        />
        <FieldRow
          label="代理"
          hint="可选 http/https/socks5 代理 URL。"
          placeholder="http://127.0.0.1:7890"
          value={value?.proxy}
          disabled={disabled}
          onSave={(v) => void save('proxy', v)}
        />
        <FieldRow
          label="强制 HTTP/1.1"
          hint="某些代理下 Connect 流式需要 HTTP/1.1。"
          type="checkbox"
          value={value?.forceHttp1}
          disabled={disabled}
          onSave={(v) => void save('forceHttp1', v)}
        />
      </Card>

      {error ? <p className="dbp-error">{error}</p> : null}
      <p className="dbp-hint">
        token 留空时自动读取 Devin CLI 凭证（%APPDATA%\devin\credentials.toml）。
      </p>
    </div>
  )

  if (!embedded) {
    return (
      <div className="dbp-page">
        <div className="dbp-page-header">
          <span className="dbp-page-title">Devin Bridge</span>
          <span className="dbp-page-desc">Devin Connect LLM 适配器（swe-2 / glm-5.3）</span>
        </div>
        {body}
        {STYLES}
      </div>
    )
  }

  return (
    <div className="dbp-card-wrap">
      <button type="button" className="dbp-card-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="dbp-page-title">Devin Bridge</span>
        <span className="dbp-page-desc">Devin Connect LLM 适配器</span>
        <span className="dbp-chevron">{open ? '▼' : '▶'}</span>
      </button>
      {open ? body : null}
      {STYLES}
    </div>
  )
}

const STYLES = (
  <style>{`
    .dbp-page { max-width: 640px; display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .dbp-card-wrap { display: flex; flex-direction: column; gap: 0; }
    .dbp-page-header { display: flex; flex-direction: column; gap: 2px; }
    .dbp-page-title { font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }
    .dbp-page-desc { font-size: 12px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-card-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); border-radius: 12px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
    .dbp-chevron { margin-left: auto; font-size: 10px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-body { display: flex; flex-direction: column; gap: 16px; padding-top: 12px; }
    .dbp-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .dbp-topbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .dbp-dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
    .dbp-topbar-text { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); overflow-wrap: anywhere; }
    .dbp-card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); }
    .dbp-card-title { margin: 0; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary, inherit); }
    .dbp-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .dbp-row-label { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); }
    .dbp-row-value { font-size: 13px; font-variant-numeric: tabular-nums; }
    .dbp-bar { height: 6px; border-radius: 999px; background: var(--dsw-alias-fill-l2, rgba(128,128,128,0.2)); overflow: hidden; }
    .dbp-bar-fill { height: 100%; border-radius: 999px; }
    .dbp-toolbar { display: flex; align-items: center; gap: 8px; }
    .dbp-search { flex: 1; min-width: 0; height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.35)); background: transparent; color: inherit; font-size: 12px; }
    .dbp-btn { flex: none; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.35)); background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
    .dbp-btn:disabled { opacity: 0.55; cursor: default; }
    .dbp-list { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; border-top: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); }
    .dbp-model-row { display: flex; align-items: center; gap: 10px; padding: 6px 2px; border-bottom: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.15)); }
    .dbp-model-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .dbp-model-id { font-size: 12.5px; color: var(--dsw-alias-label-primary, inherit); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dbp-model-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-toggle { position: relative; width: 30px; height: 18px; flex: none; padding: 0; border: none; border-radius: 999px; cursor: pointer; background: var(--dsw-alias-fill-l2, rgba(128,128,128,0.35)); }
    .dbp-toggle-on { background: var(--dsw-alias-state-business-primary, #4d6bfe); }
    .dbp-toggle:disabled { opacity: 0.55; cursor: default; }
    .dbp-toggle-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 999px; background: #fff; transition: left .15s; }
    .dbp-toggle-on .dbp-toggle-knob { left: 14px; }
    .dbp-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-error { margin: 0; font-size: 12px; color: var(--dsw-alias-state-error-primary, #e5484d); }
    .dbp-field { display: flex; flex-direction: column; gap: 4px; }
    .dbp-field-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .dbp-field-label { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); }
    .dbp-field-input { display: flex; align-items: center; gap: 8px; flex: 1; max-width: 380px; }
    .dbp-field-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
  `}</style>
)
