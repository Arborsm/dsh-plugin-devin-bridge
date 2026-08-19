import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { CallId, LlmAdapter, LlmError, ReasoningEffortId, RetryPolicySchema, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { createClient } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { randomBytes, randomUUID } from "node:crypto";
import { fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import { createConnectTransport } from "@connectrpc/connect-node";
import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/proto/gen/devin_pb.ts
/**
* Describes the file devin.proto.
*/
const file_devin = /*@__PURE__*/ fileDesc("CgtkZXZpbi5wcm90bxIRZXhhLmFwaV9zZXJ2ZXJfcGIiOgoYR29vZ2xlUHJvdG9idWZfVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAUirwEKG0V4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIQCghpZGVfbmFtZRgBIAEoCRIZChFleHRlbnNpb25fdmVyc2lvbhgCIAEoCRIPCgdhcGlfa2V5GAMgASgJEg4KBmxvY2FsZRgEIAEoCRIKCgJvcxgFIAEoCRITCgtpZGVfdmVyc2lvbhgHIAEoCRIWCg5leHRlbnNpb25fbmFtZRgMIAEoCRIJCgFmGB8gASgJIqIBCipFeGFDb2RlaXVtQ29tbW9uUGJfQ29tcGxldGlvbkNvbmZpZ3VyYXRpb24SFwoPbnVtX2NvbXBsZXRpb25zGAEgASgEEhIKCm1heF90b2tlbnMYAiABKAQSFAoMbWF4X25ld2xpbmVzGAMgASgEEhMKC3RlbXBlcmF0dXJlGAUgASgBEg0KBXRvcF9rGAcgASgEEg0KBXRvcF9wGAggASgBIkYKHEV4YUNvZGVpdW1Db21tb25QYl9JbWFnZURhdGESEwoLYmFzZTY0X2RhdGEYASABKAkSEQoJbWltZV90eXBlGAIgASgJIlMKH0V4YUNvZGVpdW1Db21tb25QYl9DaGF0VG9vbENhbGwSCgoCaWQYASABKAkSDAoEbmFtZRgCIAEoCRIWCg5hcmd1bWVudHNfanNvbhgDIAEoCSJdChxFeGFDaGF0UGJfQ2hhdFRvb2xEZWZpbml0aW9uEgwKBG5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSGgoSanNvbl9zY2hlbWFfc3RyaW5nGAMgASgJIocDChtFeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSEgoKbWVzc2FnZV9pZBgBIAEoCRJHCgZzb3VyY2UYAiABKA4yNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2USDgoGcHJvbXB0GAMgASgJEkYKCnRvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEhQKDHRvb2xfY2FsbF9pZBgHIAEoCRIcChR0b29sX3Jlc3VsdF9pc19lcnJvchgJIAEoCBI/CgZpbWFnZXMYCiADKAsyLy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfSW1hZ2VEYXRhEhAKCHRoaW5raW5nGAsgASgJEhEKCXNpZ25hdHVyZRgMIAEoCRIZChF0aGlua2luZ19yZWRhY3RlZBgNIAEoCCLOAQolRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVJlZmVyZW5jZRIVCg10cmFqZWN0b3J5X2lkGAEgASgJEkwKD3RyYWplY3RvcnlfdHlwZRgDIAEoDjIzLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkAKCXN0ZXBfdHlwZRgEIAEoDjItLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlIpsBCiJFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxVc2FnZVN0YXRzEhQKDGlucHV0X3Rva2VucxgCIAEoBBIVCg1vdXRwdXRfdG9rZW5zGAMgASgEEhoKEmNhY2hlX3dyaXRlX3Rva2VucxgEIAEoBBIZChFjYWNoZV9yZWFkX3Rva2VucxgFIAEoBBIRCgltb2RlbF91aWQYCSABKAkiiAIKJEV4YUNvZGVpdW1Db21tb25QYl9DbGllbnRNb2RlbENvbmZpZxINCgVsYWJlbBgBIAEoCRIQCghkaXNhYmxlZBgEIAEoCBIXCg9zdXBwb3J0c19pbWFnZXMYBSABKAgSEgoKaXNfcHJlbWl1bRgHIAEoCBIPCgdpc19iZXRhGAkgASgIEkUKCHByb3ZpZGVyGAogASgOMjMuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXISEgoKbWF4X3Rva2VucxgSIAEoBRIRCgltb2RlbF91aWQYFiABKAkSEwoLZGVzY3JpcHRpb24YGyABKAki/wQKFUdldENoYXRNZXNzYWdlUmVxdWVzdBJACghtZXRhZGF0YRgBIAEoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIOCgZwcm9tcHQYAiABKAkSTAoUY2hhdF9tZXNzYWdlX3Byb21wdHMYAyADKAsyLi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSPwoMcmVxdWVzdF90eXBlGAcgASgOMikuZXhhLmFwaV9zZXJ2ZXJfcGIuQ2hhdE1lc3NhZ2VSZXF1ZXN0VHlwZRJUCg1jb25maWd1cmF0aW9uGAggASgLMj0uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX0NvbXBsZXRpb25Db25maWd1cmF0aW9uEj4KBXRvb2xzGAogAygLMi8uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ2hhdFBiX0NoYXRUb29sRGVmaW5pdGlvbhJWChR0cmFqZWN0b3J5X3JlZmVyZW5jZRgPIAEoCzI4LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlSZWZlcmVuY2USEgoKY2FzY2FkZV9pZBgQIAEoCRJVCgxwbGFubmVyX21vZGUYFCABKA4yPy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ29udmVyc2F0aW9uYWxQbGFubmVyTW9kZRIWCg5jaGF0X21vZGVsX3VpZBgVIAEoCRIUCgxleGVjdXRpb25faWQYFiABKAkiwQMKFkdldENoYXRNZXNzYWdlUmVzcG9uc2USEgoKbWVzc2FnZV9pZBgBIAEoCRI+Cgl0aW1lc3RhbXAYAiABKAsyKy5leGEuYXBpX3NlcnZlcl9wYi5Hb29nbGVQcm90b2J1Zl9UaW1lc3RhbXASEgoKZGVsdGFfdGV4dBgDIAEoCRJFCgtzdG9wX3JlYXNvbhgFIAEoDjIwLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uEkwKEGRlbHRhX3Rvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEkQKBXVzYWdlGAcgASgLMjUuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsVXNhZ2VTdGF0cxIWCg5kZWx0YV90aGlua2luZxgJIAEoCRIXCg9kZWx0YV9zaWduYXR1cmUYCiABKAkSGQoRdGhpbmtpbmdfcmVkYWN0ZWQYCyABKAgSGAoQYWN0dWFsX21vZGVsX3VpZBgXIAEoCSJhCh1HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVxdWVzdBJACghtZXRhZGF0YRgBIAEoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YSJ3Ch5HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVzcG9uc2USVQoUY2xpZW50X21vZGVsX2NvbmZpZ3MYASADKAsyNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2xpZW50TW9kZWxDb25maWcqagoWQ2hhdE1lc3NhZ2VSZXF1ZXN0VHlwZRIpCiVDSEFUX01FU1NBR0VfUkVRVUVTVF9UWVBFX1VOU1BFQ0lGSUVEEAASJQohQ0hBVF9NRVNTQUdFX1JFUVVFU1RfVFlQRV9DQVNDQURFEAUquwIKJEV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZRJICkRFeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9VTlNQRUNJRklFRBAAEkEKPUV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1VTRVIQARJDCj9FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9TWVNURU0QAhJBCj1FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9UT09MEAQq3gEKLEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlElgKVEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9VTlNQRUNJRklFRBAAElQKUEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9ERUZBVUxUEAEqsAEKIEV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkcKQ0V4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlX0NPUlRFWF9UUkFKRUNUT1JZX1RZUEVfVU5TUEVDSUZJRUQQABJDCj9FeGFDb3J0ZXhQYl9Db3J0ZXhUcmFqZWN0b3J5VHlwZV9DT1JURVhfVFJBSkVDVE9SWV9UWVBFX0NBU0NBREUQBCqVAQoaRXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGUSOwo3RXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGVfQ09SVEVYX1NURVBfVFlQRV9VTlNQRUNJRklFRBAAEjoKNkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlX0NPUlRFWF9TVEVQX1RZUEVfVVNFUl9JTlBVVBAOKvcCCh1FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbhI5CjVFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9VTlNQRUNJRklFRBAAEjgKNEV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0lOQ09NUExFVEUQARI4CjRFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9NQVhfVE9LRU5TEAMSNQoxRXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb25fU1RPUF9SRUFTT05fUEFSVElBTBAJEjsKN0V4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0ZVTkNUSU9OX0NBTEwQChIzCi9FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9FUlJPUhANKpwCCiBFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlchI/CjtFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlcl9NT0RFTF9QUk9WSURFUl9VTlNQRUNJRklFRBAAEjwKOEV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyX01PREVMX1BST1ZJREVSX1dJTkRTVVJGEAESOgo2RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfT1BFTkFJEAISPQo5RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfQU5USFJPUElDEAMy+gEKEEFwaVNlcnZlclNlcnZpY2USZwoOR2V0Q2hhdE1lc3NhZ2USKC5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlcXVlc3QaKS5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlc3BvbnNlMAESfQoWR2V0Q2FzY2FkZU1vZGVsQ29uZmlncxIwLmV4YS5hcGlfc2VydmVyX3BiLkdldENhc2NhZGVNb2RlbENvbmZpZ3NSZXF1ZXN0GjEuZXhhLmFwaV9zZXJ2ZXJfcGIuR2V0Q2FzY2FkZU1vZGVsQ29uZmlnc1Jlc3BvbnNl");
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
var DevinStreamDecoder = class {
	nextIndex = 0;
	textIndex = -1;
	textStarted = false;
	textBuilder = "";
	reasoningIndex = -1;
	reasoningStarted = false;
	reasoningBuilder = "";
	tools = [];
	currentUsage = null;
	stopReason = 0;
	finished = false;
	decode(response) {
		const chunks = [];
		if (!response || this.finished) return chunks;
		const usage = response.usage;
		if (usage) {
			const u = {
				inputTokens: Number(usage.inputTokens),
				outputTokens: Number(usage.outputTokens)
			};
			if (usage.cacheReadTokens) u.cacheReadTokens = Number(usage.cacheReadTokens);
			if (usage.cacheWriteTokens) u.cacheWriteTokens = Number(usage.cacheWriteTokens);
			this.currentUsage = u;
		}
		if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
			if (!this.reasoningStarted) {
				this.reasoningIndex = this.nextIndex++;
				this.reasoningStarted = true;
				this.reasoningBuilder = "";
				chunks.push({
					type: "block-start",
					index: this.reasoningIndex,
					blockType: "reasoning"
				});
			}
			if (response.deltaThinking) {
				this.reasoningBuilder += response.deltaThinking;
				chunks.push({
					type: "reasoning-delta",
					index: this.reasoningIndex,
					text: response.deltaThinking
				});
			}
		}
		if (response.deltaText) {
			if (this.reasoningStarted) {
				chunks.push({
					type: "block-end",
					index: this.reasoningIndex,
					block: {
						type: "reasoning",
						text: this.reasoningBuilder
					}
				});
				this.reasoningStarted = false;
			}
			if (!this.textStarted) {
				this.textIndex = this.nextIndex++;
				this.textStarted = true;
				this.textBuilder = "";
				chunks.push({
					type: "block-start",
					index: this.textIndex,
					blockType: "text"
				});
			}
			this.textBuilder += response.deltaText;
			chunks.push({
				type: "text-delta",
				index: this.textIndex,
				text: response.deltaText
			});
		}
		for (const delta of response.deltaToolCalls) {
			if (this.reasoningStarted) {
				chunks.push({
					type: "block-end",
					index: this.reasoningIndex,
					block: {
						type: "reasoning",
						text: this.reasoningBuilder
					}
				});
				this.reasoningStarted = false;
			}
			if (this.textStarted) {
				chunks.push({
					type: "block-end",
					index: this.textIndex,
					block: {
						type: "text",
						text: this.textBuilder
					}
				});
				this.textStarted = false;
			}
			let state = this.findTool(delta.id);
			if (!state) {
				state = {
					callId: CallId(delta.id || `call_${this.tools.length}`),
					name: delta.name || "",
					arguments: "",
					blockIndex: this.nextIndex++,
					started: false,
					ended: false
				};
				this.tools.push(state);
			}
			if (delta.id) state.callId = CallId(delta.id);
			if (delta.name) state.name = delta.name;
			if (!state.started) {
				state.started = true;
				chunks.push({
					type: "block-start",
					index: state.blockIndex,
					blockType: "tool-call"
				});
				chunks.push({
					type: "tool-call-delta",
					index: state.blockIndex,
					id: state.callId,
					name: state.name,
					argumentsDelta: ""
				});
			}
			if (delta.argumentsJson) {
				state.arguments += delta.argumentsJson;
				chunks.push({
					type: "tool-call-delta",
					index: state.blockIndex,
					id: state.callId,
					argumentsDelta: delta.argumentsJson
				});
			}
		}
		if (response.stopReason !== 0) this.stopReason = response.stopReason;
		return chunks;
	}
	finish(upstreamError) {
		const chunks = [];
		if (this.finished) return chunks;
		this.finished = true;
		if (upstreamError) {
			chunks.push({
				type: "finish",
				reason: {
					kind: "error",
					failure: {
						message: upstreamError.message || String(upstreamError),
						code: "TRANSPORT"
					}
				}
			});
			return chunks;
		}
		if (this.reasoningStarted) chunks.push({
			type: "block-end",
			index: this.reasoningIndex,
			block: {
				type: "reasoning",
				text: this.reasoningBuilder
			}
		});
		if (this.textStarted) chunks.push({
			type: "block-end",
			index: this.textIndex,
			block: {
				type: "text",
				text: this.textBuilder
			}
		});
		for (const state of this.tools) if (!state.ended) {
			state.ended = true;
			const block = {
				type: "tool-call",
				id: state.callId,
				name: state.name,
				arguments: isJSONObject(state.arguments) ? state.arguments : "{}"
			};
			chunks.push({
				type: "block-end",
				index: state.blockIndex,
				block
			});
		}
		if (this.currentUsage) chunks.push({
			type: "usage",
			usage: this.currentUsage
		});
		chunks.push({
			type: "finish",
			reason: mapFinishReason(this.stopReason)
		});
		return chunks;
	}
	findTool(id) {
		if (id) return this.tools.find((t) => t.callId === id);
		if (this.tools.length > 0) return this.tools[this.tools.length - 1];
	}
};
function isJSONObject(value) {
	try {
		const parsed = JSON.parse(value);
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
	} catch {
		return false;
	}
}
function mapFinishReason(reason) {
	switch (reason) {
		case 3:
		case 1:
		case 9: return { kind: "max-tokens" };
		case 10: return { kind: "tool-calls" };
		case 13: return {
			kind: "error",
			failure: {
				message: "Devin stopped with an error",
				code: "SERVER"
			}
		};
		default: return { kind: "stop" };
	}
}
function connectErrorCode(message) {
	const colonIdx = message.indexOf(":");
	if (colonIdx >= 0) {
		const code = message.slice(0, colonIdx).trim();
		const known = {
			invalid_argument: "INVALID_REQUEST",
			failed_precondition: "INVALID_REQUEST",
			out_of_range: "INVALID_REQUEST",
			unimplemented: "INVALID_REQUEST",
			unauthenticated: "AUTH",
			permission_denied: "AUTH",
			not_found: "NOT_FOUND",
			resource_exhausted: "RATE_LIMIT",
			deadline_exceeded: "TIMEOUT",
			unavailable: "SERVER",
			internal: "SERVER",
			unknown: "SERVER"
		};
		if (known[code]) return known[code];
	}
	return "TRANSPORT";
}
function wrapConnectError(err) {
	if (err instanceof LlmError) return err;
	const message = err instanceof Error ? err.message : String(err);
	return new LlmError(`Devin API: ${message}`, connectErrorCode(message), { cause: err });
}
//#endregion
//#region src/adapter/devin.ts
const CLIENT_NAME = "chisel";
const CLIENT_VERSION = "3000.2.17";
const PROVIDER$1 = "devin";
const REASONING_EFFORTS = [
	{
		id: ReasoningEffortId("off"),
		name: "Off"
	},
	{
		id: ReasoningEffortId("low"),
		name: "Low"
	},
	{
		id: ReasoningEffortId("high"),
		name: "High"
	},
	{
		id: ReasoningEffortId("max"),
		name: "Max"
	}
];
var DevinAdapter = class DevinAdapter extends LlmAdapter {
	config;
	cachedClient = null;
	cachedClientKey = "";
	cachedModels = null;
	modelsExpiry = 0;
	static MODELS_CACHE_TTL_MS = 3e5;
	constructor(options) {
		super();
		this.config = options;
	}
	/** 当前连接配置（每次调用读取最新值）。 */
	conn() {
		return this.config.options();
	}
	/** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
	client() {
		const c = this.conn();
		const key = `${c.baseUrl}\0${c.token}\0${c.proxy ?? ""}\0${c.forceHttp1}`;
		if (this.cachedClient !== null && this.cachedClientKey === key) return this.cachedClient;
		const transport = createDevinTransport({
			baseUrl: c.baseUrl,
			token: c.token,
			proxy: c.proxy,
			forceHttp1: c.forceHttp1
		});
		this.cachedClient = createClient(ApiServerService, transport);
		this.cachedClientKey = key;
		this.cachedModels = null;
		this.modelsExpiry = 0;
		return this.cachedClient;
	}
	providerInfo(_provider) {
		return {
			id: PROVIDER$1,
			name: "Devin"
		};
	}
	async listModels(_provider) {
		return (await this.resolveModelCatalog()).map((m) => ({
			provider: PROVIDER$1,
			id: m.id,
			name: m.name ?? m.id,
			...m.description ? { description: m.description } : {},
			...m.supportsImages ? { inputModalities: ["text", "image"] } : { inputModalities: ["text"] }
		}));
	}
	async resolveModel(_provider, model, _signal) {
		const c = this.conn();
		const configured = (await this.resolveModelCatalog()).find((m) => m.id === model);
		const contextWindow = configured?.contextWindow ?? c.defaultContextWindow;
		return {
			provider: PROVIDER$1,
			id: model,
			name: configured?.name ?? model,
			...configured?.description ? { description: configured.description } : {},
			...configured?.supportsImages ? { inputModalities: ["text", "image"] } : { inputModalities: ["text"] },
			context: { contextWindow },
			defaultMaxTokens: configured?.maxTokens ?? c.defaultMaxTokens,
			reasoning: {
				efforts: REASONING_EFFORTS,
				defaultEffort: ReasoningEffortId("high")
			}
		};
	}
	/**
	* 解析当前可用的模型目录。
	*
	* 优先从 Devin 服务器动态获取（GetCascadeModelConfigs），带 5 分钟 TTL 缓存；
	* 网络失败时 fallback 到配置的静态模型列表。
	* 用户显式配置的 model 即使不在服务器返回的列表中也会被合并进来。
	*/
	async resolveModelCatalog() {
		if (this.cachedModels !== null && Date.now() < this.modelsExpiry) return this.cachedModels;
		const c = this.conn();
		try {
			const dynamic = await this.fetchModelCatalog();
			const seen = new Set(dynamic.map((m) => m.id));
			const merged = [...dynamic];
			for (const configured of c.models) if (!seen.has(configured.id)) merged.push(configured);
			this.cachedModels = merged;
			this.modelsExpiry = Date.now() + DevinAdapter.MODELS_CACHE_TTL_MS;
			return merged;
		} catch {
			this.cachedModels = c.models;
			this.modelsExpiry = Date.now() + 3e4;
			return c.models;
		}
	}
	/**
	* 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
	* 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens / description。
	*/
	async fetchModelCatalog() {
		const c = this.conn();
		const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
			apiKey: c.token,
			extensionName: CLIENT_NAME,
			extensionVersion: CLIENT_VERSION,
			ideName: CLIENT_NAME,
			ideVersion: CLIENT_VERSION,
			locale: "en",
			os: "win"
		});
		const request = create(GetCascadeModelConfigsRequestSchema, { metadata });
		const response = await this.client().getCascadeModelConfigs(request);
		const models = [];
		const seen = /* @__PURE__ */ new Set();
		for (const config of response.clientModelConfigs) {
			if (config.disabled) continue;
			const uid = config.modelUid;
			if (!uid || seen.has(uid)) continue;
			seen.add(uid);
			models.push({
				id: uid,
				...config.label ? { name: config.label } : {},
				...config.description ? { description: config.description } : {},
				...config.maxTokens > 0 ? { maxTokens: config.maxTokens } : {},
				supportsImages: config.supportsImages
			});
		}
		return models;
	}
	async *stream(options) {
		let protoRequest;
		try {
			protoRequest = await this.buildRequest(options);
		} catch (err) {
			throw new LlmError(`Devin request build failed: ${err instanceof Error ? err.message : String(err)}`, "INVALID_REQUEST", { cause: err });
		}
		let serverStream;
		try {
			serverStream = await this.client().getChatMessage(protoRequest);
		} catch (err) {
			throw wrapConnectError(err);
		}
		const decoder = new DevinStreamDecoder();
		const iterator = serverStream[Symbol.asyncIterator]();
		let upstreamError = null;
		try {
			while (true) {
				let result;
				try {
					result = await iterator.next();
				} catch (err) {
					upstreamError = err instanceof Error ? err : new Error(String(err));
					break;
				}
				if (result.done) break;
				if (result.value) yield* decoder.decode(result.value);
			}
		} finally {
			if (typeof iterator.return === "function") try {
				await iterator.return();
			} catch {}
		}
		yield* decoder.finish(upstreamError);
	}
	async buildRequest(options) {
		const c = this.conn();
		const fingerprint = randomHex(366);
		const trajectoryID = randomUUID();
		const cascadeID = randomUUID();
		const executionID = randomUUID();
		const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
			apiKey: c.token,
			extensionName: CLIENT_NAME,
			extensionVersion: CLIENT_VERSION,
			ideName: CLIENT_NAME,
			ideVersion: CLIENT_VERSION,
			locale: "en",
			os: "win",
			f: fingerprint
		});
		const result = create(GetChatMessageRequestSchema, {
			metadata,
			prompt: sanitizeSystemPrompt(withToolDescriptions(options.system ?? "", options.tools)),
			chatModelUid: options.model,
			requestType: 5,
			configuration: create(ExaCodeiumCommonPb_CompletionConfigurationSchema, {
				numCompletions: 1n,
				maxTokens: BigInt(options.maxTokens ?? c.defaultMaxTokens),
				maxNewlines: 400n,
				temperature: options.temperature ?? 1,
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
		for (let i = 0; i < options.messages.length; i++) if (options.messages[i].role === "assistant") lastAssistantIndex = i;
		for (let i = 0; i < options.messages.length; i++) {
			const converted = await this.convertMessage(options.messages[i], i > lastAssistantIndex, options.signal);
			result.chatMessagePrompts.push(...converted);
		}
		if (options.tools) for (const tool of options.tools) result.tools.push(convertToolDefinition(tool));
		return result;
	}
	async convertMessage(message, attachImages, signal) {
		const source = message.source;
		if (source.kind === "tool") {
			const prompt = await this.promptForContent(4, message.content, attachImages, signal);
			prompt.toolCallId = source.callId;
			for (const block of message.content) if (block.type === "tool-result" && block.isError) prompt.toolResultIsError = true;
			return [prompt];
		}
		if (source.kind === "model") {
			const prompt = await this.promptForContent(2, message.content, false, signal);
			for (const block of message.content) if (block.type === "tool-call") prompt.toolCalls.push({
				id: block.id,
				name: block.name,
				argumentsJson: block.arguments
			});
			return [prompt];
		}
		return [await this.promptForContent(1, message.content, attachImages, signal)];
	}
	async promptForContent(source, content, attachImages, signal) {
		const prompt = create(ExaChatPb_ChatMessagePromptSchema, {
			messageId: randomUUID(),
			source
		});
		let text = "";
		for (const block of content) switch (block.type) {
			case "text":
				text += block.text;
				break;
			case "reasoning":
				prompt.thinking = block.text;
				prompt.thinkingRedacted = false;
				break;
			case "image":
				if (!attachImages) {
					if (text.length > 0) text += "\n";
					text += "[Image omitted from history]";
					break;
				}
				const readImage = this.conn().readImage;
				if (!readImage) throw new LlmError("Devin adapter received an image but no attachment store is available", "INVALID_REQUEST");
				try {
					const stored = await readImage(block.attachment, signal);
					const base64 = Buffer.from(stored.data).toString("base64");
					const mimeType = stored.ref.mediaType;
					prompt.images.push({
						base64Data: base64,
						mimeType
					});
				} catch (err) {
					throw new LlmError(`Failed to read image attachment: ${err instanceof Error ? err.message : String(err)}`, "INVALID_REQUEST", { cause: err });
				}
				break;
			case "tool-call": break;
			case "tool-result": for (const sub of block.content) if (sub.type === "text") text += sub.text;
		}
		prompt.prompt = text;
		return prompt;
	}
};
function convertToolDefinition(tool) {
	const schema = stripSchemaAnnotations(tool.parameters);
	return create(ExaChatPb_ChatToolDefinitionSchema, {
		name: tool.name,
		description: tool.description || tool.name,
		jsonSchemaString: schema
	});
}
function stripSchemaAnnotations(schema) {
	try {
		const cleaned = stripSchemaValueAnnotations(schema, false);
		return JSON.stringify(cleaned);
	} catch {
		return JSON.stringify(schema);
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
	if (!tools || tools.length === 0) return systemPrompt;
	let section = "";
	for (const tool of tools) {
		const description = tool.description.trim();
		if (!description) continue;
		if (!section) section = "# tools descriptions";
		section += `\n<tool name="${escapeXMLAttribute(tool.name)}">\n`;
		section += escapeXMLText(description);
		section += "\n</tool>";
	}
	if (!section) return systemPrompt;
	const trimmed = systemPrompt.replace(/[\r\n]+$/, "");
	if (!trimmed.trim()) return section;
	return `${trimmed}\n\n${section}`;
}
function escapeXMLAttribute(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function escapeXMLText(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function randomHex(size) {
	return randomBytes(size).toString("hex");
}
/**
* Devin CLI credentials.toml 的平台相关路径。
* 支持环境变量 DEVIN_CREDENTIALS_PATH 覆盖。
*/
function devinCredentialsPath() {
	if (process.env.DEVIN_CREDENTIALS_PATH) return process.env.DEVIN_CREDENTIALS_PATH;
	if (platform() === "win32") {
		const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
		return join(appData, "devin", "credentials.toml");
	}
	const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
	return join(dataHome, "devin", "credentials.toml");
}
/**
* 从 credentials.toml 解析 Devin session。
* 使用轻量 TOML 扫描器而非完整 TOML 库，避免引入额外依赖。
* 只读取顶层 string key，拒绝重复 key 和多行值。
*/
function devinSessionEntry(contents) {
	const table = scanTomlTopLevel(contents);
	const apiKey = table["windsurf_api_key"];
	if (typeof apiKey !== "string" || !apiKey) return void 0;
	return {
		apiKey,
		apiServerUrl: table["api_server_url"] || "https://server.codeium.com",
		...table["devin_api_url"] ? { devinApiUrl: table["devin_api_url"] } : {}
	};
}
/**
* 尝试从 Devin CLI 的 credentials.toml 读取 session。
* 文件不存在或格式无效时返回 undefined，不抛异常。
*/
function readDevinSession(options) {
	const path = options?.credentialsPath ?? devinCredentialsPath();
	if (!existsSync(path)) return void 0;
	let contents;
	try {
		contents = readFileSync(path, "utf8");
	} catch {
		return;
	}
	try {
		return devinSessionEntry(contents);
	} catch {
		return;
	}
}
/**
* 扫描 TOML 文件的顶层 string key=value 对。
* 只支持 `key = "value"` 形式，不支持 table、array、多行字符串等复杂结构。
* 重复 key 抛异常（fail-closed）。
*/
function scanTomlTopLevel(contents) {
	const result = {};
	const lines = contents.split("\n");
	let inTable = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === "" || line.startsWith("#")) continue;
		if (line.startsWith("[")) {
			inTable = true;
			continue;
		}
		if (inTable) continue;
		const eqIdx = line.indexOf("=");
		if (eqIdx < 0) continue;
		const key = line.slice(0, eqIdx).trim();
		const valuePart = line.slice(eqIdx + 1).trim();
		if (!valuePart.startsWith("\"")) continue;
		const closing = valuePart.indexOf("\"", 1);
		if (closing < 0) throw new Error(`unterminated string at line ${i + 1}`);
		const value = valuePart.slice(1, closing);
		if (key in result) throw new Error(`duplicate key "${key}" at line ${i + 1}`);
		result[key] = value;
	}
	return result;
}
//#endregion
//#region src/index.ts
const name = "dsh-plugin-devin-bridge";
const inject = ["llm"];
const PROVIDER = "devin";
const SETTINGS_NS = settingsNamespace(name);
const DEFAULT_MODELS = [{
	id: "glm-5-2",
	name: "GLM-5.2",
	description: "Devin-hosted GLM-5.2 reasoning model",
	contextWindow: 128e3,
	maxTokens: 16384,
	supportsImages: false
}, {
	id: "swe-1-7",
	name: "SWE-1.7",
	description: "Devin-hosted SWE-1.7 coding model with vision support",
	contextWindow: 128e3,
	maxTokens: 16384,
	supportsImages: true
}];
const catalogModel = z.object({
	id: z.string().required(),
	name: z.string(),
	description: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	supportsImages: z.boolean()
});
const Config = z.object({
	token: z.string().role("secret").default(""),
	baseUrl: z.string().default("https://server.codeium.com"),
	proxy: z.string().default(""),
	forceHttp1: z.boolean().default(true),
	defaultContextWindow: z.number().step(1).min(1).default(128e3),
	defaultMaxTokens: z.number().step(1).min(1).default(16384),
	models: z.array(catalogModel).default(DEFAULT_MODELS),
	retryPolicy: RetryPolicySchema
});
function apply(ctx, config) {
	const attachments = ctx.get("attachments");
	const readImage = attachments ? (ref, signal) => attachments.readImage(ref, signal) : void 0;
	let current = config;
	const source = () => current;
	let cachedConn = null;
	let cachedConnKey = "";
	const resolveConn = () => {
		const c = source();
		if (c.token) return {
			token: c.token,
			baseUrl: c.baseUrl
		};
		const key = c.baseUrl;
		if (cachedConn !== null && cachedConnKey === key) return cachedConn;
		const session = readDevinSession();
		if (session) {
			const baseUrl = c.baseUrl === "https://server.codeium.com" ? session.apiServerUrl : c.baseUrl;
			cachedConn = {
				token: session.apiKey,
				baseUrl
			};
			cachedConnKey = key;
			return cachedConn;
		}
		const hint = process.platform === "win32" ? "%APPDATA%\\devin\\credentials.toml" : "~/.local/share/devin/credentials.toml";
		throw new Error(`devin-bridge: no Devin session token found. Either:
  1. Set token in the settings panel to a "devin-session-token\$..." value, or
  2. Run "devin auth login" to create ${hint}, or\n  3. Set DEVIN_CREDENTIALS_PATH to a custom credentials.toml path`);
	};
	const adapter = new DevinAdapter({ options: () => {
		const c = source();
		const { token, baseUrl } = resolveConn();
		return {
			token,
			baseUrl,
			proxy: c.proxy || void 0,
			forceHttp1: c.forceHttp1,
			models: c.models,
			defaultContextWindow: c.defaultContextWindow,
			defaultMaxTokens: c.defaultMaxTokens,
			...readImage ? { readImage } : {}
		};
	} });
	let directoryHandle = null;
	let adapterHandle = null;
	const register = () => {
		const retryPolicy = resolveRetryPolicy(source().retryPolicy, `llm: provider "${PROVIDER}" retryPolicy`);
		adapter.providerRetryPolicy = () => retryPolicy;
		if (!directoryHandle) directoryHandle = ctx.llm.registerConfigurableProviders([{
			provider: PROVIDER,
			displayName: "Devin",
			settingsNs: name,
			settingsPath: []
		}]);
		if (!adapterHandle) adapterHandle = ctx.llm.registerAdapter([PROVIDER], adapter);
	};
	const unregister = () => {
		if (adapterHandle) {
			try {
				adapterHandle();
			} catch {}
			adapterHandle = null;
		}
		if (directoryHandle) {
			try {
				directoryHandle();
			} catch {}
			directoryHandle = null;
		}
	};
	installSettingsSection(ctx, SETTINGS_NS, Config, config, {
		setSource(thunk) {
			current = thunk();
		},
		onChange() {
			unregister();
			register();
		}
	});
	register();
	ctx.effect(() => () => unregister());
}
//#endregion
export { Config, DevinAdapter, apply, devinCredentialsPath, inject, name, readDevinSession };

//# sourceMappingURL=index.js.map