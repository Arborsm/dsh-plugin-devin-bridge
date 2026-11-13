/**
 * dsh-plugin-devin-bridge 客户端入口（dsh 0.2）。
 *
 * 在插件管理器的 bundle 详情页注册 `plugins.bundle.config` 卡片
 * （key = 包名），让用户通过 UI 配置 token、baseUrl、proxy 和模型列表，
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
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-llm/remote'
import { DevinBridgeCard, type DevinBridgeCardProps } from './DevinBridgeCard.tsx'

/** Settings namespace — 等于 cordis.patch.yml 里的 entry id。 */
const SETTINGS_NS = 'devin-bridge'

/** Required services: slot registry + config forms + remote namespace。 */
export const inject = ['slots', 'configForms', 'remote', 'remote.llm']

/**
 * 注册 Devin 配置卡片到插件详情页（Plugins → dsh-plugin-devin-bridge）。
 * `plugins.bundle.config` 以包名为 key，由插件管理器在详情页
 * description 与 rows 之间渲染（仅 view: 'page'）。
 * `slots.inject` 等待插件管理器声明该槽位后再挂载，组合顺序无关。
 * @param ctx - 客户端插件上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() =>
    ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.bundle.config',
          key: 'dsh-plugin-devin-bridge',
          inject: (): DevinBridgeCardProps => ({
            form: ctx.configForms.get(SETTINGS_NS),
            discover: () => ctx.remote.llm.discoverModels(SETTINGS_NS, { provider: 'devin' }),
          }),
        },
        DevinBridgeCard,
      ),
    ),
    'devin-bridge: bundle config card',
  )
}
