/**
 * Browser-side binding of the Host `devin` remote.
 *
 * Mirrors DEVIN_INVOCATIONS in src/typert.ts: the client mounts this
 * contribution via `ctx.remote.$mount(...)`, then reads `remote.devin`.
 * Result codecs are passthrough — the gateway already delivers parsed JSON.
 */

import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'

export interface DevinQuotaPayload {
  plan?: string
  dailyRemainingPercent?: number
  weeklyRemainingPercent?: number
  dailyResetAt?: number
  weeklyResetAt?: number
  sampledAt: number
  stale: boolean
}

/** Family-merged catalog entry returned by `remote.devin.catalog()`. */
export interface DevinCatalogEntry {
  id: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  supportsImages?: boolean
  family?: string
  tiers?: Record<string, string>
  defaultEffort?: string
  isPremium?: boolean
  isPromo?: boolean
  creditMultiplier?: number
}

/** The namespace service the gateway installs as `remote.devin`. */
export interface DevinRemote {
  quota(): Promise<RemoteResult<DevinQuotaPayload>>
  refreshQuota(): Promise<RemoteResult<DevinQuotaPayload>>
  catalog(): Promise<RemoteResult<DevinCatalogEntry[]>>
}

const passthrough = (name: string) => ({
  mode: 'strict' as const,
  typeSymbol: `dsh-plugin-devin-bridge#${name}`,
  create: () => ({ parse: <T>(value: unknown): T => value as T }),
})

const descriptor = (method: string, resultName = 'DevinQuota') => ({
  id: `dsh-plugin-devin-bridge#devin/${method}`,
  service: 'devin',
  namespace: 'devin',
  method,
  invocation: { kind: 'direct' as const },
  parameters: [],
  result: passthrough(resultName),
})

/** Mirrors src/typert.ts — method names must match the Host manifest. */
export const CONTRIBUTION = {
  package: 'dsh-plugin-devin-bridge',
  descriptors: [
    descriptor('quota'),
    descriptor('refreshQuota'),
    descriptor('catalog', 'DevinCatalog'),
  ],
}

/**
 * Mount the contribution and resolve the `remote.devin` namespace.
 * Returns the namespace plus an async disposer for the effect cleanup.
 */
export async function mountDevinRemote(ctx: {
  remote?: { $mount?: (contribution: unknown) => Promise<() => Promise<void>> }
  get?: (key: string) => unknown
}): Promise<{ remote: DevinRemote; dispose: () => Promise<void> }> {
  const remote = ctx.remote
  if (remote == null || typeof remote.$mount !== 'function') {
    throw new Error('the remote service is not available in this composition')
  }
  const dispose = await remote.$mount(CONTRIBUTION)
  const namespace = ctx.get?.('remote.devin') as DevinRemote | undefined
  if (namespace == null) {
    await dispose()
    throw new Error('remote.devin is missing after mounting the contribution')
  }
  return { remote: namespace, dispose }
}
