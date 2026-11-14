// 限流重置时间的实际解析验证：把真实报错文本贴进来即可核对
// 「相对时长 + UTC 钟点 → 本地时间」，不依赖任何网络或 Devin 凭证。
//
// 用法：
//   pnpm tsx scripts/rate-limit-probe.ts          # 用内置的本次失败文案
//   pnpm tsx scripts/rate-limit-probe.ts "<错误>"  # 自定义文案
//
// 带 --at <ISO> 可把「当前时间」固定住，用来演示 21:01 UTC 前后的提醒：

import { parseRateLimitReset, describeWait, formatResetLocal, formatResetUtc } from '../src/adapter/rate-limit.ts'

const DEFAULT_MESSAGE =
  '[resource_exhausted] Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model. Your limit will reset in 1 hour 48 minutes (at 21:01 UTC).'

const args = process.argv.slice(2)
const atIndex = args.indexOf('--at')
const fixedNow = atIndex >= 0 ? Date.parse(args[atIndex + 1]!) : Number.NaN
const message = args.filter((arg, i) => arg !== '--at' && !(atIndex >= 0 && i === atIndex + 1)).join(' ').trim() || DEFAULT_MESSAGE
const now = Number.isFinite(fixedNow) ? fixedNow : Date.now()

const parsed = parseRateLimitReset(message, { now })

console.log('错误码            ', parsed.code)
console.log('原始文案          ', parsed.message)
console.log('相对时长          ', parsed.relativeMs !== undefined ? describeWait(parsed.relativeMs) : '（原文未给出）')
console.log('重置时间 (UTC)    ', parsed.absoluteUtc ?? formatResetUtc(parsed.resetAt))
console.log('重置时间 (UTC 标准)', formatResetUtc(parsed.resetAt))
console.log('重置时间 (本地)    ', formatResetLocal(parsed.resetAt))
console.log('距重置            ', describeWait(parsed.waitMs))
console.log('是否兜底估算      ', parsed.guessed ? '是（原文没有可解析时间）' : '否')

if (parsed.waitMs > 0 && parsed.waitMs <= 10 * 60_000) {
  console.log('=> 落在提前提醒窗口内：现在触发「即将重置」通知，并在到点再发一次。')
} else if (parsed.waitMs > 0) {
  const leadAt = parsed.resetAt - 5 * 60_000
  console.log(`=> 提醒将在 ${formatResetLocal(leadAt)}（本地）先发预告，${formatResetLocal(parsed.resetAt)} 到点再发一次。`)
} else {
  console.log('=> 已过重置点：立即发「可以重新运行」通知。')
}
