window.__ModuleLoader__.load({
	id: "dsh-plugin-devin-bridge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/DevinBridgeCard.tsx
		/**
		* Devin Bridge 配置卡片组件。
		*
		* 在 Plugins 设置页面渲染，让用户编辑 token、baseUrl、proxy
		* 和模型列表。通过 settings scope 读写 host 端的 namespace。
		*/
		const FIELDS = [
			{
				key: "token",
				label: "Token",
				hint: "Devin session token (devin-session-token$...). Leave empty to auto-detect from credentials.toml.",
				type: "password",
				placeholder: "devin-session-token$..."
			},
			{
				key: "baseUrl",
				label: "Base URL",
				hint: "Devin Connect endpoint.",
				type: "text",
				placeholder: "https://server.codeium.com"
			},
			{
				key: "proxy",
				label: "Proxy",
				hint: "Outbound proxy URL (http/https/socks5). Leave empty for direct connection.",
				type: "text",
				placeholder: "socks5://127.0.0.1:1080"
			},
			{
				key: "forceHttp1",
				label: "Force HTTP/1.1",
				hint: "Force HTTP/1.1 connection to Devin.",
				type: "checkbox"
			},
			{
				key: "defaultContextWindow",
				label: "Default Context Window",
				hint: "Fallback context window in tokens.",
				type: "number",
				placeholder: "128000"
			},
			{
				key: "defaultMaxTokens",
				label: "Default Max Tokens",
				hint: "Fallback max output tokens.",
				type: "number",
				placeholder: "16384"
			}
		];
		/**
		* 渲染 Devin Bridge 配置卡片。
		* @param props - settings scope 注入的 props。
		* @returns 配置表单。
		*/
		function DevinBridgeCard({ scope }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const [open, setOpen] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const value = snapshot.value;
			const disabled = !snapshot.writable || saving;
			const loading = snapshot.status === "loading";
			const handleSaveField = (0, react.useCallback)(async (field, fieldValue) => {
				if (!snapshot.writable) return;
				setSaving(true);
				setError(null);
				try {
					if (fieldValue === "" || fieldValue === void 0 || fieldValue === null) await scope.unset(field);
					else await scope.set(field, fieldValue);
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setSaving(false);
				}
			}, [scope, snapshot.writable]);
			if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "devin-bridge-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "devin-bridge-card-header",
					children: "Devin Bridge"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "devin-bridge-hint",
					children: "Loading…"
				})]
			});
			if (snapshot.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "devin-bridge-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "devin-bridge-card-header",
					children: "Devin Bridge"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "devin-bridge-hint",
					children: "Settings unavailable (running in memory mode)."
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "devin-bridge-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "devin-bridge-card-header",
						"aria-expanded": open,
						onClick: () => setOpen(!open),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-card-title",
								children: "Devin Bridge"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-card-desc",
								children: "Devin Connect LLM adapter (glm-5.2 / swe-1.7)"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-chevron",
								children: open ? "▼" : "▶"
							})
						]
					}),
					open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-card-body",
						children: [
							!snapshot.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "devin-bridge-readonly",
								role: "status",
								children: "Read-only settings provider."
							}),
							FIELDS.map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
								def: field,
								value: value?.[field.key],
								disabled,
								onSave: handleSaveField
							}, field.key)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "devin-bridge-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "devin-bridge-field-label",
										children: "Models"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "devin-bridge-field-hint",
										children: "Models shown in the selector. Use the Models settings page \"Fetch available models\" button to discover Devin's full catalog."
									}),
									value?.models && value.models.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: "devin-bridge-model-list",
										children: value.models.map((model, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											className: "devin-bridge-model-item",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "devin-bridge-model-id",
													children: model.id
												}),
												model.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "devin-bridge-model-name",
													children: model.name
												}),
												model.supportsImages && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "devin-bridge-model-tag",
													children: "vision"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "devin-bridge-model-remove",
													disabled,
													onClick: () => {
														const next = value.models.filter((_, i) => i !== index);
														handleSaveField("models", next);
													},
													children: "Remove"
												})
											]
										}, model.id + index))
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "devin-bridge-hint",
										children: "No models configured. Defaults will be used."
									})
								]
							}),
							error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "devin-bridge-error",
								role: "status",
								children: error
							}),
							saving && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "devin-bridge-hint",
								children: "Saving…"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
        .devin-bridge-card {
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 12px;
          flex-direction: column;
          gap: 12px;
          padding: 12px 14px;
          display: flex;
          list-style: none;
        }
        .devin-bridge-card-header {
          align-items: center;
          gap: 10px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          font: inherit;
          padding: 0;
          text-align: left;
        }
        .devin-bridge-card-title {
          color: var(--dsw-alias-label-primary);
          font-size: 14px;
          font-weight: 500;
        }
        .devin-bridge-card-desc {
          color: var(--dsw-alias-label-tertiary);
          font-size: 13px;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .devin-bridge-chevron {
          color: var(--dsw-alias-label-secondary);
          font-size: 12px;
        }
        .devin-bridge-card-body {
          flex-direction: column;
          gap: 12px;
          display: flex;
        }
        .devin-bridge-field {
          flex-direction: column;
          gap: 4px;
          display: flex;
        }
        .devin-bridge-field-label {
          color: var(--dsw-alias-label-secondary);
          font-size: 13px;
        }
        .devin-bridge-field-hint {
          color: var(--dsw-alias-label-tertiary);
          font-size: 12px;
          line-height: 18px;
          margin: 0;
        }
        .devin-bridge-input {
          border: 1px solid var(--dsw-alias-border-l2);
          background: var(--dsw-alias-bg-base);
          color: var(--dsw-alias-label-primary);
          border-radius: 8px;
          padding: 6px 10px;
          font: inherit;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
        }
        .devin-bridge-input:focus {
          outline: 2px solid var(--dsw-alias-state-business-primary);
          outline-offset: 1px;
        }
        .devin-bridge-input:disabled {
          opacity: 0.5;
        }
        .devin-bridge-checkbox {
          width: 16px;
          height: 16px;
        }
        .devin-bridge-readonly {
          color: var(--dsw-alias-state-warn-label);
          font-size: 12px;
          margin: 0;
        }
        .devin-bridge-hint {
          color: var(--dsw-alias-label-tertiary);
          font-size: 13px;
          margin: 0;
        }
        .devin-bridge-error {
          color: var(--dsw-alias-state-error-primary);
          font-size: 12px;
          margin: 0;
        }
        .devin-bridge-model-list {
          flex-direction: column;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
        }
        .devin-bridge-model-item {
          align-items: center;
          gap: 8px;
          border: 1px solid var(--dsw-alias-border-l1);
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          font-size: 13px;
        }
        .devin-bridge-model-id {
          color: var(--dsw-alias-label-primary);
          font-weight: 500;
        }
        .devin-bridge-model-name {
          color: var(--dsw-alias-label-secondary);
        }
        .devin-bridge-model-tag {
          border: 1px solid var(--dsw-alias-border-l3);
          border-radius: 4px;
          color: var(--dsw-alias-label-secondary);
          font-size: 11px;
          padding: 1px 6px;
        }
        .devin-bridge-model-remove {
          background: none;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 6px;
          color: var(--dsw-alias-label-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          margin-left: auto;
          padding: 2px 8px;
        }
        .devin-bridge-model-remove:hover:not(:disabled) {
          background: var(--dsw-alias-interactive-bg-hover-solid);
          color: var(--dsw-alias-label-primary);
        }
        .devin-bridge-model-remove:disabled {
          opacity: 0.5;
        }
      ` })
				]
			});
		}
		/** 单个字段行。 */
		function FieldRow({ def, value, disabled, onSave }) {
			const [draft, setDraft] = (0, react.useState)(() => formatValue(value, def.type));
			if (draft !== formatValue(value, def.type) && draft === formatValue(value, def.type)) {}
			const handleBlur = () => {
				if (def.type === "checkbox") return;
				const trimmed = draft.trim();
				if (trimmed === "") onSave(def.key, "");
				else if (def.type === "number") {
					const num = Number(trimmed);
					if (Number.isFinite(num) && num > 0) onSave(def.key, num);
				} else onSave(def.key, trimmed);
			};
			if (def.type === "checkbox") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "devin-bridge-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "8px",
						cursor: "pointer"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "devin-bridge-checkbox",
						checked: Boolean(value),
						disabled,
						onChange: (e) => onSave(def.key, e.target.checked)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "devin-bridge-field-label",
						children: def.label
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "devin-bridge-field-hint",
					children: def.hint
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "devin-bridge-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "devin-bridge-field-label",
						children: def.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "devin-bridge-input",
						type: def.type === "password" ? "password" : def.type === "number" ? "number" : "text",
						value: draft,
						placeholder: def.placeholder,
						disabled,
						autoComplete: "off",
						onChange: (e) => setDraft(e.target.value),
						onBlur: handleBlur
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "devin-bridge-field-hint",
						children: def.hint
					})
				]
			});
		}
		/** 格式化值为字符串。 */
		function formatValue(value, type) {
			if (type === "checkbox") return "";
			if (typeof value === "number") return String(value);
			if (typeof value === "string") return value;
			return "";
		}
		//#endregion
		//#region src/client/index.tsx
		/** Settings namespace — 必须和 host 端 settingsNamespace(name) 一致。 */
		const SETTINGS_NS = "dsh-plugin-devin-bridge";
		/** Required services: slot registry + settings scope binder。 */
		const inject = ["slots", "settingsScope"];
		/**
		* 注册 Devin Bridge 配置卡片到 Plugins 设置页面。
		* @param ctx - 客户端插件上下文。
		*/
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NS });
			ctx.slots.inject("settings.plugin.item", function* () {
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: SETTINGS_NS,
					inject: () => ({ scope })
				}, DevinBridgeCard);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map