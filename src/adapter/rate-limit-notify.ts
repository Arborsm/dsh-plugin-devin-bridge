// 限流通知的 webhook 渠道：POST 一条 JSON，字段与 remote.devin.rateLimit() 一致。
// 失败只影响通知本身，不阻塞生成请求；调用方负责 catch 并记日志。

import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { RateLimitNotice } from './rate-limit-watch.ts'
import { createProxyAgent } from './transport.ts'

const NOTIFY_TIMEOUT_MS = 10_000

/** 把通知 POST 到 webhook；非 2xx 视为失败。 */
export async function postRateLimitNotice(
  url: string,
  notice: RateLimitNotice,
  proxy?: string,
): Promise<void> {
  const target = new URL(url)
  const isHttps = target.protocol === 'https:'
  const agent = createProxyAgent(proxy, url)
  const body = Buffer.from(JSON.stringify({
    kind: notice.kind,
    code: notice.code,
    message: notice.message,
    resetAt: notice.resetAt,
    resetAtUtc: notice.resetAtUtc,
    resetAtLocal: notice.resetAtLocal,
    waitMs: notice.waitMs,
    guessed: notice.guessed,
  }), 'utf8')

  await new Promise<void>((resolve, reject) => {
    const req = (isHttps ? httpsRequest : httpRequest)(
      {
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: target.pathname + target.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': String(body.length),
        },
        ...(agent ? { agent } : {}),
        timeout: NOTIFY_TIMEOUT_MS,
      },
      (res) => {
        res.resume()
        const status = res.statusCode ?? 0
        if (status >= 200 && status < 300) resolve()
        else reject(new Error(`rate-limit webhook HTTP ${status}`))
      },
    )
    req.on('timeout', () => req.destroy(new Error('rate-limit webhook timed out')))
    req.on('error', reject)
    req.end(body)
  })
}
