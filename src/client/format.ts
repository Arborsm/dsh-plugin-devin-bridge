/** 毫秒 → 「1 小时 48 分钟」风格的中文时长（与 Host 侧 describeWait 一致）。 */
export function describeMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} 小时`)
  if (minutes > 0) parts.push(`${minutes} 分钟`)
  if (parts.length === 0) parts.push(`${total % 60} 秒`)
  return parts.join(' ')
}
