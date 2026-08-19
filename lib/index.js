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
const file_devin = /*@__PURE__*/ fileDesc("CgtkZXZpbi5wcm90bxIRZXhhLmFwaV9zZXJ2ZXJfcGIiOgoYR29vZ2xlUHJvdG9idWZfVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAUirwEKG0V4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIQCghpZGVfbmFtZRgBIAEoCRIZChFleHRlbnNpb25fdmVyc2lvbhgCIAEoCRIPCgdhcGlfa2V5GAMgASgJEg4KBmxvY2FsZRgEIAEoCRIKCgJvcxgFIAEoCRITCgtpZGVfdmVyc2lvbhgHIAEoCRIWCg5leHRlbnNpb25fbmFtZRgMIAEoCRIJCgFmGB8gASgJIqIBCipFeGFDb2RlaXVtQ29tbW9uUGJfQ29tcGxldGlvbkNvbmZpZ3VyYXRpb24SFwoPbnVtX2NvbXBsZXRpb25zGAEgASgEEhIKCm1heF90b2tlbnMYAiABKAQSFAoMbWF4X25ld2xpbmVzGAMgASgEEhMKC3RlbXBlcmF0dXJlGAUgASgBEg0KBXRvcF9rGAcgASgEEg0KBXRvcF9wGAggASgBIkYKHEV4YUNvZGVpdW1Db21tb25QYl9JbWFnZURhdGESEwoLYmFzZTY0X2RhdGEYASABKAkSEQoJbWltZV90eXBlGAIgASgJIlMKH0V4YUNvZGVpdW1Db21tb25QYl9DaGF0VG9vbENhbGwSCgoCaWQYASABKAkSDAoEbmFtZRgCIAEoCRIWCg5hcmd1bWVudHNfanNvbhgDIAEoCSJdChxFeGFDaGF0UGJfQ2hhdFRvb2xEZWZpbml0aW9uEgwKBG5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSGgoSanNvbl9zY2hlbWFfc3RyaW5nGAMgASgJIocDChtFeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSEgoKbWVzc2FnZV9pZBgBIAEoCRJHCgZzb3VyY2UYAiABKA4yNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2USDgoGcHJvbXB0GAMgASgJEkYKCnRvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEhQKDHRvb2xfY2FsbF9pZBgHIAEoCRIcChR0b29sX3Jlc3VsdF9pc19lcnJvchgJIAEoCBI/CgZpbWFnZXMYCiADKAsyLy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfSW1hZ2VEYXRhEhAKCHRoaW5raW5nGAsgASgJEhEKCXNpZ25hdHVyZRgMIAEoCRIZChF0aGlua2luZ19yZWRhY3RlZBgNIAEoCCLOAQolRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVJlZmVyZW5jZRIVCg10cmFqZWN0b3J5X2lkGAEgASgJEkwKD3RyYWplY3RvcnlfdHlwZRgDIAEoDjIzLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkAKCXN0ZXBfdHlwZRgEIAEoDjItLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlIpsBCiJFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxVc2FnZVN0YXRzEhQKDGlucHV0X3Rva2VucxgCIAEoBBIVCg1vdXRwdXRfdG9rZW5zGAMgASgEEhoKEmNhY2hlX3dyaXRlX3Rva2VucxgEIAEoBBIZChFjYWNoZV9yZWFkX3Rva2VucxgFIAEoBBIRCgltb2RlbF91aWQYCSABKAkigQEKHkV4YUNvZGVpdW1Db21tb25QYl9Qcm9tb1N0YXR1cxIRCglpc19hY3RpdmUYASABKAgSPQoIZW5kX2RhdGUYAiABKAsyKy5leGEuYXBpX3NlcnZlcl9wYi5Hb29nbGVQcm90b2J1Zl9UaW1lc3RhbXASDQoFbGFiZWwYAyABKAkiaAomRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsRmFtaWx5TWV0YWRhdGESGgoSbW9kZWxfZmFtaWx5X2xhYmVsGAEgASgJEiIKGmlzX2RlZmF1bHRfbW9kZWxfaW5fZmFtaWx5GAMgASgIIosECiRFeGFDb2RlaXVtQ29tbW9uUGJfQ2xpZW50TW9kZWxDb25maWcSDQoFbGFiZWwYASABKAkSEAoIZGlzYWJsZWQYBCABKAgSFwoPc3VwcG9ydHNfaW1hZ2VzGAUgASgIEhIKCmlzX3ByZW1pdW0YByABKAgSDwoHaXNfYmV0YRgJIAEoCBJFCghwcm92aWRlchgKIAEoDjIzLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyEhYKDmlzX3JlY29tbWVuZGVkGAsgASgIEg4KBmlzX25ldxgPIAEoCBIbChNpc19jYXBhY2l0eV9saW1pdGVkGBQgASgIEhIKCm1heF90b2tlbnMYEiABKAUSEQoJbW9kZWxfdWlkGBYgASgJEhMKC2Rlc2NyaXB0aW9uGBsgASgJEhkKEWNyZWRpdF9tdWx0aXBsaWVyGAMgASgCEkcKDHByb21vX3N0YXR1cxgTIAEoCzIxLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Qcm9tb1N0YXR1cxJYChVtb2RlbF9mYW1pbHlfbWV0YWRhdGEYHiABKAsyOS5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxGYW1pbHlNZXRhZGF0YSL/BAoVR2V0Q2hhdE1lc3NhZ2VSZXF1ZXN0EkAKCG1ldGFkYXRhGAEgASgLMi4uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01ldGFkYXRhEg4KBnByb21wdBgCIAEoCRJMChRjaGF0X21lc3NhZ2VfcHJvbXB0cxgDIAMoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNoYXRQYl9DaGF0TWVzc2FnZVByb21wdBI/CgxyZXF1ZXN0X3R5cGUYByABKA4yKS5leGEuYXBpX3NlcnZlcl9wYi5DaGF0TWVzc2FnZVJlcXVlc3RUeXBlElQKDWNvbmZpZ3VyYXRpb24YCCABKAsyPS5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ29tcGxldGlvbkNvbmZpZ3VyYXRpb24SPgoFdG9vbHMYCiADKAsyLy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDaGF0UGJfQ2hhdFRvb2xEZWZpbml0aW9uElYKFHRyYWplY3RvcnlfcmVmZXJlbmNlGA8gASgLMjguZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVJlZmVyZW5jZRISCgpjYXNjYWRlX2lkGBAgASgJElUKDHBsYW5uZXJfbW9kZRgUIAEoDjI/LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlEhYKDmNoYXRfbW9kZWxfdWlkGBUgASgJEhQKDGV4ZWN1dGlvbl9pZBgWIAEoCSLBAwoWR2V0Q2hhdE1lc3NhZ2VSZXNwb25zZRISCgptZXNzYWdlX2lkGAEgASgJEj4KCXRpbWVzdGFtcBgCIAEoCzIrLmV4YS5hcGlfc2VydmVyX3BiLkdvb2dsZVByb3RvYnVmX1RpbWVzdGFtcBISCgpkZWx0YV90ZXh0GAMgASgJEkUKC3N0b3BfcmVhc29uGAUgASgOMjAuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb24STAoQZGVsdGFfdG9vbF9jYWxscxgGIAMoCzIyLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9DaGF0VG9vbENhbGwSRAoFdXNhZ2UYByABKAsyNS5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxVc2FnZVN0YXRzEhYKDmRlbHRhX3RoaW5raW5nGAkgASgJEhcKD2RlbHRhX3NpZ25hdHVyZRgKIAEoCRIZChF0aGlua2luZ19yZWRhY3RlZBgLIAEoCBIYChBhY3R1YWxfbW9kZWxfdWlkGBcgASgJImEKHUdldENhc2NhZGVNb2RlbENvbmZpZ3NSZXF1ZXN0EkAKCG1ldGFkYXRhGAEgASgLMi4uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01ldGFkYXRhIncKHkdldENhc2NhZGVNb2RlbENvbmZpZ3NSZXNwb25zZRJVChRjbGllbnRfbW9kZWxfY29uZmlncxgBIAMoCzI3LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9DbGllbnRNb2RlbENvbmZpZypqChZDaGF0TWVzc2FnZVJlcXVlc3RUeXBlEikKJUNIQVRfTUVTU0FHRV9SRVFVRVNUX1RZUEVfVU5TUEVDSUZJRUQQABIlCiFDSEFUX01FU1NBR0VfUkVRVUVTVF9UWVBFX0NBU0NBREUQBSq7AgokRXhhQ29kZWl1bUNvbW1vblBiX0NoYXRNZXNzYWdlU291cmNlEkgKREV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1VOU1BFQ0lGSUVEEAASQQo9RXhhQ29kZWl1bUNvbW1vblBiX0NoYXRNZXNzYWdlU291cmNlX0NIQVRfTUVTU0FHRV9TT1VSQ0VfVVNFUhABEkMKP0V4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1NZU1RFTRACEkEKPUV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1RPT0wQBCreAQosRXhhQ29kZWl1bUNvbW1vblBiX0NvbnZlcnNhdGlvbmFsUGxhbm5lck1vZGUSWApURXhhQ29kZWl1bUNvbW1vblBiX0NvbnZlcnNhdGlvbmFsUGxhbm5lck1vZGVfQ09OVkVSU0FUSU9OQUxfUExBTk5FUl9NT0RFX1VOU1BFQ0lGSUVEEAASVApQRXhhQ29kZWl1bUNvbW1vblBiX0NvbnZlcnNhdGlvbmFsUGxhbm5lck1vZGVfQ09OVkVSU0FUSU9OQUxfUExBTk5FUl9NT0RFX0RFRkFVTFQQASqwAQogRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVR5cGUSRwpDRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVR5cGVfQ09SVEVYX1RSQUpFQ1RPUllfVFlQRV9VTlNQRUNJRklFRBAAEkMKP0V4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlX0NPUlRFWF9UUkFKRUNUT1JZX1RZUEVfQ0FTQ0FERRAEKpUBChpFeGFDb3J0ZXhQYl9Db3J0ZXhTdGVwVHlwZRI7CjdFeGFDb3J0ZXhQYl9Db3J0ZXhTdGVwVHlwZV9DT1JURVhfU1RFUF9UWVBFX1VOU1BFQ0lGSUVEEAASOgo2RXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGVfQ09SVEVYX1NURVBfVFlQRV9VU0VSX0lOUFVUEA4q9wIKHUV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uEjkKNUV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX1VOU1BFQ0lGSUVEEAASOAo0RXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb25fU1RPUF9SRUFTT05fSU5DT01QTEVURRABEjgKNEV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX01BWF9UT0tFTlMQAxI1CjFFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9QQVJUSUFMEAkSOwo3RXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb25fU1RPUF9SRUFTT05fRlVOQ1RJT05fQ0FMTBAKEjMKL0V4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0VSUk9SEA0qnAIKIEV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyEj8KO0V4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyX01PREVMX1BST1ZJREVSX1VOU1BFQ0lGSUVEEAASPAo4RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfV0lORFNVUkYQARI6CjZFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlcl9NT0RFTF9QUk9WSURFUl9PUEVOQUkQAhI9CjlFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlcl9NT0RFTF9QUk9WSURFUl9BTlRIUk9QSUMQAzL6AQoQQXBpU2VydmVyU2VydmljZRJnCg5HZXRDaGF0TWVzc2FnZRIoLmV4YS5hcGlfc2VydmVyX3BiLkdldENoYXRNZXNzYWdlUmVxdWVzdBopLmV4YS5hcGlfc2VydmVyX3BiLkdldENoYXRNZXNzYWdlUmVzcG9uc2UwARJ9ChZHZXRDYXNjYWRlTW9kZWxDb25maWdzEjAuZXhhLmFwaV9zZXJ2ZXJfcGIuR2V0Q2FzY2FkZU1vZGVsQ29uZmlnc1JlcXVlc3QaMS5leGEuYXBpX3NlcnZlcl9wYi5HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVzcG9uc2U");
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
* Describes the message exa.api_server_pb.ExaCodeiumCommonPb_ChatToolCall.
* Use `create(ExaCodeiumCommonPb_ChatToolCallSchema)` to create a new message.
*/
const ExaCodeiumCommonPb_ChatToolCallSchema = /*@__PURE__*/ messageDesc(file_devin, 4);
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
const GetChatMessageRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 12);
/**
* Describes the message exa.api_server_pb.GetCascadeModelConfigsRequest.
* Use `create(GetCascadeModelConfigsRequestSchema)` to create a new message.
*/
const GetCascadeModelConfigsRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 14);
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
/** dsh effort id → Devin model_uid 后缀。 */
const EFFORT_SUFFIX = {
	high: "",
	medium: "-medium",
	max: "-max",
	none: "-none"
};
/** dsh reasoning effort 列表（供 resolveModel 返回给 dsh 显示滑块）。 */
const REASONING_EFFORTS = [
	{
		id: ReasoningEffortId("high"),
		name: "High"
	},
	{
		id: ReasoningEffortId("medium"),
		name: "Medium"
	},
	{
		id: ReasoningEffortId("max"),
		name: "Max"
	},
	{
		id: ReasoningEffortId("none"),
		name: "No Thinking"
	}
];
/**
* 把 base model id + reasoningEffort 映射到 Devin 实际 model_uid。
* 如 glm-5-2 + max → glm-5-2-max，swe-1-7 + medium → swe-1-7-medium。
* 如果映射后的 uid 不在已知模型列表里，回退到 base id。
*/
function resolveModelUid(baseId, effort, knownIds) {
	if (!effort) return baseId;
	const suffix = EFFORT_SUFFIX[effort];
	if (suffix === void 0) return baseId;
	const mapped = suffix ? `${baseId}${suffix}` : baseId;
	return knownIds.has(mapped) ? mapped : baseId;
}
/** 从 label 解析 effort 标签（如 "GLM-5.2 High" → "High"）。 */
function parseEffortFromLabel(label) {
	return label.match(/\b(Max|High|Medium|Low|No Thinking|Lightning)\b/i)?.[0];
}
/**
* 把 model_uid 去掉 effort 后缀，得到 base model id。
* 如 glm-5-2-max → glm-5-2, swe-1-7-medium → swe-1-7, glm-5-2-none-1m → glm-5-2。
* 去掉 -max, -medium, -none, -1m, -lightning 等后缀。
*/
function toBaseModelId(uid) {
	return uid.replace(/-1m$/i, "").replace(/-none$/i, "").replace(/-max$/i, "").replace(/-medium$/i, "").replace(/-low$/i, "").replace(/-lightning$/i, "");
}
/** 格式化 discovered model 的显示名，带 family/effort/free 标记。 */
function formatDiscoveredName(m) {
	const parts = [];
	if (m.name) parts.push(m.name);
	if (m.isPromo) parts.push("[Promo]");
	else if (m.isPremium) parts.push("[Premium]");
	if (m.creditMultiplier && m.creditMultiplier > 0) parts.push(`(${m.creditMultiplier}x)`);
	return parts.join(" ");
}
var DevinAdapter = class extends LlmAdapter {
	config;
	cachedClient = null;
	cachedClientKey = "";
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
		return this.cachedClient;
	}
	providerInfo(_provider) {
		return {
			id: PROVIDER$1,
			name: "Devin"
		};
	}
	async listModels(_provider) {
		return this.conn().models.map((m) => ({
			provider: PROVIDER$1,
			id: m.id,
			name: m.name ?? m.id,
			...m.description ? { description: m.description } : {},
			...m.supportsImages ? { inputModalities: ["text", "image"] } : { inputModalities: ["text"] }
		}));
	}
	async resolveModel(_provider, model, _signal) {
		const c = this.conn();
		const configured = c.models.find((m) => m.id === model);
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
	* 从 Devin 服务器拉取可用模型列表，供 settings 面板的
	* "Fetch available models" 按钮调用。
	*
	* 同 family 的多个 effort 变体合并为一个基础模型（取 family default），
	* effort 走 dsh 的 reasoning effort 滑块控制，插件内部映射到实际 model_uid。
	* 如 GLM-5.2 family → 只返回 glm-5-2，用户调 effort=high/medium/max/none
	* 时插件映射到 glm-5-2 / glm-5-2-medium(无) / glm-5-2-max / glm-5-2-none。
	*/
	async discoverModels(signal) {
		const dynamic = await this.fetchModelCatalog(signal);
		const byFamily = /* @__PURE__ */ new Map();
		for (const m of dynamic) {
			const fam = m.family ?? m.id;
			const existing = byFamily.get(fam);
			if (!existing) {
				byFamily.set(fam, m);
				continue;
			}
			if (m.isPromo && !existing.isPromo) byFamily.set(fam, m);
		}
		return [...byFamily.values()].map((m) => ({
			id: toBaseModelId(m.id),
			name: formatDiscoveredName(m),
			...m.contextWindow ? { contextWindow: m.contextWindow } : {},
			...m.maxTokens ? { maxTokens: m.maxTokens } : {}
		}));
	}
	/**
	* 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
	* 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens /
	* description / family / effort / isPremium / isPromo / creditMultiplier。
	*
	* Devin 的 model_uid 已包含 effort（如 glm-5-2 = High, glm-5-2-max = Max,
	* swe-1-7-medium = Medium），不需要单独的 reasoning effort API。
	*/
	async fetchModelCatalog(signal) {
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
		const response = await this.client().getCascadeModelConfigs(request, { signal });
		const models = [];
		const seen = /* @__PURE__ */ new Set();
		for (const config of response.clientModelConfigs) {
			if (config.disabled) continue;
			const uid = config.modelUid;
			if (!uid || seen.has(uid)) continue;
			seen.add(uid);
			const family = config.modelFamilyMetadata?.modelFamilyLabel || void 0;
			const effort = parseEffortFromLabel(config.label);
			const isPromo = config.promoStatus?.isActive === true;
			models.push({
				id: uid,
				...config.label ? { name: config.label } : {},
				...config.description ? { description: config.description } : {},
				...config.maxTokens > 0 ? {
					contextWindow: config.maxTokens,
					maxTokens: config.maxTokens
				} : {},
				supportsImages: config.supportsImages,
				...family ? { family } : {},
				...effort ? { effort } : {},
				isPremium: config.isPremium,
				...isPromo ? { isPromo: true } : {},
				...config.creditMultiplier > 0 ? { creditMultiplier: config.creditMultiplier } : {}
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
		const knownIds = new Set(c.models.map((m) => m.id));
		const effortId = options.reasoningEffort;
		const actualModelUid = resolveModelUid(options.model, effortId, knownIds);
		const result = create(GetChatMessageRequestSchema, {
			metadata,
			prompt: sanitizeSystemPrompt(withToolDescriptions(options.system ?? "", options.tools)),
			chatModelUid: actualModelUid,
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
			for (const block of message.content) if (block.type === "tool-call") prompt.toolCalls.push(create(ExaCodeiumCommonPb_ChatToolCallSchema, {
				id: block.id,
				name: block.name,
				argumentsJson: block.arguments
			}));
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
	description: "Devin-hosted GLM-5.2 reasoning model. Effort (high/medium/max/none) selectable via dsh reasoning slider.",
	contextWindow: 2e5,
	maxTokens: 2e5,
	supportsImages: false,
	family: "GLM-5.2",
	isPromo: true,
	creditMultiplier: 1.5
}, {
	id: "swe-1-7",
	name: "SWE-1.7",
	description: "Devin-hosted SWE-1.7 coding model (Kimi K2.7 Code base). Effort (high/medium/max/none) selectable via dsh reasoning slider.",
	contextWindow: 262e3,
	maxTokens: 262e3,
	supportsImages: true,
	family: "SWE-1.7",
	creditMultiplier: 9
}];
const catalogModel = z.object({
	id: z.string().required(),
	name: z.string(),
	description: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	supportsImages: z.boolean(),
	family: z.string(),
	isPremium: z.boolean(),
	isPromo: z.boolean(),
	creditMultiplier: z.number().step(.01)
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
	let discoveryHandle = null;
	const register = () => {
		const retryPolicy = resolveRetryPolicy(source().retryPolicy, `llm: provider "${PROVIDER}" retryPolicy`);
		adapter.providerRetryPolicy = () => retryPolicy;
		if (!directoryHandle) directoryHandle = ctx.llm.registerConfigurableProviders([{
			provider: PROVIDER,
			displayName: "Devin",
			settingsNs: SETTINGS_NS,
			settingsPath: []
		}]);
		if (!adapterHandle) adapterHandle = ctx.llm.registerAdapter([PROVIDER], adapter);
		if (!discoveryHandle) discoveryHandle = ctx.llm.registerModelDiscovery(SETTINGS_NS, (request) => adapter.discoverModels(request.signal));
	};
	const unregister = () => {
		if (discoveryHandle) {
			try {
				discoveryHandle();
			} catch {}
			discoveryHandle = null;
		}
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