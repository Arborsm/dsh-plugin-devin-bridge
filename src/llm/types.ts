// 供应商无关的中间 LLM 请求/响应/事件类型。
// 翻译自 devin-2api/internal/llm/{request,response,stream}.go，保留 agent loop 语义。

// ─── 消息角色 ───────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'toolResult'

// ─── 内容块类型 ─────────────────────────────────────────────────────────────

export type ContentType = 'text' | 'thinking' | 'image' | 'toolCall'

export interface TextContent {
  type: 'text'
  text: string
  textSignature?: string
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  thinkingSignature: string
  redacted: boolean
}

export interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export interface ToolCall {
  type: 'toolCall'
  id: string
  name: string
  arguments: string
  thoughtSignature?: string
}

export type Content = TextContent | ThinkingContent | ImageContent | ToolCall

// ─── 消息 ───────────────────────────────────────────────────────────────────

export interface UserMessage {
  role: 'user'
  content: Content[]
  timestampMS: number
}

export interface ToolResultMessage {
  role: 'toolResult'
  toolCallID: string
  toolName: string
  content: Content[]
  isError: boolean
  timestampMS: number
}

export interface AssistantMessage {
  role: 'assistant'
  content: Content[]
  api: string
  provider: string
  model: string
  responseModel: string
  responseID: string
  usage: Usage
  stopReason: StopReason
  errorMessage: string
  timestampMS: number
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage

// ─── 工具定义 ───────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: string
}

// ─── 请求上下文 ─────────────────────────────────────────────────────────────

export interface RequestMessages {
  model: string
  systemPrompt: string
  messages: Message[]
  tools: ToolDefinition[]
}

// ─── 用量 ───────────────────────────────────────────────────────────────────

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
}

// ─── 停止原因 ───────────────────────────────────────────────────────────────

export type StopReason =
  | 'pending'
  | 'stop'
  | 'length'
  | 'toolUse'
  | 'error'
  | 'aborted'

// ─── 响应事件 ───────────────────────────────────────────────────────────────

export type ResponseEventType =
  | 'start'
  | 'text_start'
  | 'text_delta'
  | 'text_end'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  | 'toolcall_start'
  | 'toolcall_delta'
  | 'toolcall_end'
  | 'done'
  | 'error'

export interface ResponseEvent {
  type: ResponseEventType
  contentIndex: number
  delta: string
  content: string
  partial: AssistantMessage | null
  toolCallID: string
  toolName: string
  toolCall: ToolCall | null
  reason: StopReason
  message: AssistantMessage | null
  error: AssistantMessage | null
}

// ─── 响应流接口 ─────────────────────────────────────────────────────────────

export interface ResponseStream {
  recv(): AsyncIterable<ResponseEvent>
}

// ─── 模型信息 ───────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string
  created: number
  ownedBy: string
  supportsImages: boolean
}
