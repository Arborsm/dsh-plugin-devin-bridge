import z from "@deepseek-ai/schemastery";
import { Volatile } from "@deepseek-ai/cosmokit";
import { GenerateOptions, LlmAdapter, LlmDiscoveredModel, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, PreparedAdapterCall, ResolvedRetryPolicy, RetryPolicyConfig, StreamChunk } from "@deepseek-ai/dsh-llm";
import { Context } from "@deepseek-ai/cordis";
import { ImageAttachmentRef, StoredImageAttachment } from "@deepseek-ai/dsh-attachment";
/** 免费模型限流的原始报错文案：原样保留，方便用户与上游提示对照。 */
declare const RATE_LIMIT_MESSAGE = "Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model.";
/** 解析失败时的兜底等待：上游通常按小时级窗口限流。 */
declare const DEFAULT_RESET_MS: number;
interface RateLimitReset {
  /** 上游错误码（括号里的名字），如 resource_exhausted。 */
  code: string;
  /** 原始报错全文，不做任何改写。 */
  message: string;
  /** 相对时长（毫秒）；原文没给相对时长时缺省。 */
  relativeMs?: number;
  /** 重置时刻（epoch 毫秒）。 */
  resetAt: number;
  /** 原文给出的 UTC 钟点（HH:MM:SS 或 ISO），便于核对。 */
  absoluteUtc?: string;
  /** resetAt 距解析时刻的毫秒数（可能为负：已过点）。 */
  waitMs: number;
  /** 原文没给出可解析的时间，用了兜底时长。 */
  guessed: boolean;
}
interface ParseRateLimitOptions {
  /** 解析基准时刻，默认 Date.now()。 */
  now?: number;
  /** 原文没有可解析时间时的兜底等待，默认 {@link DEFAULT_RESET_MS}。 */
  fallbackMs?: number;
}
/**
 * 还原上游原始报错：只去掉适配器自己加的 "Devin API: " 前缀，
 * 正文一字不改，方便用户按原文搜索 / 对照上游提示。
 */
declare function originalMessage(message: string): string;
/** 从报错文本里取上游错误码；没有括号码时回退 resource_exhausted。 */
declare function extractErrorCode(message: string): string;
/** 解析「1 hour 48 minutes」这类相对时长；没有则返回 undefined。 */
declare function parseRelativeMs(message: string): number | undefined;
/**
 * 解析绝对 UTC 钟点。同一天有今/明/昨三个候选：
 *   - 给了相对时长时取离 now + 相对时长最近的一个（两者互为校验）；
 *   - 只有钟点时取不早于 now 的最近一个（已过点即次日）。
 * @param message - 上游报错全文。
 * @param nowMs - 解析基准时刻。
 * @param target - 有相对时长时传入 now + 相对时长；否则传 undefined。
 */
declare function parseAbsoluteUtcMs(message: string, nowMs: number, target?: number): {
  at: number;
  text: string;
} | undefined;
/**
 * 解析一条限流报错：同时支持相对时长与绝对 UTC 钟点。
 * 绝对时间优先（它由服务端给出，不受本机时钟漂移影响），相对时长用于
 * 对齐跨天候选项；两者都没有时用 fallbackMs 兜底并标 guessed。
 */
declare function parseRateLimitReset(message: string, options?: ParseRateLimitOptions): RateLimitReset;
/** 毫秒数 → 「1 小时 48 分钟」风格的中文时长。 */
declare function describeWait(ms: number): string;
/** 重置时刻 → 本地时间字符串，如 2026-11-14 05:01:00 UTC+08:00。 */
declare function formatResetLocal(resetAt: number, options?: {
  timeZone?: string;
  locale?: string;
}): string;
/** 重置时刻 → UTC 字符串，如 2026-11-14 21:01:00 UTC。 */
declare function formatResetUtc(resetAt: number): string;
interface BackoffPlan {
  /** 首次重试的本地延迟（毫秒）。 */
  initialDelayMs: number;
  /** 单次延迟上限（毫秒）。 */
  maxDelayMs: number;
  /** 对称抖动比例，0.1 表示 ±10%。 */
  jitterRatio: number;
}
/** 第 attempt 次（1 起）退避延迟：指数增长 + 对称抖动，封顶 maxDelayMs。 */
declare function backoffDelay(attempt: number, plan?: BackoffPlan, random?: () => number): number;
/** 通知载荷：原始错误码、原文、重置时刻与本地换算。 */
interface RateLimitNotice extends RateLimitReset {
  /** 重置时刻 UTC 展示，如 2026-11-14 21:01:00 UTC。 */
  resetAtUtc: string;
  /** 重置时刻本地展示，如 2026-11-15 05:01:00 UTC+08:00。 */
  resetAtLocal: string;
  /** reminder = 到点前预告；reset = 已到点。 */
  kind: 'reminder' | 'reset';
}
/** remote.devin.rateLimit() 返回的状态快照。 */
interface RateLimitStatus {
  /** 是否还在等重置（含等待中的自动继续）。 */
  active: boolean;
  code?: string;
  message?: string;
  resetAt?: number;
  resetAtUtc?: string;
  resetAtLocal?: string;
  /** 距重置还剩多少毫秒；已到点为 0。 */
  remainingMs?: number;
  /** 到点提醒是否开启（读实时配置）。 */
  reminderEnabled: boolean;
  /** 现在是否开启自动继续（读实时配置）。 */
  autoResume: boolean;
  /** 自动继续上限。 */
  maxResumeAttempts: number;
  /** 本周期已进行的自动继续次数。 */
  resumeAttempts: number;
  lastNotice?: 'reminder' | 'reset';
  lastNoticeAt?: number;
}
interface RateLimitWatchOptions {
  /** 到点前多少毫秒先发提醒；0 = 只在到点发，默认 5 分钟。 */
  reminderLeadMs?: number;
  /** 到点提醒是否开启；可传函数读取实时配置。默认开启。 */
  enabled?: boolean | (() => boolean);
  /**
   * 重置点已过（或上游没给时间）时的退避计划。
   * 默认 5s 起、封顶 60s、±10% 抖动，避免连续撞限流。
   */
  backoff?: BackoffPlan;
  /** 自动继续是否开启；可传函数读取实时配置。默认关闭。 */
  autoResume?: boolean | (() => boolean);
  /** 自动继续最大次数（含首轮），默认 3。 */
  maxResumeAttempts?: number;
  /** 通知发送；Index 注入（日志 / webhook / 客户端状态）。 */
  notify?: (notice: RateLimitNotice) => void;
  log?: (level: 'info' | 'warn' | 'error', message: string) => void;
  /** 测试注入时钟，默认 Date.now。 */
  now?: () => number;
  /** 测试注入定时器，默认 setTimeout / clearTimeout。 */
  schedule?: (callback: () => void, delayMs: number) => () => void;
}
/** 到点提醒 + 到点自动继续的运行时。 */
declare class RateLimitWatcher {
  private leadMs;
  private maxResumeAttempts;
  private readonly backoff;
  private readonly options;
  private cycle;
  private readonly pendingWaits;
  private lastNotice;
  private lastNoticeAt;
  private attempts;
  constructor(options?: RateLimitWatchOptions);
  get autoResume(): boolean;
  /** 到点提醒当前是否开启（支持配置热更新）。 */
  get reminderEnabled(): boolean;
  get maxAttempts(): number;
  /** 本运行时的当前时刻（epoch 毫秒），与内部定时器同一时钟。 */
  now(): number;
  /** 用本运行时的时钟解析一条限流报错（测试与生产共用同一时间基准）。 */
  parse(message: string): RateLimitReset;
  /** 第 attempt 次自动继续前的退避延迟（毫秒），指数增长并封顶。 */
  retryDelay(attempt: number): number;
  /**
   * 退避等待；signal 取消时以 AbortError 结束。
   * 用于重置时刻已过、或上游没给可解析时间的情况。
   */
  waitBackoff(attempt: number, signal?: AbortSignal): Promise<void>;
  /**
   * 调整提前提醒量与自动继续上限（配置热更新时调用）。
   * 已排好的预告计时器不会重排，下一个限流周期生效。
   */
  configure(next: {
    reminderLeadMs?: number;
    maxResumeAttempts?: number;
  }): void;
  /** 当前限流状态；没有周期时 active=false。 */
  status(): RateLimitStatus;
  /**
   * 登记一次限流：安排预告与到点通知。同一重置时刻重复上报只重置计时器，
   * 不会重复发同一条通知。
   */
  report(limit: RateLimitReset): void;
  /** 按 cycle.limit 排预告与到点计时器；已到点则立即通知并唤醒等待者。 */
  private armTimers;
  /**
   * 等到重置点。已过点立即返回；signal 取消时以 AbortError 拒绝。
   * @param limit - 本次限流信息。
   * @param signal - 本轮生成请求的取消信号。
   * @param attempt - 第几次自动继续（1 起），用于状态展示。
   */
  waitUntilReset(limit: RateLimitReset, signal?: AbortSignal, attempt?: number): Promise<void>;
  /** 取消当前周期：关闭自动继续或插件卸载时调用。 */
  cancel(): void;
  /** 一条可直接展示给用户的提醒文案（错误码 + 重置时间 + 可重跑）。 */
  describe(limit: RateLimitReset, kind?: RateLimitNotice['kind']): string;
  private settle;
  private removeWaiter;
  private disposeCycle;
  private emit;
  private clock;
  private scheduleFn;
  private log;
}
interface DevinCatalogModel {
  id: string;
  name?: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  supportsImages?: boolean;
  /** 模型系列标签（如 "GLM-5.2", "SWE-1.7"），从 model_family_metadata 提取。 */
  family?: string;
  /** family metadata 中的推理档位名（小写，如 "high"/"max"/"none"）。 */
  effort?: string;
  /** family metadata "fast mode" 标记；lightning 变体不参与档位解析。 */
  fastMode?: boolean;
  /** 是否该 family 的默认档位（is_default_model_in_family）。 */
  isDefaultInFamily?: boolean;
  /** family 档位表：effort id → 上游真实 model_uid（采纳时持久化）。 */
  tiers?: Record<string, string>;
  /** family 默认档位的 effort id（如 "high"）；dsh 滑块默认值。 */
  defaultEffort?: string;
  /** 是否需要付费 plan。 */
  isPremium?: boolean;
  /** 是否当前处于促销期（promo_status.is_active）。 */
  isPromo?: boolean;
  /** 信用倍率，用于排序和展示。 */
  creditMultiplier?: number;
}
interface DevinConnectionOptions {
  baseUrl: string;
  /** 会话 token；空串表示未配置（元数据路径照常工作，发起请求时抛 AUTH）。 */
  token: string;
  proxy?: string;
  forceHttp1: boolean;
  models: readonly DevinCatalogModel[];
  /** 设置页关掉的模型 id；picker 不显示，解析/调用不受影响。 */
  hiddenModels?: readonly string[];
  defaultContextWindow: number;
  defaultMaxTokens: number;
  retryPolicy?: RetryPolicyConfig;
  /** 可选的 attachment 读取器，用于获取图片字节 */
  readImage?: (ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>;
}
interface DevinAdapterOptions {
  /** 当前连接配置；每次操作时调用以获取最新快照。 */
  options: () => DevinConnectionOptions;
  /** 可选：限流到点提醒 / 自动继续；缺省时把限流当普通失败抛出。 */
  rateLimit?: RateLimitWatcher;
}
declare class DevinAdapter extends LlmAdapter {
  private readonly config;
  /** 限流到点提醒与自动继续的运行时（可选）。 */
  private readonly rateLimit;
  private cachedClient;
  private cachedClientKey;
  private catalogCache;
  constructor(options: DevinAdapterOptions);
  /** 当前连接配置（每次调用读取最新快照）。 */
  private conn;
  /** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
  private client;
  providerInfo(provider: string): LlmProviderInfo;
  providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
  listModels(provider: string): Promise<readonly LlmModelInfo[]>;
  resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  /** 一次 adapter 生成（连接配置快照）下的 model metadata。 */
  private modelInfo;
  /**
   * 绑定 model metadata 与 dispatch 到同一配置快照：
   * settings 在 prepare 与 stream 之间变更不会把两代配置混进一次调用。
   */
  prepareCall(provider: string, model: string, _signal?: AbortSignal): Promise<PreparedAdapterCall>;
  /**
   * 从 Devin 服务器拉取可用模型列表，供设置页的
   * "Fetch available models" 按钮调用。
   *
   * 同 family 的多个 effort 变体合并为一个基础模型（取 family default），
   * effort 走 dsh 的 reasoning effort 滑块控制，插件内部映射到实际 model_uid。
   */
  /**
   * @param draft - 可选的一次性端点/凭证（设置页草稿 interrogation），
   *   给出时覆盖持久配置；harness 不会存储这些值。
   */
  discoverModels(draft?: {
    baseURL?: string;
    apiKey?: string;
  }, signal?: AbortSignal): Promise<LlmDiscoveredModel[]>;
  /**
   * 供 remote.devin 使用：family 合并后的完整目录条目，
   * 带 tiers（effort→uid）与 defaultEffort，供设置页采纳进配置。
   */
  catalog(signal?: AbortSignal): Promise<DevinCatalogModel[]>;
  /**
   * 惰性目录兜底：解析出来仍是裸 id、且配置里没有可信的真实-uid 条目时，
   * 拉一次上游 family 目录合并后再走 resolveModelUid。
   * 覆盖 models 为空（新环境从未采纳目录）和条目缺 tiers（旧版/手写配置）
   * 两种把裸 base id（如 swe-2、swe-2-flash）直接发给上游的场景——
   * 上游不存在这些 uid，会报 permission_denied。
   */
  private withResolvableModel;
  /** family 合并目录，按连接缓存 5 分钟；catalog() 是用户主动刷新，不走这里。 */
  private dynamicCatalog;
  /**
   * 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
   * 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens /
   * description / family / effort / fastMode / defaultInFamily / isPremium /
   * isPromo / creditMultiplier。
   */
  private fetchModelCatalog;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  private streamWithConn;
  /** 单次尝试：连接 + 解码；限流失败转成 LlmError 抛出，由上层瀑布等待重放。 */
  private streamAttempt;
  /** 限流失败登记到点提醒（解析失败不影响原始错误上报）。 */
  private reportRateLimit;
  private buildRequest;
  private convertMessage;
  private promptForContent;
}
/** 额度快照（RemoteResult 透传给客户端）。 */
interface DevinQuota {
  plan?: string;
  dailyRemainingPercent?: number;
  weeklyRemainingPercent?: number;
  dailyResetAt?: number;
  weeklyResetAt?: number;
  sampledAt: number;
  stale: boolean;
}
interface QuotaOptions {
  baseUrl: string;
  token: string;
  proxy?: string;
  /** 跳过缓存强制刷新（点击胶囊/刷新按钮）。 */
  fresh?: boolean;
}
/**
 * 读取账户额度。缓存命中直接返回；刷新失败且有旧快照时返回 stale 副本。
 */
declare function fetchQuota(options: QuotaOptions): Promise<DevinQuota>;
/**
 * Devin CLI credentials.toml 的平台相关路径。
 * 支持环境变量 DEVIN_CREDENTIALS_PATH 覆盖。
 */
declare function devinCredentialsPath(): string;
interface DevinSession {
  /** windsurf_api_key，格式 devin-session-token$... */
  apiKey: string;
  /** api_server_url，默认 https://server.codeium.com */
  apiServerUrl: string;
  /** devin_api_url，可选 */
  devinApiUrl?: string;
}
/**
 * 尝试从 Devin CLI 的 credentials.toml 读取 session。
 * 文件不存在或格式无效时返回 undefined，不抛异常。
 */
declare function readDevinSession(options?: {
  credentialsPath?: string;
}): DevinSession | undefined;
declare const name = "dsh-plugin-devin-bridge";
declare const inject: string[];
/**
 * 用户可编辑的配置值（schema 解析后的 plain 形状）。
 * 运行时这些字段都是 volatile：Loader 传入的 config 里每个字段是
 * `Volatile<T>` 引用，`get()` 返回当前不可变快照。
 */
interface DevinBridgeConfig {
  /**
   * Devin session token，格式 devin-session-token$<...>。
   * 留空时自动从 Devin CLI 的 credentials.toml 读取（`devin auth login` 写入）。
   */
  token: string;
  /** Devin Connect 端点，默认 https://server.codeium.com。 */
  baseUrl: string;
  /** 可选出站代理 URL（http/https/socks5）。 */
  proxy: string;
  /** 强制 HTTP/1.1 连接 Devin，默认 true。 */
  forceHttp1: boolean;
  /** 默认上下文窗口，默认 128000。 */
  defaultContextWindow: number;
  /** 默认最大输出 token，默认 65536。 */
  defaultMaxTokens: number;
  /** 可用模型列表。 */
  models: DevinCatalogModel[];
  /** 设置页里被关掉的模型 id；picker 不再显示（仍可解析/调用）。 */
  hiddenModels: string[];
  /** 重试策略；未配置时走 dsh 默认 normal 策略。 */
  retryPolicy?: RetryPolicyConfig;
  /** 免费模型限流到点时发提醒；默认开启。 */
  rateLimitReminder: boolean;
  /** 提前多少分钟发提醒；0 表示只在重置到点发。默认 5。 */
  rateLimitReminderLeadMinutes: number;
  /** 重置到点后自动继续被中断的轮次；默认关闭。 */
  rateLimitAutoResume: boolean;
  /** 自动继续的最大尝试次数（含首轮）；默认 3。 */
  rateLimitMaxResumeAttempts: number;
  /** 可选 webhook：POST 一条 JSON 通知，空串表示只用 Host 日志。 */
  rateLimitNotifyUrl: string;
}
declare const Config: z<Schemastery.ObjectS<NoInfer<{
  token: z<string, string, "volatile-defined">;
  baseUrl: z<string, string, "volatile-defined">;
  proxy: z<string, string, "volatile-defined">;
  forceHttp1: z<boolean, boolean, "volatile-defined">;
  defaultContextWindow: z<number, number, "volatile-defined">;
  defaultMaxTokens: z<number, number, "volatile-defined">;
  models: z<NoInfer<({
    id?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    contextWindow?: number | null | undefined;
    maxTokens?: number | null | undefined;
    supportsImages?: boolean | null | undefined;
    family?: string | null | undefined;
    tiers?: import("@deepseek-ai/cosmokit").Dict<string, string> | null | undefined;
    defaultEffort?: string | null | undefined;
    isPremium?: boolean | null | undefined;
    isPromo?: boolean | null | undefined;
    creditMultiplier?: number | null | undefined;
  } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
    id: z<string, string, "defined">;
    name: z<string, string, "plain">;
    description: z<string, string, "plain">;
    contextWindow: z<number, number, "plain">;
    maxTokens: z<number, number, "plain">;
    supportsImages: z<boolean, boolean, "plain">;
    family: z<string, string, "plain">;
    /** family 档位表：effort id → 上游真实 model_uid（采纳时持久化）。 */
    tiers: z<import("@deepseek-ai/cosmokit").Dict<string, string>, import("@deepseek-ai/cosmokit").Dict<string, string>, "plain">;
    /** family 默认档位的 effort id；dsh 滑块默认值。 */
    defaultEffort: z<string, string, "plain">;
    isPremium: z<boolean, boolean, "plain">;
    isPromo: z<boolean, boolean, "plain">;
    creditMultiplier: z<number, number, "plain">;
  }>>[]>, "volatile-defined">;
  /** 设置页模型目录里被关掉的模型 id；listModels 过滤，picker 不再显示。 */
  hiddenModels: z<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
  retryPolicy: z<NoInfer<RetryPolicyConfig>, NoInfer<RetryPolicyConfig>, "volatile">;
  /** 免费模型限流到点提醒（Host 日志 + 可选 webhook），默认开启。 */
  rateLimitReminder: z<boolean, boolean, "volatile-defined">;
  /** 提前多少分钟提醒；0 = 只在重置到点提醒一次。 */
  rateLimitReminderLeadMinutes: z<number, number, "volatile-defined">;
  /** 重置到点后自动继续被中断的轮次；默认关闭。 */
  rateLimitAutoResume: z<boolean, boolean, "volatile-defined">;
  /** 自动继续最大尝试次数（含首轮）。 */
  rateLimitMaxResumeAttempts: z<number, number, "volatile-defined">;
  /** 可选 webhook URL：POST JSON 通知；留空只用日志。 */
  rateLimitNotifyUrl: z<string, string, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  token: z<string, string, "volatile-defined">;
  baseUrl: z<string, string, "volatile-defined">;
  proxy: z<string, string, "volatile-defined">;
  forceHttp1: z<boolean, boolean, "volatile-defined">;
  defaultContextWindow: z<number, number, "volatile-defined">;
  defaultMaxTokens: z<number, number, "volatile-defined">;
  models: z<NoInfer<({
    id?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    contextWindow?: number | null | undefined;
    maxTokens?: number | null | undefined;
    supportsImages?: boolean | null | undefined;
    family?: string | null | undefined;
    tiers?: import("@deepseek-ai/cosmokit").Dict<string, string> | null | undefined;
    defaultEffort?: string | null | undefined;
    isPremium?: boolean | null | undefined;
    isPromo?: boolean | null | undefined;
    creditMultiplier?: number | null | undefined;
  } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
    id: z<string, string, "defined">;
    name: z<string, string, "plain">;
    description: z<string, string, "plain">;
    contextWindow: z<number, number, "plain">;
    maxTokens: z<number, number, "plain">;
    supportsImages: z<boolean, boolean, "plain">;
    family: z<string, string, "plain">;
    /** family 档位表：effort id → 上游真实 model_uid（采纳时持久化）。 */
    tiers: z<import("@deepseek-ai/cosmokit").Dict<string, string>, import("@deepseek-ai/cosmokit").Dict<string, string>, "plain">;
    /** family 默认档位的 effort id；dsh 滑块默认值。 */
    defaultEffort: z<string, string, "plain">;
    isPremium: z<boolean, boolean, "plain">;
    isPromo: z<boolean, boolean, "plain">;
    creditMultiplier: z<number, number, "plain">;
  }>>[]>, "volatile-defined">;
  /** 设置页模型目录里被关掉的模型 id；listModels 过滤，picker 不再显示。 */
  hiddenModels: z<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
  retryPolicy: z<NoInfer<RetryPolicyConfig>, NoInfer<RetryPolicyConfig>, "volatile">;
  /** 免费模型限流到点提醒（Host 日志 + 可选 webhook），默认开启。 */
  rateLimitReminder: z<boolean, boolean, "volatile-defined">;
  /** 提前多少分钟提醒；0 = 只在重置到点提醒一次。 */
  rateLimitReminderLeadMinutes: z<number, number, "volatile-defined">;
  /** 重置到点后自动继续被中断的轮次；默认关闭。 */
  rateLimitAutoResume: z<boolean, boolean, "volatile-defined">;
  /** 自动继续最大尝试次数（含首轮）。 */
  rateLimitMaxResumeAttempts: z<number, number, "volatile-defined">;
  /** 可选 webhook URL：POST JSON 通知；留空只用日志。 */
  rateLimitNotifyUrl: z<string, string, "volatile-defined">;
}>>, "plain">;
/** Loader 传入的 config：volatile 字段是稳定引用而非裸值。 */
type Config = { readonly [K in keyof DevinBridgeConfig]: DevinBridgeConfig[K] | Volatile<DevinBridgeConfig[K]>; };
declare function apply(ctx: Context, config: Config): void;
export { Config, DEFAULT_RESET_MS, DevinAdapter, type DevinAdapterOptions, DevinBridgeConfig, type DevinCatalogModel, type DevinConnectionOptions, type DevinQuota, type DevinSession, RATE_LIMIT_MESSAGE, type RateLimitNotice, type RateLimitReset, type RateLimitStatus, type RateLimitWatchOptions, RateLimitWatcher, apply, backoffDelay, describeWait, devinCredentialsPath, extractErrorCode, fetchQuota, formatResetLocal, formatResetUtc, inject, name, originalMessage, parseAbsoluteUtcMs, parseRateLimitReset, parseRelativeMs, readDevinSession };
//# sourceMappingURL=index.d.ts.map