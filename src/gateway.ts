// Devin Bridge Gateway：注册 /v1/chat/completions 和 /v1/models 路由到 ctx.webServer。
// 参照 dsh-plugin-market 的 MarketGateway 模式，用 schemastery 配置 + Service 基类。

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { DevinAdapter } from './adapter/devin.ts'
import { decodeChatRequest } from './api/chat/decode.ts'
import {
  ChatStreamEncoder,
  encodeChatResponse,
  formatSSE,
  openAIErrorType,
} from './api/chat/encode.ts'
import type { AssistantMessage, ResponseEvent } from './llm/types.ts'

// ─── 配置类型 ───────────────────────────────────────────────────────────────

export interface DevinBridgeConfig {
  baseUrl: string
  token: string
  model: string
  proxy?: string
  forceHttp1: boolean
  apiKey?: string
}

// ─── 路由注册接口（与 ctx.webServer 兼容的最小接口） ─────────────────────────

interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

interface WebServerService {
  register(route: WebRoute): () => void
}

interface CordisContext {
  webServer: WebServerService
  effect<T>(cleanup: T | (() => T | void), name?: string): T
}

// ─── Gateway ────────────────────────────────────────────────────────────────

/**
 * Devin Bridge 网关服务。激活时注册 /v1/* 路由到 ctx.webServer。
 * 配置通过 schemastery 校验后传入。
 */
export class DevinBridgeGateway {
  private config: DevinBridgeConfig
  private adapter: DevinAdapter
  private ctx: CordisContext

  constructor(ctx: CordisContext, config: DevinBridgeConfig) {
    this.ctx = ctx
    this.config = config
    this.adapter = new DevinAdapter({
      baseUrl: config.baseUrl,
      token: config.token,
      model: config.model,
      proxy: config.proxy,
      forceHttp1: config.forceHttp1,
    })

    // 注册路由
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/v1/chat/completions',
      handler: (req, res) => this.handleChat(req, res),
    }), 'devinBridge.chat')
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/v1/models',
      handler: (req, res) => this.handleModels(req, res),
    }), 'devinBridge.models')
  }

  // ─── /v1/chat/completions ──────────────────────────────────────────────────

  private async handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 鉴权
    if (!this.checkAuth(req, res)) return

    // 只接受 POST
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'method not allowed')
      return
    }

    try {
      // 读 body（上限 32MB）
      const body = await readBody(req, 32 << 20)
      const decoded = decodeChatRequest(body)
      const { context, options } = decoded

      // 调用上游
      let stream
      try {
        stream = await this.adapter.stream(context)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const status = mapProviderErrorStatus(message)
        this.sendError(res, status, message)
        return
      }

      if (options.stream) {
        await this.handleStreamResponse(res, stream, context.model, options.includeUsage)
      } else {
        await this.handleNonStreamResponse(res, stream)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.sendError(res, 400, message)
    }
  }

  private async handleStreamResponse(
    res: ServerResponse,
    stream: { recv(): AsyncIterable<ResponseEvent> },
    model: string,
    includeUsage: boolean,
  ): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const encoder = new ChatStreamEncoder(model, includeUsage)
    try {
      for await (const event of stream.recv()) {
        const events = encoder.encode(event)
        for (const sseEvent of events) {
          res.write(formatSSE(sseEvent))
        }
        if (event.type === 'error') {
          // 错误 SSE 已写出，结束流
          break
        }
      }
    } catch (err) {
      // 流中途错误，尝试写入 error chunk
      const message = err instanceof Error ? err.message : String(err)
      const errorChunk = JSON.stringify({
        error: { message, type: openAIErrorType(message), code: null, param: null },
      })
      res.write(`data: ${errorChunk}\n\n`)
    } finally {
      res.end()
    }
  }

  private async handleNonStreamResponse(
    res: ServerResponse,
    stream: { recv(): AsyncIterable<ResponseEvent> },
  ): Promise<void> {
    let finalMessage: AssistantMessage | null = null
    let errorMessage: string | null = null

    for await (const event of stream.recv()) {
      if (event.type === 'done' && event.message) {
        finalMessage = event.message
      } else if (event.type === 'error' && event.error) {
        errorMessage = event.error.errorMessage || 'response stream returned an error'
      }
    }

    if (errorMessage) {
      this.sendError(res, mapProviderErrorStatus(errorMessage), errorMessage)
      return
    }
    if (!finalMessage) {
      this.sendError(res, 502, 'response stream ended without a final message')
      return
    }

    const body = encodeChatResponse(finalMessage)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
  }

  // ─── /v1/models ────────────────────────────────────────────────────────────

  private async handleModels(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.checkAuth(req, res)) return

    try {
      const models = await this.adapter.listModels()
      const data = models.map((m) => ({
        id: m.id,
        object: 'model',
        created: m.created || Math.floor(Date.now() / 1000),
        owned_by: m.ownedBy || 'devin',
        supports_images: m.supportsImages,
      }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ object: 'list', data }))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.sendError(res, 502, message)
    }
  }

  // ─── 鉴权 ─────────────────────────────────────────────────────────────────

  private checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
    const apiKey = this.config.apiKey?.trim()
    if (!apiKey) return true

    let provided = ''
    const auth = req.headers.authorization
    if (auth && auth.startsWith('Bearer ')) {
      provided = auth.slice(7).trim()
    }
    if (!provided) {
      const xKey = req.headers['x-api-key']
      if (typeof xKey === 'string') provided = xKey.trim()
    }

    if (!provided) {
      this.sendAuthError(res, 'Missing API key')
      return false
    }

    // 常量时间比较
    const expected = Buffer.from(apiKey)
    const actual = Buffer.from(provided)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      this.sendAuthError(res, 'Invalid API key')
      return false
    }
    return true
  }

  // ─── 错误响应 ─────────────────────────────────────────────────────────────

  private sendError(res: ServerResponse, status: number, message: string): void {
    const errorType = openAIErrorType(message)
    // 客户端可修正的错误用 invalid_request_error
    let finalStatus = status
    let finalType = errorType
    if (status === 400 || message.includes('does not support image') ||
        message.includes('invalid_argument') || message.startsWith('invalid_argument:')) {
      finalType = 'invalid_request_error'
      if (status >= 500) finalStatus = 400
    }
    res.writeHead(finalStatus, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      error: { message, type: finalType, code: null, param: null },
    }))
  }

  private sendAuthError(res: ServerResponse, message: string): void {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      error: { message, type: 'unauthenticated', code: null, param: null },
    }))
  }
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) {
      throw new Error('request body too large')
    }
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!
  }
  return result === 0
}

function mapProviderErrorStatus(message: string): number {
  if (message.includes('does not support image') ||
      message.includes('invalid_argument') ||
      message.startsWith('invalid_argument:') ||
      message.includes('file_id images') ||
      message.includes('only data URL') ||
      message.includes('validate Devin request') ||
      message.includes('validate adapted request')) {
    return 400
  }
  if (message.includes('unauthenticated') || message.startsWith('unauthenticated:')) return 401
  if (message.includes('permission_denied') || message.startsWith('permission_denied:')) return 403
  if (message.includes('not_found') || message.startsWith('not_found:')) return 404
  if (message.includes('resource_exhausted') || message.startsWith('resource_exhausted:')) return 429
  return 502
}
