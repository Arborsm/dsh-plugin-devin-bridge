// 中间 LLM 层校验逻辑。翻译自 devin-2api/internal/llm/request.go 的 Validate() 方法。

import type {
  Content,
  ContentType,
  Message,
  RequestMessages,
  ToolDefinition,
} from './types.ts'

function validJSONObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function validateContent(
  content: Content[],
  allowed: ContentType[],
): string | null {
  const allowedSet = new Set(allowed)
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (!block) return `content block ${i} is nil`
    if (!allowedSet.has(block.type)) {
      return `content block ${i} has disallowed type "${block.type}"`
    }
    switch (block.type) {
      case 'text':
        break
      case 'thinking':
        if (block.redacted && !block.thinkingSignature) {
          return `content block ${i} (thinking): redacted thinking content requires a signature`
        }
        break
      case 'image':
        if (!block.data) return `content block ${i} (image): image data is required`
        if (!block.mimeType) return `content block ${i} (image): image MIME type is required`
        break
      case 'toolCall':
        if (!block.id) return `content block ${i} (toolCall): tool call ID is required`
        if (!block.name) return `content block ${i} (toolCall): tool call name is required`
        if (!validJSONObject(block.arguments)) {
          return `content block ${i} (toolCall): tool call arguments must be a JSON object`
        }
        break
    }
  }
  return null
}

export function validateMessage(message: Message, index: number): string | null {
  if (!message) return `message ${index} is nil`
  switch (message.role) {
    case 'user':
      return validateContent(message.content, ['text', 'image'])
        ? `message ${index} (user): ${validateContent(message.content, ['text', 'image'])}`
        : null
    case 'assistant': {
      const err = validateContent(message.content, ['text', 'thinking', 'toolCall'])
      if (err) return `message ${index} (assistant): ${err}`
      if (message.stopReason && !isValidStopReason(message.stopReason)) {
        return `message ${index} (assistant): invalid stop reason "${message.stopReason}"`
      }
      return null
    }
    case 'toolResult':
      if (!message.toolCallID) return `message ${index} (toolResult): tool result call ID is required`
      if (!message.toolName) return `message ${index} (toolResult): tool result name is required`
      {
        const err = validateContent(message.content, ['text', 'image'])
        if (err) return `message ${index} (toolResult): ${err}`
      }
      return null
    default:
      return `message ${index}: unknown role "${(message as Message).role}"`
  }
}

export function validateTool(tool: ToolDefinition, index: number): string | null {
  if (!tool.name) return `tool ${index}: tool name is required`
  if (!validJSONObject(tool.inputSchema)) {
    return `tool ${index}: tool input schema must be a JSON object`
  }
  return null
}

export function validateRequest(request: RequestMessages): string | null {
  for (let i = 0; i < request.messages.length; i++) {
    const err = validateMessage(request.messages[i]!, i)
    if (err) return err
  }
  for (let i = 0; i < request.tools.length; i++) {
    const err = validateTool(request.tools[i]!, i)
    if (err) return err
  }
  return null
}

function isValidStopReason(reason: string): boolean {
  return ['pending', 'stop', 'length', 'toolUse', 'error', 'aborted'].includes(reason)
}
