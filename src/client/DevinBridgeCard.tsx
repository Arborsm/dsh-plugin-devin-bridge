/**
 * Devin Bridge 配置卡片组件。
 *
 * 在 Plugins 设置页面渲染，让用户编辑 token、baseUrl、proxy
 * 和模型列表。通过 settings scope 读写 host 端的 namespace。
 */

import { useSyncExternalStore, useState, useCallback, type ReactNode } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'

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

/** card 组件接收的 props（由 slot inject 注入）。 */
export interface DevinBridgeCardProps {
  scope: SettingsScope<DevinBridgeConfig>
}

/** 字段元数据。 */
interface FieldDef {
  key: keyof DevinBridgeConfig
  label: string
  hint: string
  type: 'text' | 'password' | 'number' | 'checkbox'
  placeholder?: string
}

const FIELDS: readonly FieldDef[] = [
  { key: 'token', label: 'Token', hint: 'Devin session token (devin-session-token$...). Leave empty to auto-detect from credentials.toml.', type: 'password', placeholder: 'devin-session-token$...' },
  { key: 'baseUrl', label: 'Base URL', hint: 'Devin Connect endpoint.', type: 'text', placeholder: 'https://server.codeium.com' },
  { key: 'proxy', label: 'Proxy', hint: 'Outbound proxy URL (http/https/socks5). Leave empty for direct connection.', type: 'text', placeholder: 'socks5://127.0.0.1:1080' },
  { key: 'forceHttp1', label: 'Force HTTP/1.1', hint: 'Force HTTP/1.1 connection to Devin.', type: 'checkbox' },
  { key: 'defaultContextWindow', label: 'Default Context Window', hint: 'Fallback context window in tokens.', type: 'number', placeholder: '128000' },
  { key: 'defaultMaxTokens', label: 'Default Max Tokens', hint: 'Fallback max output tokens.', type: 'number', placeholder: '16384' },
]

/**
 * 渲染 Devin Bridge 配置卡片。
 * @param props - settings scope 注入的 props。
 * @returns 配置表单。
 */
export function DevinBridgeCard({ scope }: DevinBridgeCardProps): ReactNode {
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

  if (loading) {
    return <li className="devin-bridge-card"><div className="devin-bridge-card-header">Devin Bridge</div><p className="devin-bridge-hint">Loading…</p></li>
  }

  if (snapshot.status === 'unavailable') {
    return <li className="devin-bridge-card"><div className="devin-bridge-card-header">Devin Bridge</div><p className="devin-bridge-hint">Settings unavailable (running in memory mode).</p></li>
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

          {FIELDS.map((field) => (
            <FieldRow
              key={field.key}
              def={field}
              value={value?.[field.key]}
              disabled={disabled}
              onSave={handleSaveField}
            />
          ))}

          {/* 模型列表 */}
          <div className="devin-bridge-field">
            <span className="devin-bridge-field-label">Models</span>
            <p className="devin-bridge-field-hint">
              Models shown in the selector. Use the Models settings page "Fetch available models"
              button to discover Devin's full catalog.
            </p>
            {value?.models && value.models.length > 0 ? (
              <ul className="devin-bridge-model-list">
                {value.models.map((model, index) => (
                  <li key={model.id + index} className="devin-bridge-model-item">
                    <span className="devin-bridge-model-id">{model.id}</span>
                    {model.name && <span className="devin-bridge-model-name">{model.name}</span>}
                    {model.supportsImages && <span className="devin-bridge-model-tag">vision</span>}
                    <button
                      type="button"
                      className="devin-bridge-model-remove"
                      disabled={disabled}
                      onClick={() => {
                        const next = value.models.filter((_, i) => i !== index)
                        handleSaveField('models', next)
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="devin-bridge-hint">No models configured. Defaults will be used.</p>
            )}
          </div>

          {error && <p className="devin-bridge-error" role="status">{error}</p>}
          {saving && <p className="devin-bridge-hint">Saving…</p>}
        </div>
      )}

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
        .devin-bridge-model-list {
          flex-direction: column;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
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
        .devin-bridge-model-remove {
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
        .devin-bridge-model-remove:hover:not(:disabled) {
          background: var(--dsw-alias-interactive-bg-hover-solid);
          color: var(--dsw-alias-label-primary);
        }
        .devin-bridge-model-remove:disabled {
          opacity: 0.5;
        }
      `}</style>
    </li>
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

  // 当 host 端值变化时同步 draft
  const current = formatValue(value, def.type)
  if (draft !== current && draft === formatValue(value, def.type)) {
    // no-op, draft already in sync
  }

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
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
