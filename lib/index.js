import { createRequire } from "node:module";
import { createClient } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { randomBytes, randomUUID } from "node:crypto";
import { fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import { createConnectTransport } from "@connectrpc/connect-node";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/proto/gen/devin_pb.ts
/**
* Describes the file devin.proto.
*/
const file_devin = /*@__PURE__*/ fileDesc("CgtkZXZpbi5wcm90bxIRZXhhLmFwaV9zZXJ2ZXJfcGIiOgoYR29vZ2xlUHJvdG9idWZfVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAUirwEKG0V4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIQCghpZGVfbmFtZRgBIAEoCRIZChFleHRlbnNpb25fdmVyc2lvbhgCIAEoCRIPCgdhcGlfa2V5GAMgASgJEg4KBmxvY2FsZRgEIAEoCRIKCgJvcxgFIAEoCRITCgtpZGVfdmVyc2lvbhgHIAEoCRIWCg5leHRlbnNpb25fbmFtZRgMIAEoCRIJCgFmGB8gASgJIqIBCipFeGFDb2RlaXVtQ29tbW9uUGJfQ29tcGxldGlvbkNvbmZpZ3VyYXRpb24SFwoPbnVtX2NvbXBsZXRpb25zGAEgASgEEhIKCm1heF90b2tlbnMYAiABKAQSFAoMbWF4X25ld2xpbmVzGAMgASgEEhMKC3RlbXBlcmF0dXJlGAUgASgBEg0KBXRvcF9rGAcgASgEEg0KBXRvcF9wGAggASgBIkYKHEV4YUNvZGVpdW1Db21tb25QYl9JbWFnZURhdGESEwoLYmFzZTY0X2RhdGEYASABKAkSEQoJbWltZV90eXBlGAIgASgJIlMKH0V4YUNvZGVpdW1Db21tb25QYl9DaGF0VG9vbENhbGwSCgoCaWQYASABKAkSDAoEbmFtZRgCIAEoCRIWCg5hcmd1bWVudHNfanNvbhgDIAEoCSJdChxFeGFDaGF0UGJfQ2hhdFRvb2xEZWZpbml0aW9uEgwKBG5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSGgoSanNvbl9zY2hlbWFfc3RyaW5nGAMgASgJIocDChtFeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSEgoKbWVzc2FnZV9pZBgBIAEoCRJHCgZzb3VyY2UYAiABKA4yNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2USDgoGcHJvbXB0GAMgASgJEkYKCnRvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEhQKDHRvb2xfY2FsbF9pZBgHIAEoCRIcChR0b29sX3Jlc3VsdF9pc19lcnJvchgJIAEoCBI/CgZpbWFnZXMYCiADKAsyLy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfSW1hZ2VEYXRhEhAKCHRoaW5raW5nGAsgASgJEhEKCXNpZ25hdHVyZRgMIAEoCRIZChF0aGlua2luZ19yZWRhY3RlZBgNIAEoCCLOAQolRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVJlZmVyZW5jZRIVCg10cmFqZWN0b3J5X2lkGAEgASgJEkwKD3RyYWplY3RvcnlfdHlwZRgDIAEoDjIzLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkAKCXN0ZXBfdHlwZRgEIAEoDjItLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlIpsBCiJFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxVc2FnZVN0YXRzEhQKDGlucHV0X3Rva2VucxgCIAEoBBIVCg1vdXRwdXRfdG9rZW5zGAMgASgEEhoKEmNhY2hlX3dyaXRlX3Rva2VucxgEIAEoBBIZChFjYWNoZV9yZWFkX3Rva2VucxgFIAEoBBIRCgltb2RlbF91aWQYCSABKAkiqwEKJEV4YUNvZGVpdW1Db21tb25QYl9DbGllbnRNb2RlbENvbmZpZxIQCghkaXNhYmxlZBgEIAEoCBIXCg9zdXBwb3J0c19pbWFnZXMYBSABKAgSRQoIcHJvdmlkZXIYCiABKA4yMy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlchIRCgltb2RlbF91aWQYFiABKAki/wQKFUdldENoYXRNZXNzYWdlUmVxdWVzdBJACghtZXRhZGF0YRgBIAEoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIOCgZwcm9tcHQYAiABKAkSTAoUY2hhdF9tZXNzYWdlX3Byb21wdHMYAyADKAsyLi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSPwoMcmVxdWVzdF90eXBlGAcgASgOMikuZXhhLmFwaV9zZXJ2ZXJfcGIuQ2hhdE1lc3NhZ2VSZXF1ZXN0VHlwZRJUCg1jb25maWd1cmF0aW9uGAggASgLMj0uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX0NvbXBsZXRpb25Db25maWd1cmF0aW9uEj4KBXRvb2xzGAogAygLMi8uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ2hhdFBiX0NoYXRUb29sRGVmaW5pdGlvbhJWChR0cmFqZWN0b3J5X3JlZmVyZW5jZRgPIAEoCzI4LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlSZWZlcmVuY2USEgoKY2FzY2FkZV9pZBgQIAEoCRJVCgxwbGFubmVyX21vZGUYFCABKA4yPy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ29udmVyc2F0aW9uYWxQbGFubmVyTW9kZRIWCg5jaGF0X21vZGVsX3VpZBgVIAEoCRIUCgxleGVjdXRpb25faWQYFiABKAkiwQMKFkdldENoYXRNZXNzYWdlUmVzcG9uc2USEgoKbWVzc2FnZV9pZBgBIAEoCRI+Cgl0aW1lc3RhbXAYAiABKAsyKy5leGEuYXBpX3NlcnZlcl9wYi5Hb29nbGVQcm90b2J1Zl9UaW1lc3RhbXASEgoKZGVsdGFfdGV4dBgDIAEoCRJFCgtzdG9wX3JlYXNvbhgFIAEoDjIwLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uEkwKEGRlbHRhX3Rvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEkQKBXVzYWdlGAcgASgLMjUuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsVXNhZ2VTdGF0cxIWCg5kZWx0YV90aGlua2luZxgJIAEoCRIXCg9kZWx0YV9zaWduYXR1cmUYCiABKAkSGQoRdGhpbmtpbmdfcmVkYWN0ZWQYCyABKAgSGAoQYWN0dWFsX21vZGVsX3VpZBgXIAEoCSJhCh1HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVxdWVzdBJACghtZXRhZGF0YRgBIAEoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YSJ3Ch5HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVzcG9uc2USVQoUY2xpZW50X21vZGVsX2NvbmZpZ3MYASADKAsyNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2xpZW50TW9kZWxDb25maWcqagoWQ2hhdE1lc3NhZ2VSZXF1ZXN0VHlwZRIpCiVDSEFUX01FU1NBR0VfUkVRVUVTVF9UWVBFX1VOU1BFQ0lGSUVEEAASJQohQ0hBVF9NRVNTQUdFX1JFUVVFU1RfVFlQRV9DQVNDQURFEAUquwIKJEV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZRJICkRFeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9VTlNQRUNJRklFRBAAEkEKPUV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1VTRVIQARJDCj9FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9TWVNURU0QAhJBCj1FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9UT09MEAQq3gEKLEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlElgKVEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9VTlNQRUNJRklFRBAAElQKUEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9ERUZBVUxUEAEqsAEKIEV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkcKQ0V4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlX0NPUlRFWF9UUkFKRUNUT1JZX1RZUEVfVU5TUEVDSUZJRUQQABJDCj9FeGFDb3J0ZXhQYl9Db3J0ZXhUcmFqZWN0b3J5VHlwZV9DT1JURVhfVFJBSkVDVE9SWV9UWVBFX0NBU0NBREUQBCqVAQoaRXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGUSOwo3RXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGVfQ09SVEVYX1NURVBfVFlQRV9VTlNQRUNJRklFRBAAEjoKNkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlX0NPUlRFWF9TVEVQX1RZUEVfVVNFUl9JTlBVVBAOKvcCCh1FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbhI5CjVFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9VTlNQRUNJRklFRBAAEjgKNEV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0lOQ09NUExFVEUQARI4CjRFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9NQVhfVE9LRU5TEAMSNQoxRXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb25fU1RPUF9SRUFTT05fUEFSVElBTBAJEjsKN0V4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0ZVTkNUSU9OX0NBTEwQChIzCi9FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9FUlJPUhANKpwCCiBFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlchI/CjtFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlcl9NT0RFTF9QUk9WSURFUl9VTlNQRUNJRklFRBAAEjwKOEV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyX01PREVMX1BST1ZJREVSX1dJTkRTVVJGEAESOgo2RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfT1BFTkFJEAISPQo5RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfQU5USFJPUElDEAMy+gEKEEFwaVNlcnZlclNlcnZpY2USZwoOR2V0Q2hhdE1lc3NhZ2USKC5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlcXVlc3QaKS5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlc3BvbnNlMAESfQoWR2V0Q2FzY2FkZU1vZGVsQ29uZmlncxIwLmV4YS5hcGlfc2VydmVyX3BiLkdldENhc2NhZGVNb2RlbENvbmZpZ3NSZXF1ZXN0GjEuZXhhLmFwaV9zZXJ2ZXJfcGIuR2V0Q2FzY2FkZU1vZGVsQ29uZmlnc1Jlc3BvbnNl");
/**
* Describes the message exa.api_server_pb.ExaCodeiumCommonPb_Metadata.
* Use `create(ExaCodeiumCommonPb_MetadataSchema)` to create a new message.
*/
const ExaCodeiumCommonPb_MetadataSchema = /*@__PURE__*/ messageDesc(file_devin, 1);
/**
* Describes the message exa.api_server_pb.ExaCodeiumCommonPb_CompletionConfiguration.
* Use `create(ExaCodeiumCommonPb_CompletionConfigurationSchema)` to create a new message.
*/
const ExaCodeiumCommonPb_CompletionConfigurationSchema = /*@__PURE__*/ messageDesc(file_devin, 2);
/**
* Describes the message exa.api_server_pb.ExaChatPb_ChatToolDefinition.
* Use `create(ExaChatPb_ChatToolDefinitionSchema)` to create a new message.
*/
const ExaChatPb_ChatToolDefinitionSchema = /*@__PURE__*/ messageDesc(file_devin, 5);
/**
* Describes the message exa.api_server_pb.ExaChatPb_ChatMessagePrompt.
* Use `create(ExaChatPb_ChatMessagePromptSchema)` to create a new message.
*/
const ExaChatPb_ChatMessagePromptSchema = /*@__PURE__*/ messageDesc(file_devin, 6);
/**
* Describes the message exa.api_server_pb.ExaCortexPb_CortexTrajectoryReference.
* Use `create(ExaCortexPb_CortexTrajectoryReferenceSchema)` to create a new message.
*/
const ExaCortexPb_CortexTrajectoryReferenceSchema = /*@__PURE__*/ messageDesc(file_devin, 7);
/**
* Describes the message exa.api_server_pb.GetChatMessageRequest.
* Use `create(GetChatMessageRequestSchema)` to create a new message.
*/
const GetChatMessageRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 10);
/**
* Describes the message exa.api_server_pb.GetCascadeModelConfigsRequest.
* Use `create(GetCascadeModelConfigsRequestSchema)` to create a new message.
*/
const GetCascadeModelConfigsRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 12);
/**
* @generated from service exa.api_server_pb.ApiServerService
*/
const ApiServerService = /*@__PURE__*/ serviceDesc(file_devin, 0);
//#endregion
//#region src/llm/validate.ts
function validJSONObject(value) {
	try {
		const parsed = JSON.parse(value);
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
	} catch {
		return false;
	}
}
function validateContent(content, allowed) {
	const allowedSet = new Set(allowed);
	for (let i = 0; i < content.length; i++) {
		const block = content[i];
		if (!block) return `content block ${i} is nil`;
		if (!allowedSet.has(block.type)) return `content block ${i} has disallowed type "${block.type}"`;
		switch (block.type) {
			case "text": break;
			case "thinking":
				if (block.redacted && !block.thinkingSignature) return `content block ${i} (thinking): redacted thinking content requires a signature`;
				break;
			case "image":
				if (!block.data) return `content block ${i} (image): image data is required`;
				if (!block.mimeType) return `content block ${i} (image): image MIME type is required`;
				break;
			case "toolCall":
				if (!block.id) return `content block ${i} (toolCall): tool call ID is required`;
				if (!block.name) return `content block ${i} (toolCall): tool call name is required`;
				if (!validJSONObject(block.arguments)) return `content block ${i} (toolCall): tool call arguments must be a JSON object`;
		}
	}
	return null;
}
function validateMessage(message, index) {
	if (!message) return `message ${index} is nil`;
	switch (message.role) {
		case "user": return validateContent(message.content, ["text", "image"]) ? `message ${index} (user): ${validateContent(message.content, ["text", "image"])}` : null;
		case "assistant": {
			const err = validateContent(message.content, [
				"text",
				"thinking",
				"toolCall"
			]);
			if (err) return `message ${index} (assistant): ${err}`;
			if (message.stopReason && !isValidStopReason(message.stopReason)) return `message ${index} (assistant): invalid stop reason "${message.stopReason}"`;
			return null;
		}
		case "toolResult":
			if (!message.toolCallID) return `message ${index} (toolResult): tool result call ID is required`;
			if (!message.toolName) return `message ${index} (toolResult): tool result name is required`;
			{
				const err = validateContent(message.content, ["text", "image"]);
				if (err) return `message ${index} (toolResult): ${err}`;
			}
			return null;
		default: return `message ${index}: unknown role "${message.role}"`;
	}
}
function validateTool(tool, index) {
	if (!tool.name) return `tool ${index}: tool name is required`;
	if (!validJSONObject(tool.inputSchema)) return `tool ${index}: tool input schema must be a JSON object`;
	return null;
}
function validateRequest(request) {
	for (let i = 0; i < request.messages.length; i++) {
		const err = validateMessage(request.messages[i], i);
		if (err) return err;
	}
	for (let i = 0; i < request.tools.length; i++) {
		const err = validateTool(request.tools[i], i);
		if (err) return err;
	}
	return null;
}
function isValidStopReason(reason) {
	return [
		"pending",
		"stop",
		"length",
		"toolUse",
		"error",
		"aborted"
	].includes(reason);
}
//#endregion
//#region src/adapter/transport.ts
/**
* 创建 Connect transport，注入 Devin Basic auth header 并支持代理。
*/
function createDevinTransport(config) {
	const agent = createProxyAgent(config.proxy, config.baseUrl);
	const interceptors = [authInterceptor(config.token)];
	const transportOptions = {
		baseUrl: config.baseUrl,
		interceptors,
		nodeOptions: agent ? { agent } : void 0
	};
	if (config.forceHttp1) transportOptions.httpVersion = "1.1";
	else transportOptions.httpVersion = "2";
	return createConnectTransport(transportOptions);
}
/**
* Auth 拦截器：注入 Authorization: Basic <token>-<token>。
* 与 Go authTransport 行为一致。
*/
function authInterceptor(token) {
	return (next) => async (req) => {
		req.header.set("Authorization", `Basic ${token}-${token}`);
		return next(req);
	};
}
/**
* 根据代理 URL 创建合适的 Agent。
* 支持 http://, https://, socks5://, socks5h:// 协议。
*/
function createProxyAgent(proxyUrl, baseUrl) {
	if (!proxyUrl) return void 0;
	baseUrl.startsWith("https://");
	const protocol = new URL(proxyUrl).protocol;
	if (protocol === "http:" || protocol === "https:") {
		const { HttpsProxyAgent } = __require("https-proxy-agent");
		return new HttpsProxyAgent(proxyUrl);
	}
	if (protocol === "socks5:" || protocol === "socks5h:") {
		const { SocksProxyAgent } = __require("socks-proxy-agent");
		return new SocksProxyAgent(proxyUrl);
	}
	throw new Error(`unsupported proxy protocol: ${protocol}`);
}
//#endregion
//#region src/adapter/decoder.ts
var ResponseDecoder = class {
	model;
	partial;
	text = null;
	textBuilder = "";
	textIdx = 0;
	textOpen = false;
	thinking = null;
	thinkingBuilder = "";
	thinkingSigBuilder = "";
	thinkIdx = 0;
	thinkingOpen = false;
	tools = [];
	started = false;
	finished = false;
	hasStopReason = false;
	stopReason = "pending";
	constructor(model) {
		this.model = model;
		this.partial = emptyPartial(model);
	}
	start() {
		if (this.started || this.finished) return [];
		this.started = true;
		return [{
			...emptyEvent("start"),
			partial: this.partial
		}];
	}
	decode(response) {
		if (!response || this.finished) return [];
		this.updateMetadata(response);
		const events = [];
		if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
			events.push(...this.endText());
			events.push(...this.decodeThinking(response));
		}
		if (response.deltaText) {
			events.push(...this.endThinking());
			events.push(...this.decodeText(response.deltaText));
		}
		for (const delta of response.deltaToolCalls) {
			events.push(...this.endThinking());
			events.push(...this.endText());
			events.push(...this.decodeTool(delta));
		}
		if (response.stopReason !== 0) {
			this.hasStopReason = true;
			this.stopReason = mapStopReason(response.stopReason);
		}
		return events;
	}
	finish(upstreamErr) {
		if (this.finished) return [];
		if (upstreamErr) return this.fail(upstreamErr.message || String(upstreamErr));
		if (!this.hasStopReason && this.partial.content.length === 0 && this.tools.length === 0) return this.fail("Devin stream ended without generated content");
		let reason = this.stopReason;
		if (!this.hasStopReason) reason = "stop";
		if (reason === "error") return this.fail("Devin stopped with an error");
		return this.complete(reason);
	}
	updateMetadata(response) {
		if (response.messageId) this.partial.responseID = response.messageId;
		if (response.actualModelUid) this.partial.responseModel = response.actualModelUid;
		if (response.timestamp) this.partial.timestampMS = Number(response.timestamp.seconds) * 1e3 + Math.floor(response.timestamp.nanos / 1e6);
		const usage = response.usage;
		if (usage) {
			if (!this.partial.responseModel && usage.modelUid) this.partial.responseModel = usage.modelUid;
			this.partial.usage.input = Number(usage.inputTokens);
			this.partial.usage.output = Number(usage.outputTokens);
			this.partial.usage.cacheRead = Number(usage.cacheReadTokens);
			this.partial.usage.cacheWrite = Number(usage.cacheWriteTokens);
			this.partial.usage.totalTokens = this.partial.usage.input + this.partial.usage.output + this.partial.usage.cacheRead + this.partial.usage.cacheWrite;
		}
	}
	decodeThinking(response) {
		const events = [];
		if (!this.thinkingOpen) {
			this.thinking = {
				type: "thinking",
				thinking: "",
				thinkingSignature: "",
				redacted: response.thinkingRedacted
			};
			this.thinkingBuilder = "";
			this.thinkingSigBuilder = "";
			this.partial.content.push(this.thinking);
			this.thinkIdx = this.partial.content.length - 1;
			this.thinkingOpen = true;
			events.push({
				...emptyEvent("thinking_start"),
				contentIndex: this.thinkIdx,
				partial: this.partial
			});
		}
		if (response.deltaThinking) this.thinkingBuilder += response.deltaThinking;
		if (response.deltaSignature) this.thinkingSigBuilder += response.deltaSignature;
		if (this.thinking) {
			this.thinking.redacted = this.thinking.redacted || response.thinkingRedacted;
			this.thinking.thinkingSignature = this.thinkingSigBuilder;
			this.partial.content[this.thinkIdx] = this.thinking;
		}
		if (response.deltaThinking) events.push({
			...emptyEvent("thinking_delta"),
			contentIndex: this.thinkIdx,
			delta: response.deltaThinking,
			partial: this.partial
		});
		return events;
	}
	decodeText(delta) {
		const events = [];
		if (!this.textOpen) {
			this.text = {
				type: "text",
				text: ""
			};
			this.textBuilder = "";
			this.partial.content.push(this.text);
			this.textIdx = this.partial.content.length - 1;
			this.textOpen = true;
			events.push({
				...emptyEvent("text_start"),
				contentIndex: this.textIdx,
				partial: this.partial
			});
		}
		this.textBuilder += delta;
		events.push({
			...emptyEvent("text_delta"),
			contentIndex: this.textIdx,
			delta,
			partial: this.partial
		});
		return events;
	}
	decodeTool(delta) {
		const events = [];
		let state = this.findTool(delta.id);
		if (!state) {
			state = {
				call: {
					type: "toolCall",
					id: delta.id,
					name: delta.name,
					arguments: "{}"
				},
				contentIdx: -1,
				arguments: "",
				emitted: false
			};
			this.tools.push(state);
		}
		if (delta.id) state.call.id = delta.id;
		if (delta.name) state.call.name = delta.name;
		const fragment = delta.argumentsJson;
		const hasFragment = !!delta.argumentsJson;
		if (hasFragment) state.arguments += fragment;
		if (!state.emitted) {
			state.contentIdx = this.partial.content.length;
			state.emitted = true;
			this.partial.content.push(state.call);
			events.push({
				...emptyEvent("toolcall_start"),
				contentIndex: state.contentIdx,
				toolCallID: state.call.id,
				toolName: state.call.name,
				partial: this.partial
			});
		}
		if (hasFragment) events.push({
			...emptyEvent("toolcall_delta"),
			contentIndex: state.contentIdx,
			toolCallID: state.call.id,
			delta: fragment,
			partial: this.partial
		});
		return events;
	}
	endThinking() {
		if (!this.thinkingOpen || !this.thinking) return [];
		this.thinkingOpen = false;
		this.thinking.thinking = this.thinkingBuilder;
		this.thinking.thinkingSignature = this.thinkingSigBuilder;
		this.partial.content[this.thinkIdx] = this.thinking;
		return [{
			...emptyEvent("thinking_end"),
			contentIndex: this.thinkIdx,
			content: this.thinking.thinking,
			partial: this.partial
		}];
	}
	endText() {
		if (!this.textOpen || !this.text) return [];
		this.textOpen = false;
		this.text.text = this.textBuilder;
		this.partial.content[this.textIdx] = this.text;
		return [{
			...emptyEvent("text_end"),
			contentIndex: this.textIdx,
			content: this.text.text,
			partial: this.partial
		}];
	}
	findTool(id) {
		if (id) return this.tools.find((t) => t.call.id === id);
		if (this.tools.length > 0) return this.tools[this.tools.length - 1];
	}
	complete(reason) {
		if (this.finished) return [];
		const events = [];
		this.partial.stopReason = reason;
		events.push(...this.endThinking());
		events.push(...this.endText());
		for (const state of this.tools) {
			if (!state.emitted) continue;
			state.call.arguments = isJSONObject$1(state.arguments) ? state.arguments : "{}";
			this.partial.content[state.contentIdx] = state.call;
			events.push({
				...emptyEvent("toolcall_end"),
				contentIndex: state.contentIdx,
				toolCall: state.call,
				partial: this.partial
			});
		}
		events.push({
			...emptyEvent("done"),
			reason,
			message: this.partial
		});
		this.finished = true;
		return events;
	}
	fail(message) {
		if (this.finished) return [];
		this.partial.stopReason = "error";
		this.partial.errorMessage = message;
		this.finished = true;
		return [{
			...emptyEvent("error"),
			reason: "error",
			error: this.partial
		}];
	}
};
var DevinResponseStream = class {
	decoder;
	upstream;
	iterator = null;
	queue = [];
	started = false;
	finished = false;
	upstreamError = null;
	constructor(model, upstream) {
		this.decoder = new ResponseDecoder(model);
		this.upstream = upstream;
	}
	async *recv() {
		if (!this.started) {
			this.started = true;
			yield* this.decoder.start();
		}
		if (!this.iterator) this.iterator = this.upstream[Symbol.asyncIterator]();
		while (!this.finished) {
			const { done, value, error } = await safeNext(this.iterator);
			if (error) {
				this.upstreamError = error;
				this.finished = true;
				yield* this.decoder.finish(error);
				return;
			}
			if (done) {
				this.finished = true;
				yield* this.decoder.finish(this.upstreamError);
				return;
			}
			if (value) yield* this.decoder.decode(value);
		}
	}
};
async function safeNext(iter) {
	try {
		const result = await iter.next();
		return {
			done: result.done ?? false,
			value: result.value ?? null,
			error: null
		};
	} catch (e) {
		return {
			done: true,
			value: null,
			error: e instanceof Error ? e : new Error(String(e))
		};
	}
}
function emptyPartial(model) {
	return {
		role: "assistant",
		content: [],
		api: "connect",
		provider: "devin",
		model,
		responseModel: "",
		responseID: "",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0
		},
		stopReason: "pending",
		errorMessage: "",
		timestampMS: Date.now()
	};
}
function emptyEvent(type) {
	return {
		type,
		contentIndex: 0,
		delta: "",
		content: "",
		partial: null,
		toolCallID: "",
		toolName: "",
		toolCall: null,
		reason: "pending",
		message: null,
		error: null
	};
}
function isJSONObject$1(value) {
	try {
		const parsed = JSON.parse(value);
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
	} catch {
		return false;
	}
}
function mapStopReason(reason) {
	switch (reason) {
		case 3:
		case 1:
		case 9: return "length";
		case 10: return "toolUse";
		case 13: return "error";
		default: return "stop";
	}
}
//#endregion
//#region src/adapter/devin.ts
const CLIENT_NAME = "chisel";
const CLIENT_VERSION = "3000.2.17";
const MODELS_CACHE_TTL_MS = 3e5;
var DevinAdapter = class {
	config;
	client;
	modelsCache = null;
	modelsExpiry = 0;
	constructor(config) {
		this.config = config;
		const transport = createDevinTransport({
			baseUrl: config.baseUrl,
			token: config.token,
			proxy: config.proxy,
			forceHttp1: config.forceHttp1
		});
		this.client = createClient(ApiServerService, transport);
	}
	async stream(request) {
		const validationError = validateRequest(request);
		if (validationError) throw new Error(`validate Devin request: ${validationError}`);
		let model = request.model.trim();
		if (!model) model = this.config.model;
		const imageError = validateImagesForModel(request, model);
		if (imageError) throw imageError;
		const protoRequest = buildRequest(request, {
			...this.config,
			model
		});
		try {
			const serverStream = await this.client.getChatMessage(protoRequest);
			return new DevinResponseStream(model, serverStream);
		} catch (err) {
			throw connectError(err);
		}
	}
	async listModels() {
		if (this.modelsCache && Date.now() < this.modelsExpiry) return this.modelsCache;
		const metadata = buildMetadata(this.config.token);
		const request = create(GetCascadeModelConfigsRequestSchema, { metadata });
		const response = await this.client.getCascadeModelConfigs(request);
		const now = Math.floor(Date.now() / 1e3);
		const models = [];
		const seen = /* @__PURE__ */ new Set();
		for (const c of response.clientModelConfigs) {
			if (c.disabled) continue;
			const uid = c.modelUid;
			if (!uid) continue;
			if (seen.has(uid)) continue;
			seen.add(uid);
			let ownedBy = "devin";
			const providerName = c.provider !== 0 ? String(c.provider) : "";
			if (providerName) {
				const idx = providerName.lastIndexOf("_");
				if (idx >= 0 && idx + 1 < providerName.length) ownedBy = providerName.slice(idx + 1).toLowerCase();
			}
			models.push({
				id: uid,
				created: now,
				ownedBy,
				supportsImages: c.supportsImages
			});
		}
		const configured = this.config.model.trim();
		if (configured && !seen.has(configured)) models.push({
			id: configured,
			created: now,
			ownedBy: "devin",
			supportsImages: true
		});
		this.modelsCache = models;
		this.modelsExpiry = Date.now() + MODELS_CACHE_TTL_MS;
		return models;
	}
};
function buildRequest(request, config) {
	const fingerprint = randomHex(366);
	const trajectoryID = randomUUID();
	const cascadeID = randomUUID();
	const executionID = randomUUID();
	const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
		apiKey: config.token,
		extensionName: CLIENT_NAME,
		extensionVersion: CLIENT_VERSION,
		ideName: CLIENT_NAME,
		ideVersion: CLIENT_VERSION,
		locale: "en",
		os: "mac",
		f: fingerprint
	});
	const result = create(GetChatMessageRequestSchema, {
		metadata,
		prompt: sanitizeSystemPrompt(withToolDescriptions(request.systemPrompt, request.tools)),
		chatModelUid: config.model,
		requestType: 5,
		configuration: create(ExaCodeiumCommonPb_CompletionConfigurationSchema, {
			numCompletions: 1n,
			maxTokens: 128000n,
			maxNewlines: 400n,
			temperature: 1,
			topK: 40n,
			topP: .95
		}),
		trajectoryReference: create(ExaCortexPb_CortexTrajectoryReferenceSchema, {
			trajectoryId: trajectoryID,
			trajectoryType: 4,
			stepType: 14
		}),
		cascadeId: cascadeID,
		plannerMode: 1,
		executionId: executionID
	});
	let lastAssistantIndex = -1;
	for (let i = 0; i < request.messages.length; i++) if (request.messages[i].role === "assistant") lastAssistantIndex = i;
	for (let i = 0; i < request.messages.length; i++) {
		const converted = convertMessage(request.messages[i], i > lastAssistantIndex);
		result.chatMessagePrompts.push(...converted);
	}
	for (const tool of request.tools) result.tools.push(convertToolDefinition(tool));
	return result;
}
function convertMessage(message, attachImages) {
	switch (message.role) {
		case "user": return [promptForContent(1, message.content, attachImages)];
		case "assistant": {
			const prompt = promptForContent(2, message.content, false);
			for (const block of message.content) if (block.type === "toolCall") prompt.toolCalls.push({
				id: block.id,
				name: block.name,
				argumentsJson: block.arguments
			});
			return [prompt];
		}
		case "toolResult": {
			const prompt = promptForContent(4, message.content, attachImages);
			prompt.toolCallId = message.toolCallID;
			prompt.toolResultIsError = message.isError;
			return [prompt];
		}
		default: throw new Error(`unsupported message type: ${message.role}`);
	}
}
function promptForContent(source, content, attachImages) {
	const prompt = create(ExaChatPb_ChatMessagePromptSchema, {
		messageId: randomUUID(),
		source
	});
	let text = "";
	for (const block of content) switch (block.type) {
		case "text":
			text += block.text;
			break;
		case "thinking":
			prompt.thinking = block.thinking;
			if (block.thinkingSignature) prompt.signature = block.thinkingSignature;
			prompt.thinkingRedacted = block.redacted;
			break;
		case "image":
			if (!attachImages) {
				if (text.length > 0) text += "\n";
				text += "[Image omitted from history]";
				break;
			}
			let data = block.data;
			if (data.startsWith("data:")) {
				const commaIdx = data.indexOf(",");
				if (commaIdx >= 0) data = data.slice(commaIdx + 1);
			}
			const mimeType = block.mimeType || "image/png";
			prompt.images.push({
				base64Data: data,
				mimeType
			});
	}
	prompt.prompt = text;
	return prompt;
}
function convertToolDefinition(tool) {
	const schema = stripSchemaAnnotations(tool.inputSchema);
	return create(ExaChatPb_ChatToolDefinitionSchema, {
		name: tool.name,
		description: tool.name,
		jsonSchemaString: schema
	});
}
function stripSchemaAnnotations(schemaStr) {
	try {
		const cleaned = stripSchemaValueAnnotations(JSON.parse(schemaStr), false);
		return JSON.stringify(cleaned);
	} catch {
		return schemaStr;
	}
}
function stripSchemaValueAnnotations(value, propertyNames) {
	if (Array.isArray(value)) return value.map((item) => stripSchemaValueAnnotations(item, false));
	if (value !== null && typeof value === "object") {
		const cleaned = {};
		for (const [key, child] of Object.entries(value)) {
			if (isNaturalLanguageAnnotation(key) && !propertyNames) continue;
			if (isSchemaLiteral(key) && !propertyNames) {
				cleaned[key] = child;
				continue;
			}
			cleaned[key] = stripSchemaValueAnnotations(child, key === "properties");
		}
		return cleaned;
	}
	return value;
}
function isSchemaLiteral(key) {
	return [
		"const",
		"default",
		"enum",
		"example",
		"examples"
	].includes(key);
}
function isNaturalLanguageAnnotation(key) {
	if ([
		"description",
		"title",
		"$comment"
	].includes(key)) return true;
	return key.toLowerCase().startsWith("x-");
}
const IDENTITY_REPLACEMENTS = [
	{
		pattern: /You are Claude Code, Anthropic's official CLI for Claude/gi,
		replace: "You are an AI coding assistant"
	},
	{
		pattern: /Claude Code is available as a CLI in the terminal, desktop app/gi,
		replace: "The assistant is available as a CLI in the terminal, desktop tool"
	},
	{
		pattern: /Fast mode for Claude Code uses Claude Opus/gi,
		replace: "Fast mode uses the faster output model"
	},
	{
		pattern: /The most recent Claude models are the Claude 5 family/gi,
		replace: "The most recent models are the latest family"
	},
	{
		pattern: /default to the latest and most capable Claude models/gi,
		replace: "default to the latest and most capable models"
	},
	{
		pattern: /IMPORTANT: Assist with authorized security testing[\s\S]*?defensive use cases/g,
		replace: "IMPORTANT: Assist with authorized security testing and educational contexts. Refuse harmful requests. Dual-use tools require clear authorization context"
	}
];
function sanitizeSystemPrompt(prompt) {
	for (const { pattern, replace } of IDENTITY_REPLACEMENTS) prompt = prompt.replace(pattern, replace);
	return prompt;
}
function withToolDescriptions(systemPrompt, tools) {
	let section = "";
	for (const tool of tools) {
		const description = tool.description.trim();
		if (!description) continue;
		if (!section) section = "# tools descriptions";
		section += `\n<tool name="${escapeXMLAttribute(tool.name)}">\n`;
		section += escapeXMLText(formatToolDescription(description));
		section += "\n</tool>";
	}
	if (!section) return systemPrompt;
	const trimmed = systemPrompt.replace(/[\r\n]+$/, "");
	if (!trimmed.trim()) return section;
	return `${trimmed}\n\n${section}`;
}
function formatToolDescription(description) {
	return description.trim();
}
function escapeXMLAttribute(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function escapeXMLText(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function validateImagesForModel(request, model) {
	if (!requestHasImages(request)) return null;
	if (!modelLikelySupportsImages(model)) return /* @__PURE__ */ new Error(`model "${model}" does not support image inputs (supports_images=false); use a vision-capable model or remove images`);
	return null;
}
function requestHasImages(request) {
	for (const message of request.messages) {
		if (message.role !== "user" && message.role !== "toolResult") continue;
		for (const block of message.content) if (block.type === "image") return true;
	}
	return false;
}
function modelLikelySupportsImages(model) {
	const m = model.toLowerCase().trim();
	if (!m) return true;
	for (const p of [
		"glm-5-2",
		"glm-5",
		"glm-4.7",
		"glm-4-7",
		"glm-4",
		"deepseek",
		"kimi-k2",
		"qwen3-coder"
	]) if (m === p || m.startsWith(p + "-") || m.startsWith(p + "_")) return false;
	if (m.startsWith("o1") || m.startsWith("o3-mini") || m.startsWith("o4-mini")) return false;
	return true;
}
function buildMetadata(token) {
	return create(ExaCodeiumCommonPb_MetadataSchema, {
		apiKey: token,
		extensionName: CLIENT_NAME,
		extensionVersion: CLIENT_VERSION,
		ideName: CLIENT_NAME,
		ideVersion: CLIENT_VERSION,
		locale: "en",
		os: "win",
		f: randomHex(32)
	});
}
function randomHex(size) {
	return randomBytes(size).toString("hex");
}
function connectError(err) {
	if (err === null || err === void 0) return /* @__PURE__ */ new Error("unknown error");
	const e = err;
	if (e.code) {
		const msg = (e.message || e.rawMessage || "").trim() || String(err);
		return /* @__PURE__ */ new Error(`${e.code}: ${msg}`);
	}
	if (err instanceof Error) return err;
	return new Error(String(err));
}
//#endregion
//#region src/api/chat/decode.ts
function decodeChatRequest(body) {
	let request;
	try {
		request = JSON.parse(body);
	} catch (e) {
		throw new Error(`decode chat request: ${e instanceof Error ? e.message : String(e)}`);
	}
	if (!request.model) throw new Error("chat request model is required");
	if (!request.messages || request.messages.length === 0) throw new Error("chat request messages are required");
	const context = {
		model: request.model,
		systemPrompt: "",
		messages: [],
		tools: []
	};
	for (let i = 0; i < request.messages.length; i++) appendMessage(context, request.messages[i], i);
	if (request.tools) for (const tool of request.tools) {
		if (tool.type !== "function") continue;
		const schema = tool.function.parameters;
		const schemaStr = schema ? JSON.stringify(schema) : "{\"type\":\"object\"}";
		context.tools.push({
			name: tool.function.name,
			description: tool.function.description,
			inputSchema: schemaStr
		});
	}
	return {
		context,
		options: {
			stream: !!request.stream,
			includeUsage: !!request.stream_options?.include_usage
		}
	};
}
function appendMessage(context, message, index) {
	switch (message.role) {
		case "system":
		case "developer": {
			const text = contentToText(message.content);
			if (context.systemPrompt && text) context.systemPrompt += "\n";
			context.systemPrompt += text;
			break;
		}
		case "user": {
			const content = decodeUserContent(message.content);
			context.messages.push({
				role: "user",
				content,
				timestampMS: Date.now()
			});
			break;
		}
		case "assistant": {
			const content = decodeAssistantContent(message);
			context.messages.push({
				role: "assistant",
				content,
				api: "",
				provider: "",
				model: "",
				responseModel: "",
				responseID: "",
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0
				},
				stopReason: "pending",
				errorMessage: "",
				timestampMS: Date.now()
			});
			break;
		}
		case "tool": {
			if (!message.tool_call_id) throw new Error(`message[${index}]: tool message requires tool_call_id`);
			const content = decodeContent(message.content);
			const name = findToolName(context.messages, message.tool_call_id);
			context.messages.push({
				role: "toolResult",
				toolCallID: message.tool_call_id,
				toolName: name,
				content,
				isError: false,
				timestampMS: Date.now()
			});
			break;
		}
	}
}
function decodeUserContent(raw) {
	if (raw === null || raw === void 0) return [{
		type: "text",
		text: ""
	}];
	return decodeContent(raw);
}
function decodeAssistantContent(message) {
	const content = [];
	if (message.content !== null && message.content !== void 0) content.push(...decodeContent(message.content));
	if (message.tool_calls) for (const call of message.tool_calls) {
		if (call.type && call.type !== "function") continue;
		let args = call.function.arguments;
		if (!isJSONObject(args)) args = "{}";
		content.push({
			type: "toolCall",
			id: call.id,
			name: call.function.name,
			arguments: args
		});
	}
	return content;
}
function decodeContent(raw) {
	if (typeof raw === "string") return [{
		type: "text",
		text: sanitizeText(raw)
	}];
	if (!Array.isArray(raw)) throw new Error("decode message content: expected string or array");
	const content = [];
	for (let i = 0; i < raw.length; i++) {
		const part = raw[i];
		switch (part.type) {
			case "input_text":
			case "output_text":
			case "text":
				content.push({
					type: "text",
					text: sanitizeText(String(part.text ?? ""))
				});
				break;
			case "input_image":
			case "image_url":
			case "image": content.push(decodeImagePart(part));
		}
	}
	return content;
}
function contentToText(raw) {
	return decodeContent(raw).filter((c) => c.type === "text").map((c) => c.text).join("");
}
function decodeImagePart(part) {
	if (part.file_id) throw new Error("file_id images are not supported; use base64 data URL in image_url");
	const candidates = [
		part.image_url,
		part.image,
		part.source
	];
	for (const candidate of candidates) {
		if (candidate === null || candidate === void 0) continue;
		try {
			return decodeImageValue(candidate);
		} catch (e) {
			if (!(e instanceof ImageShapeError)) throw e;
		}
	}
	if (typeof part.url === "string") return decodeDataImage(part.url);
	if (typeof part.data === "string") return decodeDataImage(part.data);
	throw new Error("image part missing image_url/url/data (base64 data URL required)");
}
var ImageShapeError = class extends Error {
	constructor() {
		super("unrecognized image value shape");
	}
};
function decodeImageValue(raw) {
	if (typeof raw === "string") return decodeDataImage(raw);
	if (raw === null || typeof raw !== "object") throw new ImageShapeError();
	const obj = raw;
	if (obj.file_id) throw new Error("file_id images are not supported; use base64 data URL");
	if (typeof obj.url === "string") return decodeDataImage(obj.url);
	let encoded = "";
	if (typeof obj.data === "string") encoded = obj.data;
	if (!encoded && typeof obj.base64 === "string") encoded = obj.base64;
	if (!encoded && typeof obj.b64_json === "string") encoded = obj.b64_json;
	if (!encoded) throw new ImageShapeError();
	let mimeType = "";
	if (typeof obj.mime_type === "string") mimeType = obj.mime_type;
	if (!mimeType && typeof obj.media_type === "string") mimeType = obj.media_type;
	if (encoded.startsWith("data:")) return decodeDataImage(encoded);
	if (!mimeType) mimeType = sniffImageMIME(encoded);
	if (!mimeType) throw new Error("image base64 requires mime_type/media_type or data URL prefix");
	return decodeRawBase64(encoded, mimeType);
}
function decodeDataImage(value) {
	value = value.trim();
	if (!value) throw new Error("image url/data is empty");
	if (value.startsWith("http://") || value.startsWith("https://")) throw new Error("http(s) image URLs are not fetched yet; embed as data:image/...;base64,...");
	if (!value.startsWith("data:")) {
		const mimeType = sniffImageMIME(value);
		if (mimeType) return decodeRawBase64(value, mimeType);
		throw new Error("only data URL or raw base64 images are supported");
	}
	const commaIdx = value.indexOf(",");
	if (commaIdx < 0) throw new Error("image must be a base64 data URL");
	const meta = value.slice(5, commaIdx);
	const encoded = value.slice(commaIdx + 1);
	let isBase64 = meta.includes(";base64") || !meta.includes(";");
	if (meta.includes(";base64")) isBase64 = true;
	let mimeType = meta;
	const semiIdx = mimeType.indexOf(";");
	if (semiIdx >= 0) mimeType = mimeType.slice(0, semiIdx);
	mimeType = mimeType.trim() || "image/png";
	if (!isBase64) throw new Error("image data URL must be base64 encoded");
	return decodeRawBase64(encoded, mimeType);
}
function decodeRawBase64(encoded, mimeType) {
	encoded = encoded.replace(/[\n\r \t]/g, "");
	let data;
	try {
		data = Buffer.from(encoded, "base64");
	} catch {
		try {
			data = Buffer.from(encoded, "base64url");
		} catch {
			throw new Error("decode image data: invalid base64");
		}
	}
	if (data.length === 0) throw new Error("image data is empty");
	return {
		type: "image",
		data: data.toString("base64"),
		mimeType
	};
}
function sniffImageMIME(encoded) {
	encoded = encoded.replace(/[\n\r \t]/g, "");
	let raw;
	try {
		raw = Buffer.from(encoded, "base64");
	} catch {
		try {
			raw = Buffer.from(encoded, "base64url");
		} catch {
			return "";
		}
	}
	if (raw.length < 4) return "";
	if (raw.length >= 3 && raw[0] === 255 && raw[1] === 216 && raw[2] === 255) return "image/jpeg";
	if (raw.length >= 8 && raw[0] === 137 && raw[1] === 80 && raw[2] === 78 && raw[3] === 71) return "image/png";
	if (raw.length >= 6 && raw[0] === 71 && raw[1] === 73 && raw[2] === 70) return "image/gif";
	if (raw.length >= 12 && raw[0] === 82 && raw[1] === 73 && raw[2] === 70 && raw[3] === 70 && raw[8] === 87 && raw[9] === 69 && raw[10] === 66 && raw[11] === 80) return "image/webp";
	return "";
}
const CODEX_PERMISSIONS_BLOCK = /<permissions instructions>[\s\S]*?<\/permissions instructions>/g;
function sanitizeText(text) {
	return text.replace(CODEX_PERMISSIONS_BLOCK, "");
}
function isJSONObject(value) {
	try {
		const parsed = JSON.parse(value);
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
	} catch {
		return false;
	}
}
function findToolName(messages, callID) {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role !== "assistant") continue;
		for (const block of msg.content) if (block.type === "toolCall" && block.id === callID) return block.name;
	}
	throw new Error(`tool message references unknown tool_call_id "${callID}"`);
}
//#endregion
//#region src/api/chat/encode.ts
var ChatStreamEncoder = class {
	model;
	responseID;
	createdAt;
	includeUsage;
	textStarted = false;
	thinkingStarted = false;
	toolCalls = [];
	finished = false;
	finalUsage = null;
	constructor(model, includeUsage) {
		this.model = model;
		this.responseID = newChatResponseID();
		this.createdAt = Math.floor(Date.now() / 1e3);
		this.includeUsage = includeUsage;
	}
	encode(event) {
		if (this.finished) throw new Error("chat completion stream is already done");
		switch (event.type) {
			case "start": return [this.startChunk()];
			case "text_start":
				this.textStarted = true;
				return [];
			case "text_delta": return this.textDelta(event);
			case "text_end":
				this.textStarted = false;
				return [];
			case "thinking_start":
				this.thinkingStarted = true;
				return [];
			case "thinking_delta": return this.thinkingDelta(event);
			case "thinking_end":
				this.thinkingStarted = false;
				return [];
			case "toolcall_start": return this.startToolCall(event);
			case "toolcall_delta": return this.toolCallDelta(event);
			case "toolcall_end": return this.endToolCall(event);
			case "done": return this.finish(event);
			case "error": return this.failed(event);
			default: throw new Error(`unsupported response event type "${event.type}"`);
		}
	}
	startChunk() {
		return this.chunk({ choices: [{
			index: 0,
			delta: { role: "assistant" },
			finish_reason: null
		}] });
	}
	textDelta(event) {
		if (!this.textStarted) this.textStarted = true;
		if (!event.delta) return [];
		return [this.chunk({ choices: [{
			index: 0,
			delta: { content: event.delta },
			finish_reason: null
		}] })];
	}
	thinkingDelta(event) {
		if (!this.thinkingStarted) this.thinkingStarted = true;
		if (!event.delta) return [];
		return [this.chunk({ choices: [{
			index: 0,
			delta: { reasoning_content: event.delta },
			finish_reason: null
		}] })];
	}
	startToolCall(event) {
		const state = {
			index: this.toolCalls.length,
			id: event.toolCallID,
			name: event.toolName,
			arguments: "",
			done: false
		};
		this.toolCalls.push(state);
		return [this.chunk({ choices: [{
			index: 0,
			delta: { tool_calls: [{
				index: state.index,
				id: state.id,
				type: "function",
				function: {
					name: state.name,
					arguments: ""
				}
			}] },
			finish_reason: null
		}] })];
	}
	toolCallDelta(event) {
		const state = this.findTool(event.toolCallID, event.contentIndex);
		if (!state) return [];
		state.arguments += event.delta;
		return [this.chunk({ choices: [{
			index: 0,
			delta: { tool_calls: [{
				index: state.index,
				function: { arguments: event.delta }
			}] },
			finish_reason: null
		}] })];
	}
	endToolCall(event) {
		const state = this.findToolByIndex(event.contentIndex);
		if (!state) return [];
		state.done = true;
		if (event.toolCall) {
			state.id = event.toolCall.id;
			state.name = event.toolCall.name;
			state.arguments = event.toolCall.arguments;
		}
		return [];
	}
	finish(event) {
		this.finished = true;
		if (event.message) this.finalUsage = event.message.usage;
		const reason = finishReason(event.reason);
		const events = [this.chunk({ choices: [{
			index: 0,
			delta: {},
			finish_reason: reason
		}] })];
		if (this.includeUsage) events.push(this.chunk({
			choices: [],
			usage: chatUsage(this.finalUsage)
		}));
		events.push({
			name: "[DONE]",
			data: "[DONE]"
		});
		return events;
	}
	failed(event) {
		this.finished = true;
		const message = event.error?.errorMessage || "chat completion stream failed";
		return [{
			name: "",
			data: JSON.stringify({
				id: this.responseID,
				object: "chat.completion.chunk",
				created: this.createdAt,
				model: this.model,
				choices: [],
				usage: null,
				error: {
					message,
					type: openAIErrorType(message),
					code: null,
					param: null
				}
			})
		}];
	}
	findTool(id, contentIndex) {
		return this.toolCalls.find((t) => id && t.id === id || t.index === contentIndex);
	}
	findToolByIndex(contentIndex) {
		return this.toolCalls.find((t) => t.index === contentIndex);
	}
	chunk(payload) {
		payload.id = this.responseID;
		payload.object = "chat.completion.chunk";
		payload.created = this.createdAt;
		payload.model = this.model;
		if (!("usage" in payload)) payload.usage = null;
		return {
			name: "",
			data: JSON.stringify(payload)
		};
	}
};
function encodeChatResponse(message) {
	if (!message) throw new Error("response message is nil");
	let model = message.responseModel || message.model || "devin";
	const { messageObj, toolCalls } = messageToChat(message);
	const response = {
		id: newChatResponseID(),
		object: "chat.completion",
		created: Math.floor(Date.now() / 1e3),
		model,
		choices: [{
			index: 0,
			message: messageObj,
			finish_reason: finishReason(message.stopReason)
		}],
		usage: chatUsage(message.usage)
	};
	if (toolCalls.length > 0) response.choices[0].message = {
		...messageObj,
		tool_calls: toolCalls
	};
	return JSON.stringify(response);
}
function messageToChat(message) {
	const textParts = [];
	const reasoningParts = [];
	const toolCalls = [];
	for (const block of message.content) switch (block.type) {
		case "text":
			textParts.push(block.text);
			break;
		case "thinking":
			reasoningParts.push(block.thinking);
			break;
		case "toolCall": toolCalls.push({
			id: block.id,
			type: "function",
			function: {
				name: block.name,
				arguments: block.arguments
			}
		});
	}
	const messageObj = {
		role: "assistant",
		content: textParts.join("")
	};
	if (reasoningParts.length > 0) messageObj.reasoning_content = reasoningParts.join("");
	if (toolCalls.length > 0) {
		messageObj.tool_calls = toolCalls;
		messageObj.content = null;
	}
	return {
		messageObj,
		toolCalls
	};
}
function chatUsage(usage) {
	if (!usage) return {
		prompt_tokens: 0,
		completion_tokens: 0,
		total_tokens: 0
	};
	const inputTokens = usage.input + usage.cacheRead + usage.cacheWrite;
	let total = usage.totalTokens;
	if (total === 0) total = inputTokens + usage.output;
	return {
		prompt_tokens: inputTokens,
		completion_tokens: usage.output,
		total_tokens: total,
		prompt_tokens_details: { cached_tokens: usage.cacheRead },
		completion_tokens_details: { reasoning_tokens: 0 }
	};
}
function finishReason(reason) {
	switch (reason) {
		case "toolUse": return "tool_calls";
		case "length": return "length";
		case "stop": return "stop";
		case "error":
		case "aborted": return "content_filter";
		default: return null;
	}
}
function newChatResponseID() {
	return "chatcmpl-" + randomBytes(16).toString("hex");
}
const OPENAI_ERROR_TYPES = {
	invalid_argument: "invalid_request_error",
	failed_precondition: "invalid_request_error",
	out_of_range: "invalid_request_error",
	unimplemented: "invalid_request_error",
	unauthenticated: "authentication_error",
	permission_denied: "permission_error",
	not_found: "not_found_error",
	resource_exhausted: "rate_limit_error",
	deadline_exceeded: "timeout_error",
	unavailable: "server_error",
	internal: "server_error",
	unknown: "server_error"
};
function openAIErrorType(message) {
	const colonIdx = message.indexOf(":");
	if (colonIdx >= 0) {
		const code = message.slice(0, colonIdx).trim();
		if (OPENAI_ERROR_TYPES[code]) return OPENAI_ERROR_TYPES[code];
	}
	return "server_error";
}
function formatSSE(event) {
	if (event.name === "[DONE]") return "data: [DONE]\n\n";
	return `data: ${event.data}\n\n`;
}
//#endregion
//#region src/gateway.ts
/**
* Devin Bridge 网关服务。激活时注册 /v1/* 路由到 ctx.webServer。
* 配置通过 schemastery 校验后传入。
*/
var DevinBridgeGateway = class {
	config;
	adapter;
	ctx;
	constructor(ctx, config) {
		this.ctx = ctx;
		this.config = config;
		this.adapter = new DevinAdapter({
			baseUrl: config.baseUrl,
			token: config.token,
			model: config.model,
			proxy: config.proxy,
			forceHttp1: config.forceHttp1
		});
		ctx.effect(() => ctx.webServer.register({
			kind: "exact",
			path: "/v1/chat/completions",
			handler: (req, res) => this.handleChat(req, res)
		}), "devinBridge.chat");
		ctx.effect(() => ctx.webServer.register({
			kind: "exact",
			path: "/v1/models",
			handler: (req, res) => this.handleModels(req, res)
		}), "devinBridge.models");
	}
	async handleChat(req, res) {
		if (!this.checkAuth(req, res)) return;
		if (req.method !== "POST") {
			this.sendError(res, 405, "method not allowed");
			return;
		}
		try {
			const { context, options } = decodeChatRequest(await readBody(req, 32 << 20));
			let stream;
			try {
				stream = await this.adapter.stream(context);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				const status = mapProviderErrorStatus(message);
				this.sendError(res, status, message);
				return;
			}
			if (options.stream) await this.handleStreamResponse(res, stream, context.model, options.includeUsage);
			else await this.handleNonStreamResponse(res, stream);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.sendError(res, 400, message);
		}
	}
	async handleStreamResponse(res, stream, model, includeUsage) {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive"
		});
		const encoder = new ChatStreamEncoder(model, includeUsage);
		try {
			for await (const event of stream.recv()) {
				const events = encoder.encode(event);
				for (const sseEvent of events) res.write(formatSSE(sseEvent));
				if (event.type === "error") break;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const errorChunk = JSON.stringify({ error: {
				message,
				type: openAIErrorType(message),
				code: null,
				param: null
			} });
			res.write(`data: ${errorChunk}\n\n`);
		} finally {
			res.end();
		}
	}
	async handleNonStreamResponse(res, stream) {
		let finalMessage = null;
		let errorMessage = null;
		for await (const event of stream.recv()) if (event.type === "done" && event.message) finalMessage = event.message;
		else if (event.type === "error" && event.error) errorMessage = event.error.errorMessage || "response stream returned an error";
		if (errorMessage) {
			this.sendError(res, mapProviderErrorStatus(errorMessage), errorMessage);
			return;
		}
		if (!finalMessage) {
			this.sendError(res, 502, "response stream ended without a final message");
			return;
		}
		const body = encodeChatResponse(finalMessage);
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(body);
	}
	async handleModels(req, res) {
		if (!this.checkAuth(req, res)) return;
		try {
			const data = (await this.adapter.listModels()).map((m) => ({
				id: m.id,
				object: "model",
				created: m.created || Math.floor(Date.now() / 1e3),
				owned_by: m.ownedBy || "devin",
				supports_images: m.supportsImages
			}));
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				object: "list",
				data
			}));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.sendError(res, 502, message);
		}
	}
	checkAuth(req, res) {
		const apiKey = this.config.apiKey?.trim();
		if (!apiKey) return true;
		let provided = "";
		const auth = req.headers.authorization;
		if (auth && auth.startsWith("Bearer ")) provided = auth.slice(7).trim();
		if (!provided) {
			const xKey = req.headers["x-api-key"];
			if (typeof xKey === "string") provided = xKey.trim();
		}
		if (!provided) {
			this.sendAuthError(res, "Missing API key");
			return false;
		}
		const expected = Buffer.from(apiKey);
		const actual = Buffer.from(provided);
		if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
			this.sendAuthError(res, "Invalid API key");
			return false;
		}
		return true;
	}
	sendError(res, status, message) {
		const errorType = openAIErrorType(message);
		let finalStatus = status;
		let finalType = errorType;
		if (status === 400 || message.includes("does not support image") || message.includes("invalid_argument") || message.startsWith("invalid_argument:")) {
			finalType = "invalid_request_error";
			if (status >= 500) finalStatus = 400;
		}
		res.writeHead(finalStatus, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: {
			message,
			type: finalType,
			code: null,
			param: null
		} }));
	}
	sendAuthError(res, message) {
		res.writeHead(401, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: {
			message,
			type: "unauthenticated",
			code: null,
			param: null
		} }));
	}
};
async function readBody(req, maxBytes) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.length;
		if (total > maxBytes) throw new Error("request body too large");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}
function timingSafeEqual(a, b) {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
	return result === 0;
}
function mapProviderErrorStatus(message) {
	if (message.includes("does not support image") || message.includes("invalid_argument") || message.startsWith("invalid_argument:") || message.includes("file_id images") || message.includes("only data URL") || message.includes("validate Devin request") || message.includes("validate adapted request")) return 400;
	if (message.includes("unauthenticated") || message.startsWith("unauthenticated:")) return 401;
	if (message.includes("permission_denied") || message.startsWith("permission_denied:")) return 403;
	if (message.includes("not_found") || message.startsWith("not_found:")) return 404;
	if (message.includes("resource_exhausted") || message.startsWith("resource_exhausted:")) return 429;
	return 502;
}
//#endregion
//#region src/index.ts
/** Cordis 插件名称，与 cordis.patch.yml 中的 name 一致。 */
const name = "dsh-plugin-devin-bridge";
/**
* schemastery 配置 schema。
* dsh 在加载插件时用 schemastery 校验 cordis.patch.yml 中的 config 字段。
*/
const Config = {
	baseUrl: {
		type: "string",
		required: true,
		description: "Devin Connect 服务地址"
	},
	token: {
		type: "string",
		required: true,
		description: "Devin session token (devin-session-token$...)"
	},
	model: {
		type: "string",
		required: false,
		default: "glm-5-2",
		description: "默认模型 UID"
	},
	proxy: {
		type: "string",
		required: false,
		default: "",
		description: "可选代理地址 (http/https/socks5)"
	},
	forceHttp1: {
		type: "boolean",
		required: false,
		default: true,
		description: "强制 HTTP/1.1"
	},
	apiKey: {
		type: "string",
		required: false,
		default: "",
		description: "/v1/* 接口访问密钥；留空不鉴权"
	}
};
/**
* 插件启动入口。Harness 加载插件时调用。
* @param ctx - Cordis 上下文，包含 ctx.webServer 等 service
* @param config - 经 schemastery 校验后的配置
*/
function apply(ctx, config) {
	if (!config.baseUrl) throw new Error("devin-bridge: baseUrl is required");
	if (!config.token) throw new Error("devin-bridge: token is required");
	new DevinBridgeGateway(ctx, config);
}
//#endregion
export { Config, DevinBridgeGateway, apply, name };

//# sourceMappingURL=index.js.map