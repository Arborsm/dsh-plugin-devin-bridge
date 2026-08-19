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
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { IApiClient } from '@deepseek-ai/dsh-host-apiproxy/client'

/** 插件配置类型。 */
interface DevinBridgeConfig {
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
  }>
}

/** 从 discoverModels 返回的候选模型。 */
interface DiscoveredModel {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
}

/** card 组件接收的 props（由 slot inject 注入）。 */
export interface DevinBridgeCardProps {
  scope: SettingsScope<DevinBridgeConfig>
  api: IApiClient
}

/** Provider route key — 必须和 host 端 PROVIDER 一致。 */
const PROVIDER = 'devin'
/** Settings namespace — 必须和 host 端一致。 */
const SETTINGS_NS = 'dsh-plugin-devin-bridge'

/**
 * 渲染 Devin Bridge 配置卡片。
 * @param props - settings scope 和 api 注入的 props。
 * @returns 配置表单。
 */
export function DevinBridgeCard({ scope, api }: DevinBridgeCardProps): ReactNode {
  const snapshot = useSyncExternalStore(
    (listener) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
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
        if (fieldValue === '' || fieldValue === undefined || fieldValue === null) {
          await scope.unset(field)
        } else {
          await scope.set(field, fieldValue)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [scope, snapshot.writable],
  )

  const handleSaveModels = useCallback(
    async (models: DevinBridgeConfig['models']) => {
      await handleSaveField('models', models)
    },
    [handleSaveField],
  )

  if (loading) {
    return (
      <li className="devin-bridge-card">
        <div className="devin-bridge-card-header">Devin Bridge</div>
        <p className="devin-bridge-hint">Loading…</p>
        {STYLES}
      </li>
    )
  }

  if (snapshot.status === 'unavailable') {
    return (
      <li className="devin-bridge-card">
        <div className="devin-bridge-card-header">Devin Bridge</div>
        <p className="devin-bridge-hint">Settings unavailable (running in memory mode).</p>
        {STYLES}
      </li>
    )
  }

  return (
    <li className="devin-bridge-card">
      <button
        type="button"
        className="devin-bridge-card-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="devin-bridge-card-title">Devin Bridge</span>
        <span className="devin-bridge-card-desc">Devin Connect LLM adapter (glm-5.2 / swe-1.7)</span>
        <span className="devin-bridge-chevron">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="devin-bridge-card-body">
          {!snapshot.writable && (
            <p className="devin-bridge-readonly" role="status">Read-only settings provider.</p>
          )}

          {/* 模型管理（主要功能，默认展开） */}
          <ModelManager
            models={value?.models ?? []}
            disabled={disabled}
            api={api}
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
      )}

      {STYLES}
    </li>
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
  api,
  onSave,
  onError,
}: {
  models: DevinBridgeConfig['models']
  disabled: boolean
  api: IApiClient
  onSave: (models: DevinBridgeConfig['models']) => Promise<void>
  onError: (msg: string | null) => void
}): ReactNode {
  const [fetching, setFetching] = useState(false)
  const [candidates, setCandidates] = useState<DiscoveredModel[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualName, setManualName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleFetch = async () => {
    setFetching(true)
    onError(null)
    try {
      // 传 provider: 'devin' 让 dsh-llm 路由到已注册的 adapter discovery
      const response = await api.llm.discoverModels({
        settingsNs: SETTINGS_NS,
        provider: PROVIDER,
      })
      if (!response.result.ok) {
        onError(response.result.error.message)
        return
      }
      const found = response.result.value.models
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

  const adoptPicked = async () => {
    if (candidates === null) return
    const byId = new Map(models.map((m) => [m.id, m]))
    for (const candidate of candidates) {
      if (!picked.has(candidate.id)) continue
      if (!byId.has(candidate.id)) {
        byId.set(candidate.id, {
          id: candidate.id,
          ...candidate.name ? { name: candidate.name } : {},
          ...candidate.contextWindow ? { contextWindow: candidate.contextWindow } : {},
          ...candidate.maxTokens ? { maxTokens: candidate.maxTokens } : {},
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

      {/* Fetch 候选列表 */}
      {candidates !== null && (
        <div className="devin-bridge-fetch-picker">
          <p className="devin-bridge-field-hint">
            Choose models to add ({candidates.length} available, {picked.size} selected):
          </p>
          <ul className="devin-bridge-candidate-list">
            {candidates.map((model) => (
              <li key={model.id} className="devin-bridge-candidate-item">
                <label className="devin-bridge-candidate-label">
                  <input
                    type="checkbox"
                    className="devin-bridge-checkbox"
                    checked={picked.has(model.id)}
                    onChange={() => togglePick(model.id)}
                  />
                  <span className="devin-bridge-model-id">{model.id}</span>
                  {model.name && <span className="devin-bridge-model-name">{model.name}</span>}
                  {model.contextWindow && (
                    <span className="devin-bridge-model-tag">{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
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
              onClick={() => { setCandidates(null); setPicked(new Set()) }}
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
  })

  const handleSave = async () => {
    const updated: DevinBridgeConfig['models'][number] = {
      id: draft.id,
      ...draft.name.trim() ? { name: draft.name.trim() } : {},
      ...draft.description.trim() ? { description: draft.description.trim() } : {},
      ...draft.contextWindow.trim() ? { contextWindow: Number(draft.contextWindow) } : {},
      ...draft.maxTokens.trim() ? { maxTokens: Number(draft.maxTokens) } : {},
      ...draft.supportsImages ? { supportsImages: true } : {},
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
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      max-height: 240px;
      overflow-y: auto;
    }
    .devin-bridge-candidate-item {
      border: 1px solid var(--dsw-alias-border-l1);
      border-radius: 6px;
      padding: 4px 8px;
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
