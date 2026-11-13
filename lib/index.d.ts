import z from "@deepseek-ai/schemastery";
import { Volatile } from "@deepseek-ai/cosmokit";
import { GenerateOptions, LlmAdapter, LlmDiscoveredModel, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, PreparedAdapterCall, ResolvedRetryPolicy, RetryPolicyConfig, StreamChunk } from "@deepseek-ai/dsh-llm";
import { Context } from "@deepseek-ai/cordis";
import { ImageAttachmentRef, StoredImageAttachment } from "@deepseek-ai/dsh-attachment";
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
}
declare class DevinAdapter extends LlmAdapter {
  private readonly config;
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
  /** 默认最大输出 token，默认 128000。 */
  defaultMaxTokens: number;
  /** 可用模型列表。 */
  models: DevinCatalogModel[];
  /** 设置页里被关掉的模型 id；picker 不再显示（仍可解析/调用）。 */
  hiddenModels: string[];
  /** 重试策略；未配置时走 dsh 默认 normal 策略。 */
  retryPolicy?: RetryPolicyConfig;
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
}>>, "plain">;
/** Loader 传入的 config：volatile 字段是稳定引用而非裸值。 */
type Config = { readonly [K in keyof DevinBridgeConfig]: DevinBridgeConfig[K] | Volatile<DevinBridgeConfig[K]>; };
declare function apply(ctx: Context, config: Config): void;
export { Config, DevinAdapter, type DevinAdapterOptions, DevinBridgeConfig, type DevinCatalogModel, type DevinConnectionOptions, type DevinQuota, type DevinSession, apply, devinCredentialsPath, fetchQuota, inject, name, readDevinSession };
//# sourceMappingURL=index.d.ts.map