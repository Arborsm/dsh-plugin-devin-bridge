import { IncomingMessage, ServerResponse } from "node:http";
//#region src/gateway.d.ts
interface DevinBridgeConfig {
  baseUrl: string;
  token: string;
  model: string;
  proxy?: string;
  forceHttp1: boolean;
  apiKey?: string;
}
interface WebRoute {
  kind: 'exact' | 'prefix';
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
interface WebServerService {
  register(route: WebRoute): () => void;
}
interface CordisContext {
  webServer: WebServerService;
  effect<T>(cleanup: T | (() => T | void), name?: string): T;
}
/**
 * Devin Bridge 网关服务。激活时注册 /v1/* 路由到 ctx.webServer。
 * 配置通过 schemastery 校验后传入。
 */
declare class DevinBridgeGateway {
  private config;
  private adapter;
  private ctx;
  constructor(ctx: CordisContext, config: DevinBridgeConfig);
  private handleChat;
  private handleStreamResponse;
  private handleNonStreamResponse;
  private handleModels;
  private checkAuth;
  private sendError;
  private sendAuthError;
}
//#endregion
//#region src/index.d.ts
/** Cordis 插件名称，与 cordis.patch.yml 中的 name 一致。 */
declare const name = "dsh-plugin-devin-bridge";
/**
 * schemastery 配置 schema。
 * dsh 在加载插件时用 schemastery 校验 cordis.patch.yml 中的 config 字段。
 */
declare const Config: {
  readonly baseUrl: {
    readonly type: "string";
    readonly required: true;
    readonly description: "Devin Connect 服务地址";
  };
  readonly token: {
    readonly type: "string";
    readonly required: true;
    readonly description: "Devin session token (devin-session-token$...)";
  };
  readonly model: {
    readonly type: "string";
    readonly required: false;
    readonly default: "glm-5-2";
    readonly description: "默认模型 UID";
  };
  readonly proxy: {
    readonly type: "string";
    readonly required: false;
    readonly default: "";
    readonly description: "可选代理地址 (http/https/socks5)";
  };
  readonly forceHttp1: {
    readonly type: "boolean";
    readonly required: false;
    readonly default: true;
    readonly description: "强制 HTTP/1.1";
  };
  readonly apiKey: {
    readonly type: "string";
    readonly required: false;
    readonly default: "";
    readonly description: "/v1/* 接口访问密钥；留空不鉴权";
  };
};
/**
 * 插件启动入口。Harness 加载插件时调用。
 * @param ctx - Cordis 上下文，包含 ctx.webServer 等 service
 * @param config - 经 schemastery 校验后的配置
 */
declare function apply(ctx: {
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix';
      path: string;
      handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>;
    }): () => void;
  };
  effect<T>(cleanup: T | (() => T | void), name?: string): T;
}, config: DevinBridgeConfig): void;
//#endregion
export { Config, type DevinBridgeConfig, DevinBridgeGateway, apply, name };
//# sourceMappingURL=index.d.ts.map