import z from "@deepseek-ai/schemastery";
import { GenerateOptions, LlmAdapter, LlmDiscoveredModel, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, RetryPolicyConfig, StreamChunk } from "@deepseek-ai/dsh-llm";
import { Context } from "@deepseek-ai/cordis";
import { ImageAttachmentRef, StoredImageAttachment } from "@deepseek-ai/dsh-attachment";
//#region src/adapter/devin.d.ts
interface DevinCatalogModel {
  id: string;
  name?: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  supportsImages?: boolean;
}
interface DevinConnectionOptions {
  baseUrl: string;
  token: string;
  proxy?: string;
  forceHttp1: boolean;
  models: readonly DevinCatalogModel[];
  defaultContextWindow: number;
  defaultMaxTokens: number;
  /** 可选的 attachment 读取器，用于获取图片字节 */
  readImage?: (ref: ImageAttachmentRef, signal?: AbortSignal) => Promise<StoredImageAttachment>;
}
interface DevinAdapterOptions {
  /** 当前连接配置；每次操作时调用以获取最新值。 */
  options: () => DevinConnectionOptions;
}
declare class DevinAdapter extends LlmAdapter {
  private readonly config;
  private cachedClient;
  private cachedClientKey;
  constructor(options: DevinAdapterOptions);
  /** 当前连接配置（每次调用读取最新值）。 */
  private conn;
  /** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
  private client;
  providerInfo(_provider: string): LlmProviderInfo;
  listModels(_provider: string): Promise<readonly LlmModelInfo[]>;
  resolveModel(_provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  /**
   * 从 Devin 服务器拉取可用模型列表，供 settings 面板的
   * "Fetch available models" 按钮调用。返回的模型由用户勾选后
   * 写入 config.models，listModels 只展示用户配置的模型。
   */
  discoverModels(signal?: AbortSignal): Promise<LlmDiscoveredModel[]>;
  /**
   * 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
   * 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens / description。
   */
  private fetchModelCatalog;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  private buildRequest;
  private convertMessage;
  private promptForContent;
}
//#endregion
//#region src/adapter/credentials.d.ts
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
//#endregion
//#region src/index.d.ts
declare const name = "dsh-plugin-devin-bridge";
declare const inject: string[];
interface Config {
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
  /** 默认最大输出 token，默认 16384。 */
  defaultMaxTokens: number;
  /** 可用模型列表。 */
  models: DevinCatalogModel[];
  /** 重试策略。 */
  retryPolicy: RetryPolicyConfig;
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, DevinAdapter, type DevinAdapterOptions, type DevinCatalogModel, type DevinConnectionOptions, type DevinSession, apply, devinCredentialsPath, inject, name, readDevinSession };
//# sourceMappingURL=index.d.ts.map