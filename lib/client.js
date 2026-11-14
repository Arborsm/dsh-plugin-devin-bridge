window.__ModuleLoader__.load({
	id: "dsh-plugin-devin-bridge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/format.ts
		/** 毫秒 → 「1 小时 48 分钟」风格的中文时长（与 Host 侧 describeWait 一致）。 */
		function describeMs(ms) {
			const total = Math.max(0, Math.round(ms / 1e3));
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor(total % 3600 / 60);
			const parts = [];
			if (hours > 0) parts.push(`${hours} 小时`);
			if (minutes > 0) parts.push(`${minutes} 分钟`);
			if (parts.length === 0) parts.push(`${total % 60} 秒`);
			return parts.join(" ");
		}
		// src/client/DevinBridgeCard.tsx
		/**
		* Devin Bridge 设置面板（settings.section 独立页 + plugins.bundle.config 内嵌）。
		*
		* 布局按「状态 → 模型 → 配置」三段：
		* - 顶栏：连接状态点 + 端点 + 刷新按钮
		* - 「额度」卡：套餐名、日/周剩余百分比进度条、重置时间（remote.devin）
		* - 「限流状态」卡：挂起中的限流周期、重置时间与运行期操作（remote.devin）
		* - 「模型目录」卡：搜索 + 全开/全关 + 每模型开关（写 hiddenModels）
		* - 「连接设置」卡：token / baseUrl / proxy / forceHttp1
		* - 「限流提醒」卡：到点提醒、自动继续、提前量、Webhook 等持久配置
		*/
		const REFRESH_MS$2 = 6e4;
		/** 剩余百分比 → 圆点/进度条颜色。 */
		function toneOf$1(percent) {
			if (percent === void 0) return "var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))";
			if (percent <= 10) return "var(--dsw-alias-state-error-primary, #e5484d)";
			if (percent <= 30) return "var(--dsw-alias-state-warn-primary, #f5a524)";
			return "var(--dsw-alias-state-success-primary, #30a46c)";
		}
		/** unix 秒 → "周三 14:00" 风格的重置标签。 */
		function resetLabel(unix) {
			if (!unix) return "";
			const date = /* @__PURE__ */ new Date(unix * 1e3);
			if (Number.isNaN(date.getTime())) return "";
			const days = [
				"周日",
				"周一",
				"周二",
				"周三",
				"周四",
				"周五",
				"周六"
			];
			const hh = String(date.getHours()).padStart(2, "0");
			const mm = String(date.getMinutes()).padStart(2, "0");
			return `${days[date.getDay()]} ${hh}:${mm}`;
		}
		/** 每 REFRESH_MS 轮询一次；fresh=true 走 refreshQuota 跳过 Host 缓存。 */
		function useQuota(remote) {
			const [state, setState] = (0, react.useState)({
				data: null,
				error: null
			});
			const alive = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async (fresh) => {
				if (!remote) {
					setState({
						data: null,
						error: null
					});
					return;
				}
				try {
					const result = fresh ? await remote.refreshQuota() : await remote.quota();
					if (!alive.current) return;
					if (result.ok) setState({
						data: result.value,
						error: null
					});
					else setState({
						data: null,
						error: new Error(result.error?.message ?? "quota failed")
					});
				} catch (error) {
					if (alive.current) setState({
						data: null,
						error: error instanceof Error ? error : new Error(String(error))
					});
				}
			}, [remote]);
			(0, react.useEffect)(() => {
				load(false);
				const timer = setInterval(() => void load(false), REFRESH_MS$2);
				return () => clearInterval(timer);
			}, [load]);
			return [state, (0, react.useCallback)(() => void load(true), [load])];
		}
		/** 一行标题 + 数值。 */
		function Row({ label, value, tone }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dbp-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dbp-row-label",
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dbp-row-value",
					style: tone ? { color: tone } : void 0,
					children: value
				})]
			});
		}
		/** 剩余额度进度条。 */
		function Bar({ percent }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dbp-bar",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dbp-bar-fill",
					style: {
						width: `${typeof percent === "number" ? Math.max(0, Math.min(100, percent)) : 0}%`,
						background: toneOf$1(percent)
					}
				})
			});
		}
		/** 最小开关。 */
		function Toggle({ checked, disabled, label, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "switch",
				"aria-checked": checked,
				"aria-label": label,
				disabled,
				className: `dbp-toggle${checked ? " dbp-toggle-on" : ""}`,
				onClick: () => onChange(!checked),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dbp-toggle-knob" })
			});
		}
		function Card({ title, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dbp-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
					className: "dbp-card-title",
					children: title
				}), children]
			});
		}
		/** 模型行副标题：family / 图片 / 倍率 / 上下文。 */
		function modelMeta(entry) {
			const parts = [];
			if (entry.family) parts.push(entry.family);
			if (entry.supportsImages) parts.push("图片");
			if (typeof entry.creditMultiplier === "number") parts.push(`${entry.creditMultiplier}x`);
			if (typeof entry.contextWindow === "number" && entry.contextWindow > 0) parts.push(`${Math.round(entry.contextWindow / 1e3)}k ctx`);
			return parts.join(" · ");
		}
		/**
		* 模型目录卡：列出 config.models，开关写 hiddenModels。
		* 目录为空时给"拉取可用模型"入口。
		*/
		function ModelCatalog(props) {
			const { models, hidden, disabled, onSetHidden, onFetch, fetching, fetchError } = props;
			const [filter, setFilter] = (0, react.useState)("");
			const hiddenSet = new Set(hidden);
			const visible = models.filter((m) => !hiddenSet.has(m.id));
			const query = filter.trim().toLowerCase();
			const rows = query === "" ? models : models.filter((m) => m.id.toLowerCase().includes(query) || (m.name ?? "").toLowerCase().includes(query));
			if (models.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: "模型目录",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "还没有模型。点下面的按钮从 Devin 服务器拉取可用模型目录。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dbp-btn",
						disabled: fetching || disabled,
						onClick: onFetch,
						children: fetching ? "拉取中…" : "拉取可用模型"
					}) }),
					fetchError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-error",
						children: fetchError
					}) : null
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: `模型目录 · 已启用 ${visible.length}/${models.length}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dbp-toolbar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "search",
								value: filter,
								placeholder: "搜索模型…",
								"aria-label": "搜索模型",
								className: "dbp-search",
								onChange: (e) => setFilter(e.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dbp-btn",
								disabled,
								onClick: () => onSetHidden([]),
								children: "全开"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dbp-btn",
								disabled,
								onClick: () => onSetHidden(models.map((m) => m.id)),
								children: "全关"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dbp-btn",
								disabled: fetching || disabled,
								onClick: onFetch,
								children: fetching ? "拉取中…" : "刷新目录"
							})
						]
					}),
					fetchError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-error",
						children: fetchError
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dbp-list",
						children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dbp-hint",
							children: "没有匹配的模型。"
						}) : rows.map((entry) => {
							const meta = modelMeta(entry);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dbp-model-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dbp-model-text",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dbp-model-id",
										children: entry.id
									}), meta ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dbp-model-meta",
										children: meta
									}) : null]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
									checked: !hiddenSet.has(entry.id),
									disabled,
									label: `${entry.id} 是否出现在模型选择器里`,
									onChange: (next) => {
										const merged = new Set(hiddenSet);
										if (next) merged.delete(entry.id);
										else merged.add(entry.id);
										onSetHidden([...merged]);
									}
								})]
							}, entry.id);
						})
					}),
					models.length > 0 && visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "全部关闭时模型选择器将为空，至少保留一个。"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: `其中 ${models.filter((m) => m.supportsImages).length} 个支持图片输入。开关立即写入配置，模型选择器随之更新。`
					})
				]
			});
		}
		/** 可编辑字段行（连接设置卡）。 */
		function FieldRow(props) {
			if (props.type === "checkbox") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckboxRow, { ...props });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, { ...props });
		}
		function CheckboxRow(props) {
			const { label, hint, value, disabled, onSave } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: "dbp-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dbp-field-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dbp-field-label",
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
						checked: value === true,
						disabled,
						label,
						onChange: onSave
					})]
				}), hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dbp-field-hint",
					children: hint
				}) : null]
			});
		}
		function TextRow(props) {
			const { label, hint, type = "text", placeholder, value, disabled, onSave } = props;
			const [draft, setDraft] = (0, react.useState)(value === void 0 || value === null ? "" : String(value));
			(0, react.useEffect)(() => {
				setDraft(value === void 0 || value === null ? "" : String(value));
			}, [value]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: "dbp-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dbp-field-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dbp-field-label",
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dbp-field-input",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type,
							value: draft,
							placeholder,
							disabled,
							className: "dbp-search",
							onChange: (e) => setDraft(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") onSave(type === "number" ? Number(draft) : draft);
							}
						}), draft !== (value === void 0 || value === null ? "" : String(value)) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dbp-btn",
							disabled,
							onClick: () => onSave(type === "number" ? Number(draft) : draft),
							children: "保存"
						}) : null]
					})]
				}), hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dbp-field-hint",
					children: hint
				}) : null]
			});
		}
		/** 与 useQuota 同类：每 15s 拉一次限流状态，期间可手动刷新；reachable=false 表示 remote 未挂载或拉取失败。 */
		function useRateLimit(source) {
			const [state, setState] = (0, react.useState)(null);
			const [reachable, setReachable] = (0, react.useState)(true);
			const alive = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async () => {
				if (!source) {
					setState(null);
					setReachable(false);
					return;
				}
				try {
					const result = await source.rateLimit();
					if (alive.current) {
						setReachable(result.ok);
						setState(result.ok ? result.value : null);
					}
				} catch {
					if (alive.current) {
						setState(null);
						setReachable(false);
					}
				}
			}, [source]);
			(0, react.useEffect)(() => {
				load();
				const timer = setInterval(() => void load(), 15e3);
				return () => clearInterval(timer);
			}, [load]);
			return [
				state,
				reachable,
				(0, react.useCallback)(() => void load(), [load])
			];
		}
		/** 限流运行状态卡：挂起时显示重置时间与操作按钮；平时只留一行状态。 */
		function RateLimitStatusCard(props) {
			const { status, reachable, source, onRefresh, onError } = props;
			const [busy, setBusy] = (0, react.useState)("idle");
			const run = async (kind, call) => {
				setBusy(kind);
				try {
					const result = await call();
					if (!result.ok) onError(result.error?.message ?? "操作被 Host 拒绝。");
					onRefresh();
				} catch (error) {
					onError(error instanceof Error ? error.message : String(error));
				} finally {
					setBusy("idle");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: "限流状态",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: "当前状态",
						value: !reachable ? "限流服务未挂载" : status?.active ? `[${status.code ?? "resource_exhausted"}] 等待重置 · 还剩 ${describeMs(status.remainingMs ?? 0)}` : "无挂起的限流",
						tone: status?.active ? "var(--dsw-alias-state-warn-primary, #f5a524)" : void 0
					}),
					status?.active && status.resetAtUtc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: "重置时间 (UTC)",
						value: status.resetAtUtc
					}) : null,
					status?.active && status.resetAtLocal ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: "重置时间 (本地)",
						value: status.resetAtLocal
					}) : null,
					status?.active && status.message ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: status.message
					}) : null,
					status ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: "到点提醒",
						value: status.reminderEnabled === false ? "已关闭" : "已开启"
					}) : null,
					status?.active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: "自动继续",
						value: status.autoResume ? `已开启 · 已重试 ${status.resumeAttempts ?? 0}/${status.maxResumeAttempts ?? 0} 次` : "已关闭"
					}) : null,
					status?.active ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dbp-toolbar",
						children: [status.autoResume ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dbp-btn",
							disabled: busy !== "idle" || source == null,
							onClick: () => void run("disable", () => source.disableRateLimitAutoResume()),
							children: busy === "disable" ? "处理中…" : "关闭自动继续"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dbp-btn",
							disabled: busy !== "idle" || source == null,
							onClick: () => void run("enable", () => source.enableRateLimitAutoResume()),
							children: busy === "enable" ? "处理中…" : "开启自动继续"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dbp-btn",
							disabled: busy !== "idle" || source == null,
							onClick: () => void run("cancel", () => source.cancelRateLimit()),
							children: busy === "cancel" ? "处理中…" : "取消提醒"
						})]
					}) : null,
					status?.active && !status.autoResume ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "开启自动继续后对之后撞限流的请求生效；本次已中断的回复需要重新发送。"
					}) : null
				]
			});
		}
		/** 限流提醒设置卡：到点提醒、自动继续、提前量、Webhook 等持久配置。 */
		function RateLimitSettingsCard(props) {
			const { reminder, autoResumeConfig, leadMinutes, maxAttempts, notifyUrl, disabled, onSave } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: "限流提醒",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "免费模型触发限流时，解析报错里的重置时间（相对时长 + UTC 钟点），换算成本地时间后提醒；可选在重置到点后自动继续。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dbp-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dbp-field-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-field-label",
								children: "到点提醒"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
								checked: reminder !== false,
								disabled,
								label: "限流到点提醒",
								onChange: (next) => onSave("rateLimitReminder", next)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dbp-field-hint",
							children: "关闭后不再发通知，但仍会在设置页显示重置时间。"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dbp-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dbp-field-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-field-label",
								children: "自动继续"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
								checked: autoResumeConfig === true,
								disabled,
								label: "限流重置后自动继续",
								onChange: (next) => onSave("rateLimitAutoResume", next)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dbp-field-hint",
							children: "写入配置、对之后所有撞限流的请求生效；上方状态卡的按钮只对当前运行生效。"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
						label: "提前提醒（分钟）",
						hint: "0 表示只在重置到点发一次；默认提前 5 分钟。",
						type: "number",
						value: leadMinutes,
						disabled,
						onSave: (v) => onSave("rateLimitReminderLeadMinutes", v)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
						label: "自动继续次数上限",
						hint: "重置到点后按指数退避重试，超过上限即放弃；默认 3。",
						type: "number",
						value: maxAttempts,
						disabled,
						onSave: (v) => onSave("rateLimitMaxResumeAttempts", v)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
						label: "通知 Webhook",
						hint: "可选：POST 一条 JSON（kind/code/message/resetAtUtc/resetAtLocal）。留空只写 Host 日志。",
						placeholder: "https://example.com/devin-rate-limit",
						value: notifyUrl,
						disabled,
						onSave: (v) => onSave("rateLimitNotifyUrl", v)
					})
				]
			});
		}
		/**
		* Devin Bridge 面板主体。
		*/
		function DevinBridgeCard({ form, discover, remote, rateLimit, embedded = true }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => form.subscribe(listener), () => form.getSnapshot(), () => form.getSnapshot());
			const [open, setOpen] = (0, react.useState)(!embedded);
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [fetching, setFetching] = (0, react.useState)(false);
			const [fetchError, setFetchError] = (0, react.useState)(null);
			const [quota, refreshQuota] = useQuota(remote);
			const [limit, limitReachable, refreshLimit] = useRateLimit(rateLimit);
			const value = snapshot.value;
			const disabled = !snapshot.writable || saving;
			const baseUrl = value?.baseUrl?.trim() || "server.codeium.com";
			const tokenSource = value?.token?.trim() ? "settings token" : "credentials.toml";
			const status = quota.data !== null ? {
				tone: "ok",
				text: `已连接 · ${baseUrl} · ${quota.data.plan ?? tokenSource}`
			} : quota.error !== null ? {
				tone: "error",
				text: `额度查询失败 · ${baseUrl} · ${tokenSource}`
			} : {
				tone: "loading",
				text: `连接中… · ${baseUrl} · ${tokenSource}`
			};
			const save = (0, react.useCallback)(async (field, fieldValue) => {
				if (!snapshot.writable) return;
				setSaving(true);
				setError(null);
				try {
					if (!(fieldValue === "" || fieldValue === void 0 || fieldValue === null ? await form.unset(field) : await form.set(field, fieldValue))) setError("设置写入被 Host 拒绝。");
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setSaving(false);
				}
			}, [form, snapshot.writable]);
			const fetchModels = (0, react.useCallback)(async () => {
				setFetching(true);
				setFetchError(null);
				try {
					const result = await discover();
					if (!result.ok) {
						setFetchError(result.error?.message ?? "拉取模型目录失败");
						return;
					}
					const candidates = result.value ?? [];
					const existing = new Map((value?.models ?? []).map((m) => [m.id, m]));
					const adopted = candidates.map((c) => {
						const prev = existing.get(c.id);
						return {
							id: c.id,
							name: c.name ?? prev?.name ?? c.id,
							...c.description ?? prev?.description ? { description: c.description ?? prev?.description } : {},
							contextWindow: c.contextWindow ?? prev?.contextWindow ?? 0,
							maxTokens: c.maxTokens ?? prev?.maxTokens ?? 65536,
							supportsImages: c.supportsImages ?? c.inputModalities?.includes("image") ?? prev?.supportsImages ?? false,
							...c.isPromo ?? prev?.isPromo ? { isPromo: true } : {},
							...c.isPremium ?? prev?.isPremium ? { isPremium: true } : {},
							...c.creditMultiplier ?? prev?.creditMultiplier ? { creditMultiplier: c.creditMultiplier ?? prev?.creditMultiplier } : {},
							...c.family ? { family: c.family } : {},
							...c.tiers ? { tiers: c.tiers } : {},
							...c.defaultEffort ? { defaultEffort: c.defaultEffort } : {}
						};
					});
					if (!await form.set("models", adopted)) setFetchError("设置写入被 Host 拒绝。");
				} catch (err) {
					setFetchError(err instanceof Error ? err.message : String(err));
				} finally {
					setFetching(false);
				}
			}, [
				discover,
				form,
				value?.models
			]);
			if (snapshot.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: embedded ? "dbp-card-wrap" : "dbp-page",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dbp-hint",
					children: "加载中…"
				}), STYLES]
			});
			if (snapshot.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: embedded ? "dbp-card-wrap" : "dbp-page",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dbp-hint",
					children: "设置服务不可用（内存模式）。"
				}), STYLES]
			});
			const body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dbp-body",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dbp-topbar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dbp-topbar-left",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-dot",
								style: { background: status.tone === "ok" ? "var(--dsw-alias-state-success-primary, #30a46c)" : status.tone === "error" ? "var(--dsw-alias-state-error-primary, #e5484d)" : "var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))" }
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-topbar-text",
								children: status.text
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dbp-btn",
							onClick: refreshQuota,
							children: "刷新"
						})]
					}),
					!snapshot.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "当前设置只读。"
					}) : null,
					quota.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: `额度不可用：${quota.error.message}`
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
						title: `额度${quota.data?.plan ? ` · ${quota.data.plan}` : ""}${quota.data?.stale ? " · 缓存快照" : ""}`,
						children: remote == null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dbp-hint",
							children: "额度服务未挂载。"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: "今日剩余",
								value: typeof quota.data?.dailyRemainingPercent === "number" ? `${quota.data.dailyRemainingPercent}%` : "—",
								tone: toneOf$1(quota.data?.dailyRemainingPercent)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, { percent: quota.data?.dailyRemainingPercent }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: "今日重置",
								value: resetLabel(quota.data?.dailyResetAt) || "—",
								tone: "var(--dsw-alias-label-secondary, #8a8a8a)"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: "本周剩余",
								value: typeof quota.data?.weeklyRemainingPercent === "number" ? `${quota.data.weeklyRemainingPercent}%` : "—",
								tone: toneOf$1(quota.data?.weeklyRemainingPercent)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, { percent: quota.data?.weeklyRemainingPercent }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: "本周重置",
								value: resetLabel(quota.data?.weeklyResetAt) || "—",
								tone: "var(--dsw-alias-label-secondary, #8a8a8a)"
							})
						] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateLimitStatusCard, {
						status: limit,
						reachable: limitReachable,
						source: rateLimit,
						onRefresh: refreshLimit,
						onError: setError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCatalog, {
						models: value?.models ?? [],
						hidden: value?.hiddenModels ?? [],
						disabled,
						onSetHidden: (next) => void save("hiddenModels", next),
						onFetch: () => void fetchModels(),
						fetching,
						fetchError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
						title: "连接设置",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
								label: "Token",
								hint: "Devin session token。留空自动读取 credentials.toml。",
								type: "password",
								placeholder: "devin-session-token$...",
								value: value?.token,
								disabled,
								onSave: (v) => void save("token", v)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
								label: "Base URL",
								hint: "Connect API 端点，默认 https://server.codeium.com。",
								placeholder: "https://server.codeium.com",
								value: value?.baseUrl,
								disabled,
								onSave: (v) => void save("baseUrl", v)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
								label: "代理",
								hint: "可选 http/https/socks5 代理 URL。",
								placeholder: "http://127.0.0.1:7890",
								value: value?.proxy,
								disabled,
								onSave: (v) => void save("proxy", v)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
								label: "强制 HTTP/1.1",
								hint: "某些代理下 Connect 流式需要 HTTP/1.1。",
								type: "checkbox",
								value: value?.forceHttp1,
								disabled,
								onSave: (v) => void save("forceHttp1", v)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateLimitSettingsCard, {
						reminder: value?.rateLimitReminder !== false,
						autoResumeConfig: value?.rateLimitAutoResume === true,
						leadMinutes: value?.rateLimitReminderLeadMinutes ?? 5,
						maxAttempts: value?.rateLimitMaxResumeAttempts ?? 3,
						notifyUrl: value?.rateLimitNotifyUrl ?? "",
						disabled,
						onSave: (field, next) => void save(field, next)
					}),
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-error",
						children: error
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dbp-hint",
						children: "token 留空时自动读取 Devin CLI 凭证（%APPDATA%\\devin\\credentials.toml）。"
					})
				]
			});
			if (!embedded) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dbp-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dbp-page-header",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dbp-page-title",
							children: "Devin Bridge"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dbp-page-desc",
							children: "Devin Connect LLM 适配器（swe-2 / glm-5.3）"
						})]
					}),
					body,
					STYLES
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dbp-card-wrap",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dbp-card-head",
						"aria-expanded": open,
						onClick: () => setOpen(!open),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-page-title",
								children: "Devin Bridge"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-page-desc",
								children: "Devin Connect LLM 适配器"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dbp-chevron",
								children: open ? "▼" : "▶"
							})
						]
					}),
					open ? body : null,
					STYLES
				]
			});
		}
		const STYLES = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
    .dbp-page { max-width: 640px; display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .dbp-card-wrap { display: flex; flex-direction: column; gap: 0; }
    .dbp-page-header { display: flex; flex-direction: column; gap: 2px; }
    .dbp-page-title { font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }
    .dbp-page-desc { font-size: 12px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-card-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); border-radius: 12px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
    .dbp-chevron { margin-left: auto; font-size: 10px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-body { display: flex; flex-direction: column; gap: 16px; padding-top: 12px; }
    .dbp-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .dbp-topbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .dbp-dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
    .dbp-topbar-text { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); overflow-wrap: anywhere; }
    .dbp-card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); }
    .dbp-card-title { margin: 0; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary, inherit); }
    .dbp-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .dbp-row-label { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); }
    .dbp-row-value { font-size: 13px; font-variant-numeric: tabular-nums; }
    .dbp-bar { height: 6px; border-radius: 999px; background: var(--dsw-alias-fill-l2, rgba(128,128,128,0.2)); overflow: hidden; }
    .dbp-bar-fill { height: 100%; border-radius: 999px; }
    .dbp-toolbar { display: flex; align-items: center; gap: 8px; }
    .dbp-search { flex: 1; min-width: 0; height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.35)); background: transparent; color: inherit; font-size: 12px; }
    .dbp-btn { flex: none; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.35)); background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
    .dbp-btn:disabled { opacity: 0.55; cursor: default; }
    .dbp-list { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; border-top: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.25)); }
    .dbp-model-row { display: flex; align-items: center; gap: 10px; padding: 6px 2px; border-bottom: 1px solid var(--dsw-alias-border, rgba(128,128,128,0.15)); }
    .dbp-model-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .dbp-model-id { font-size: 12.5px; color: var(--dsw-alias-label-primary, inherit); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dbp-model-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-toggle { position: relative; width: 30px; height: 18px; flex: none; padding: 0; border: none; border-radius: 999px; cursor: pointer; background: var(--dsw-alias-fill-l2, rgba(128,128,128,0.35)); }
    .dbp-toggle-on { background: var(--dsw-alias-state-business-primary, #4d6bfe); }
    .dbp-toggle:disabled { opacity: 0.55; cursor: default; }
    .dbp-toggle-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 999px; background: #fff; transition: left .15s; }
    .dbp-toggle-on .dbp-toggle-knob { left: 14px; }
    .dbp-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
    .dbp-error { margin: 0; font-size: 12px; color: var(--dsw-alias-state-error-primary, #e5484d); }
    .dbp-field { display: flex; flex-direction: column; gap: 4px; }
    .dbp-field-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .dbp-field-label { font-size: 13px; color: var(--dsw-alias-label-secondary, #8a8a8a); }
    .dbp-field-input { display: flex; align-items: center; gap: 8px; flex: 1; max-width: 380px; }
    .dbp-field-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8a8a8a); }
  ` });
		// src/client/QuotaPill.tsx
		/**
		* 会话输入区右侧的 Devin 额度胶囊（conversation.input.right）。
		*
		* 只在当前会话选中了 `devin` provider 的模型时显示，形如 "日 82% · 周 91%"，
		* 圆点颜色随剩余量变化；点击跳过 Host 缓存立刻问一次上游。
		*/
		const PROVIDER_ID$1 = "devin";
		const REFRESH_MS$1 = 6e4;
		const EMPTY_STORE$1 = {
			getSnapshot: () => null,
			subscribe: () => () => {}
		};
		function toneOf(percent) {
			if (percent === void 0) return "var(--dsw-alias-fill-tertiary, rgba(128,128,128,0.4))";
			if (percent <= 10) return "var(--dsw-alias-state-error-primary, #e5484d)";
			if (percent <= 30) return "var(--dsw-alias-state-warn-primary, #f5a524)";
			return "var(--dsw-alias-state-success-primary, #30a46c)";
		}
		function QuotaPill({ directory, quota, refreshQuota }) {
			const usable = directory !== null && directory !== void 0 && typeof directory.subscribe === "function" && typeof directory.getSnapshot === "function";
			const current = (0, react.useSyncExternalStore)(usable ? directory.subscribe : EMPTY_STORE$1.subscribe, usable ? directory.getSnapshot : EMPTY_STORE$1.getSnapshot, usable ? directory.getSnapshot : EMPTY_STORE$1.getSnapshot)?.current ?? null;
			const active = current?.provider === PROVIDER_ID$1;
			const [data, setData] = (0, react.useState)(null);
			const alive = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async (fresh) => {
				const call = fresh ? refreshQuota : quota;
				if (!call) {
					if (alive.current) setData(null);
					return;
				}
				try {
					const result = await call();
					if (alive.current) setData(result.ok ? result.value : null);
				} catch {
					if (alive.current) setData(null);
				}
			}, [quota, refreshQuota]);
			(0, react.useEffect)(() => {
				if (!active) {
					setData(null);
					return;
				}
				load(false);
				const timer = setInterval(() => void load(false), REFRESH_MS$1);
				return () => clearInterval(timer);
			}, [active, load]);
			if (!active || data === null) return null;
			const daily = data.dailyRemainingPercent;
			const weekly = data.weeklyRemainingPercent;
			const segments = [];
			if (typeof daily === "number") segments.push({
				key: "d",
				text: `日 ${daily}%`,
				tone: toneOf(daily)
			});
			if (typeof weekly === "number") segments.push({
				key: "w",
				text: `周 ${weekly}%`,
				tone: toneOf(weekly)
			});
			if (segments.length === 0) segments.push({
				key: "x",
				text: "额度",
				tone: toneOf(void 0)
			});
			const parts = [`Devin${data.plan ? ` ${data.plan}` : ""}`];
			if (typeof current?.model === "string") parts.push(current.model);
			if (typeof daily === "number") parts.push(`今日剩余 ${daily}%`);
			if (typeof weekly === "number") parts.push(`本周剩余 ${weekly}%`);
			if (data.stale) parts.push("（缓存快照）");
			parts.push("点击立即刷新");
			const label = parts.join(" · ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "status",
				"aria-label": label,
				title: label,
				onClick: () => void load(true),
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					padding: "2px 8px",
					borderRadius: 999,
					border: "1px solid var(--dsw-alias-border, rgba(128,128,128,0.35))",
					color: "inherit",
					fontSize: 11,
					lineHeight: "16px",
					whiteSpace: "nowrap",
					userSelect: "none",
					cursor: "pointer"
				},
				children: segments.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 6
					},
					children: [
						index === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							style: {
								width: 1,
								height: 10,
								display: "inline-block",
								background: "var(--dsw-alias-border, rgba(128,128,128,0.35))"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							style: {
								width: 6,
								height: 6,
								borderRadius: 999,
								background: segment.tone,
								display: "inline-block"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: segment.text })
					]
				}, segment.key))
			});
		}
		// src/client/RateLimitPill.tsx
		/**
		* 会话输入区右侧的限流状态胶囊（conversation.input.right）。
		*
		* 只在当前会话选中了 `devin` provider 的模型、且有挂起的限流周期时显示，
		* 形如「限流 · 1 小时 43 分钟后重置」，自动继续开启时追加尝试进度；
		* 倒计时每秒本地递减，点击立即刷新。
		*/
		const PROVIDER_ID = "devin";
		const REFRESH_MS = 15e3;
		const EMPTY_STORE = {
			getSnapshot: () => null,
			subscribe: () => () => {}
		};
		const WARN = "var(--dsw-alias-state-warn-primary, #f5a524)";
		function RateLimitPill({ directory, status }) {
			const usable = directory !== null && directory !== void 0 && typeof directory.subscribe === "function" && typeof directory.getSnapshot === "function";
			const current = (0, react.useSyncExternalStore)(usable ? directory.subscribe : EMPTY_STORE.subscribe, usable ? directory.getSnapshot : EMPTY_STORE.getSnapshot, usable ? directory.getSnapshot : EMPTY_STORE.getSnapshot)?.current ?? null;
			const active = current?.provider === PROVIDER_ID;
			const [data, setData] = (0, react.useState)(null);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const alive = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async () => {
				if (!status) {
					if (alive.current) setData(null);
					return;
				}
				try {
					const result = await status();
					if (alive.current) setData(result.ok ? result.value : null);
				} catch {
					if (alive.current) setData(null);
				}
			}, [status]);
			(0, react.useEffect)(() => {
				if (!active) {
					setData(null);
					return;
				}
				load();
				const timer = setInterval(() => void load(), REFRESH_MS);
				return () => clearInterval(timer);
			}, [active, load]);
			const pending = data?.active === true && typeof data.resetAt === "number";
			(0, react.useEffect)(() => {
				if (!pending) return void 0;
				const timer = setInterval(() => setNow(Date.now()), 1e3);
				return () => clearInterval(timer);
			}, [pending]);
			if (!active || !pending) return null;
			const segments = [{
				key: "wait",
				text: `限流 · ${describeMs(Math.max(0, (data?.resetAt ?? now) - now))}后重置`
			}];
			if (data?.autoResume) segments.push({
				key: "auto",
				text: `自动 ${data.resumeAttempts ?? 0}/${data.maxResumeAttempts ?? 0}`
			});
			const parts = [`Devin${current?.model ? ` ${current.model}` : ""} 触发限流`];
			if (data?.code) parts[0] += `（${data.code}）`;
			if (data?.resetAtLocal) parts.push(`${data.resetAtLocal} 重置`);
			parts.push(data?.autoResume ? "自动继续已开启" : "仅提醒");
			parts.push("点击立即刷新");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "status",
				"aria-label": parts.join(" · "),
				title: parts.join(" · "),
				onClick: () => void load(),
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					padding: "2px 8px",
					borderRadius: 999,
					border: "1px solid var(--dsw-alias-state-warn-primary, #f5a524)",
					color: "inherit",
					fontSize: 11,
					lineHeight: "16px",
					whiteSpace: "nowrap",
					userSelect: "none",
					cursor: "pointer"
				},
				children: segments.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 6
					},
					children: [
						index === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							style: {
								width: 1,
								height: 10,
								display: "inline-block",
								background: "var(--dsw-alias-border, rgba(128,128,128,0.35))"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							style: {
								width: 6,
								height: 6,
								borderRadius: 999,
								background: WARN,
								display: "inline-block"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: segment.text })
					]
				}, segment.key))
			});
		}
		// src/client/remote.ts
		const passthrough = (name) => ({
			mode: "strict",
			typeSymbol: `dsh-plugin-devin-bridge#${name}`,
			create: () => ({ parse: (value) => value })
		});
		const descriptor = (method, resultName = "DevinQuota") => ({
			id: `dsh-plugin-devin-bridge#devin/${method}`,
			service: "devin",
			namespace: "devin",
			method,
			invocation: { kind: "direct" },
			parameters: [],
			result: passthrough(resultName)
		});
		/** Mirrors src/typert.ts — method names must match the Host manifest. */
		const CONTRIBUTION = {
			package: "dsh-plugin-devin-bridge",
			descriptors: [
				descriptor("quota"),
				descriptor("refreshQuota"),
				descriptor("catalog", "DevinCatalog"),
				descriptor("rateLimit", "DevinRateLimitStatus"),
				descriptor("cancelRateLimit", "DevinRateLimitStatus"),
				descriptor("enableRateLimitAutoResume", "DevinRateLimitStatus"),
				descriptor("disableRateLimitAutoResume", "DevinRateLimitStatus")
			]
		};
		/**
		* Mount the contribution and resolve the `remote.devin` namespace.
		* Returns the namespace plus an async disposer for the effect cleanup.
		*/
		async function mountDevinRemote(ctx) {
			const remote = ctx.remote;
			if (remote == null || typeof remote.$mount !== "function") throw new Error("the remote service is not available in this composition");
			const dispose = await remote.$mount(CONTRIBUTION);
			const namespace = ctx.get?.("remote.devin");
			if (namespace == null) {
				await dispose();
				throw new Error("remote.devin is missing after mounting the contribution");
			}
			return {
				remote: namespace,
				dispose
			};
		}
		// src/client/index.tsx
		/** Settings namespace — 等于 cordis.patch.yml 里的 entry id。 */
		const SETTINGS_NS = "devin-bridge";
		/** Required services: slot registry + config forms + remote namespaces。 */
		const inject = [
			"slots",
			"configForms",
			"remote",
			"remote.llm"
		];
		/**
		* 注册 Devin 配置页面与输入区额度胶囊。
		* `slots.inject` 等待槽位声明后再挂载，组合顺序无关。
		* @param ctx - 客户端插件上下文。
		*/
		function apply(ctx) {
			let devinRemote = null;
			ctx.effect(() => {
				let cancelled = false;
				let dispose;
				mountDevinRemote(ctx).then(({ remote, dispose: d }) => {
					if (cancelled) {
						d();
						return;
					}
					devinRemote = remote;
					dispose = d;
				}).catch(() => {
					devinRemote = null;
				});
				return () => {
					cancelled = true;
					devinRemote = null;
					if (dispose) dispose();
				};
			}, "devin-bridge: remote mount");
			const unmounted = () => Promise.reject(/* @__PURE__ */ new Error("remote.devin not mounted"));
			const quotaProxy = {
				quota: () => devinRemote?.quota() ?? unmounted(),
				refreshQuota: () => devinRemote?.refreshQuota() ?? unmounted()
			};
			const rateLimitProxy = {
				rateLimit: () => devinRemote?.rateLimit() ?? unmounted(),
				cancelRateLimit: () => devinRemote?.cancelRateLimit() ?? unmounted(),
				enableRateLimitAutoResume: () => devinRemote?.enableRateLimitAutoResume() ?? unmounted(),
				disableRateLimitAutoResume: () => devinRemote?.disableRateLimitAutoResume() ?? unmounted()
			};
			const face = (embedded) => () => ({
				embedded,
				form: ctx.configForms.get(SETTINGS_NS),
				discover: () => devinRemote?.catalog() ?? unmounted(),
				remote: quotaProxy,
				rateLimit: rateLimitProxy
			});
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "devin",
				order: 25,
				label: () => "Devin",
				inject: face(false)
			}, DevinBridgeCard)), "devin-bridge: settings section");
			ctx.effect(() => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "dsh-plugin-devin-bridge",
				inject: face(true)
			}, DevinBridgeCard)), "devin-bridge: bundle config card");
			ctx.inject(["modelDirectories"], (scope) => {
				scope.slots.inject("conversation.input.right", () => scope.slots.register({
					name: "conversation.input.right",
					id: "devin-quota",
					order: 1e3,
					inject: (sessionId) => {
						try {
							return {
								directory: scope.modelDirectories.directoryFor(sessionId).store,
								quota: () => devinRemote?.quota() ?? unmounted(),
								refreshQuota: () => devinRemote?.refreshQuota() ?? unmounted()
							};
						} catch {
							return {
								directory: void 0,
								quota: null,
								refreshQuota: null
							};
						}
					}
				}, QuotaPill));
				scope.slots.inject("conversation.input.right", () => scope.slots.register({
					name: "conversation.input.right",
					id: "devin-rate-limit",
					order: 1001,
					inject: (sessionId) => {
						try {
							return {
								directory: scope.modelDirectories.directoryFor(sessionId).store,
								status: () => devinRemote?.rateLimit() ?? unmounted()
							};
						} catch {
							return {
								directory: void 0,
								status: null
							};
						}
					}
				}, RateLimitPill));
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map