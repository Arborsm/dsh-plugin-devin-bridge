// Devin Connect 传输层：auth header 注入 + 代理 + 强制 HTTP/1.1。
// 翻译自 devin-2api/internal/adapter/devin/devin.go 的 authTransport + httpproxy。

import type { Interceptor } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'
import type { Agent } from 'node:http'

export interface TransportConfig {
  baseUrl: string
  token: string
  proxy?: string
  forceHttp1: boolean
}

/**
 * 创建 Connect transport，注入 Devin Basic auth header 并支持代理。
 */
export function createDevinTransport(config: TransportConfig) {
  const agent = createProxyAgent(config.proxy, config.baseUrl)
  const interceptors: Interceptor[] = [authInterceptor(config.token)]

  const transportOptions: Parameters<typeof createConnectTransport>[0] = {
    baseUrl: config.baseUrl,
    interceptors,
    nodeOptions: agent ? { agent } : undefined,
  } as never
  if (config.forceHttp1) {
    ;(transportOptions as { httpVersion: '1.1' }).httpVersion = '1.1'
  } else {
    ;(transportOptions as { httpVersion: '2' }).httpVersion = '2'
  }
  return createConnectTransport(transportOptions)
}

/**
 * Auth 拦截器：注入 Authorization: Basic <token>-<token>。
 * 与 Go authTransport 行为一致。
 */
function authInterceptor(token: string): Interceptor {
  return (next) => async (req) => {
    req.header.set('Authorization', `Basic ${token}-${token}`)
    return next(req)
  }
}

/**
 * 根据代理 URL 创建合适的 Agent。
 * 支持 http://, https://, socks5://, socks5h:// 协议。
 */
function createProxyAgent(proxyUrl: string | undefined, baseUrl: string): Agent | undefined {
  if (!proxyUrl) return undefined

  const isHttps = baseUrl.startsWith('https://')
  const url = new URL(proxyUrl)
  const protocol = url.protocol

  if (protocol === 'http:' || protocol === 'https:') {
    // 动态导入避免无代理场景的额外加载
    const { HttpsProxyAgent } = require('https-proxy-agent') as typeof import('https-proxy-agent')
    return new HttpsProxyAgent(proxyUrl) as unknown as Agent
  }

  if (protocol === 'socks5:' || protocol === 'socks5h:') {
    const { SocksProxyAgent } = require('socks-proxy-agent') as typeof import('socks-proxy-agent')
    return new SocksProxyAgent(proxyUrl) as unknown as Agent
  }

  throw new Error(`unsupported proxy protocol: ${protocol}`)
}
