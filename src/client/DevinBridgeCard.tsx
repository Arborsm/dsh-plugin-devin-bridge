/**
 * Devin Bridge 配置卡片组件。
 *
 * 在 Plugins 设置页面渲染，让用户编辑 token、baseUrl、proxy
 * 和模型列表。通过 settings scope 读写 host 端的 namespace。
 * 模型管理支持：
 * - 从 Devin 服务器动态拉取可用模型（Fetch available models）
 * - 手动添加模型
 * - 编辑模型详情（name/contextWindow/maxTokens/supportsImages/description）
 * - 删除已配置模型
 */

import { useSyncExternalStore, useState, useCallback, type ReactNode } from 'react'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'

/** 插件配置类型。 */
export interface DevinBridgeConfig {
  token: string
  baseUrl: string
  proxy: string
  forceHttp1: boolean
  defaultContextWindow: number
  defaultMaxTokens: number
  models: Array<{
    id: string
    name?: string
    description?: string
    contextWindow?: number
    maxTokens?: number
    supportsImages?: boolean
    family?: string
    isPremium?: boolean
    isPromo?: boolean
    creditMultiplier?: number
  }>
}

/** 从 discoverModels 返回的候选模型。 */
interface DiscoveredModel {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
}

/** card 组件接收的 props（owner 传 view，slot inject 注入 form/discover）。 */
export interface DevinBridgeCardProps {
  /** 插件管理器传入的视图模式；bundle 配置页固定 'page'。 */
  view?: 'summary' | 'page'
  /** true = 插件详情页内嵌卡片（可折叠）；false = 设置侧栏独立页面（整页展开）。 */
  embedded?: boolean
  form: ConfigForm<DevinBridgeConfig>
  /** 调用 Host 端注册的模型发现；返回 RemoteResult 包装的候选列表。 */
  discover: () => Promise<RemoteResult<DiscoveredModel[]>>
}

/** 从 discovered candidate 的 name 解析 free/premium/multiplier。 */
function parseCandidateInfo(model: DiscoveredModel): {
  isPromo?: boolean
  isPremium?: boolean
  creditMultiplier?: number
} {
  const name = model.name ?? ''
  const multMatch = name.match(/\(([\d.]+)x\)/)
  return {
    isPromo: name.includes('[Promo]'),
    isPremium: name.includes('[Premium]'),
    ...multMatch ? { creditMultiplier: Number(multMatch[1]) } : {},
  }
}

/** 把候选模型按 family 分组（从 name 解析 family，已无 effort 后缀）。 */
function groupCandidatesByFamily(models: DiscoveredModel[]): Array<{ family: string; models: DiscoveredModel[] }> {
  const groups = new Map<string, DiscoveredModel[]>()
  for (const m of models) {
    // name 格式: "GLM-5.2 High [Free] (1.5x)" → family = "GLM-5.2"
    const rawLabel = (m.name ?? m.id).replace(/\s*\[(?:Free|Premium|Promo)\]\s*/g, '').replace(/\s*\([\d.]+x\)\s*/g, '').trim()
    // 去掉 effort 词（discoverModels 可能还带 effort 在 name 里）
    let family = rawLabel.replace(/\s*\b(Max|High|Medium|Low|No Thinking|Lightning)\b\s*/gi, '').trim()
    if (rawLabel.includes('Lightning') && !family.includes('Lightning')) {
      family = family + ' Lightning'
    }
    if (!family) family = m.id
    const arr = groups.get(family) ?? []
    arr.push(m)
    groups.set(family, arr)
  }
  return [...groups.entries()]
    .map(([family, ms]) => ({ family, models: ms }))
    .sort((a, b) => {
      const aFree = a.models.some(m => m.name?.includes('[Free]'))
      const bFree = b.models.some(m => m.name?.includes('[Free]'))
      if (aFree !== bFree) return aFree ? -1 : 1
      return a.family.localeCompare(b.family)
    })
}

/**
 * 渲染 Devin Bridge 配置卡片。
 * @param props - settings scope 和 api 注入的 props。
 * @returns 配置表单。
 */
export function DevinBridgeCard({ form, discover, embedded = true }: DevinBridgeCardProps): ReactNode {
  const snapshot = useSyncExternalStore(
    (listener) => form.subscribe(listener),
    () => form.getSnapshot(),
    () => form.getSnapshot(),
  )

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = snapshot.value
  const disabled = !snapshot.writable || saving
  const loading = snapshot.status === 'loading'

  const handleSaveField = useCallback(
    async (field: string, fieldValue: unknown) => {
      if (!snapshot.writable) return
      setSaving(true)
      setError(null)
      try {
        const accepted = fieldValue === '' || fieldValue === undefined || fieldValue === null
          ? await form.unset(field)
          : await form.set(field, fieldValue)
        if (!accepted) setError('Settings write was refused by the host.')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [form, snapshot.writable],
  )

  const handleSaveModels = useCallback(
    async (models: DevinBridgeConfig['models']) => {
      await handleSaveField('models', models)
    },
    [handleSaveField],
  )

  if (loading) {
    return (
      <div className={embedded ? 'devin-bridge-card' : 'devin-bridge-page'}>
        <div className="devin-bridge-card-header">Devin Bridge</div>
        <p className="devin-bridge-hint">Loading…</p>
        {STYLES}
      </div>
    )
  }

  if (snapshot.status === 'unavailable') {
    return (
      <div className={embedded ? 'devin-bridge-card' : 'devin-bridge-page'}>
        <div className="devin-bridge-card-header">Devin Bridge</div>
        <p className="devin-bridge-hint">Settings unavailable (running in memory mode).</p>
        {STYLES}
      </div>
    )
  }

  const body = (
    <div className="devin-bridge-card-body">
      {!snapshot.writable && (
        <p className="devin-bridge-readonly" role="status">Read-only settings provider.</p>
      )}

      {/* 连接状态（token 来源提示） */}
      <ConnectionStatus token={value?.token} baseUrl={value?.baseUrl} />

      {/* 模型管理（主要功能，默认展开） */}
      <ModelManager
        models={value?.models ?? []}
        disabled={disabled}
        discover={discover}
        onSave={handleSaveModels}
        onError={setError}
      />

      {/* 高级选项（默认折叠） */}
      <details className="devin-bridge-advanced">
        <summary className="devin-bridge-advanced-summary">Advanced settings</summary>
        <div className="devin-bridge-advanced-body">
          <FieldRow def={ADVANCED_FIELDS.token} value={value?.token} disabled={disabled} onSave={handleSaveField} />
          <FieldRow def={ADVANCED_FIELDS.baseUrl} value={value?.baseUrl} disabled={disabled} onSave={handleSaveField} />
          <FieldRow def={ADVANCED_FIELDS.proxy} value={value?.proxy} disabled={disabled} onSave={handleSaveField} />
          <FieldRow def={ADVANCED_FIELDS.forceHttp1} value={value?.forceHttp1} disabled={disabled} onSave={handleSaveField} />
          <FieldRow def={ADVANCED_FIELDS.defaultContextWindow} value={value?.defaultContextWindow} disabled={disabled} onSave={handleSaveField} />
          <FieldRow def={ADVANCED_FIELDS.defaultMaxTokens} value={value?.defaultMaxTokens} disabled={disabled} onSave={handleSaveField} />
        </div>
      </details>

      {error && <p className="devin-bridge-error" role="status">{error}</p>}
      {saving && <p className="devin-bridge-hint">Saving…</p>}
    </div>
  )

  if (!embedded) {
    return (
      <div className="devin-bridge-page">
        <div className="devin-bridge-page-header">
          <span className="devin-bridge-card-title">Devin Bridge</span>
          <span className="devin-bridge-card-desc">Devin Connect LLM adapter (swe-2 / glm-5.3)</span>
        </div>
        {body}
        {STYLES}
      </div>
    )
  }

  return (
    <div className="devin-bridge-card">
      <button
        type="button"
        className="devin-bridge-card-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="devin-bridge-card-title">Devin Bridge</span>
        <span className="devin-bridge-card-desc">Devin Connect LLM adapter (swe-2 / glm-5.3)</span>
        <span className="devin-bridge-chevron">{open ? '▼' : '▶'}</span>
      </button>

      {open && body}

      {STYLES}
    </div>
  )
}

/** 连接状态行：显示当前 token 来源与目标端点。 */
function ConnectionStatus({ token, baseUrl }: { token?: string; baseUrl?: string }): ReactNode {
  const custom = Boolean(token?.trim())
  return (
    <div className="devin-bridge-status">
      <span className={`devin-bridge-status-dot ${custom ? 'devin-bridge-status-dot-config' : 'devin-bridge-status-dot-auto'}`} />
      <span className="devin-bridge-status-text">
        {custom
          ? 'Using token from settings'
          : 'Token auto-detected from Devin CLI credentials.toml'}
        {baseUrl?.trim() ? ` → ${baseUrl.trim()}` : ''}
      </span>
    </div>
  )
}

/** 高级选项字段定义。 */
const ADVANCED_FIELDS = {
  token: {
    key: 'token' as const,
    label: 'Token',
    hint: 'Devin session token. Leave empty to auto-detect from credentials.toml.',
    type: 'password' as const,
    placeholder: 'devin-session-token$...',
  },
  baseUrl: {
    key: 'baseUrl' as const,
    label: 'Base URL',
    hint: 'Devin Connect endpoint.',
    type: 'text' as const,
    placeholder: 'https://server.codeium.com',
  },
  proxy: {
    key: 'proxy' as const,
    label: 'Proxy',
    hint: 'Outbound proxy URL. Leave empty for direct connection.',
    type: 'text' as const,
    placeholder: 'socks5://127.0.0.1:1080',
  },
  forceHttp1: {
    key: 'forceHttp1' as const,
    label: 'Force HTTP/1.1',
    hint: 'Force HTTP/1.1 connection to Devin.',
    type: 'checkbox' as const,
  },
  defaultContextWindow: {
    key: 'defaultContextWindow' as const,
    label: 'Default Context Window',
    hint: 'Fallback context window in tokens.',
    type: 'number' as const,
    placeholder: '200000',
  },
  defaultMaxTokens: {
    key: 'defaultMaxTokens' as const,
    label: 'Default Max Tokens',
    hint: 'Fallback max output tokens.',
    type: 'number' as const,
    placeholder: '16384',
  },
}

interface FieldDef {
  key: keyof DevinBridgeConfig
  label: string
  hint: string
  type: 'text' | 'password' | 'number' | 'checkbox'
  placeholder?: string
}

/** 模型管理组件：fetch + 手动添加 + 列表 + 编辑 + 删除。 */
function ModelManager({
  models,
  disabled,
  discover,
  onSave,
  onError,
}: {
  models: DevinBridgeConfig['models']
  disabled: boolean
  discover: DevinBridgeCardProps['discover']
  onSave: (models: DevinBridgeConfig['models']) => Promise<void>
  onError: (msg: string | null) => void
}): ReactNode {
  const [fetching, setFetching] = useState(false)
  const [candidates, setCandidates] = useState<DiscoveredModel[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualName, setManualName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleFetch = async () => {
    setFetching(true)
    onError(null)
    try {
      // remote.llm.discoverModels 路由到 host 端 registerModelDiscovery 的 adapter
      const response = await discover()
      if (!response.ok) {
        onError(response.error.message)
        return
      }
      const found = response.value
      if (found.length === 0) {
        onError('The provider listed no models.')
        return
      }
      const known = new Set(models.map((m) => m.id))
      setCandidates(found)
      setPicked(new Set(found.filter((m) => !known.has(m.id)).map((m) => m.id)))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  const togglePick = (id: string) => {
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const pickFamily = (ids: string[], on: boolean) => {
    setPicked((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const filterLower = filter.trim().toLowerCase()
  const visibleCandidates = candidates === null ? null
    : filterLower === '' ? candidates
    : candidates.filter((m) =>
        m.id.toLowerCase().includes(filterLower) || (m.name ?? '').toLowerCase().includes(filterLower),
      )

  const adoptPicked = async () => {
    if (candidates === null) return
    const byId = new Map(models.map((m) => [m.id, m]))
    for (const candidate of candidates) {
      if (!picked.has(candidate.id)) continue
      if (!byId.has(candidate.id)) {
        // discoverModels 返回的是 base id（已去掉 effort 后缀）
        // name 里带 [Free]/[Premium]/(Nx) 标记，解析出来
        const rawLabel = candidate.name?.replace(/\s*\[(?:Free|Premium|Promo)\]\s*/g, '').replace(/\s*\([\d.]+x\)\s*/g, '').trim() ?? candidate.id
        const isPromo = candidate.name?.includes('[Promo]') ?? false
        const isPremium = candidate.name?.includes('[Premium]') ?? false
        const multMatch = candidate.name?.match(/\(([\d.]+)x\)/)
        const creditMultiplier = multMatch ? Number(multMatch[1]) : undefined
        byId.set(candidate.id, {
          id: candidate.id,
          ...rawLabel ? { name: rawLabel } : {},
          ...candidate.contextWindow ? { contextWindow: candidate.contextWindow } : {},
          ...candidate.maxTokens ? { maxTokens: candidate.maxTokens } : {},
          ...isPromo ? { isPromo: true } : {},
          ...isPremium ? { isPremium: true } : {},
          ...creditMultiplier ? { creditMultiplier } : {},
        })
      }
    }
    await onSave([...byId.values()])
    setCandidates(null)
    setPicked(new Set())
  }

  const handleAddManual = async () => {
    const id = manualId.trim()
    if (!id) return
    if (models.some((m) => m.id === id)) {
      onError(`Model "${id}" already exists.`)
      return
    }
    await onSave([...models, { id, ...manualName.trim() ? { name: manualName.trim() } : {} }])
    setManualId('')
    setManualName('')
    setShowAddManual(false)
  }

  const handleRemove = async (index: number) => {
    await onSave(models.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const handleUpdateModel = async (index: number, updated: DevinBridgeConfig['models'][number]) => {
    const next = models.map((m, i) => i === index ? updated : m)
    await onSave(next)
  }

  return (
    <div className="devin-bridge-field">
      <span className="devin-bridge-field-label">Models</span>
      <p className="devin-bridge-field-hint">
        Models shown in the selector. Fetch from Devin to discover available models,
        or add manually by id.
      </p>

      {/* 操作按钮 */}
      <div className="devin-bridge-model-actions">
        <button
          type="button"
          className="devin-bridge-btn"
          disabled={disabled || fetching}
          onClick={handleFetch}
        >
          {fetching ? 'Fetching…' : 'Fetch available models'}
        </button>
        <button
          type="button"
          className="devin-bridge-btn devin-bridge-btn-secondary"
          disabled={disabled}
          onClick={() => setShowAddManual(!showAddManual)}
        >
          {showAddManual ? 'Cancel' : 'Add manually'}
        </button>
      </div>

      {/* 手动添加表单 */}
      {showAddManual && (
        <div className="devin-bridge-manual-add">
          <input
            className="devin-bridge-input"
            type="text"
            placeholder="Model id (e.g. glm-5-2)"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            disabled={disabled}
          />
          <input
            className="devin-bridge-input"
            type="text"
            placeholder="Display name (optional)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="devin-bridge-btn"
            disabled={disabled || !manualId.trim()}
            onClick={handleAddManual}
          >
            Add
          </button>
        </div>
      )}

      {/* Fetch 候选列表 — 按 family 分组 */}
      {candidates !== null && (
        <div className="devin-bridge-fetch-picker">
          <div className="devin-bridge-picker-toolbar">
            <input
              className="devin-bridge-input devin-bridge-picker-search"
              type="text"
              placeholder="Filter models…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span className="devin-bridge-picker-count">
              {picked.size}/{candidates.length} selected
            </span>
            <button
              type="button"
              className="devin-bridge-btn-text"
              onClick={() => setPicked(new Set(candidates.map((m) => m.id)))}
            >
              All
            </button>
            <button
              type="button"
              className="devin-bridge-btn-text"
              onClick={() => setPicked(new Set())}
            >
              None
            </button>
          </div>
          <div className="devin-bridge-picker-scroll">
            {groupCandidatesByFamily(visibleCandidates ?? []).map(({ family, models: famModels }) => {
              const allOn = famModels.every((m) => picked.has(m.id))
              return (
                <div key={family} className="devin-bridge-family-group">
                  <div className="devin-bridge-family-header">
                    <label className="devin-bridge-candidate-label">
                      <input
                        type="checkbox"
                        className="devin-bridge-checkbox"
                        checked={allOn}
                        onChange={(e) => pickFamily(famModels.map((m) => m.id), e.target.checked)}
                      />
                      <span className="devin-bridge-family-name">{family}</span>
                    </label>
                    <span className="devin-bridge-family-count">{famModels.length}</span>
                  </div>
                  <ul className="devin-bridge-candidate-list">
                    {famModels.map((model) => {
                      const info = parseCandidateInfo(model)
                      const known = models.some((m) => m.id === model.id)
                      return (
                        <li key={model.id} className="devin-bridge-candidate-item">
                          <label className="devin-bridge-candidate-label">
                            <input
                              type="checkbox"
                              className="devin-bridge-checkbox"
                              checked={picked.has(model.id)}
                              onChange={() => togglePick(model.id)}
                            />
                            <span className="devin-bridge-model-id">{model.id}</span>
                            <span className="devin-bridge-candidate-tags">
                              {known && <span className="devin-bridge-model-tag">added</span>}
                              {info.isPromo && <span className="devin-bridge-model-tag devin-bridge-tag-promo">Promo</span>}
                              {info.isPremium && !info.isPromo && <span className="devin-bridge-model-tag devin-bridge-tag-premium">Premium</span>}
                              {model.contextWindow && (
                                <span className="devin-bridge-model-tag">{(model.contextWindow / 1000).toFixed(0)}k</span>
                              )}
                              {info.creditMultiplier && (
                                <span className="devin-bridge-model-tag">{info.creditMultiplier}x</span>
                              )}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
            {visibleCandidates !== null && visibleCandidates.length === 0 && (
              <p className="devin-bridge-hint">No models match "{filter}".</p>
            )}
          </div>
          <div className="devin-bridge-model-actions">
            <button
              type="button"
              className="devin-bridge-btn"
              disabled={disabled || picked.size === 0}
              onClick={adoptPicked}
            >
              Add selected ({picked.size})
            </button>
            <button
              type="button"
              className="devin-bridge-btn devin-bridge-btn-secondary"
              onClick={() => { setCandidates(null); setPicked(new Set()); setFilter('') }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 已配置模型列表 */}
      {models.length > 0 ? (
        <ul className="devin-bridge-model-list">
          {models.map((model, index) => (
            <li key={model.id + index} className="devin-bridge-model-item-wrap">
              <div className="devin-bridge-model-item">
                <span className="devin-bridge-model-id">{model.id}</span>
                {model.name && <span className="devin-bridge-model-name">{model.name}</span>}
                {model.isPromo && <span className="devin-bridge-model-tag devin-bridge-tag-promo">Promo</span>}
                {model.isPremium && !model.isPromo && <span className="devin-bridge-model-tag devin-bridge-tag-premium">Premium</span>}
                {model.supportsImages && <span className="devin-bridge-model-tag">vision</span>}
                {model.contextWindow && (
                  <span className="devin-bridge-model-tag">{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                )}
                <button
                  type="button"
                  className="devin-bridge-model-edit"
                  disabled={disabled}
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                >
                  {editingIndex === index ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  className="devin-bridge-model-remove"
                  disabled={disabled}
                  onClick={() => handleRemove(index)}
                >
                  Remove
                </button>
              </div>
              {editingIndex === index && (
                <ModelEditor
                  model={model}
                  disabled={disabled}
                  onSave={(updated) => handleUpdateModel(index, updated)}
                  onClose={() => setEditingIndex(null)}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="devin-bridge-hint">No models configured. Defaults will be used.</p>
      )}
    </div>
  )
}

/** 模型编辑器：编辑单个模型的详情字段。 */
function ModelEditor({
  model,
  disabled,
  onSave,
  onClose,
}: {
  model: DevinBridgeConfig['models'][number]
  disabled: boolean
  onSave: (model: DevinBridgeConfig['models'][number]) => Promise<void>
  onClose: () => void
}): ReactNode {
  const [draft, setDraft] = useState({
    id: model.id,
    name: model.name ?? '',
    description: model.description ?? '',
    contextWindow: model.contextWindow?.toString() ?? '',
    maxTokens: model.maxTokens?.toString() ?? '',
    supportsImages: model.supportsImages ?? false,
    family: model.family ?? '',
    isPremium: model.isPremium ?? false,
    isPromo: model.isPromo ?? false,
    creditMultiplier: model.creditMultiplier?.toString() ?? '',
  })

  const handleSave = async () => {
    const updated: DevinBridgeConfig['models'][number] = {
      id: draft.id,
      ...draft.name.trim() ? { name: draft.name.trim() } : {},
      ...draft.description.trim() ? { description: draft.description.trim() } : {},
      ...draft.contextWindow.trim() ? { contextWindow: Number(draft.contextWindow) } : {},
      ...draft.maxTokens.trim() ? { maxTokens: Number(draft.maxTokens) } : {},
      ...draft.supportsImages ? { supportsImages: true } : {},
      ...draft.family.trim() ? { family: draft.family.trim() } : {},
      ...draft.isPremium ? { isPremium: true } : {},
      ...draft.isPromo ? { isPromo: true } : {},
      ...draft.creditMultiplier.trim() ? { creditMultiplier: Number(draft.creditMultiplier) } : {},
    }
    await onSave(updated)
    onClose()
  }

  return (
    <div className="devin-bridge-model-editor">
      <div className="devin-bridge-field">
        <span className="devin-bridge-field-label">ID</span>
        <input
          className="devin-bridge-input"
          type="text"
          value={draft.id}
          disabled={true}
        />
      </div>
      <div className="devin-bridge-field">
        <span className="devin-bridge-field-label">Name</span>
        <input
          className="devin-bridge-input"
          type="text"
          value={draft.name}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="devin-bridge-field">
        <span className="devin-bridge-field-label">Description</span>
        <input
          className="devin-bridge-input"
          type="text"
          value={draft.description}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="devin-bridge-editor-row">
        <div className="devin-bridge-field">
          <span className="devin-bridge-field-label">Context Window</span>
          <input
            className="devin-bridge-input"
            type="number"
            value={draft.contextWindow}
            placeholder="200000"
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, contextWindow: e.target.value })}
          />
        </div>
        <div className="devin-bridge-field">
          <span className="devin-bridge-field-label">Max Tokens</span>
          <input
            className="devin-bridge-input"
            type="number"
            value={draft.maxTokens}
            placeholder="16384"
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, maxTokens: e.target.value })}
          />
        </div>
      </div>
      <label className="devin-bridge-checkbox-label">
        <input
          type="checkbox"
          className="devin-bridge-checkbox"
          checked={draft.supportsImages}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, supportsImages: e.target.checked })}
        />
        <span className="devin-bridge-field-label">Supports Images</span>
      </label>
      <div className="devin-bridge-editor-row">
        <div className="devin-bridge-field">
          <span className="devin-bridge-field-label">Family</span>
          <input
            className="devin-bridge-input"
            type="text"
            value={draft.family}
            placeholder="GLM-5.2"
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, family: e.target.value })}
          />
        </div>
      </div>
      <div className="devin-bridge-editor-row">
        <div className="devin-bridge-field">
          <span className="devin-bridge-field-label">Credit Multiplier</span>
          <input
            className="devin-bridge-input"
            type="number"
            value={draft.creditMultiplier}
            placeholder="1.5"
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, creditMultiplier: e.target.value })}
          />
        </div>
      </div>
      <div className="devin-bridge-editor-row">
        <label className="devin-bridge-checkbox-label">
          <input
            type="checkbox"
            className="devin-bridge-checkbox"
            checked={draft.isPromo}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, isPromo: e.target.checked })}
          />
          <span className="devin-bridge-field-label">Promo</span>
        </label>
        <label className="devin-bridge-checkbox-label">
          <input
            type="checkbox"
            className="devin-bridge-checkbox"
            checked={draft.isPremium}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, isPremium: e.target.checked })}
          />
          <span className="devin-bridge-field-label">Premium</span>
        </label>
      </div>
      <div className="devin-bridge-model-actions">
        <button
          type="button"
          className="devin-bridge-btn"
          disabled={disabled}
          onClick={handleSave}
        >
          Save
        </button>
        <button
          type="button"
          className="devin-bridge-btn devin-bridge-btn-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/** 单个字段行。 */
function FieldRow({
  def,
  value,
  disabled,
  onSave,
}: {
  def: FieldDef
  value: unknown
  disabled: boolean
  onSave: (field: string, value: unknown) => void
}): ReactNode {
  const [draft, setDraft] = useState(() => formatValue(value, def.type))

  const handleBlur = () => {
    if (def.type === 'checkbox') return
    const trimmed = draft.trim()
    if (trimmed === '') {
      onSave(def.key, '')
    } else if (def.type === 'number') {
      const num = Number(trimmed)
      if (Number.isFinite(num) && num > 0) {
        onSave(def.key, num)
      }
    } else {
      onSave(def.key, trimmed)
    }
  }

  if (def.type === 'checkbox') {
    return (
      <div className="devin-bridge-field">
        <label className="devin-bridge-checkbox-label">
          <input
            type="checkbox"
            className="devin-bridge-checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onSave(def.key, e.target.checked)}
          />
          <span className="devin-bridge-field-label">{def.label}</span>
        </label>
        <p className="devin-bridge-field-hint">{def.hint}</p>
      </div>
    )
  }

  return (
    <div className="devin-bridge-field">
      <span className="devin-bridge-field-label">{def.label}</span>
      <input
        className="devin-bridge-input"
        type={def.type === 'password' ? 'password' : def.type === 'number' ? 'number' : 'text'}
        value={draft}
        placeholder={def.placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
      />
      <p className="devin-bridge-field-hint">{def.hint}</p>
    </div>
  )
}

/** 格式化值为字符串。 */
function formatValue(value: unknown, type: FieldDef['type']): string {
  if (type === 'checkbox') return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return ''
}

/** 内联样式。 */
const STYLES = (
  <style>{`
    .devin-bridge-page {
      flex-direction: column;
      gap: 16px;
      display: flex;
      max-width: 720px;
    }
    .devin-bridge-page-header {
      flex-direction: column;
      gap: 4px;
      display: flex;
    }
    .devin-bridge-page-header .devin-bridge-card-title {
      font-size: 16px;
    }
    .devin-bridge-card {
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 12px;
      flex-direction: column;
      gap: 12px;
      padding: 12px 14px;
      display: flex;
      list-style: none;
    }
    .devin-bridge-card-header {
      align-items: center;
      gap: 10px;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      font: inherit;
      padding: 0;
      text-align: left;
    }
    .devin-bridge-card-title {
      color: var(--dsw-alias-label-primary);
      font-size: 14px;
      font-weight: 500;
    }
    .devin-bridge-card-desc {
      color: var(--dsw-alias-label-tertiary);
      font-size: 13px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .devin-bridge-chevron {
      color: var(--dsw-alias-label-secondary);
      font-size: 12px;
    }
    .devin-bridge-card-body {
      flex-direction: column;
      gap: 12px;
      display: flex;
    }
    .devin-bridge-advanced {
      border-top: 1px solid var(--dsw-alias-border-l2);
      padding-top: 8px;
    }
    .devin-bridge-advanced-summary {
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font-size: 13px;
      padding: 4px 0;
    }
    .devin-bridge-advanced-body {
      flex-direction: column;
      gap: 12px;
      display: flex;
      padding-top: 8px;
    }
    .devin-bridge-field {
      flex-direction: column;
      gap: 4px;
      display: flex;
    }
    .devin-bridge-field-label {
      color: var(--dsw-alias-label-secondary);
      font-size: 13px;
    }
    .devin-bridge-field-hint {
      color: var(--dsw-alias-label-tertiary);
      font-size: 12px;
      line-height: 18px;
      margin: 0;
    }
    .devin-bridge-input {
      border: 1px solid var(--dsw-alias-border-l2);
      background: var(--dsw-alias-bg-base);
      color: var(--dsw-alias-label-primary);
      border-radius: 8px;
      padding: 6px 10px;
      font: inherit;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    .devin-bridge-input:focus {
      outline: 2px solid var(--dsw-alias-state-business-primary);
      outline-offset: 1px;
    }
    .devin-bridge-input:disabled {
      opacity: 0.5;
    }
    .devin-bridge-checkbox {
      width: 16px;
      height: 16px;
    }
    .devin-bridge-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .devin-bridge-readonly {
      color: var(--dsw-alias-state-warn-label);
      font-size: 12px;
      margin: 0;
    }
    .devin-bridge-hint {
      color: var(--dsw-alias-label-tertiary);
      font-size: 13px;
      margin: 0;
    }
    .devin-bridge-error {
      color: var(--dsw-alias-state-error-primary);
      font-size: 12px;
      margin: 0;
    }
    .devin-bridge-status {
      align-items: center;
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 8px;
      display: flex;
      gap: 8px;
      padding: 8px 10px;
    }
    .devin-bridge-status-dot {
      border-radius: 50%;
      flex-shrink: 0;
      height: 8px;
      width: 8px;
    }
    .devin-bridge-status-dot-auto {
      background: var(--dsw-alias-state-success-primary, #22c55e);
    }
    .devin-bridge-status-dot-config {
      background: var(--dsw-alias-state-business-primary, #3b82f6);
    }
    .devin-bridge-status-text {
      color: var(--dsw-alias-label-secondary);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .devin-bridge-picker-toolbar {
      align-items: center;
      display: flex;
      gap: 8px;
    }
    .devin-bridge-picker-search {
      flex: 1;
      font-size: 13px;
      min-width: 0;
      padding: 4px 10px;
    }
    .devin-bridge-picker-count {
      color: var(--dsw-alias-label-tertiary);
      flex-shrink: 0;
      font-size: 12px;
    }
    .devin-bridge-btn-text {
      background: none;
      border: none;
      color: var(--dsw-alias-state-business-primary, #3b82f6);
      cursor: pointer;
      flex-shrink: 0;
      font: inherit;
      font-size: 12px;
      padding: 2px 4px;
    }
    .devin-bridge-btn-text:hover {
      text-decoration: underline;
    }
    .devin-bridge-picker-scroll {
      flex-direction: column;
      gap: 8px;
      display: flex;
      max-height: 400px;
      overflow-y: auto;
    }
    .devin-bridge-candidate-tags {
      align-items: center;
      display: flex;
      gap: 4px;
      margin-left: auto;
    }
    .devin-bridge-model-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .devin-bridge-btn {
      background: var(--dsw-alias-button-primary-fill);
      color: var(--dsw-alias-label-primary-foreground);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      padding: 6px 12px;
    }
    .devin-bridge-btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    .devin-bridge-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .devin-bridge-btn-secondary {
      background: var(--dsw-alias-bg-base);
      color: var(--dsw-alias-label-primary);
      border: 1px solid var(--dsw-alias-border-l2);
    }
    .devin-bridge-manual-add {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .devin-bridge-manual-add .devin-bridge-input {
      flex: 1;
      min-width: 120px;
    }
    .devin-bridge-fetch-picker {
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 8px;
      padding: 10px;
      flex-direction: column;
      gap: 8px;
      display: flex;
    }
    .devin-bridge-candidate-list {
      flex-direction: column;
      gap: 4px;
      margin: 0 0 8px 0;
      padding: 0;
      list-style: none;
      display: flex;
    }
    .devin-bridge-candidate-item {
      border: 1px solid var(--dsw-alias-border-l1);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .devin-bridge-family-group {
      margin-bottom: 8px;
    }
    .devin-bridge-family-header {
      align-items: center;
      display: flex;
      gap: 8px;
      padding: 4px 0;
      position: sticky;
      top: 0;
      background: var(--dsw-alias-bg-primary, #fff);
      z-index: 1;
    }
    .devin-bridge-family-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--dsw-alias-label-primary);
    }
    .devin-bridge-family-count {
      border: 1px solid var(--dsw-alias-border-l3);
      border-radius: 10px;
      color: var(--dsw-alias-label-secondary);
      font-size: 11px;
      margin-left: auto;
      padding: 0 6px;
    }
    .devin-bridge-candidate-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .devin-bridge-model-list {
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
    }
    .devin-bridge-model-item-wrap {
      flex-direction: column;
      gap: 0;
      display: flex;
    }
    .devin-bridge-model-item {
      align-items: center;
      gap: 8px;
      border: 1px solid var(--dsw-alias-border-l1);
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      font-size: 13px;
    }
    .devin-bridge-model-id {
      color: var(--dsw-alias-label-primary);
      font-weight: 500;
    }
    .devin-bridge-model-name {
      color: var(--dsw-alias-label-secondary);
    }
    .devin-bridge-model-tag {
      border: 1px solid var(--dsw-alias-border-l3);
      border-radius: 4px;
      color: var(--dsw-alias-label-secondary);
      font-size: 11px;
      padding: 1px 6px;
    }
    .devin-bridge-tag-promo {
      border-color: var(--dsw-alias-state-success-primary, #22c55e);
      color: var(--dsw-alias-state-success-primary, #22c55e);
    }
    .devin-bridge-tag-premium {
      border-color: var(--dsw-alias-state-warn-label, #f59e0b);
      color: var(--dsw-alias-state-warn-label, #f59e0b);
    }
    .devin-bridge-model-edit {
      background: none;
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 6px;
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      margin-left: auto;
      padding: 2px 8px;
    }
    .devin-bridge-model-edit:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover-solid);
      color: var(--dsw-alias-label-primary);
    }
    .devin-bridge-model-edit:disabled {
      opacity: 0.5;
    }
    .devin-bridge-model-remove {
      background: none;
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 6px;
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      padding: 2px 8px;
    }
    .devin-bridge-model-remove:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover-solid);
      color: var(--dsw-alias-label-primary);
    }
    .devin-bridge-model-remove:disabled {
      opacity: 0.5;
    }
    .devin-bridge-model-editor {
      border: 1px solid var(--dsw-alias-border-l1);
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 10px;
      flex-direction: column;
      gap: 10px;
      display: flex;
    }
    .devin-bridge-editor-row {
      display: flex;
      gap: 12px;
    }
    .devin-bridge-editor-row .devin-bridge-field {
      flex: 1;
    }
  `}</style>
)
