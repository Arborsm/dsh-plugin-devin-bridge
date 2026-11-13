/**
 * dsh-plugin-devin-bridge 客户端入口（dsh 0.2）。
 *
 * 在 Plugins 设置页注册一个 `settings.plugins.tab` tab，
 * 让用户通过 UI 配置 token、baseUrl、proxy 和模型列表，
 * 包括从 Devin 服务器动态拉取可用模型。
 *
 * 配置读写走 `ctx.configForms`（Host settings 的 volatile 字段），
 * 模型发现走 `ctx.remote.llm.discoverModels`。
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-llm/remote'
import { DevinBridgeCard, type DevinBridgeCardProps } from './DevinBridgeCard.tsx'

/** Settings namespace — 等于 cordis.patch.yml 里的 entry id。 */
const SETTINGS_NS = 'devin-bridge'

/** Required services: slot registry + config forms + llm remote namespace。 */
export const inject = ['slots', 'configForms', 'remote.llm']

/**
 * 注册 Devin 配置 tab 到 Plugins 设置页。
 * `whileServed` 保证仅在 Host 实际加载了本插件（serve 该 namespace）时注册；
 * `slots.inject` 等待 Plugins section 声明 `settings.plugins.tab` 后再挂载。
 * @param ctx - 客户端插件上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() =>
    ctx.configForms.whileServed([SETTINGS_NS], () =>
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          {
            name: 'settings.plugins.tab',
            id: SETTINGS_NS,
            order: 100,
            label: 'Devin',
            inject: (): DevinBridgeCardProps => ({
              form: ctx.configForms.get(SETTINGS_NS),
              discover: () => ctx.remote.llm.discoverModels(SETTINGS_NS, { provider: 'devin' }),
            }),
          },
          DevinBridgeCard,
        ),
      ),
    ),
    'devin-bridge: settings tab',
  )
}
