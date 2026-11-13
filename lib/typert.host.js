// src/typert.ts
const codec = (name, parse) => ({
	mode: "strict",
	typeSymbol: `dsh-plugin-devin-bridge#${name}`,
	create: () => ({ parse })
});
function requireObject(value, subject) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${subject} must be an object`);
	return value;
}
const quotaCodec = codec("DevinQuota", (value) => {
	const record = requireObject(value, "devin quota");
	const num = (key) => typeof record[key] === "number" && Number.isFinite(record[key]) ? record[key] : void 0;
	const result = {
		sampledAt: num("sampledAt") ?? 0,
		stale: record.stale === true
	};
	if (typeof record.plan === "string") result.plan = record.plan;
	const daily = num("dailyRemainingPercent");
	if (daily !== void 0) result.dailyRemainingPercent = daily;
	const weekly = num("weeklyRemainingPercent");
	if (weekly !== void 0) result.weeklyRemainingPercent = weekly;
	const dailyReset = num("dailyResetAt");
	if (dailyReset !== void 0) result.dailyResetAt = dailyReset;
	const weeklyReset = num("weeklyResetAt");
	if (weeklyReset !== void 0) result.weeklyResetAt = weeklyReset;
	return result;
});
const catalogCodec = codec("DevinCatalog", (value) => {
	if (!Array.isArray(value)) throw new TypeError("devin catalog must be an array");
	for (const item of value) requireObject(item, "devin catalog entry");
	return value;
});
/** Wires of the `devin` namespace, in service order. */
const DEVIN_INVOCATIONS = [
	{
		id: "dsh-plugin-devin-bridge#devin/quota",
		service: "devin",
		namespace: "devin",
		method: "quota",
		invocation: { kind: "direct" },
		parameters: [],
		result: quotaCodec,
		description: "Cached account quota (plan, daily/weekly remaining percent, reset times)."
	},
	{
		id: "dsh-plugin-devin-bridge#devin/refreshQuota",
		service: "devin",
		namespace: "devin",
		method: "refreshQuota",
		invocation: { kind: "direct" },
		parameters: [],
		result: quotaCodec,
		description: "Force-refresh the account quota, bypassing the upstream cache."
	},
	{
		id: "dsh-plugin-devin-bridge#devin/catalog",
		service: "devin",
		namespace: "devin",
		method: "catalog",
		invocation: { kind: "direct" },
		parameters: [],
		result: catalogCodec,
		description: "Family-merged model catalog with effort tier maps, for settings adoption."
	}
];
/** The manifest the Typert loader registers for this package. */
const TYPERT = {
	package: "dsh-plugin-devin-bridge",
	face: "host",
	schemas: [],
	invocations: DEVIN_INVOCATIONS,
	model: {
		services: [{
			description: "Devin bridge account surface: upstream quota snapshot for the settings page and input pill.",
			summary: "Reads Devin account quota through the Host-side adapter.",
			tags: ["devin", "quota"],
			key: "devin",
			exportName: "DevinBridgeService",
			members: DEVIN_INVOCATIONS.map((invocation) => ({
				kind: "method",
				name: invocation.method,
				signature: `${invocation.method}()`,
				summary: invocation.description
			})),
			types: []
		}],
		events: [],
		objects: []
	},
	events: [],
	objects: []
};
export { DEVIN_INVOCATIONS, TYPERT };

//# sourceMappingURL=typert.host.js.map