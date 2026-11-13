/**
 * dsh-plugin-devin-bridge 客户端入口（dsh 0.2）。
 *
 * 同一配置页面注册到两个位置（与 dsh-memory 的做法一致）：
 * - `settings.section`：设置侧栏独立的 "Devin" 页面；
 * - `plugins.bundle.config`：插件管理器 bundle 详情页（key = 包名）。
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
 * 注册 Devin 配置页面。
 * `slots.inject` 等待槽位声明后再挂载，组合顺序无关。
 * @param ctx - 客户端插件上下文。
 */
export function apply(ctx: ClientContext): void {
  const face = (embedded: boolean) => (): DevinBridgeCardProps => ({
    embedded,
    form: ctx.configForms.get(SETTINGS_NS),
    discover: () => ctx.remote.llm.discoverModels(SETTINGS_NS, { provider: 'devin' }),
  })

  // Settings → Devin：设置侧栏中的独立页面。
  ctx.effect(() =>
    ctx.slots.inject('settings.section', () =>
      ctx.slots.register(
        {
          name: 'settings.section',
          id: 'devin',
          order: 25,
          label: () => 'Devin',
          inject: face(false),
        },
        DevinBridgeCard,
      ),
    ),
    'devin-bridge: settings section',
  )

  // Plugins → dsh-plugin-devin-bridge 详情页：以包名为 key。
  ctx.effect(() =>
    ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.bundle.config',
          key: 'dsh-plugin-devin-bridge',
          inject: face(true),
        },
        DevinBridgeCard,
      ),
    ),
    'devin-bridge: bundle config card',
  )
}
