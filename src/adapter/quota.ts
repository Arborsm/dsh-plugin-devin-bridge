// Devin 账户额度查询：POST GetUserStatus（Connect unary, application/proto），
// 手工解析响应中的套餐/日周剩余百分比/重置时间。带 5 分钟缓存与 stale 回退。

import { create, toBinary } from '@bufbuild/protobuf'
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import { attributionHeaders } from '@deepseek-ai/dsh-llm'
import { ExaCodeiumCommonPb_MetadataSchema } from '../proto/gen/devin_pb.ts'
import { createProxyAgent } from './transport.ts'

/** 额度快照（RemoteResult 透传给客户端）。 */
export interface DevinQuota {
  plan?: string
  dailyRemainingPercent?: number
  weeklyRemainingPercent?: number
  dailyResetAt?: number
  weeklyResetAt?: number
  sampledAt: number
  stale: boolean
}

export interface QuotaOptions {
  baseUrl: string
  token: string
  proxy?: string
  /** 跳过缓存强制刷新（点击胶囊/刷新按钮）。 */
  fresh?: boolean
}

const PROCEDURE = '/exa.seat_management_pb.SeatManagementService/GetUserStatus'
const QUOTA_REFRESH_MS = 5 * 60_000
const QUOTA_RETRY_MS = 30_000
const QUOTA_TIMEOUT_MS = 20_000

// GetUserStatusResponse 中读取的字段号（上游协议）：
//   response{1=user_status}, user_status{13=plan_status},
//   plan_status{1=plan_info{2=label}, 14=daily%, 15=weekly%, 17=dailyReset, 18=weeklyReset}
const F_USER_STATUS = 1
const F_PLAN_STATUS = 13
const F_PLAN_INFO = 1
const F_PLAN_LABEL = 2
const F_DAILY = 14
const F_WEEKLY = 15
const F_DAILY_RESET = 17
const F_WEEKLY_RESET = 18

let cached: DevinQuota | null = null
let expiry = 0

/**
 * 读取账户额度。缓存命中直接返回；刷新失败且有旧快照时返回 stale 副本。
 */
export async function fetchQuota(options: QuotaOptions): Promise<DevinQuota> {
  const now = Date.now()
  if (!options.fresh && cached && now < expiry) return cached
  try {
    const body = encodeRequest(options.token)
    const payload = await unaryPost(options, body)
    const quota = decodeUserStatus(payload)
    quota.sampledAt = Math.floor(Date.now() / 1000)
    quota.stale = false
    cached = quota
    expiry = now + QUOTA_REFRESH_MS
    return quota
  } catch (error) {
    if (cached) {
      expiry = now + QUOTA_RETRY_MS
      return { ...cached, stale: true }
    }
    throw error
  }
}

/** 序列化 GetUserStatusRequest：field 1 = metadata。 */
function encodeRequest(token: string): Uint8Array {
  const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
    apiKey: token,
    extensionName: 'chisel',
    extensionVersion: '3000.2.17',
    ideName: 'chisel',
    ideVersion: '3000.2.17',
    locale: 'en',
    os: 'mac',
  })
  const inner = toBinary(ExaCodeiumCommonPb_MetadataSchema, metadata)
  const out = new Uint8Array(1 + varintSize(inner.length) + inner.length)
  out[0] = (F_USER_STATUS << 3) | 2
  writeVarint(out, 1, inner.length)
  out.set(inner, 1 + varintSize(inner.length))
  return out
}

function varintSize(value: number): number {
  let size = 1
  let v = value >>> 0
  while (v >= 0x80) {
    v >>>= 7
    size++
  }
  return size
}

function writeVarint(buf: Uint8Array, offset: number, value: number): void {
  let v = value >>> 0
  let i = offset
  while (v >= 0x80) {
    buf[i++] = (v & 0x7f) | 0x80
    v >>>= 7
  }
  buf[i] = v
}

/** Connect unary POST：application/proto 裸消息体，错误体是 JSON {code,message}。 */
async function unaryPost(options: QuotaOptions, body: Uint8Array): Promise<Uint8Array> {
  const url = new URL(options.baseUrl.replace(/\/+$/, '') + PROCEDURE)
  const isHttps = url.protocol === 'https:'
  const agent = createProxyAgent(options.proxy, options.baseUrl)

  const headers: Record<string, string> = {
    'Content-Type': 'application/proto',
    Accept: 'application/proto',
    Authorization: `Basic ${options.token}-${options.token}`,
    'Content-Length': String(body.length),
    ...attributionHeaders(),
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const req = (isHttps ? httpsRequest : httpRequest)(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        ...(agent ? { agent } : {}),
        timeout: QUOTA_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const payload = Buffer.concat(chunks)
          const status = res.statusCode ?? 0
          if (status >= 200 && status < 300) {
            resolve(new Uint8Array(payload))
            return
          }
          // Connect unary 错误体：JSON {code:"...", message:"..."}
          let detail = payload.toString('utf8')
          try {
            const parsed = JSON.parse(detail) as { code?: string; message?: string }
            detail = parsed.message ? `[${parsed.code ?? 'unknown'}] ${parsed.message}` : detail
          } catch { /* 原样输出 */ }
          reject(new Error(`GetUserStatus HTTP ${status}: ${detail.slice(0, 300)}`))
        })
      },
    )
    req.on('timeout', () => req.destroy(new Error('GetUserStatus timed out')))
    req.on('error', reject)
    req.end(body)
  })
}

// ─── 极简 protobuf wire reader ──────────────────────────────────────────────

class WireReader {
  private offset = 0
  constructor(private readonly buf: Uint8Array) {}

  /** 返回下一个字段号与 wire type；结束返回 null。 */
  next(): { field: number; wire: number } | null {
    if (this.offset >= this.buf.length) return null
    const tag = this.varint()
    return { field: tag >>> 3, wire: tag & 7 }
  }

  varint(): number {
    let result = 0
    let shift = 0
    for (;;) {
      const byte = this.buf[this.offset++]
      if (byte === undefined) throw new Error('truncated varint')
      result |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
      if (shift > 63) throw new Error('varint too long')
    }
    return result >>> 0
  }

  bytes(): Uint8Array {
    const length = this.varint()
    const start = this.offset
    this.offset += length
    if (this.offset > this.buf.length) throw new Error('truncated bytes field')
    return this.buf.subarray(start, this.offset)
  }

  /** 按 wire type 跳过当前字段值。 */
  skip(wire: number): void {
    switch (wire) {
      case 0: this.varint(); return
      case 1: this.offset += 8; return
      case 2: this.bytes(); return
      case 5: this.offset += 4; return
      default: throw new Error(`unsupported wire type ${wire}`)
    }
  }
}

/** 提取消息中首个指定字段号的 length-delimited 值；缺失返回 null。 */
function nestedField(buf: Uint8Array, fieldNo: number): Uint8Array | null {
  const reader = new WireReader(buf)
  for (;;) {
    const tag = reader.next()
    if (tag === null) return null
    if (tag.field === fieldNo) {
      if (tag.wire !== 2) return null
      return reader.bytes()
    }
    reader.skip(tag.wire)
  }
}

function decodeUserStatus(data: Uint8Array): DevinQuota {
  const userStatus = nestedField(data, F_USER_STATUS)
  if (!userStatus) throw new Error('GetUserStatus: response carries no user_status')
  const planStatus = nestedField(userStatus, F_PLAN_STATUS)
  if (!planStatus) throw new Error('GetUserStatus: user_status carries no plan_status')

  const quota: DevinQuota = { sampledAt: 0, stale: false }
  const reader = new WireReader(planStatus)
  for (;;) {
    const tag = reader.next()
    if (tag === null) break
    switch (tag.field) {
      case F_PLAN_INFO: {
        const info = reader.bytes()
        const label = nestedField(info, F_PLAN_LABEL)
        if (label) quota.plan = new TextDecoder().decode(label)
        break
      }
      case F_DAILY: {
        const v = tag.wire === 0 ? reader.varint() : undefined
        if (v !== undefined && v <= 100) quota.dailyRemainingPercent = v
        else if (v === undefined) reader.skip(tag.wire)
        break
      }
      case F_WEEKLY: {
        const v = tag.wire === 0 ? reader.varint() : undefined
        if (v !== undefined && v <= 100) quota.weeklyRemainingPercent = v
        else if (v === undefined) reader.skip(tag.wire)
        break
      }
      case F_DAILY_RESET:
        quota.dailyResetAt = tag.wire === 0 ? reader.varint() : (reader.skip(tag.wire), undefined)
        break
      case F_WEEKLY_RESET:
        quota.weeklyResetAt = tag.wire === 0 ? reader.varint() : (reader.skip(tag.wire), undefined)
        break
      default:
        reader.skip(tag.wire)
    }
  }
  return quota
}
