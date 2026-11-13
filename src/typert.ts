/**
 * Host-face Typert manifest for the `devin` remote service.
 *
 * The Typert loader discovers this file through `exports["./typert"]` and
 * registers every invocation with the gateway; descriptors must match the
 * service object provided in `src/index.ts` (ctx.provide('devin', service))
 * and the client mirror in `src/client/remote.ts` exactly.
 */

/** Minimal parser face every strict codec factory returns. */
export interface TypertSchema<T> {
  parse(value: unknown): T
}

/** Strict codec shape the Typert loader and gateway accept. */
export interface TypertStrictCodec<T> {
  mode: 'strict'
  typeSymbol: string
  create(): TypertSchema<T>
}

const codec = <T>(name: string, parse: (value: unknown) => T): TypertStrictCodec<T> => ({
  mode: 'strict',
  typeSymbol: `dsh-plugin-devin-bridge#${name}`,
  create: () => ({ parse }),
})

function requireObject(value: unknown, subject: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${subject} must be an object`)
  }
  return value as Record<string, unknown>
}

const quotaCodec = codec('DevinQuota', (value) => {
  const record = requireObject(value, 'devin quota')
  const num = (key: string): number | undefined =>
    typeof record[key] === 'number' && Number.isFinite(record[key]) ? (record[key] as number) : undefined
  const result: Record<string, unknown> = {
    sampledAt: num('sampledAt') ?? 0,
    stale: record.stale === true,
  }
  if (typeof record.plan === 'string') result.plan = record.plan
  const daily = num('dailyRemainingPercent')
  if (daily !== undefined) result.dailyRemainingPercent = daily
  const weekly = num('weeklyRemainingPercent')
  if (weekly !== undefined) result.weeklyRemainingPercent = weekly
  const dailyReset = num('dailyResetAt')
  if (dailyReset !== undefined) result.dailyResetAt = dailyReset
  const weeklyReset = num('weeklyResetAt')
  if (weeklyReset !== undefined) result.weeklyResetAt = weeklyReset
  return result
})

/** Wires of the `devin` namespace, in service order. */
export const DEVIN_INVOCATIONS = [
  {
    id: 'dsh-plugin-devin-bridge#devin/quota',
    service: 'devin',
    namespace: 'devin',
    method: 'quota',
    invocation: { kind: 'direct' as const },
    parameters: [],
    result: quotaCodec,
    description: 'Cached account quota (plan, daily/weekly remaining percent, reset times).',
  },
  {
    id: 'dsh-plugin-devin-bridge#devin/refreshQuota',
    service: 'devin',
    namespace: 'devin',
    method: 'refreshQuota',
    invocation: { kind: 'direct' as const },
    parameters: [],
    result: quotaCodec,
    description: 'Force-refresh the account quota, bypassing the upstream cache.',
  },
]

const SERVICE_DOC = {
  description: 'Devin bridge account surface: upstream quota snapshot for the settings page and input pill.',
  summary: 'Reads Devin account quota through the Host-side adapter.',
  tags: ['devin', 'quota'],
  key: 'devin',
  exportName: 'DevinBridgeService',
  members: DEVIN_INVOCATIONS.map((invocation) => ({
    kind: 'method',
    name: invocation.method,
    signature: `${invocation.method}()`,
    summary: invocation.description,
  })),
  types: [],
}

/** The manifest the Typert loader registers for this package. */
export const TYPERT = {
  package: 'dsh-plugin-devin-bridge',
  face: 'host' as const,
  schemas: [],
  invocations: DEVIN_INVOCATIONS,
  model: { services: [SERVICE_DOC], events: [], objects: [] },
  events: [],
  objects: [],
}
