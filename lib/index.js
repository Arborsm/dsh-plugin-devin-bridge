import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { isVolatile } from "@deepseek-ai/cosmokit";
import { LlmAdapter, LlmError, ReasoningEffortId, RetryPolicySchema, ToolCallId, attributionHeaders, offloadedImageText, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { createClient } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { randomBytes, randomUUID } from "node:crypto";
import { fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import { createConnectTransport } from "@connectrpc/connect-node";
import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
// \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
// src/proto/gen/devin_pb.ts
/**
* Describes the file devin.proto.
*/
const file_devin = /*@__PURE__*/ fileDesc("CgtkZXZpbi5wcm90bxIRZXhhLmFwaV9zZXJ2ZXJfcGIiOgoYR29vZ2xlUHJvdG9idWZfVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAUirwEKG0V4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YRIQCghpZGVfbmFtZRgBIAEoCRIZChFleHRlbnNpb25fdmVyc2lvbhgCIAEoCRIPCgdhcGlfa2V5GAMgASgJEg4KBmxvY2FsZRgEIAEoCRIKCgJvcxgFIAEoCRITCgtpZGVfdmVyc2lvbhgHIAEoCRIWCg5leHRlbnNpb25fbmFtZRgMIAEoCRIJCgFmGB8gASgJIqIBCipFeGFDb2RlaXVtQ29tbW9uUGJfQ29tcGxldGlvbkNvbmZpZ3VyYXRpb24SFwoPbnVtX2NvbXBsZXRpb25zGAEgASgEEhIKCm1heF90b2tlbnMYAiABKAQSFAoMbWF4X25ld2xpbmVzGAMgASgEEhMKC3RlbXBlcmF0dXJlGAUgASgBEg0KBXRvcF9rGAcgASgEEg0KBXRvcF9wGAggASgBIkYKHEV4YUNvZGVpdW1Db21tb25QYl9JbWFnZURhdGESEwoLYmFzZTY0X2RhdGEYASABKAkSEQoJbWltZV90eXBlGAIgASgJIlMKH0V4YUNvZGVpdW1Db21tb25QYl9DaGF0VG9vbENhbGwSCgoCaWQYASABKAkSDAoEbmFtZRgCIAEoCRIWCg5hcmd1bWVudHNfanNvbhgDIAEoCSJdChxFeGFDaGF0UGJfQ2hhdFRvb2xEZWZpbml0aW9uEgwKBG5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSGgoSanNvbl9zY2hlbWFfc3RyaW5nGAMgASgJIocDChtFeGFDaGF0UGJfQ2hhdE1lc3NhZ2VQcm9tcHQSEgoKbWVzc2FnZV9pZBgBIAEoCRJHCgZzb3VyY2UYAiABKA4yNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2USDgoGcHJvbXB0GAMgASgJEkYKCnRvb2xfY2FsbHMYBiADKAsyMi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdFRvb2xDYWxsEhQKDHRvb2xfY2FsbF9pZBgHIAEoCRIcChR0b29sX3Jlc3VsdF9pc19lcnJvchgJIAEoCBI/CgZpbWFnZXMYCiADKAsyLy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfSW1hZ2VEYXRhEhAKCHRoaW5raW5nGAsgASgJEhEKCXNpZ25hdHVyZRgMIAEoCRIZChF0aGlua2luZ19yZWRhY3RlZBgNIAEoCCLOAQolRXhhQ29ydGV4UGJfQ29ydGV4VHJhamVjdG9yeVJlZmVyZW5jZRIVCg10cmFqZWN0b3J5X2lkGAEgASgJEkwKD3RyYWplY3RvcnlfdHlwZRgDIAEoDjIzLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkAKCXN0ZXBfdHlwZRgEIAEoDjItLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlIpsBCiJFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxVc2FnZVN0YXRzEhQKDGlucHV0X3Rva2VucxgCIAEoBBIVCg1vdXRwdXRfdG9rZW5zGAMgASgEEhoKEmNhY2hlX3dyaXRlX3Rva2VucxgEIAEoBBIZChFjYWNoZV9yZWFkX3Rva2VucxgFIAEoBBIRCgltb2RlbF91aWQYCSABKAkigQEKHkV4YUNvZGVpdW1Db21tb25QYl9Qcm9tb1N0YXR1cxIRCglpc19hY3RpdmUYASABKAgSPQoIZW5kX2RhdGUYAiABKAsyKy5leGEuYXBpX3NlcnZlcl9wYi5Hb29nbGVQcm90b2J1Zl9UaW1lc3RhbXASDQoFbGFiZWwYAyABKAkiSgorRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsRmFtaWx5TWV0YWRhdGFWYWx1ZRINCgVvcmRlchgBIAEoAxIMCgRuYW1lGAIgASgJIokBCitFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxGYW1pbHlNZXRhZGF0YUVudHJ5EgsKA2tleRgBIAEoCRJNCgV2YWx1ZRgCIAEoCzI+LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbEZhbWlseU1ldGFkYXRhVmFsdWUiuQEKJkV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbEZhbWlseU1ldGFkYXRhEhoKEm1vZGVsX2ZhbWlseV9sYWJlbBgBIAEoCRJPCgdlbnRyaWVzGAIgAygLMj4uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsRmFtaWx5TWV0YWRhdGFFbnRyeRIiChppc19kZWZhdWx0X21vZGVsX2luX2ZhbWlseRgDIAEoCCI0Ch9FeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxPckFsaWFzEhEKCW1vZGVsX3VpZBgDIAEoCSL7BAokRXhhQ29kZWl1bUNvbW1vblBiX0NsaWVudE1vZGVsQ29uZmlnEg0KBWxhYmVsGAEgASgJEkoKDm1vZGVsX29yX2FsaWFzGAIgASgLMjIuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsT3JBbGlhcxIQCghkaXNhYmxlZBgEIAEoCBIXCg9zdXBwb3J0c19pbWFnZXMYBSABKAgSEgoKaXNfcHJlbWl1bRgHIAEoCBIPCgdpc19iZXRhGAkgASgIEkUKCHByb3ZpZGVyGAogASgOMjMuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXISFgoOaXNfcmVjb21tZW5kZWQYCyABKAgSDgoGaXNfbmV3GA8gASgIEhsKE2lzX2NhcGFjaXR5X2xpbWl0ZWQYFCABKAgSEgoKbWF4X3Rva2VucxgSIAEoBRIRCgltb2RlbF91aWQYFiABKAkSEwoLZGVzY3JpcHRpb24YGyABKAkSGQoRY3JlZGl0X211bHRpcGxpZXIYAyABKAISRwoMcHJvbW9fc3RhdHVzGBMgASgLMjEuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX1Byb21vU3RhdHVzElgKFW1vZGVsX2ZhbWlseV9tZXRhZGF0YRgeIAEoCzI5LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbEZhbWlseU1ldGFkYXRhEiIKGmlzX2RlZmF1bHRfbW9kZWxfaW5fZmFtaWx5GB8gASgIIv8EChVHZXRDaGF0TWVzc2FnZVJlcXVlc3QSQAoIbWV0YWRhdGEYASABKAsyLi5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfTWV0YWRhdGESDgoGcHJvbXB0GAIgASgJEkwKFGNoYXRfbWVzc2FnZV9wcm9tcHRzGAMgAygLMi4uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ2hhdFBiX0NoYXRNZXNzYWdlUHJvbXB0Ej8KDHJlcXVlc3RfdHlwZRgHIAEoDjIpLmV4YS5hcGlfc2VydmVyX3BiLkNoYXRNZXNzYWdlUmVxdWVzdFR5cGUSVAoNY29uZmlndXJhdGlvbhgIIAEoCzI9LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Db21wbGV0aW9uQ29uZmlndXJhdGlvbhI+CgV0b29scxgKIAMoCzIvLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNoYXRQYl9DaGF0VG9vbERlZmluaXRpb24SVgoUdHJhamVjdG9yeV9yZWZlcmVuY2UYDyABKAsyOC5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb3J0ZXhQYl9Db3J0ZXhUcmFqZWN0b3J5UmVmZXJlbmNlEhIKCmNhc2NhZGVfaWQYECABKAkSVQoMcGxhbm5lcl9tb2RlGBQgASgOMj8uZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX0NvbnZlcnNhdGlvbmFsUGxhbm5lck1vZGUSFgoOY2hhdF9tb2RlbF91aWQYFSABKAkSFAoMZXhlY3V0aW9uX2lkGBYgASgJItUDChZHZXRDaGF0TWVzc2FnZVJlc3BvbnNlEhIKCm1lc3NhZ2VfaWQYASABKAkSPgoJdGltZXN0YW1wGAIgASgLMisuZXhhLmFwaV9zZXJ2ZXJfcGIuR29vZ2xlUHJvdG9idWZfVGltZXN0YW1wEhIKCmRlbHRhX3RleHQYAyABKAkSRQoLc3RvcF9yZWFzb24YBSABKA4yMC5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbhJMChBkZWx0YV90b29sX2NhbGxzGAYgAygLMjIuZXhhLmFwaV9zZXJ2ZXJfcGIuRXhhQ29kZWl1bUNvbW1vblBiX0NoYXRUb29sQ2FsbBJECgV1c2FnZRgHIAEoCzI1LmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFVzYWdlU3RhdHMSFgoOZGVsdGFfdGhpbmtpbmcYCSABKAkSFwoPZGVsdGFfc2lnbmF0dXJlGAogASgJEhkKEXRoaW5raW5nX3JlZGFjdGVkGAsgASgIEhIKCnJlcXVlc3RfaWQYESABKAkSGAoQYWN0dWFsX21vZGVsX3VpZBgXIAEoCSJhCh1HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVxdWVzdBJACghtZXRhZGF0YRgBIAEoCzIuLmV4YS5hcGlfc2VydmVyX3BiLkV4YUNvZGVpdW1Db21tb25QYl9NZXRhZGF0YSJ3Ch5HZXRDYXNjYWRlTW9kZWxDb25maWdzUmVzcG9uc2USVQoUY2xpZW50X21vZGVsX2NvbmZpZ3MYASADKAsyNy5leGEuYXBpX3NlcnZlcl9wYi5FeGFDb2RlaXVtQ29tbW9uUGJfQ2xpZW50TW9kZWxDb25maWcqagoWQ2hhdE1lc3NhZ2VSZXF1ZXN0VHlwZRIpCiVDSEFUX01FU1NBR0VfUkVRVUVTVF9UWVBFX1VOU1BFQ0lGSUVEEAASJQohQ0hBVF9NRVNTQUdFX1JFUVVFU1RfVFlQRV9DQVNDQURFEAUquwIKJEV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZRJICkRFeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9VTlNQRUNJRklFRBAAEkEKPUV4YUNvZGVpdW1Db21tb25QYl9DaGF0TWVzc2FnZVNvdXJjZV9DSEFUX01FU1NBR0VfU09VUkNFX1VTRVIQARJDCj9FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9TWVNURU0QAhJBCj1FeGFDb2RlaXVtQ29tbW9uUGJfQ2hhdE1lc3NhZ2VTb3VyY2VfQ0hBVF9NRVNTQUdFX1NPVVJDRV9UT09MEAQq3gEKLEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlElgKVEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9VTlNQRUNJRklFRBAAElQKUEV4YUNvZGVpdW1Db21tb25QYl9Db252ZXJzYXRpb25hbFBsYW5uZXJNb2RlX0NPTlZFUlNBVElPTkFMX1BMQU5ORVJfTU9ERV9ERUZBVUxUEAEqsAEKIEV4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlEkcKQ0V4YUNvcnRleFBiX0NvcnRleFRyYWplY3RvcnlUeXBlX0NPUlRFWF9UUkFKRUNUT1JZX1RZUEVfVU5TUEVDSUZJRUQQABJDCj9FeGFDb3J0ZXhQYl9Db3J0ZXhUcmFqZWN0b3J5VHlwZV9DT1JURVhfVFJBSkVDVE9SWV9UWVBFX0NBU0NBREUQBCqVAQoaRXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGUSOwo3RXhhQ29ydGV4UGJfQ29ydGV4U3RlcFR5cGVfQ09SVEVYX1NURVBfVFlQRV9VTlNQRUNJRklFRBAAEjoKNkV4YUNvcnRleFBiX0NvcnRleFN0ZXBUeXBlX0NPUlRFWF9TVEVQX1RZUEVfVVNFUl9JTlBVVBAOKvcCCh1FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbhI5CjVFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9VTlNQRUNJRklFRBAAEjgKNEV4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0lOQ09NUExFVEUQARI4CjRFeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9NQVhfVE9LRU5TEAMSNQoxRXhhQ29kZWl1bUNvbW1vblBiX1N0b3BSZWFzb25fU1RPUF9SRUFTT05fUEFSVElBTBAJEjsKN0V4YUNvZGVpdW1Db21tb25QYl9TdG9wUmVhc29uX1NUT1BfUkVBU09OX0ZVTkNUSU9OX0NBTEwQChIzCi9FeGFDb2RlaXVtQ29tbW9uUGJfU3RvcFJlYXNvbl9TVE9QX1JFQVNPTl9FUlJPUhANKpwCCiBFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlchI/CjtFeGFDb2RlaXVtQ29tbW9uUGJfTW9kZWxQcm92aWRlcl9NT0RFTF9QUk9WSURFUl9VTlNQRUNJRklFRBAAEjwKOEV4YUNvZGVpdW1Db21tb25QYl9Nb2RlbFByb3ZpZGVyX01PREVMX1BST1ZJREVSX1dJTkRTVVJGEAESOgo2RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfT1BFTkFJEAISPQo5RXhhQ29kZWl1bUNvbW1vblBiX01vZGVsUHJvdmlkZXJfTU9ERUxfUFJPVklERVJfQU5USFJPUElDEAMy+gEKEEFwaVNlcnZlclNlcnZpY2USZwoOR2V0Q2hhdE1lc3NhZ2USKC5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlcXVlc3QaKS5leGEuYXBpX3NlcnZlcl9wYi5HZXRDaGF0TWVzc2FnZVJlc3BvbnNlMAESfQoWR2V0Q2FzY2FkZU1vZGVsQ29uZmlncxIwLmV4YS5hcGlfc2VydmVyX3BiLkdldENhc2NhZGVNb2RlbENvbmZpZ3NSZXF1ZXN0GjEuZXhhLmFwaV9zZXJ2ZXJfcGIuR2V0Q2FzY2FkZU1vZGVsQ29uZmlnc1Jlc3BvbnNl");
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
const GetChatMessageRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 15);
/**
* Describes the message exa.api_server_pb.GetCascadeModelConfigsRequest.
* Use `create(GetCascadeModelConfigsRequestSchema)` to create a new message.
*/
const GetCascadeModelConfigsRequestSchema = /*@__PURE__*/ messageDesc(file_devin, 17);
/**
* @generated from service exa.api_server_pb.ApiServerService
*/
const ApiServerService = /*@__PURE__*/ serviceDesc(file_devin, 0);
// src/adapter/transport.ts
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
		for (const [name, value] of Object.entries(attributionHeaders())) req.header.set(name, value);
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
// src/adapter/decoder.ts
var DevinStreamDecoder = class {
	nextIndex = 0;
	textIndex = -1;
	textStarted = false;
	textBuilder = "";
	reasoningIndex = -1;
	reasoningStarted = false;
	reasoningBuilder = "";
	signatureBuilder = "";
	reasoningRedacted = false;
	tools = [];
	blockMeta = [];
	messageId = "";
	requestId = "";
	actualModelUid = "";
	hasContent = false;
	currentUsage = null;
	hasStopReason = false;
	stopReason = 0;
	finished = false;
	decode(response) {
		const chunks = [];
		if (!response || this.finished) return chunks;
		if (response.messageId) this.messageId = response.messageId;
		if (response.requestId) this.requestId = response.requestId;
		if (response.actualModelUid) this.actualModelUid = response.actualModelUid;
		const usage = response.usage;
		if (usage) {
			const u = {
				inputTokens: Number(usage.inputTokens),
				outputTokens: Number(usage.outputTokens)
			};
			if (usage.cacheReadTokens) u.cacheReadTokens = Number(usage.cacheReadTokens);
			if (usage.cacheWriteTokens) u.cacheWriteTokens = Number(usage.cacheWriteTokens);
			u.totalTokens = u.inputTokens + u.outputTokens + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0);
			this.currentUsage = u;
		}
		if (response.deltaThinking || response.deltaSignature || response.thinkingRedacted) {
			chunks.push(...this.endText());
			if (!this.reasoningStarted) {
				this.reasoningIndex = this.nextIndex++;
				this.reasoningStarted = true;
				this.reasoningBuilder = "";
				this.signatureBuilder = "";
				this.reasoningRedacted = false;
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
			if (response.deltaSignature) this.signatureBuilder += response.deltaSignature;
			if (response.thinkingRedacted) this.reasoningRedacted = true;
			this.hasContent = true;
		}
		if (response.deltaText) {
			chunks.push(...this.endReasoning());
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
			this.hasContent = true;
		}
		for (const delta of response.deltaToolCalls) {
			chunks.push(...this.endReasoning());
			chunks.push(...this.endText());
			let state = this.findTool(delta.id);
			if (!state) {
				state = {
					callId: ToolCallId(delta.id || `call_${this.tools.length}`),
					name: delta.name || "",
					arguments: "",
					blockIndex: this.nextIndex++,
					started: false,
					ended: false
				};
				this.tools.push(state);
			}
			if (delta.id) state.callId = ToolCallId(delta.id);
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
			this.hasContent = true;
		}
		if (response.stopReason !== 0) {
			this.hasStopReason = true;
			this.stopReason = response.stopReason;
		}
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
						code: connectErrorCode(upstreamError.message || String(upstreamError))
					}
				}
			});
			return chunks;
		}
		if (!this.hasStopReason && !this.hasContent) {
			chunks.push({
				type: "finish",
				reason: {
					kind: "error",
					failure: {
						message: "Devin stream ended without generated content",
						code: "EMPTY_RESPONSE"
					}
				}
			});
			return chunks;
		}
		chunks.push(...this.endReasoning());
		chunks.push(...this.endText());
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
			reason: mapFinishReason(this.stopReason, this.hasStopReason),
			replayState: this.replayEnvelope()
		});
		return chunks;
	}
	endText() {
		if (!this.textStarted) return [];
		this.textStarted = false;
		this.blockMeta[this.textIndex] = { type: "text" };
		return [{
			type: "block-end",
			index: this.textIndex,
			block: {
				type: "text",
				text: this.textBuilder
			}
		}];
	}
	endReasoning() {
		if (!this.reasoningStarted) return [];
		this.reasoningStarted = false;
		this.blockMeta[this.reasoningIndex] = {
			type: "reasoning",
			...this.signatureBuilder ? { signature: this.signatureBuilder } : {},
			...this.reasoningRedacted ? { redacted: true } : {}
		};
		return [{
			type: "block-end",
			index: this.reasoningIndex,
			block: {
				type: "reasoning",
				text: this.reasoningBuilder
			}
		}];
	}
	/** finish 时把 response 级与 block 级 replay 元数据打信封给 assembler。 */
	replayEnvelope() {
		const response = {};
		if (this.requestId) response.requestId = this.requestId;
		if (this.messageId) response.messageId = this.messageId;
		if (this.actualModelUid) response.actualModelUid = this.actualModelUid;
		const hasMeta = this.blockMeta.some((m) => m !== void 0);
		if (Object.keys(response).length === 0 && !hasMeta) return void 0;
		return {
			response,
			...hasMeta ? { blocks: this.blockMeta } : {}
		};
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
function mapFinishReason(reason, hasStopReason) {
	if (reason === 13) return {
		kind: "error",
		failure: {
			message: "Devin stopped with an error",
			code: "SERVER"
		}
	};
	if (!hasStopReason) return { kind: "stop" };
	switch (reason) {
		case 3:
		case 1:
		case 9: return { kind: "max-tokens" };
		case 10: return { kind: "tool-calls" };
		default: return { kind: "stop" };
	}
}
function connectErrorCode(message) {
	const bracket = message.match(/^\[([a-z_]+)\]/);
	const colonIdx = message.indexOf(":");
	return {
		invalid_argument: "INVALID_REQUEST",
		failed_precondition: "INVALID_REQUEST",
		out_of_range: "INVALID_REQUEST",
		unimplemented: "INVALID_REQUEST",
		unauthenticated: "AUTH",
		permission_denied: "AUTH",
		not_found: "UNKNOWN_MODEL",
		resource_exhausted: "RATE_LIMIT",
		deadline_exceeded: "TIMEOUT",
		unavailable: "SERVER",
		internal: "SERVER",
		unknown: "SERVER"
	}[(bracket?.[1] ?? (colonIdx > 0 ? message.slice(0, colonIdx).trim() : "")).toLowerCase()] ?? "TRANSPORT";
}
function wrapConnectError(err) {
	if (err instanceof LlmError) return err;
	const message = err instanceof Error ? err.message : String(err);
	return new LlmError(`Devin API: ${message}`, connectErrorCode(message), { cause: err });
}
// src/adapter/devin.ts
const CLIENT_NAME = "chisel";
const CLIENT_VERSION = "3000.2.17";
/** dsh effort id → Devin model_uid 候选后缀（目录不可用时的回退，按序尝试）。 */
const EFFORT_SUFFIX = {
	high: ["", "-high"],
	medium: ["-medium"],
	max: ["-max"],
	none: ["-none"]
};
/** dsh reasoning effort 列表（目录不可用时展示的全部滑块档位）。 */
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
/** 规范化 catalog effort 名到 dsh effort id（"No Thinking" → "none"）。 */
function normalizeEffortName(name) {
	const lower = name.trim().toLowerCase();
	return lower === "no thinking" ? "none" : lower;
}
/** 从目录构建 family → effort id → model_uid 的档位表（跳过 fast mode 变体）。 */
function familyTiers(models) {
	const tiers = /* @__PURE__ */ new Map();
	for (const m of models) {
		if (!m.family || !m.effort || m.fastMode) continue;
		const effort = normalizeEffortName(m.effort);
		let tier = tiers.get(m.family);
		if (!tier) {
			tier = /* @__PURE__ */ new Map();
			tiers.set(m.family, tier);
		}
		if (!tier.has(effort)) tier.set(effort, m.id);
	}
	return tiers;
}
/**
* 把 base model id + reasoningEffort 映射到 Devin 实际 model_uid。
* 如 glm-5-2 + max → glm-5-2-max，swe-1-7 + medium → swe-1-7-medium。
* 优先走目录档位表；失败回退内置后缀映射；都不命中用 base id。
*/
function resolveModelUid(baseId, effort, models) {
	const base = models.find((m) => m.id === baseId || toBaseModelId(m.id) === baseId);
	if (effort) {
		if (base?.family) {
			const tierUid = familyTiers(models).get(base.family)?.get(normalizeEffortName(effort));
			if (tierUid) return tierUid;
		}
		for (const suffix of EFFORT_SUFFIX[normalizeEffortName(effort)] ?? []) {
			const mapped = suffix ? `${baseId}${suffix}` : baseId;
			if (models.some((m) => m.id === mapped)) return mapped;
		}
	}
	if (models.some((m) => m.id === baseId)) return baseId;
	if (base?.family) {
		const def = models.find((m) => m.family === base.family && m.isDefaultInFamily && !m.fastMode);
		if (def) return def.id;
	}
	return baseId;
}
/** 从 label 解析 effort 标签（如 "GLM-5.2 High" → "High"），目录缺 family metadata 时回退。 */
function parseEffortFromLabel(label) {
	return label.match(/\b(Max|High|Medium|Low|No Thinking|Lightning)\b/i)?.[0];
}
/**
* 把 model_uid 去掉 effort 后缀，得到 base model id。
* 如 glm-5-2-max → glm-5-2, swe-1-7-medium → swe-1-7, glm-5-2-none-1m → glm-5-2。
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
	/** 当前连接配置（每次调用读取最新快照）。 */
	conn() {
		return this.config.options();
	}
	/** 获取或重建 Connect client（baseUrl/token/proxy 变更时自动重建）。 */
	client(c) {
		if (!c.token) {
			const hint = process.platform === "win32" ? "%APPDATA%\\devin\\credentials.toml" : "~/.local/share/devin/credentials.toml";
			throw new LlmError(`devin-bridge: no Devin session token found. Either:
  1. Set token in the settings panel to a "devin-session-token\$..." value, or
  2. Run "devin auth login" to create ${hint}, or\n  3. Set DEVIN_CREDENTIALS_PATH to a custom credentials.toml path`, "AUTH");
		}
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
	providerInfo(provider) {
		return {
			id: provider,
			name: "Devin"
		};
	}
	providerRetryPolicy(provider) {
		return resolveRetryPolicy(this.conn().retryPolicy, `llm: provider "${provider}" retryPolicy`);
	}
	async listModels(provider) {
		return this.conn().models.map((m) => ({
			provider,
			id: m.id,
			name: m.name ?? m.id,
			...m.description ? { description: m.description } : {},
			inputModalities: m.supportsImages ? ["text", "image"] : ["text"]
		}));
	}
	async resolveModel(provider, model, _signal) {
		return this.modelInfo(this.conn(), provider, model);
	}
	/** 一次 adapter 生成（连接配置快照）下的 model metadata。 */
	modelInfo(c, provider, model) {
		const configured = c.models.find((m) => m.id === model);
		const contextWindow = configured?.contextWindow ?? c.defaultContextWindow;
		const tiers = configured?.family ? familyTiers(c.models).get(configured.family) : void 0;
		const efforts = tiers && tiers.size > 0 ? REASONING_EFFORTS.filter((e) => tiers.has(e.id)) : REASONING_EFFORTS;
		return {
			provider,
			id: model,
			name: configured?.name ?? model,
			...configured?.description ? { description: configured.description } : {},
			inputModalities: configured?.supportsImages ? ["text", "image"] : ["text"],
			context: { contextWindow },
			defaultMaxTokens: configured?.maxTokens ?? c.defaultMaxTokens,
			reasoning: {
				efforts,
				defaultEffort: ReasoningEffortId("high")
			}
		};
	}
	/**
	* 绑定 model metadata 与 dispatch 到同一配置快照：
	* settings 在 prepare 与 stream 之间变更不会把两代配置混进一次调用。
	*/
	async prepareCall(provider, model, _signal) {
		const c = this.conn();
		return {
			model: this.modelInfo(c, provider, model),
			stream: (options) => this.streamWithConn(options, c)
		};
	}
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
	async discoverModels(draft, signal) {
		const c = this.conn();
		const conn = draft && (draft.baseURL || draft.apiKey) ? {
			...c,
			baseUrl: draft.baseURL ?? c.baseUrl,
			token: draft.apiKey ?? c.token
		} : c;
		const dynamic = await this.fetchModelCatalog(conn, signal);
		const byFamily = /* @__PURE__ */ new Map();
		for (const m of dynamic) {
			const fam = m.family ?? m.id;
			const existing = byFamily.get(fam);
			if (!existing) {
				byFamily.set(fam, m);
				continue;
			}
			if (m.isDefaultInFamily && !existing.isDefaultInFamily || m.isPromo && !existing.isPromo && !existing.isDefaultInFamily) byFamily.set(fam, m);
		}
		return [...byFamily.values()].map((m) => ({
			id: toBaseModelId(m.id),
			name: formatDiscoveredName(m),
			...m.contextWindow ? { contextWindow: m.contextWindow } : {},
			...m.maxTokens ? { maxTokens: m.maxTokens } : {},
			inputModalities: m.supportsImages ? ["text", "image"] : ["text"]
		}));
	}
	/**
	* 调用 GetCascadeModelConfigs RPC 从 Devin 服务器拉取可用模型目录。
	* 过滤掉 disabled 的模型，提取 uid / label / supports_images / max_tokens /
	* description / family / effort / fastMode / defaultInFamily / isPremium /
	* isPromo / creditMultiplier。
	*/
	async fetchModelCatalog(c, signal) {
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
		const response = await this.client(c).getCascadeModelConfigs(request, { signal });
		const models = [];
		const seen = /* @__PURE__ */ new Set();
		for (const config of response.clientModelConfigs) {
			if (config.disabled) continue;
			const uid = config.modelUid || config.modelOrAlias?.modelUid || "";
			if (!uid || seen.has(uid)) continue;
			seen.add(uid);
			const familyMeta = config.modelFamilyMetadata;
			const family = familyMeta?.modelFamilyLabel || void 0;
			let effort;
			let fastMode = false;
			for (const entry of familyMeta?.entries ?? []) {
				const key = entry.key.toLowerCase();
				if (key === "reasoning effort" || key === "effort" || key === "thinking") effort = entry.value?.name?.toLowerCase();
				else if (key === "fast mode") fastMode = (entry.value?.order ?? 0n) > 0n;
			}
			effort ??= parseEffortFromLabel(config.label)?.toLowerCase();
			const isDefaultInFamily = config.isDefaultModelInFamily || familyMeta?.isDefaultModelInFamily === true;
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
				...fastMode ? { fastMode: true } : {},
				...isDefaultInFamily ? { isDefaultInFamily: true } : {},
				isPremium: config.isPremium,
				...isPromo ? { isPromo: true } : {},
				...config.creditMultiplier > 0 ? { creditMultiplier: config.creditMultiplier } : {}
			});
		}
		return models;
	}
	async *stream(options) {
		yield* this.streamWithConn(options, this.conn());
	}
	async *streamWithConn(options, c) {
		let protoRequest;
		try {
			protoRequest = await this.buildRequest(options, c);
		} catch (err) {
			if (err instanceof LlmError) throw err;
			throw new LlmError(`Devin request build failed: ${err instanceof Error ? err.message : String(err)}`, "INVALID_REQUEST", { cause: err });
		}
		let serverStream;
		try {
			serverStream = await this.client(c).getChatMessage(protoRequest, { signal: options.signal });
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
	async buildRequest(options, c) {
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
			os: "mac",
			f: fingerprint
		});
		const actualModelUid = resolveModelUid(options.model, options.reasoningEffort, c.models);
		const parts = [];
		if (options.system) parts.push(options.system);
		let startIndex = 0;
		while (startIndex < options.messages.length && options.messages[startIndex].role === "system") {
			const text = flattenText(options.messages[startIndex].content);
			if (text) parts.push(text);
			startIndex++;
		}
		const systemPrompt = parts.join("\n\n");
		const messages = options.messages.slice(startIndex);
		const result = create(GetChatMessageRequestSchema, {
			metadata,
			prompt: sanitizeSystemPrompt(withToolDescriptions(systemPrompt, options.tools)),
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
		for (let i = 0; i < messages.length; i++) if (messages[i].role === "assistant") lastAssistantIndex = i;
		for (let i = 0; i < messages.length; i++) {
			const converted = await this.convertMessage(messages[i], i > lastAssistantIndex, c, options.signal);
			result.chatMessagePrompts.push(...converted);
		}
		if (options.tools) for (const tool of options.tools) result.tools.push(convertToolDefinition(tool));
		return result;
	}
	async convertMessage(message, attachImages, c, signal) {
		switch (message.role) {
			case "system": {
				const content = flattenText(message.content);
				const prompt = await this.promptForContent(1, [], attachImages, c, signal);
				prompt.prompt = `<system-reminder>\n${content.replaceAll("</system-reminder>", "<\\/system-reminder>")}\n</system-reminder>`;
				return [prompt];
			}
			case "developer": return [await this.promptForContent(1, message.content.filter((b) => b.type === "text"), attachImages, c, signal)];
			case "tool": {
				const prompt = await this.promptForContent(4, message.content, attachImages, c, signal);
				prompt.toolCallId = message.toolCallId;
				prompt.toolResultIsError = message.isError === true;
				return [prompt];
			}
			case "assistant": {
				const prompt = await this.promptForContent(2, message.content, false, c, signal);
				const replay = message.source.replayState;
				for (const block of message.content) if (block.type === "tool-call") prompt.toolCalls.push(create(ExaCodeiumCommonPb_ChatToolCallSchema, {
					id: block.id,
					name: block.name,
					argumentsJson: block.arguments
				}));
				if (replay?.blocks) for (let i = 0; i < message.content.length; i++) {
					if (message.content[i].type !== "reasoning") continue;
					const meta = replay.blocks[i];
					if (meta?.signature) prompt.signature = meta.signature;
					if (meta?.redacted) prompt.thinkingRedacted = true;
				}
				return [prompt];
			}
			default: return [await this.promptForContent(1, message.content, attachImages, c, signal)];
		}
	}
	async promptForContent(source, content, attachImages, c, signal) {
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
				prompt.thinking += block.text;
				break;
			case "image":
				if (block.offloaded) {
					if (text.length > 0) text += "\n";
					text += offloadedImageText(block.attachment);
					break;
				}
				if (!attachImages) {
					if (text.length > 0) text += "\n";
					text += "[Image omitted from history]";
					break;
				}
				if (!c.readImage) throw new LlmError("Devin adapter received an image but no attachment store is available", "UNSUPPORTED_CONTENT");
				try {
					const stored = await c.readImage(block.attachment, signal);
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
			case "file":
				if (text.length > 0) text += "\n";
				text += `[File: ${block.attachment.name ?? "attachment"}]`;
		}
		prompt.prompt = text;
		return prompt;
	}
};
function convertToolDefinition(tool) {
	const schema = stripSchemaAnnotations(tool.parameters);
	return create(ExaChatPb_ChatToolDefinitionSchema, {
		name: tool.name,
		description: tool.name,
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
function flattenText(content) {
	let text = "";
	for (const block of content) if (block.type === "text") text += block.text;
	return text;
}
function randomHex(size) {
	return randomBytes(size).toString("hex");
}
// src/adapter/credentials.ts
const DEFAULT_API_SERVER_URL = "https://server.codeium.com";
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
// src/index.ts
const name = "dsh-plugin-devin-bridge";
const inject = ["llm"];
const PROVIDER = "devin";
const DEFAULT_MODELS = [{
	id: "swe-2",
	name: "SWE-2",
	description: "Devin-hosted SWE-2 coding model. Effort (high/medium/max) selectable via dsh reasoning slider.",
	contextWindow: 262e3,
	maxTokens: 262e3,
	supportsImages: true,
	family: "SWE-2",
	creditMultiplier: 9
}, {
	id: "swe-2-flash",
	name: "SWE-2 Flash",
	description: "Devin-hosted SWE-2 Flash fast coding model. Effort (medium/high/max) selectable via dsh reasoning slider.",
	contextWindow: 262144,
	maxTokens: 262144,
	supportsImages: false,
	family: "SWE-2 Flash",
	isPromo: true,
	creditMultiplier: 4
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
	token: z.string().role("secret").default("").volatile(),
	baseUrl: z.string().default(DEFAULT_API_SERVER_URL).volatile(),
	proxy: z.string().default("").volatile(),
	forceHttp1: z.boolean().default(true).volatile(),
	defaultContextWindow: z.number().step(1).min(1).default(128e3).volatile(),
	defaultMaxTokens: z.number().step(1).min(1).default(16384).volatile(),
	models: z.array(catalogModel).default(DEFAULT_MODELS).volatile(),
	retryPolicy: RetryPolicySchema.volatile()
});
/** 取 volatile 字段的当前快照；裸值（测试/直接构造）原样返回。 */
function readVolatile(value) {
	return isVolatile(value) ? value.get() : value;
}
function apply(ctx, config) {
	ctx.inject(["settings"], (child) => {
		child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
	});
	const settingsNs = ctx.fiber.entry?.options.id ?? "devin-bridge";
	const source = () => ({
		token: readVolatile(config.token) ?? "",
		baseUrl: readVolatile(config.baseUrl) ?? "https://server.codeium.com",
		proxy: readVolatile(config.proxy) ?? "",
		forceHttp1: readVolatile(config.forceHttp1) ?? true,
		defaultContextWindow: readVolatile(config.defaultContextWindow) ?? 128e3,
		defaultMaxTokens: readVolatile(config.defaultMaxTokens) ?? 16384,
		models: [...readVolatile(config.models) ?? DEFAULT_MODELS],
		retryPolicy: readVolatile(config.retryPolicy)
	});
	const attachments = ctx.get("attachments");
	const readImage = attachments ? (ref, signal) => attachments.readImage(ref, signal) : void 0;
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
		const baseUrl = c.baseUrl === "https://server.codeium.com" && session ? session.apiServerUrl : c.baseUrl;
		const conn = {
			token: session?.apiKey ?? "",
			baseUrl
		};
		if (conn.token) {
			cachedConn = conn;
			cachedConnKey = key;
		}
		return conn;
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
			retryPolicy: c.retryPolicy,
			...readImage ? { readImage } : {}
		};
	} });
	ctx.llm.registerConfigurableProviders([{
		provider: PROVIDER,
		displayName: "Devin",
		settingsNs,
		settingsPath: [],
		defaultBaseURL: DEFAULT_API_SERVER_URL
	}]);
	const registration = ctx.llm.registerAdapter([PROVIDER], adapter);
	ctx.on("loader/volatile-update", () => {
		try {
			registration.replace([PROVIDER]);
		} catch (error) {
			ctx.logger.error("devin-bridge: provider route refresh failed");
			ctx.logger.error(error);
		}
	});
	ctx.llm.registerModelDiscovery(settingsNs, (request, signal) => adapter.discoverModels(request.baseURL || request.apiKey ? {
		baseURL: request.baseURL,
		apiKey: request.apiKey
	} : void 0, signal));
}
export { Config, DevinAdapter, apply, devinCredentialsPath, inject, name, readDevinSession };

//# sourceMappingURL=index.js.map