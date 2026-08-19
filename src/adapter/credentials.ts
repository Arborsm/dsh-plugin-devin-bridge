// Devin CLI credentials.toml 自动读取。
// 翻译自 codex-router/src/devin-cli-status.mjs + devin-cli-session.mjs。
//
// Devin CLI（`devin auth login`）会把 session token 持久化到 credentials.toml。
// 本模块只读不写，不修改、不复制、不删除另一个工具的凭证文件。

import { existsSync, readFileSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_API_SERVER_URL = 'https://server.codeium.com'

/**
 * Devin CLI credentials.toml 的平台相关路径。
 * 支持环境变量 DEVIN_CREDENTIALS_PATH 覆盖。
 */
export function devinCredentialsPath(): string {
  if (process.env.DEVIN_CREDENTIALS_PATH) return process.env.DEVIN_CREDENTIALS_PATH
  if (platform() === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'devin', 'credentials.toml')
  }
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return join(dataHome, 'devin', 'credentials.toml')
}

export interface DevinSession {
  /** windsurf_api_key，格式 devin-session-token$... */
  apiKey: string
  /** api_server_url，默认 https://server.codeium.com */
  apiServerUrl: string
  /** devin_api_url，可选 */
  devinApiUrl?: string
}

/**
 * 从 credentials.toml 解析 Devin session。
 * 使用轻量 TOML 扫描器而非完整 TOML 库，避免引入额外依赖。
 * 只读取顶层 string key，拒绝重复 key 和多行值。
 */
export function devinSessionEntry(contents: string): DevinSession | undefined {
  const table = scanTomlTopLevel(contents)
  const apiKey = table['windsurf_api_key']
  if (typeof apiKey !== 'string' || !apiKey) return undefined
  return {
    apiKey,
    apiServerUrl: table['api_server_url'] || DEFAULT_API_SERVER_URL,
    ...table['devin_api_url'] ? { devinApiUrl: table['devin_api_url'] } : {},
  }
}

/**
 * 尝试从 Devin CLI 的 credentials.toml 读取 session。
 * 文件不存在或格式无效时返回 undefined，不抛异常。
 */
export function readDevinSession(options?: { credentialsPath?: string }): DevinSession | undefined {
  const path = options?.credentialsPath ?? devinCredentialsPath()
  if (!existsSync(path)) return undefined
  let contents: string
  try {
    contents = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  try {
    return devinSessionEntry(contents)
  } catch {
    return undefined
  }
}

// ─── 轻量 TOML 顶层扫描器 ───────────────────────────────────────────────────

/**
 * 扫描 TOML 文件的顶层 string key=value 对。
 * 只支持 `key = "value"` 形式，不支持 table、array、多行字符串等复杂结构。
 * 重复 key 抛异常（fail-closed）。
 */
function scanTomlTopLevel(contents: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = contents.split('\n')
  let inTable = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const line = raw.trim()
    // 空行和注释跳过
    if (line === '' || line.startsWith('#')) continue
    // table header — 进入 table 区，顶层扫描停止
    if (line.startsWith('[')) {
      inTable = true
      continue
    }
    // 在 table 区内的行不读取（只读顶层 key）
    if (inTable) continue
    // key = "value"
    const eqIdx = line.indexOf('=')
    if (eqIdx < 0) continue
    const key = line.slice(0, eqIdx).trim()
    const valuePart = line.slice(eqIdx + 1).trim()
    // 只读 string 值
    if (!valuePart.startsWith('"')) continue
    // 简单解析双引号字符串（不支持转义，credentials.toml 的 token 不含特殊字符）
    const closing = valuePart.indexOf('"', 1)
    if (closing < 0) throw new Error(`unterminated string at line ${i + 1}`)
    const value = valuePart.slice(1, closing)
    if (key in result) throw new Error(`duplicate key "${key}" at line ${i + 1}`)
    result[key] = value
  }
  return result
}
