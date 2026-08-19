/**
 * dsh-plugin-devin-bridge 客户端入口。
 *
 * 在 Plugins 设置页面注册 `settings.plugin.item` slot card，
 * 让用户通过 UI 配置 token、baseUrl、proxy 和模型列表，
 * 而不是手动编辑 settings.yaml。
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { DevinBridgeCard, type DevinBridgeCardProps } from './DevinBridgeCard.tsx'

/** Settings namespace — 必须和 host 端 settingsNamespace(name) 一致。 */
const SETTINGS_NS = 'dsh-plugin-devin-bridge'

/** 插件配置类型（和 host 端 Config 对齐）。 */
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

/** Required services: slot registry + settings scope binder。 */
export const inject = ['slots', 'settingsScope']

/**
 * 注册 Devin Bridge 配置卡片到 Plugins 设置页面。
 * @param ctx - 客户端插件上下文。
 */
export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<DevinBridgeConfig>({ namespace: SETTINGS_NS })

  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: SETTINGS_NS,
        inject: (): DevinBridgeCardProps => ({ scope }),
      },
      DevinBridgeCard,
    )
  })
}
