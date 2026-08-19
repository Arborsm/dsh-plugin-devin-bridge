// dsh-plugin-devin-bridge 入口。
// Cordis 插件标准入口：export const name + export function apply(ctx, config)。
// apply 在 Harness 加载插件时调用，创建 DevinBridgeGateway 并注册路由。

import { DevinBridgeGateway } from './gateway.ts'
import type { DevinBridgeConfig } from './gateway.ts'

/** Cordis 插件名称，与 cordis.patch.yml 中的 name 一致。 */
export const name = 'dsh-plugin-devin-bridge'

/**
 * schemastery 配置 schema。
 * dsh 在加载插件时用 schemastery 校验 cordis.patch.yml 中的 config 字段。
 */
export const Config = {
  baseUrl: { type: 'string', required: true, description: 'Devin Connect 服务地址' },
  token: { type: 'string', required: true, description: 'Devin session token (devin-session-token$...)' },
  model: { type: 'string', required: false, default: 'glm-5-2', description: '默认模型 UID' },
  proxy: { type: 'string', required: false, default: '', description: '可选代理地址 (http/https/socks5)' },
  forceHttp1: { type: 'boolean', required: false, default: true, description: '强制 HTTP/1.1' },
  apiKey: { type: 'string', required: false, default: '', description: '/v1/* 接口访问密钥；留空不鉴权' },
} as const

/**
 * 插件启动入口。Harness 加载插件时调用。
 * @param ctx - Cordis 上下文，包含 ctx.webServer 等 service
 * @param config - 经 schemastery 校验后的配置
 */
export function apply(ctx: {
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>
    }): () => void
  }
  effect<T>(cleanup: T | (() => T | void), name?: string): T
}, config: DevinBridgeConfig): void {
  // 校验必填项
  if (!config.baseUrl) throw new Error('devin-bridge: baseUrl is required')
  if (!config.token) throw new Error('devin-bridge: token is required')

  // 创建并注册 gateway
  new DevinBridgeGateway(ctx, config)
}

// 导出 gateway 类供高级用法
export { DevinBridgeGateway } from './gateway.ts'
export type { DevinBridgeConfig } from './gateway.ts'
