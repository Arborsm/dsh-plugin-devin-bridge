import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { isVolatile } from "@deepseek-ai/cosmokit";
import { LlmAdapter, LlmError, ReasoningEffortId, RetryPolicySchema, ToolCallId, attributionHeaders, offloadedImageText, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { createClient } from "@connectrpc/connect";
import { create, toBinary } from "@bufbuild/protobuf";
import { randomBytes, randomUUID } from "node:crypto";
import { fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import { createConnectTransport } from "@connectrpc/connect-node";
import { request } from "node:https";
import { request as request$1 } from "node:http";
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
* Describes the message exa.api_server_pb.ExaCodeiumCommonPb_ImageData.
* Use `create(ExaCodeiumCommonPb_ImageDataSchema)` to create a new message.
*/
const ExaCodeiumCommonPb_ImageDataSchema = /*@__PURE__*/ messageDesc(file_devin, 3);
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
		const replay = this.replayEnvelope();
		chunks.push({
			type: "finish",
			reason: mapFinishReason(this.stopReason, this.hasStopReason),
			...replay !== void 0 ? { replayState: replay } : {}
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
			...hasMeta ? { blocks: Array.from(this.blockMeta, (m) => m ?? null) } : {}
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
		permission_denied: "MODEL_UNSUPPORTED",
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
// src/adapter/rate-limit.ts
/** 免费模型限流的原始报错文案：原样保留，方便用户与上游提示对照。 */
const RATE_LIMIT_MESSAGE = "Reached free model rate limit. Upgrade to Max for higher limits, or switch to a different model.";
/** 解析失败时的兜底等待：上游通常按小时级窗口限流。 */
const DEFAULT_RESET_MS = 36e5;
const UNIT_MS = {
	hour: 36e5,
	hr: 36e5,
	h: 36e5,
	minute: 6e4,
	min: 6e4,
	m: 6e4,
	second: 1e3,
	sec: 1e3,
	s: 1e3
};
const CODE_BRACKET = /\[([a-z][a-z0-9_]*)\]/i;
/** 「reset in 1 hour 48 minutes」之后的时长片段。 */
const DURATION_TAIL = /reset(?:s|ting)?\s+in\s+([^().;]+)/i;
const DURATION_TOKEN = /(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|h|m|s)\b/gi;
/** 「(at 21:01 UTC)」。 */
const ABSOLUTE_CLOCK_UTC = /\(?\bat\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*UTC\b/i;
/** ISO 形式「2026-11-14T21:01:00Z」。 */
const ABSOLUTE_ISO_UTC = /\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?Z\b/;
/** 适配器前缀（wrapConnectError 加的），通知前剥掉以还原上游原文。 */
const ADAPTER_PREFIX = "Devin API: ";
/**
* 还原上游原始报错：只去掉适配器自己加的 "Devin API: " 前缀，
* 正文一字不改，方便用户按原文搜索 / 对照上游提示。
*/
function originalMessage(message) {
	return message.startsWith(ADAPTER_PREFIX) ? message.slice(11) : message;
}
/** 从报错文本里取上游错误码；没有括号码时回退 resource_exhausted。 */
function extractErrorCode(message) {
	return message.match(CODE_BRACKET)?.[1] ?? "resource_exhausted";
}
/** 解析「1 hour 48 minutes」这类相对时长；没有则返回 undefined。 */
function parseRelativeMs(message) {
	const scope = message.match(DURATION_TAIL)?.[1] ?? message;
	let total = 0;
	let matched = false;
	DURATION_TOKEN.lastIndex = 0;
	for (let m = DURATION_TOKEN.exec(scope); m !== null; m = DURATION_TOKEN.exec(scope)) {
		const amount = Number(m[1]);
		const name = m[2].toLowerCase().replace(/s$/, "");
		const unit = UNIT_MS[name];
		if (!Number.isFinite(amount) || unit === void 0) continue;
		total += amount * unit;
		matched = true;
	}
	return matched ? total : void 0;
}
/**
* 解析绝对 UTC 钟点。同一天有今/明/昨三个候选：
*   - 给了相对时长时取离 now + 相对时长最近的一个（两者互为校验）；
*   - 只有钟点时取不早于 now 的最近一个（已过点即次日）。
* @param message - 上游报错全文。
* @param nowMs - 解析基准时刻。
* @param target - 有相对时长时传入 now + 相对时长；否则传 undefined。
*/
function parseAbsoluteUtcMs(message, nowMs, target) {
	const iso = message.match(ABSOLUTE_ISO_UTC);
	if (iso) {
		const at = Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4]), Number(iso[5]), Number(iso[6] ?? 0));
		return Number.isFinite(at) ? {
			at,
			text: iso[0]
		} : void 0;
	}
	const clock = message.match(ABSOLUTE_CLOCK_UTC);
	if (!clock) return void 0;
	const hour = Number(clock[1]);
	const minute = Number(clock[2]);
	const second = Number(clock[3] ?? 0);
	if (hour > 23 || minute > 59 || second > 59) return void 0;
	const day = 864e5;
	const base = new Date(nowMs);
	const today = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, minute, second);
	const candidates = [
		today - day,
		today,
		today + day
	];
	let best;
	if (target !== void 0) best = candidates.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
	else best = candidates.find((candidate) => candidate >= nowMs) ?? today + day;
	return {
		at: best,
		text: clock[0].replace(/^\(?at\s+/i, "").replace(/\)$/, "")
	};
}
/**
* 解析一条限流报错：同时支持相对时长与绝对 UTC 钟点。
* 绝对时间优先（它由服务端给出，不受本机时钟漂移影响），相对时长用于
* 对齐跨天候选项；两者都没有时用 fallbackMs 兜底并标 guessed。
*/
function parseRateLimitReset(message, options = {}) {
	const now = options.now ?? Date.now();
	const relativeMs = parseRelativeMs(message);
	const absolute = parseAbsoluteUtcMs(message, now, relativeMs !== void 0 ? now + relativeMs : void 0);
	const guessed = absolute === void 0 && relativeMs === void 0;
	const resetAt = absolute?.at ?? (relativeMs !== void 0 ? now + relativeMs : now + (options.fallbackMs ?? 36e5));
	return {
		code: extractErrorCode(message),
		message,
		...relativeMs !== void 0 ? { relativeMs } : {},
		resetAt,
		...absolute ? { absoluteUtc: absolute.text } : {},
		waitMs: resetAt - now,
		guessed
	};
}
/** 毫秒数 → 「1 小时 48 分钟」风格的中文时长。 */
function describeWait(ms) {
	const total = Math.max(0, Math.round(ms / 1e3));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor(total % 3600 / 60);
	const seconds = total % 60;
	const parts = [];
	if (hours > 0) parts.push(`${hours} 小时`);
	if (minutes > 0) parts.push(`${minutes} 分钟`);
	if (parts.length === 0) parts.push(`${seconds} 秒`);
	return parts.join(" ");
}
function clockParts(at, timeZone, locale) {
	const parts = new Intl.DateTimeFormat(locale ?? "en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZoneName: "shortOffset"
	}).formatToParts(new Date(at));
	const pick = (type) => parts.find((p) => p.type === type)?.value ?? "";
	return {
		year: pick("year"),
		month: pick("month"),
		day: pick("day"),
		hour: pick("hour"),
		minute: pick("minute"),
		second: pick("second"),
		zone: pick("timeZoneName").replace("GMT", "UTC")
	};
}
/** 重置时刻 → 本地时间字符串，如 2026-11-14 05:01:00 UTC+08:00。 */
function formatResetLocal(resetAt, options = {}) {
	if (!Number.isFinite(resetAt)) return "—";
	const p = clockParts(resetAt, options.timeZone, options.locale);
	return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.zone}`.trim();
}
/** 重置时刻 → UTC 字符串，如 2026-11-14 21:01:00 UTC。 */
function formatResetUtc(resetAt) {
	if (!Number.isFinite(resetAt)) return "—";
	const p = clockParts(resetAt, "UTC");
	return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} UTC`;
}
/**
* 从解码器尾块里找限流失败（finish.reason.kind === 'error' 且 code 为 RATE_LIMIT）。
* 纯函数：不构造 LlmError，调用方按自己的错误类型重抛。
*/
function findRateLimitFailure(chunks) {
	for (const chunk of chunks) {
		if (chunk.type !== "finish") continue;
		const reason = chunk.reason;
		if (!reason || reason.kind !== "error") continue;
		if (reason.failure?.code !== "RATE_LIMIT") continue;
		return {
			code: "RATE_LIMIT",
			message: reason.failure.message ?? ""
		};
	}
}
const DEFAULT_BACKOFF$1 = {
	initialDelayMs: 500,
	maxDelayMs: 1e4,
	jitterRatio: .1
};
/** 第 attempt 次（1 起）退避延迟：指数增长 + 对称抖动，封顶 maxDelayMs。 */
function backoffDelay(attempt, plan = DEFAULT_BACKOFF$1, random = Math.random) {
	const step = Math.max(0, attempt - 1);
	const base = Math.min(plan.maxDelayMs, plan.initialDelayMs * 2 ** Math.min(step, 16));
	const jitter = 1 + (random() * 2 - 1) * Math.max(0, plan.jitterRatio);
	return Math.max(0, Math.min(plan.maxDelayMs, Math.round(base * jitter)));
}
// src/adapter/devin.ts
const CLIENT_NAME = "chisel";
const CLIENT_VERSION = "3000.2.17";
/**
* 输出 token 上限。catalog 的 `maxTokens` 字段实际是 context window（262k），
* 不是输出上限；请求侧以此为天花板，更小值照常放行。
*/
const MAX_OUTPUT_TOKENS = 128e3;
/** dsh effort id → Devin model_uid 候选后缀（目录不可用时的回退，按序尝试）。 */
const EFFORT_SUFFIX = {
	none: ["-none"],
	minimal: ["-minimal"],
	low: ["-low"],
	medium: ["-medium"],
	high: ["", "-high"],
	xhigh: ["-xhigh"],
	max: ["-max"]
};
/** dsh reasoning effort 列表（目录不可用时展示的全部滑块档位）。 */
const REASONING_EFFORTS = [
	{
		id: ReasoningEffortId("none"),
		name: "No Thinking"
	},
	{
		id: ReasoningEffortId("minimal"),
		name: "Minimal"
	},
	{
		id: ReasoningEffortId("low"),
		name: "Low"
	},
	{
		id: ReasoningEffortId("medium"),
		name: "Medium"
	},
	{
		id: ReasoningEffortId("high"),
		name: "High"
	},
	{
		id: ReasoningEffortId("xhigh"),
		name: "Extra High"
	},
	{
		id: ReasoningEffortId("max"),
		name: "Max"
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
* 把动态目录按 family 合并：每个 family 取一个代表成员（默认档 > promo > 首个），
* 并汇总成员档位表（effort id → uid，跳过 fast mode 变体）。
*/
function mergeFamilies(models) {
	const byFamily = /* @__PURE__ */ new Map();
	for (const m of models) {
		const fam = m.family ?? m.id;
		const list = byFamily.get(fam) ?? [];
		list.push(m);
		byFamily.set(fam, list);
	}
	return [...byFamily.values()].map((members) => {
		const tiers = {};
		for (const m of members) {
			if (!m.effort || m.fastMode) continue;
			const e = normalizeEffortName(m.effort);
			if (!tiers[e]) tiers[e] = m.id;
		}
		const member = members.find((m) => m.isDefaultInFamily && !m.fastMode) ?? members.find((m) => m.isPromo && !m.fastMode) ?? members.find((m) => !m.fastMode) ?? members[0];
		return {
			member,
			tiers,
			...member.effort ? { defaultEffort: normalizeEffortName(member.effort) } : {}
		};
	});
}
/**
* 把 base model id + reasoningEffort 映射到 Devin 实际 model_uid。
* 如 swe-2 + max → swe-2-max，swe-1-7 + medium → swe-1-7-medium。
* 优先用采纳时持久化的 tiers 表（effort id → uid），其次 family 成员档位表，
* 最后回退内置后缀映射；都不命中用 base id。
*/
function resolveModelUid(baseId, effort, models) {
	const bareId = baseId.includes("/") ? baseId.slice(baseId.lastIndexOf("/") + 1) : baseId;
	const configured = models.find((m) => m.id === bareId);
	const legacy = configured ?? models.find((m) => toBaseModelId(m.id) === bareId);
	if (effort) {
		const e = normalizeEffortName(effort);
		const tierUid = configured?.tiers?.[e] ?? (legacy?.family ? familyTiers(models).get(legacy.family)?.get(e) : void 0) ?? EFFORT_SUFFIX[e]?.map((suffix) => `${bareId}${suffix}`).find((id) => models.some((m) => m.id === id));
		if (tierUid) return tierUid;
	}
	if (configured?.tiers) return configured.tiers[configured.defaultEffort ?? "high"] ?? configured.tiers["high"] ?? Object.values(configured.tiers)[0];
	if (models.some((m) => m.id === bareId)) return bareId;
	if (legacy?.family) {
		const def = models.find((m) => m.family === legacy.family && m.isDefaultInFamily && !m.fastMode);
		if (def) return def.id;
	}
	return bareId;
}
/**
* family 默认成员的 uid 减去自身 effort 后缀得到对外暴露的 base model id。
* 如 swe-2-high（effort=high）→ swe-2；swe-1-7（effort=max，无后缀）→ swe-1-7。
*/
function familyBaseId(member) {
	let id = member.id;
	if (member.effort) {
		const suffix = `-${normalizeEffortName(member.effort)}`;
		if (id.toLowerCase().endsWith(suffix)) id = id.slice(0, -suffix.length);
	}
	return id.replace(/-1m$/i, "");
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
	/** 限流到点提醒与自动继续的运行时（可选）。 */
	rateLimit;
	cachedClient = null;
	cachedClientKey = "";
	catalogCache = null;
	constructor(options) {
		super();
		this.config = options;
		this.rateLimit = options.rateLimit;
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
  2. Run "devin auth login" to create ${hint}, or\n  3. Set DEVIN_CREDENTIALS_PATH to a custom credentials.toml path`, "MISSING_CREDENTIAL");
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
		const conn = this.conn();
		const hidden = new Set(conn.hiddenModels ?? []);
		return conn.models.filter((m) => !hidden.has(m.id)).map((m) => ({
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
		const tierSet = configured?.tiers ? new Set(Object.keys(configured.tiers)) : configured?.family ? familyTiers(c.models).get(configured.family) : void 0;
		const efforts = tierSet && tierSet.size > 0 ? REASONING_EFFORTS.filter((e) => tierSet.has(e.id)) : REASONING_EFFORTS;
		return {
			provider,
			id: model,
			name: configured?.name ?? model,
			...configured?.description ? { description: configured.description } : {},
			inputModalities: configured?.supportsImages ? ["text", "image"] : ["text"],
			context: { contextWindow },
			defaultMaxTokens: Math.min(configured?.maxTokens ?? c.defaultMaxTokens, MAX_OUTPUT_TOKENS),
			reasoning: {
				efforts,
				defaultEffort: ReasoningEffortId(configured?.defaultEffort ?? "high")
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
		return mergeFamilies(await this.fetchModelCatalog(conn, signal)).map(({ member: m }) => ({
			id: familyBaseId(m),
			name: formatDiscoveredName(m.family ? {
				...m,
				name: m.family
			} : m),
			...m.contextWindow ? { contextWindow: m.contextWindow } : {},
			...m.maxTokens ? { maxTokens: m.maxTokens } : {},
			inputModalities: m.supportsImages ? ["text", "image"] : ["text"]
		}));
	}
	/**
	* 供 remote.devin 使用：family 合并后的完整目录条目，
	* 带 tiers（effort→uid）与 defaultEffort，供设置页采纳进配置。
	*/
	async catalog(signal) {
		return mergeFamilies(await this.fetchModelCatalog(this.conn(), signal)).map(({ member: m, tiers, defaultEffort }) => ({
			id: familyBaseId(m),
			name: m.family ?? m.name ?? m.id,
			...m.description ? { description: m.description } : {},
			...m.contextWindow ? { contextWindow: m.contextWindow } : {},
			...m.maxTokens ? { maxTokens: m.maxTokens } : {},
			supportsImages: m.supportsImages,
			...m.family ? { family: m.family } : {},
			...Object.keys(tiers).length > 0 ? { tiers } : {},
			...defaultEffort ? { defaultEffort } : {},
			isPremium: m.isPremium,
			isPromo: m.isPromo,
			...m.creditMultiplier !== void 0 ? { creditMultiplier: m.creditMultiplier } : {}
		}));
	}
	/**
	* 惰性目录兜底：解析出来仍是裸 id、且配置里没有可信的真实-uid 条目时，
	* 拉一次上游 family 目录合并后再走 resolveModelUid。
	* 覆盖 models 为空（新环境从未采纳目录）和条目缺 tiers（旧版/手写配置）
	* 两种把裸 base id（如 swe-2、swe-2-flash）直接发给上游的场景——
	* 上游不存在这些 uid，会报 permission_denied。
	*/
	async withResolvableModel(options, c) {
		const bare = options.model.includes("/") ? options.model.slice(options.model.lastIndexOf("/") + 1) : options.model;
		if (resolveModelUid(options.model, options.reasoningEffort, c.models) !== bare) return c;
		const entry = c.models.find((m) => m.id === bare);
		if (entry && !entry.tiers && !entry.family && !entry.effort) return c;
		try {
			const dynamic = await this.dynamicCatalog(c, options.signal);
			const merged = [...dynamic, ...c.models.filter((m) => !dynamic.some((d) => d.id === m.id))];
			return {
				...c,
				models: merged
			};
		} catch {
			return c;
		}
	}
	/** family 合并目录，按连接缓存 5 分钟；catalog() 是用户主动刷新，不走这里。 */
	async dynamicCatalog(c, signal) {
		const key = `${c.baseUrl}\0${c.token}`;
		if (this.catalogCache?.key === key && Date.now() - this.catalogCache.at < 3e5) return this.catalogCache.models;
		const models = mergeFamilies(await this.fetchModelCatalog(c, signal)).map(({ member: m, tiers, defaultEffort }) => ({
			id: familyBaseId(m),
			name: m.family ?? m.name ?? m.id,
			...m.description ? { description: m.description } : {},
			...m.contextWindow ? { contextWindow: m.contextWindow } : {},
			...m.maxTokens ? { maxTokens: m.maxTokens } : {},
			supportsImages: m.supportsImages,
			...m.family ? { family: m.family } : {},
			...Object.keys(tiers).length > 0 ? { tiers } : {},
			...defaultEffort ? { defaultEffort } : {},
			isPremium: m.isPremium,
			isPromo: m.isPromo,
			...m.creditMultiplier !== void 0 ? { creditMultiplier: m.creditMultiplier } : {}
		}));
		this.catalogCache = {
			key,
			at: Date.now(),
			models
		};
		return models;
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
					maxTokens: MAX_OUTPUT_TOKENS
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
	async *streamWithConn(options, conn) {
		const c = await this.withResolvableModel(options, conn);
		let protoRequest;
		try {
			protoRequest = await this.buildRequest(options, c);
		} catch (err) {
			if (err instanceof LlmError) throw err;
			throw new LlmError(`Devin request build failed: ${err instanceof Error ? err.message : String(err)}`, "INVALID_REQUEST", { cause: err });
		}
		try {
			yield* this.streamAttempt(options, c, protoRequest);
		} catch (err) {
			const failure = err instanceof LlmError ? err : wrapConnectError(err);
			this.reportRateLimit(failure);
			throw failure;
		}
	}
	/** 单次尝试：连接 + 解码；限流失败转成 LlmError 抛出，由上层瀑布等待重放。 */
	async *streamAttempt(options, c, protoRequest) {
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
		const tail = decoder.finish(upstreamError);
		const limit = this.rateLimit ? findRateLimitFailure(tail) : void 0;
		if (limit) throw new LlmError(limit.message, "RATE_LIMIT");
		yield* tail;
	}
	/** 限流失败登记到点提醒（解析失败不影响原始错误上报）。 */
	reportRateLimit(failure) {
		const watcher = this.rateLimit;
		if (!watcher || failure.code !== "RATE_LIMIT") return;
		try {
			watcher.report(watcher.parse(originalMessage(failure.message)));
		} catch {}
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
				maxTokens: BigInt(Math.min(options.maxTokens ?? c.defaultMaxTokens, MAX_OUTPUT_TOKENS)),
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
					prompt.images.push(create(ExaCodeiumCommonPb_ImageDataSchema, {
						base64Data: base64,
						mimeType
					}));
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
// src/adapter/quota.ts
const PROCEDURE = "/exa.seat_management_pb.SeatManagementService/GetUserStatus";
const QUOTA_REFRESH_MS = 3e5;
const QUOTA_RETRY_MS = 3e4;
const QUOTA_TIMEOUT_MS = 2e4;
const F_USER_STATUS = 1;
const F_PLAN_STATUS = 13;
const F_PLAN_INFO = 1;
const F_PLAN_LABEL = 2;
const F_DAILY = 14;
const F_WEEKLY = 15;
const F_DAILY_RESET = 17;
const F_WEEKLY_RESET = 18;
let cached = null;
let expiry = 0;
/**
* 读取账户额度。缓存命中直接返回；刷新失败且有旧快照时返回 stale 副本。
*/
async function fetchQuota(options) {
	const now = Date.now();
	if (!options.fresh && cached && now < expiry) return cached;
	try {
		const quota = decodeUserStatus(await unaryPost(options, encodeRequest(options.token)));
		quota.sampledAt = Math.floor(Date.now() / 1e3);
		quota.stale = false;
		cached = quota;
		expiry = now + QUOTA_REFRESH_MS;
		return quota;
	} catch (error) {
		if (cached) {
			expiry = now + QUOTA_RETRY_MS;
			return {
				...cached,
				stale: true
			};
		}
		throw error;
	}
}
/** 序列化 GetUserStatusRequest：field 1 = metadata。 */
function encodeRequest(token) {
	const metadata = create(ExaCodeiumCommonPb_MetadataSchema, {
		apiKey: token,
		extensionName: "chisel",
		extensionVersion: "3000.2.17",
		ideName: "chisel",
		ideVersion: "3000.2.17",
		locale: "en",
		os: "mac"
	});
	const inner = toBinary(ExaCodeiumCommonPb_MetadataSchema, metadata);
	const out = new Uint8Array(1 + varintSize(inner.length) + inner.length);
	out[0] = 10;
	writeVarint(out, 1, inner.length);
	out.set(inner, 1 + varintSize(inner.length));
	return out;
}
function varintSize(value) {
	let size = 1;
	let v = value >>> 0;
	while (v >= 128) {
		v >>>= 7;
		size++;
	}
	return size;
}
function writeVarint(buf, offset, value) {
	let v = value >>> 0;
	let i = offset;
	while (v >= 128) {
		buf[i++] = v & 127 | 128;
		v >>>= 7;
	}
	buf[i] = v;
}
/** Connect unary POST：application/proto 裸消息体，错误体是 JSON {code,message}。 */
async function unaryPost(options, body) {
	const url = new URL(options.baseUrl.replace(/\/+$/, "") + PROCEDURE);
	const isHttps = url.protocol === "https:";
	const agent = createProxyAgent(options.proxy, options.baseUrl);
	const headers = {
		"Content-Type": "application/proto",
		Accept: "application/proto",
		Authorization: `Basic ${options.token}-${options.token}`,
		"Content-Length": String(body.length),
		...attributionHeaders()
	};
	return new Promise((resolve, reject) => {
		const req = (isHttps ? request : request$1)({
			hostname: url.hostname,
			port: url.port || (isHttps ? 443 : 80),
			path: url.pathname + url.search,
			method: "POST",
			headers,
			...agent ? { agent } : {},
			timeout: QUOTA_TIMEOUT_MS
		}, (res) => {
			const chunks = [];
			res.on("data", (chunk) => chunks.push(chunk));
			res.on("end", () => {
				const payload = Buffer.concat(chunks);
				const status = res.statusCode ?? 0;
				if (status >= 200 && status < 300) {
					resolve(new Uint8Array(payload));
					return;
				}
				let detail = payload.toString("utf8");
				try {
					const parsed = JSON.parse(detail);
					detail = parsed.message ? `[${parsed.code ?? "unknown"}] ${parsed.message}` : detail;
				} catch {}
				reject(/* @__PURE__ */ new Error(`GetUserStatus HTTP ${status}: ${detail.slice(0, 300)}`));
			});
		});
		req.on("timeout", () => req.destroy(/* @__PURE__ */ new Error("GetUserStatus timed out")));
		req.on("error", reject);
		req.end(body);
	});
}
var WireReader = class {
	buf;
	offset = 0;
	constructor(buf) {
		this.buf = buf;
	}
	/** 返回下一个字段号与 wire type；结束返回 null。 */
	next() {
		if (this.offset >= this.buf.length) return null;
		const tag = this.varint();
		return {
			field: tag >>> 3,
			wire: tag & 7
		};
	}
	varint() {
		let result = 0;
		let shift = 0;
		for (;;) {
			const byte = this.buf[this.offset++];
			if (byte === void 0) throw new Error("truncated varint");
			result |= (byte & 127) << shift;
			if ((byte & 128) === 0) break;
			shift += 7;
			if (shift > 63) throw new Error("varint too long");
		}
		return result >>> 0;
	}
	bytes() {
		const length = this.varint();
		const start = this.offset;
		this.offset += length;
		if (this.offset > this.buf.length) throw new Error("truncated bytes field");
		return this.buf.subarray(start, this.offset);
	}
	/** 按 wire type 跳过当前字段值。 */
	skip(wire) {
		switch (wire) {
			case 0:
				this.varint();
				return;
			case 1:
				this.offset += 8;
				return;
			case 2:
				this.bytes();
				return;
			case 5:
				this.offset += 4;
				return;
			default: throw new Error(`unsupported wire type ${wire}`);
		}
	}
};
/** 提取消息中首个指定字段号的 length-delimited 值；缺失返回 null。 */
function nestedField(buf, fieldNo) {
	const reader = new WireReader(buf);
	for (;;) {
		const tag = reader.next();
		if (tag === null) return null;
		if (tag.field === fieldNo) {
			if (tag.wire !== 2) return null;
			return reader.bytes();
		}
		reader.skip(tag.wire);
	}
}
function decodeUserStatus(data) {
	const userStatus = nestedField(data, F_USER_STATUS);
	if (!userStatus) throw new Error("GetUserStatus: response carries no user_status");
	const planStatus = nestedField(userStatus, F_PLAN_STATUS);
	if (!planStatus) throw new Error("GetUserStatus: user_status carries no plan_status");
	const quota = {
		sampledAt: 0,
		stale: false
	};
	const reader = new WireReader(planStatus);
	for (;;) {
		const tag = reader.next();
		if (tag === null) break;
		switch (tag.field) {
			case F_PLAN_INFO: {
				const label = nestedField(reader.bytes(), F_PLAN_LABEL);
				if (label) quota.plan = new TextDecoder().decode(label);
				break;
			}
			case F_DAILY: {
				const v = tag.wire === 0 ? reader.varint() : void 0;
				if (v !== void 0 && v <= 100) quota.dailyRemainingPercent = v;
				else if (v === void 0) reader.skip(tag.wire);
				break;
			}
			case F_WEEKLY: {
				const v = tag.wire === 0 ? reader.varint() : void 0;
				if (v !== void 0 && v <= 100) quota.weeklyRemainingPercent = v;
				else if (v === void 0) reader.skip(tag.wire);
				break;
			}
			case F_DAILY_RESET:
				quota.dailyResetAt = tag.wire === 0 ? reader.varint() : (reader.skip(tag.wire), void 0);
				break;
			case F_WEEKLY_RESET:
				quota.weeklyResetAt = tag.wire === 0 ? reader.varint() : (reader.skip(tag.wire), void 0);
				break;
			default: reader.skip(tag.wire);
		}
	}
	return quota;
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
// src/adapter/rate-limit-watch.ts
const DEFAULT_BACKOFF = {
	initialDelayMs: 5e3,
	maxDelayMs: 6e4,
	jitterRatio: .1
};
/** 到点提醒 + 到点自动继续的运行时。 */
var RateLimitWatcher = class {
	leadMs;
	maxResumeAttempts;
	backoff;
	options;
	cycle = null;
	pendingWaits = /* @__PURE__ */ new Set();
	lastNotice;
	lastNoticeAt;
	attempts = 0;
	constructor(options = {}) {
		this.options = options;
		this.leadMs = Math.max(0, options.reminderLeadMs ?? 3e5);
		this.maxResumeAttempts = Math.max(1, options.maxResumeAttempts ?? 3);
		this.backoff = options.backoff ?? DEFAULT_BACKOFF;
	}
	get autoResume() {
		const value = this.options.autoResume;
		return typeof value === "function" ? value() === true : value === true;
	}
	/** 到点提醒当前是否开启（支持配置热更新）。 */
	get reminderEnabled() {
		const value = this.options.enabled;
		return typeof value === "function" ? value() !== false : value !== false;
	}
	get maxAttempts() {
		return this.maxResumeAttempts;
	}
	/** 本运行时的当前时刻（epoch 毫秒），与内部定时器同一时钟。 */
	now() {
		return this.clock();
	}
	/** 用本运行时的时钟解析一条限流报错（测试与生产共用同一时间基准）。 */
	parse(message) {
		return parseRateLimitReset(message, { now: this.clock() });
	}
	/** 第 attempt 次自动继续前的退避延迟（毫秒），指数增长并封顶。 */
	retryDelay(attempt) {
		return backoffDelay(attempt, this.backoff);
	}
	/**
	* 退避等待；signal 取消时以 AbortError 结束。
	* 用于重置时刻已过、或上游没给可解析时间的情况。
	*/
	waitBackoff(attempt, signal) {
		if (signal?.aborted) return Promise.reject(abortError());
		this.attempts = attempt;
		return new Promise((resolve, reject) => {
			const cancelTimer = this.scheduleFn()(() => {
				finish(() => resolve());
			}, this.retryDelay(attempt));
			const finish = (done) => {
				signal?.removeEventListener("abort", onAbort);
				this.pendingWaits.delete(entry);
				done();
			};
			const onAbort = () => {
				cancelTimer();
				finish(() => reject(abortError()));
			};
			const entry = { cancel: () => {
				cancelTimer();
				finish(() => reject(abortError()));
			} };
			this.pendingWaits.add(entry);
			signal?.addEventListener("abort", onAbort, { once: true });
		});
	}
	/**
	* 调整提前提醒量与自动继续上限（配置热更新时调用）。
	* 已排好的预告计时器不会重排，下一个限流周期生效。
	*/
	configure(next) {
		if (next.reminderLeadMs !== void 0) this.leadMs = Math.max(0, next.reminderLeadMs);
		if (next.maxResumeAttempts !== void 0) this.maxResumeAttempts = Math.max(1, next.maxResumeAttempts);
	}
	/** 当前限流状态；没有周期时 active=false。 */
	status() {
		const base = {
			active: false,
			reminderEnabled: this.reminderEnabled,
			autoResume: this.autoResume,
			maxResumeAttempts: this.maxResumeAttempts,
			resumeAttempts: this.attempts,
			...this.lastNotice && this.lastNoticeAt !== void 0 ? {
				lastNotice: this.lastNotice,
				lastNoticeAt: this.lastNoticeAt
			} : {}
		};
		if (!this.cycle) return base;
		const remainingMs = Math.max(0, this.cycle.limit.resetAt - this.clock());
		return {
			...base,
			active: remainingMs > 0,
			code: this.cycle.limit.code,
			message: this.cycle.limit.message,
			resetAt: this.cycle.limit.resetAt,
			resetAtUtc: formatResetUtc(this.cycle.limit.resetAt),
			resetAtLocal: formatResetLocal(this.cycle.limit.resetAt),
			remainingMs
		};
	}
	/**
	* 登记一次限流：安排预告与到点通知。同一重置时刻重复上报只重置计时器，
	* 不会重复发同一条通知。
	*/
	report(limit) {
		if (this.cycle && Math.abs(this.cycle.limit.resetAt - limit.resetAt) <= 6e4) {
			this.cycle.limit = limit;
			this.armTimers(this.cycle);
			return;
		}
		this.disposeCycle();
		const cycle = {
			limit,
			waiters: [],
			cancelTimers: [],
			reminded: false
		};
		this.cycle = cycle;
		this.armTimers(cycle);
	}
	/** 按 cycle.limit 排预告与到点计时器；已到点则立即通知并唤醒等待者。 */
	armTimers(cycle) {
		for (const cancel of cycle.cancelTimers) cancel();
		cycle.cancelTimers.length = 0;
		const remaining = cycle.limit.resetAt - this.clock();
		if (remaining <= 0) {
			this.emit(cycle.limit, "reset");
			this.settle(cycle, null);
			if (this.cycle === cycle) this.cycle = null;
			return;
		}
		const lead = Math.min(this.leadMs, remaining);
		if (!cycle.reminded && lead > 0 && lead < remaining) cycle.cancelTimers.push(this.scheduleFn()(() => {
			cycle.reminded = true;
			this.emit(cycle.limit, "reminder");
		}, remaining - lead));
		cycle.cancelTimers.push(this.scheduleFn()(() => {
			this.emit(cycle.limit, "reset");
			this.settle(cycle, null);
			this.attempts = 0;
			if (this.cycle === cycle) this.cycle = null;
		}, remaining));
	}
	/**
	* 等到重置点。已过点立即返回；signal 取消时以 AbortError 拒绝。
	* @param limit - 本次限流信息。
	* @param signal - 本轮生成请求的取消信号。
	* @param attempt - 第几次自动继续（1 起），用于状态展示。
	*/
	waitUntilReset(limit, signal, attempt = 1) {
		this.attempts = attempt;
		if (this.cycle === null || this.cycle.limit.resetAt !== limit.resetAt) this.report(limit);
		const cycle = this.cycle;
		if (cycle === null) return Promise.resolve();
		if (signal?.aborted) return Promise.reject(abortError());
		if (limit.resetAt - this.clock() <= 0) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const waiter = {
				resolve,
				reject,
				signal
			};
			if (signal) {
				waiter.onAbort = () => {
					this.removeWaiter(cycle, waiter);
					reject(abortError());
				};
				signal.addEventListener("abort", waiter.onAbort, { once: true });
			}
			cycle.waiters.push(waiter);
		});
	}
	/** 取消当前周期：关闭自动继续或插件卸载时调用。 */
	cancel() {
		this.disposeCycle();
	}
	/** 一条可直接展示给用户的提醒文案（错误码 + 重置时间 + 可重跑）。 */
	describe(limit, kind = "reset") {
		const resetUtc = formatResetUtc(limit.resetAt);
		const resetLocal = formatResetLocal(limit.resetAt);
		const head = kind === "reset" ? "限流已重置，可以重新运行" : "限流即将重置，可以准备重新运行";
		const left = kind === "reset" ? "" : `（还剩 ${describeWait(limit.resetAt - this.clock())}）`;
		return `[${limit.code}] ${head} · 重置时间 ${resetUtc} · 本地 ${resetLocal}${left}`;
	}
	settle(cycle, error) {
		const waiters = cycle.waiters.splice(0);
		for (const waiter of waiters) {
			if (waiter.signal && waiter.onAbort) waiter.signal.removeEventListener("abort", waiter.onAbort);
			if (error) waiter.reject(error);
			else waiter.resolve();
		}
	}
	removeWaiter(cycle, waiter) {
		const index = cycle.waiters.indexOf(waiter);
		if (index >= 0) cycle.waiters.splice(index, 1);
	}
	disposeCycle() {
		for (const pending of [...this.pendingWaits]) pending.cancel();
		this.attempts = 0;
		if (!this.cycle) return;
		for (const cancel of this.cycle.cancelTimers) cancel();
		this.settle(this.cycle, abortError());
		this.cycle = null;
	}
	emit(limit, kind) {
		if (!this.reminderEnabled) return;
		const notice = {
			...limit,
			resetAtUtc: formatResetUtc(limit.resetAt),
			resetAtLocal: formatResetLocal(limit.resetAt),
			kind
		};
		this.lastNotice = kind;
		this.lastNoticeAt = this.clock();
		try {
			this.options.notify?.(notice);
		} catch (error) {
			this.log("error", `devin-bridge: 限流通知发送失败：${error instanceof Error ? error.message : String(error)}`);
		}
		this.log("info", `devin-bridge: ${this.describe(limit, kind)}｜${limit.message}`);
	}
	clock() {
		return (this.options.now ?? Date.now)();
	}
	scheduleFn() {
		return this.options.schedule ?? ((callback, delayMs) => {
			const handle = setTimeout(callback, delayMs);
			return () => clearTimeout(handle);
		});
	}
	log(level, message) {
		this.options.log?.(level, message);
	}
};
function abortError() {
	const error = /* @__PURE__ */ new Error("devin-bridge: rate-limit wait aborted");
	error.name = "AbortError";
	return error;
}
// src/adapter/rate-limit-notify.ts
const NOTIFY_TIMEOUT_MS = 1e4;
/** 把通知 POST 到 webhook；非 2xx 视为失败。 */
async function postRateLimitNotice(url, notice, proxy) {
	const target = new URL(url);
	if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error(`rate-limit webhook must be an http(s) URL, got "${target.protocol}"`);
	const isHttps = target.protocol === "https:";
	const agent = createProxyAgent(proxy, url);
	const body = Buffer.from(JSON.stringify({
		kind: notice.kind,
		code: notice.code,
		message: notice.message,
		resetAt: notice.resetAt,
		resetAtUtc: notice.resetAtUtc,
		resetAtLocal: notice.resetAtLocal,
		waitMs: notice.waitMs,
		guessed: notice.guessed
	}), "utf8");
	await new Promise((resolve, reject) => {
		const req = (isHttps ? request : request$1)({
			hostname: target.hostname,
			port: target.port || (isHttps ? 443 : 80),
			path: target.pathname + target.search,
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Length": String(body.length)
			},
			...agent ? { agent } : {},
			timeout: NOTIFY_TIMEOUT_MS
		}, (res) => {
			res.resume();
			const status = res.statusCode ?? 0;
			if (status >= 200 && status < 300) resolve();
			else reject(/* @__PURE__ */ new Error(`rate-limit webhook HTTP ${status}`));
		});
		req.on("timeout", () => req.destroy(/* @__PURE__ */ new Error("rate-limit webhook timed out")));
		req.on("error", reject);
		req.end(body);
	});
}
// src/adapter/rate-limit-observe.ts
/**
* 把下游 chunk 流包一层限流处理：
*   - 撞限流即登记到点提醒（无论自动继续是否开启）；
*   - 自动继续开启、未取消、未超次数，且本次尝试没有产出时，
*     等到重置点（已过点则指数退避）后重新调用 next()。
* @param next - 瀑布的下一环；可重复调用以获得新的 chunk 流。
* @param watcher - 共享的限流运行时。
* @param log - 可选日志。
*/
function rateLimitStream(next, watcher, log, signal) {
	return (async function* stream() {
		const maxAttempts = watcher.autoResume ? watcher.maxAttempts : 1;
		for (let attempt = 1;; attempt++) {
			let emitted = false;
			let failure;
			try {
				for await (const chunk of next()) {
					if (chunk.type === "finish" && chunk.reason?.kind === "error") {
						const limit = findRateLimitFailure([chunk]);
						if (limit) {
							failure = limit;
							break;
						}
					}
					emitted = true;
					yield chunk;
				}
			} catch (error) {
				failure = toRateLimitFailure(error);
				if (!failure) throw error;
			}
			if (!failure) return;
			const limit = watcher.parse(originalMessage(failure.message));
			try {
				watcher.report(limit);
			} catch (error) {
				log?.("warn", `devin-bridge: 限流观察器登记失败：${error instanceof Error ? error.message : String(error)}`);
			}
			if (emitted || !watcher.autoResume || signal?.aborted || attempt >= maxAttempts) throw rateLimitError(limit.message);
			try {
				if (limit.resetAt > watcher.now()) await watcher.waitUntilReset(limit, signal, attempt);
				else await watcher.waitBackoff(attempt, signal);
			} catch (error) {
				if (signal?.aborted) throw error;
				throw rateLimitError(limit.message);
			}
			log?.("info", `devin-bridge: 限流窗口已重置，即将进行第 ${attempt + 1}/${maxAttempts} 次尝试`);
		}
	})();
}
/** 从抛出的错误里识别限流（Connect/gRPC 风格的消息）。 */
function toRateLimitFailure(error) {
	if (error === null || error === void 0) return void 0;
	const record = error;
	const code = typeof record.code === "string" ? record.code : "";
	const message = typeof record.message === "string" ? record.message : String(error);
	if (!(code === "RATE_LIMIT" || /\brate[\s_-]?limit|resource_exhausted|too many requests/i.test(message))) return void 0;
	return {
		code: code || "RATE_LIMIT",
		message: originalMessage(message)
	};
}
/** 限流终止错误：用 dsh-llm 的 LlmError，保住 RATE_LIMIT 码供上层重试策略识别。 */
function rateLimitError(message) {
	return new LlmError(message, "RATE_LIMIT");
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
	maxTokens: 128e3,
	supportsImages: true,
	family: "SWE-2",
	tiers: {
		high: "swe-2-high",
		medium: "swe-2-medium",
		max: "swe-2-max"
	},
	defaultEffort: "high",
	creditMultiplier: 9
}, {
	id: "swe-2-flash",
	name: "SWE-2 Flash",
	description: "Devin-hosted SWE-2 Flash fast coding model. Effort (medium/high/max) selectable via dsh reasoning slider.",
	contextWindow: 262144,
	maxTokens: 128e3,
	supportsImages: false,
	family: "SWE-2 Flash",
	isPromo: true,
	tiers: {
		medium: "swe-2-flash-medium",
		high: "swe-2-flash-high",
		max: "swe-2-flash-max"
	},
	defaultEffort: "medium",
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
	/** family 档位表：effort id → 上游真实 model_uid（采纳时持久化）。 */
	tiers: z.dict(z.string()),
	/** family 默认档位的 effort id；dsh 滑块默认值。 */
	defaultEffort: z.string(),
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
	defaultMaxTokens: z.number().step(1).min(1).default(128e3).volatile(),
	models: z.array(catalogModel).default(DEFAULT_MODELS).volatile(),
	/** 设置页模型目录里被关掉的模型 id；listModels 过滤，picker 不再显示。 */
	hiddenModels: z.array(z.string()).default([]).volatile(),
	retryPolicy: RetryPolicySchema.volatile(),
	/** 免费模型限流到点提醒（Host 日志 + 可选 webhook），默认开启。 */
	rateLimitReminder: z.boolean().default(true).volatile(),
	/** 提前多少分钟提醒；0 = 只在重置到点提醒一次。 */
	rateLimitReminderLeadMinutes: z.number().step(1).min(0).max(1440).default(5).volatile(),
	/** 重置到点后自动继续被中断的轮次；默认关闭。 */
	rateLimitAutoResume: z.boolean().default(false).volatile(),
	/** 自动继续最大尝试次数（含首轮）。 */
	rateLimitMaxResumeAttempts: z.number().step(1).min(1).max(10).default(3).volatile(),
	/** 可选 webhook URL：POST JSON 通知；留空只用日志。 */
	rateLimitNotifyUrl: z.string().default("").volatile()
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
		defaultMaxTokens: readVolatile(config.defaultMaxTokens) ?? 128e3,
		models: [...readVolatile(config.models) ?? DEFAULT_MODELS],
		hiddenModels: [...readVolatile(config.hiddenModels) ?? []],
		retryPolicy: readVolatile(config.retryPolicy),
		rateLimitReminder: readVolatile(config.rateLimitReminder) ?? true,
		rateLimitReminderLeadMinutes: readVolatile(config.rateLimitReminderLeadMinutes) ?? 5,
		rateLimitAutoResume: readVolatile(config.rateLimitAutoResume) ?? false,
		rateLimitMaxResumeAttempts: readVolatile(config.rateLimitMaxResumeAttempts) ?? 3,
		rateLimitNotifyUrl: readVolatile(config.rateLimitNotifyUrl) ?? ""
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
	let autoResumeOverride;
	const watcher = new RateLimitWatcher({
		reminderLeadMs: source().rateLimitReminderLeadMinutes * 6e4,
		enabled: () => source().rateLimitReminder,
		autoResume: () => autoResumeOverride ?? source().rateLimitAutoResume,
		maxResumeAttempts: source().rateLimitMaxResumeAttempts,
		log: (level, message) => {
			if (level === "error") ctx.logger.error(message);
			else if (level === "warn") ctx.logger.warn(message);
			else ctx.logger.info(message);
		},
		notify: (notice) => {
			const c = source();
			if (!c.rateLimitReminder) return;
			if (!c.rateLimitNotifyUrl) return;
			postRateLimitNotice(c.rateLimitNotifyUrl, notice, c.proxy || void 0).catch((error) => {
				ctx.logger.warn(`devin-bridge: 限流 webhook 发送失败：${error instanceof Error ? error.message : String(error)}`);
			});
		}
	});
	let lastAutoResumeConfig = source().rateLimitAutoResume;
	ctx.on("loader/volatile-update", () => {
		const c = source();
		if (c.rateLimitAutoResume !== lastAutoResumeConfig) {
			lastAutoResumeConfig = c.rateLimitAutoResume;
			autoResumeOverride = void 0;
		}
		watcher.configure({
			reminderLeadMs: c.rateLimitReminderLeadMinutes * 6e4,
			maxResumeAttempts: c.rateLimitMaxResumeAttempts
		});
	});
	ctx.effect(() => ctx.on("llm/stream", (options, next) => rateLimitStream(next, watcher, (level, message) => ctx.logger[level](message), options.signal)));
	ctx.effect(() => () => watcher.cancel());
	const adapter = new DevinAdapter({
		rateLimit: watcher,
		options: () => {
			const c = source();
			const { token, baseUrl } = resolveConn();
			return {
				token,
				baseUrl,
				proxy: c.proxy || void 0,
				forceHttp1: c.forceHttp1,
				models: c.models,
				hiddenModels: c.hiddenModels,
				defaultContextWindow: c.defaultContextWindow,
				defaultMaxTokens: c.defaultMaxTokens,
				retryPolicy: c.retryPolicy,
				...readImage ? { readImage } : {}
			};
		}
	});
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
	const fetchWithConn = (fresh) => {
		const { token, baseUrl } = resolveConn();
		if (!token) throw new Error("devin-bridge: no Devin session token found");
		return fetchQuota({
			baseUrl,
			token,
			proxy: source().proxy || void 0,
			fresh
		});
	};
	const service = {
		quota: () => fetchWithConn(false),
		refreshQuota: () => fetchWithConn(true),
		catalog: () => adapter.catalog(),
		/** 当前限流周期状态：错误码、重置时刻（UTC + 本地）、是否自动继续。 */
		rateLimit: () => watcher.status(),
		/** 手动取消挂着的提醒 / 自动继续。 */
		cancelRateLimit: () => {
			watcher.cancel();
			return watcher.status();
		},
		/** 打开自动继续（不改持久配置，只影响当前运行时）。 */
		enableRateLimitAutoResume: () => {
			autoResumeOverride = true;
			return watcher.status();
		},
		/** 关闭自动继续并取消挂着的等待。 */
		disableRateLimitAutoResume: () => {
			autoResumeOverride = false;
			watcher.cancel();
			return watcher.status();
		}
	};
	Object.defineProperty(service, "typertRemote", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: {
			service,
			serviceKey: "devin",
			namespace: "devin"
		}
	});
	if (typeof ctx.provide === "function") ctx.provide("devin", service);
}
export { Config, DEFAULT_RESET_MS, DevinAdapter, RATE_LIMIT_MESSAGE, RateLimitWatcher, apply, backoffDelay, describeWait, devinCredentialsPath, extractErrorCode, fetchQuota, formatResetLocal, formatResetUtc, inject, name, originalMessage, parseAbsoluteUtcMs, parseRateLimitReset, parseRelativeMs, readDevinSession };

//# sourceMappingURL=index.js.map