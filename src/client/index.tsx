/**
 * dsh-plugin-devin-bridge 客户端入口（dsh 0.2）。
 *
 * 贡献：
 * - `settings.section`：设置侧栏独立 "Devin" 页面（额度卡 + 模型目录开关 + 连接设置）；
 * - `plugins.bundle.config`：插件管理器 bundle 详情页内嵌同一面板（key = 包名）；
 * - `conversation.input.right`：选中 devin 模型时的日/周额度胶囊。
 *
 * 配置读写走 `ctx.configForms`；模型发现走 `ctx.remote.llm.discoverModels`；
 * 账户额度走插件自己的 `remote.devin`（Host 代理 GetUserStatus，token 不出进程）。
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-llm/remote'
import { DevinBridgeCard, type DevinBridgeCardProps, type QuotaSource } from './DevinBridgeCard.tsx'
import { QuotaPill, type QuotaPillProps } from './QuotaPill.tsx'
import { mountDevinRemote, type DevinRemote } from './remote.ts'

/** Settings namespace — 等于 cordis.patch.yml 里的 entry id。 */
const SETTINGS_NS = 'devin-bridge'

/** Required services: slot registry + config forms + remote namespaces。 */
export const inject = ['slots', 'configForms', 'remote', 'remote.llm']

/**
 * 注册 Devin 配置页面与输入区额度胶囊。
 * `slots.inject` 等待槽位声明后再挂载，组合顺序无关。
 * @param ctx - 客户端插件上下文。
 */
export function apply(ctx: ClientContext): void {
  // remote.devin 是异步 $mount 的：先持引用，组件读取时再取（首轮轮询可能晚一拍）。
  let devinRemote: DevinRemote | null = null
  ctx.effect(
    () => {
      let cancelled = false
      let dispose: (() => Promise<void>) | undefined
      void mountDevinRemote(ctx)
        .then(({ remote, dispose: d }) => {
          if (cancelled) {
            void d()
            return
          }
          devinRemote = remote
          dispose = d
        })
        .catch(() => {
          devinRemote = null
        })
      return () => {
        cancelled = true
        devinRemote = null
        if (dispose) void dispose()
      }
    },
    'devin-bridge: remote mount',
  )

  // 惰性代理：$mount 完成前调用会失败（reject），挂载后即通，组件无需感知时序。
  const unmounted = () => Promise.reject(new Error('remote.devin not mounted'))
  const quotaProxy: QuotaSource = {
    quota: () => devinRemote?.quota() ?? unmounted(),
    refreshQuota: () => devinRemote?.refreshQuota() ?? unmounted(),
  }

  const face = (embedded: boolean) => (): DevinBridgeCardProps => ({
    embedded,
    form: ctx.configForms.get(SETTINGS_NS),
    // 目录刷新走 remote.devin.catalog：带 family 档位表（effort→uid），
    // remote.llm.discoverModels 的 LlmDiscoveredModel 形状放不下。
    discover: () => devinRemote?.catalog() ?? unmounted(),
    remote: quotaProxy,
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

  // 输入区右侧的额度胶囊：只在当前会话选中 devin provider 时显示。
  // modelDirectories 不保证存在，走运行时 inject 容错。
  ctx.inject(['modelDirectories'], (scope) => {
    scope.slots.inject('conversation.input.right', () =>
      scope.slots.register(
        {
          name: 'conversation.input.right',
          id: 'devin-quota',
          order: 1000,
          inject: (sessionId: string): QuotaPillProps => {
            try {
              return {
                directory: scope.modelDirectories.directoryFor(sessionId as Parameters<typeof scope.modelDirectories.directoryFor>[0]).store,
                quota: () => devinRemote?.quota() ?? unmounted(),
                refreshQuota: () => devinRemote?.refreshQuota() ?? unmounted(),
              }
            } catch {
              // 会话还没绑定模型目录：胶囊先不渲染。
              return { directory: undefined, quota: null, refreshQuota: null }
            }
          },
        },
        QuotaPill,
      ),
    )
  })
}
