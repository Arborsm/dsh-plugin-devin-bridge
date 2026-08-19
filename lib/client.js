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
		* 模型管理支持：
		* - 从 Devin 服务器动态拉取可用模型（Fetch available models）
		* - 手动添加模型
		* - 编辑模型详情（name/contextWindow/maxTokens/supportsImages/description）
		* - 删除已配置模型
		*/
		/** Provider route key — 必须和 host 端 PROVIDER 一致。 */
		const PROVIDER = "devin";
		/** Settings namespace — 必须和 host 端一致。 */
		const SETTINGS_NS$1 = "dsh-plugin-devin-bridge";
		/**
		* 渲染 Devin Bridge 配置卡片。
		* @param props - settings scope 和 api 注入的 props。
		* @returns 配置表单。
		*/
		function DevinBridgeCard({ scope, api }) {
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
			const handleSaveModels = (0, react.useCallback)(async (models) => {
				await handleSaveField("models", models);
			}, [handleSaveField]);
			if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "devin-bridge-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "devin-bridge-card-header",
						children: "Devin Bridge"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "devin-bridge-hint",
						children: "Loading…"
					}),
					STYLES
				]
			});
			if (snapshot.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "devin-bridge-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "devin-bridge-card-header",
						children: "Devin Bridge"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "devin-bridge-hint",
						children: "Settings unavailable (running in memory mode)."
					}),
					STYLES
				]
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelManager, {
								models: value?.models ?? [],
								disabled,
								api,
								onSave: handleSaveModels,
								onError: setError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: "devin-bridge-advanced",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
									className: "devin-bridge-advanced-summary",
									children: "Advanced settings"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "devin-bridge-advanced-body",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.token,
											value: value?.token,
											disabled,
											onSave: handleSaveField
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.baseUrl,
											value: value?.baseUrl,
											disabled,
											onSave: handleSaveField
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.proxy,
											value: value?.proxy,
											disabled,
											onSave: handleSaveField
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.forceHttp1,
											value: value?.forceHttp1,
											disabled,
											onSave: handleSaveField
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.defaultContextWindow,
											value: value?.defaultContextWindow,
											disabled,
											onSave: handleSaveField
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
											def: ADVANCED_FIELDS.defaultMaxTokens,
											value: value?.defaultMaxTokens,
											disabled,
											onSave: handleSaveField
										})
									]
								})]
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
					STYLES
				]
			});
		}
		/** 高级选项字段定义。 */
		const ADVANCED_FIELDS = {
			token: {
				key: "token",
				label: "Token",
				hint: "Devin session token. Leave empty to auto-detect from credentials.toml.",
				type: "password",
				placeholder: "devin-session-token$..."
			},
			baseUrl: {
				key: "baseUrl",
				label: "Base URL",
				hint: "Devin Connect endpoint.",
				type: "text",
				placeholder: "https://server.codeium.com"
			},
			proxy: {
				key: "proxy",
				label: "Proxy",
				hint: "Outbound proxy URL. Leave empty for direct connection.",
				type: "text",
				placeholder: "socks5://127.0.0.1:1080"
			},
			forceHttp1: {
				key: "forceHttp1",
				label: "Force HTTP/1.1",
				hint: "Force HTTP/1.1 connection to Devin.",
				type: "checkbox"
			},
			defaultContextWindow: {
				key: "defaultContextWindow",
				label: "Default Context Window",
				hint: "Fallback context window in tokens.",
				type: "number",
				placeholder: "200000"
			},
			defaultMaxTokens: {
				key: "defaultMaxTokens",
				label: "Default Max Tokens",
				hint: "Fallback max output tokens.",
				type: "number",
				placeholder: "16384"
			}
		};
		/** 模型管理组件：fetch + 手动添加 + 列表 + 编辑 + 删除。 */
		function ModelManager({ models, disabled, api, onSave, onError }) {
			const [fetching, setFetching] = (0, react.useState)(false);
			const [candidates, setCandidates] = (0, react.useState)(null);
			const [picked, setPicked] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [showAddManual, setShowAddManual] = (0, react.useState)(false);
			const [manualId, setManualId] = (0, react.useState)("");
			const [manualName, setManualName] = (0, react.useState)("");
			const [editingIndex, setEditingIndex] = (0, react.useState)(null);
			const handleFetch = async () => {
				setFetching(true);
				onError(null);
				try {
					const response = await api.llm.discoverModels({
						settingsNs: SETTINGS_NS$1,
						provider: PROVIDER
					});
					if (!response.result.ok) {
						onError(response.result.error.message);
						return;
					}
					const found = response.result.value.models;
					if (found.length === 0) {
						onError("The provider listed no models.");
						return;
					}
					const known = new Set(models.map((m) => m.id));
					setCandidates(found);
					setPicked(new Set(found.filter((m) => !known.has(m.id)).map((m) => m.id)));
				} catch (err) {
					onError(err instanceof Error ? err.message : String(err));
				} finally {
					setFetching(false);
				}
			};
			const togglePick = (id) => {
				setPicked((current) => {
					const next = new Set(current);
					if (!next.delete(id)) next.add(id);
					return next;
				});
			};
			const adoptPicked = async () => {
				if (candidates === null) return;
				const byId = new Map(models.map((m) => [m.id, m]));
				for (const candidate of candidates) {
					if (!picked.has(candidate.id)) continue;
					if (!byId.has(candidate.id)) {
						const rawLabel = candidate.name?.replace(/\s*\[(?:Free|Premium)\]\s*/g, "").replace(/\s*\([\d.]+x\)\s*/g, "").trim() ?? candidate.id;
						const effort = rawLabel.match(/\b(Max|High|Medium|Low|No Thinking|Lightning)\b/i)?.[0];
						let family = rawLabel;
						if (effort) family = rawLabel.replace(new RegExp(`\\s*${effort}\\s*`, "i"), "").trim();
						if (family.includes("Lightning")) family = family.replace(/\s*Lightning\s*/i, "").trim();
						const isFree = candidate.name?.includes("[Free]") ?? false;
						const isPremium = candidate.name?.includes("[Premium]") ?? false;
						const multMatch = candidate.name?.match(/\(([\d.]+)x\)/);
						const creditMultiplier = multMatch ? Number(multMatch[1]) : void 0;
						byId.set(candidate.id, {
							id: candidate.id,
							...rawLabel ? { name: rawLabel } : {},
							...candidate.contextWindow ? { contextWindow: candidate.contextWindow } : {},
							...candidate.maxTokens ? { maxTokens: candidate.maxTokens } : {},
							...family ? { family } : {},
							...effort ? { effort } : {},
							...isFree ? { isFree: true } : {},
							...isPremium ? { isPremium: true } : {},
							...creditMultiplier ? { creditMultiplier } : {}
						});
					}
				}
				await onSave([...byId.values()]);
				setCandidates(null);
				setPicked(/* @__PURE__ */ new Set());
			};
			const handleAddManual = async () => {
				const id = manualId.trim();
				if (!id) return;
				if (models.some((m) => m.id === id)) {
					onError(`Model "${id}" already exists.`);
					return;
				}
				await onSave([...models, {
					id,
					...manualName.trim() ? { name: manualName.trim() } : {}
				}]);
				setManualId("");
				setManualName("");
				setShowAddManual(false);
			};
			const handleRemove = async (index) => {
				await onSave(models.filter((_, i) => i !== index));
				if (editingIndex === index) setEditingIndex(null);
			};
			const handleUpdateModel = async (index, updated) => {
				await onSave(models.map((m, i) => i === index ? updated : m));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "devin-bridge-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "devin-bridge-field-label",
						children: "Models"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "devin-bridge-field-hint",
						children: "Models shown in the selector. Fetch from Devin to discover available models, or add manually by id."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-model-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "devin-bridge-btn",
							disabled: disabled || fetching,
							onClick: handleFetch,
							children: fetching ? "Fetching…" : "Fetch available models"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "devin-bridge-btn devin-bridge-btn-secondary",
							disabled,
							onClick: () => setShowAddManual(!showAddManual),
							children: showAddManual ? "Cancel" : "Add manually"
						})]
					}),
					showAddManual && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-manual-add",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "text",
								placeholder: "Model id (e.g. glm-5-2)",
								value: manualId,
								onChange: (e) => setManualId(e.target.value),
								disabled
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "text",
								placeholder: "Display name (optional)",
								value: manualName,
								onChange: (e) => setManualName(e.target.value),
								disabled
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "devin-bridge-btn",
								disabled: disabled || !manualId.trim(),
								onClick: handleAddManual,
								children: "Add"
							})
						]
					}),
					candidates !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-fetch-picker",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "devin-bridge-field-hint",
								children: [
									"Choose models to add (",
									candidates.length,
									" available, ",
									picked.size,
									" selected):"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: "devin-bridge-candidate-list",
								children: candidates.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: "devin-bridge-candidate-item",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "devin-bridge-candidate-label",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												className: "devin-bridge-checkbox",
												checked: picked.has(model.id),
												onChange: () => togglePick(model.id)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "devin-bridge-model-id",
												children: model.id
											}),
											model.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "devin-bridge-model-name",
												children: model.name
											}),
											model.contextWindow && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "devin-bridge-model-tag",
												children: [(model.contextWindow / 1e3).toFixed(0), "k ctx"]
											})
										]
									})
								}, model.id))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "devin-bridge-model-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "devin-bridge-btn",
									disabled: disabled || picked.size === 0,
									onClick: adoptPicked,
									children: [
										"Add selected (",
										picked.size,
										")"
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "devin-bridge-btn devin-bridge-btn-secondary",
									onClick: () => {
										setCandidates(null);
										setPicked(/* @__PURE__ */ new Set());
									},
									children: "Close"
								})]
							})
						]
					}),
					models.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "devin-bridge-model-list",
						children: models.map((model, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "devin-bridge-model-item-wrap",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
									model.isFree && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "devin-bridge-model-tag devin-bridge-tag-free",
										children: "Free"
									}),
									model.isPremium && !model.isFree && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "devin-bridge-model-tag devin-bridge-tag-premium",
										children: "Premium"
									}),
									model.effort && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "devin-bridge-model-tag",
										children: model.effort
									}),
									model.supportsImages && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "devin-bridge-model-tag",
										children: "vision"
									}),
									model.contextWindow && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "devin-bridge-model-tag",
										children: [(model.contextWindow / 1e3).toFixed(0), "k ctx"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "devin-bridge-model-edit",
										disabled,
										onClick: () => setEditingIndex(editingIndex === index ? null : index),
										children: editingIndex === index ? "Close" : "Edit"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "devin-bridge-model-remove",
										disabled,
										onClick: () => handleRemove(index),
										children: "Remove"
									})
								]
							}), editingIndex === index && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelEditor, {
								model,
								disabled,
								onSave: (updated) => handleUpdateModel(index, updated),
								onClose: () => setEditingIndex(null)
							})]
						}, model.id + index))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "devin-bridge-hint",
						children: "No models configured. Defaults will be used."
					})
				]
			});
		}
		/** 模型编辑器：编辑单个模型的详情字段。 */
		function ModelEditor({ model, disabled, onSave, onClose }) {
			const [draft, setDraft] = (0, react.useState)({
				id: model.id,
				name: model.name ?? "",
				description: model.description ?? "",
				contextWindow: model.contextWindow?.toString() ?? "",
				maxTokens: model.maxTokens?.toString() ?? "",
				supportsImages: model.supportsImages ?? false,
				family: model.family ?? "",
				effort: model.effort ?? "",
				isPremium: model.isPremium ?? false,
				isFree: model.isFree ?? false,
				creditMultiplier: model.creditMultiplier?.toString() ?? ""
			});
			const handleSave = async () => {
				await onSave({
					id: draft.id,
					...draft.name.trim() ? { name: draft.name.trim() } : {},
					...draft.description.trim() ? { description: draft.description.trim() } : {},
					...draft.contextWindow.trim() ? { contextWindow: Number(draft.contextWindow) } : {},
					...draft.maxTokens.trim() ? { maxTokens: Number(draft.maxTokens) } : {},
					...draft.supportsImages ? { supportsImages: true } : {},
					...draft.family.trim() ? { family: draft.family.trim() } : {},
					...draft.effort.trim() ? { effort: draft.effort.trim() } : {},
					...draft.isPremium ? { isPremium: true } : {},
					...draft.isFree ? { isFree: true } : {},
					...draft.creditMultiplier.trim() ? { creditMultiplier: Number(draft.creditMultiplier) } : {}
				});
				onClose();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "devin-bridge-model-editor",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "devin-bridge-field-label",
							children: "ID"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "devin-bridge-input",
							type: "text",
							value: draft.id,
							disabled: true
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "devin-bridge-field-label",
							children: "Name"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "devin-bridge-input",
							type: "text",
							value: draft.name,
							disabled,
							onChange: (e) => setDraft({
								...draft,
								name: e.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "devin-bridge-field-label",
							children: "Description"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "devin-bridge-input",
							type: "text",
							value: draft.description,
							disabled,
							onChange: (e) => setDraft({
								...draft,
								description: e.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-editor-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "devin-bridge-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Context Window"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "number",
								value: draft.contextWindow,
								placeholder: "200000",
								disabled,
								onChange: (e) => setDraft({
									...draft,
									contextWindow: e.target.value
								})
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "devin-bridge-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Max Tokens"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "number",
								value: draft.maxTokens,
								placeholder: "16384",
								disabled,
								onChange: (e) => setDraft({
									...draft,
									maxTokens: e.target.value
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "devin-bridge-checkbox-label",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							className: "devin-bridge-checkbox",
							checked: draft.supportsImages,
							disabled,
							onChange: (e) => setDraft({
								...draft,
								supportsImages: e.target.checked
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "devin-bridge-field-label",
							children: "Supports Images"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-editor-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "devin-bridge-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Family"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "text",
								value: draft.family,
								placeholder: "GLM-5.2",
								disabled,
								onChange: (e) => setDraft({
									...draft,
									family: e.target.value
								})
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "devin-bridge-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Effort"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "text",
								value: draft.effort,
								placeholder: "High",
								disabled,
								onChange: (e) => setDraft({
									...draft,
									effort: e.target.value
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "devin-bridge-editor-row",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "devin-bridge-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Credit Multiplier"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "devin-bridge-input",
								type: "number",
								value: draft.creditMultiplier,
								placeholder: "1.5",
								disabled,
								onChange: (e) => setDraft({
									...draft,
									creditMultiplier: e.target.value
								})
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-editor-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "devin-bridge-checkbox-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "devin-bridge-checkbox",
								checked: draft.isFree,
								disabled,
								onChange: (e) => setDraft({
									...draft,
									isFree: e.target.checked
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Free (promo)"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "devin-bridge-checkbox-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "devin-bridge-checkbox",
								checked: draft.isPremium,
								disabled,
								onChange: (e) => setDraft({
									...draft,
									isPremium: e.target.checked
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "devin-bridge-field-label",
								children: "Premium"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "devin-bridge-model-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "devin-bridge-btn",
							disabled,
							onClick: handleSave,
							children: "Save"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "devin-bridge-btn devin-bridge-btn-secondary",
							onClick: onClose,
							children: "Cancel"
						})]
					})
				]
			});
		}
		/** 单个字段行。 */
		function FieldRow({ def, value, disabled, onSave }) {
			const [draft, setDraft] = (0, react.useState)(() => formatValue(value, def.type));
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
					className: "devin-bridge-checkbox-label",
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
		/** 内联样式。 */
		const STYLES = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
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
    .devin-bridge-advanced {
      border-top: 1px solid var(--dsw-alias-border-l2);
      padding-top: 8px;
    }
    .devin-bridge-advanced-summary {
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font-size: 13px;
      padding: 4px 0;
    }
    .devin-bridge-advanced-body {
      flex-direction: column;
      gap: 12px;
      display: flex;
      padding-top: 8px;
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
    .devin-bridge-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
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
    .devin-bridge-model-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .devin-bridge-btn {
      background: var(--dsw-alias-button-primary-fill);
      color: var(--dsw-alias-label-primary-foreground);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      padding: 6px 12px;
    }
    .devin-bridge-btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    .devin-bridge-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .devin-bridge-btn-secondary {
      background: var(--dsw-alias-bg-base);
      color: var(--dsw-alias-label-primary);
      border: 1px solid var(--dsw-alias-border-l2);
    }
    .devin-bridge-manual-add {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .devin-bridge-manual-add .devin-bridge-input {
      flex: 1;
      min-width: 120px;
    }
    .devin-bridge-fetch-picker {
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 8px;
      padding: 10px;
      flex-direction: column;
      gap: 8px;
      display: flex;
    }
    .devin-bridge-candidate-list {
      flex-direction: column;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      max-height: 240px;
      overflow-y: auto;
    }
    .devin-bridge-candidate-item {
      border: 1px solid var(--dsw-alias-border-l1);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .devin-bridge-candidate-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .devin-bridge-model-list {
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
    }
    .devin-bridge-model-item-wrap {
      flex-direction: column;
      gap: 0;
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
    .devin-bridge-tag-free {
      border-color: var(--dsw-alias-state-success-primary, #22c55e);
      color: var(--dsw-alias-state-success-primary, #22c55e);
    }
    .devin-bridge-tag-premium {
      border-color: var(--dsw-alias-state-warn-label, #f59e0b);
      color: var(--dsw-alias-state-warn-label, #f59e0b);
    }
    .devin-bridge-model-edit {
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
    .devin-bridge-model-edit:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover-solid);
      color: var(--dsw-alias-label-primary);
    }
    .devin-bridge-model-edit:disabled {
      opacity: 0.5;
    }
    .devin-bridge-model-remove {
      background: none;
      border: 1px solid var(--dsw-alias-border-l2);
      border-radius: 6px;
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      padding: 2px 8px;
    }
    .devin-bridge-model-remove:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover-solid);
      color: var(--dsw-alias-label-primary);
    }
    .devin-bridge-model-remove:disabled {
      opacity: 0.5;
    }
    .devin-bridge-model-editor {
      border: 1px solid var(--dsw-alias-border-l1);
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 10px;
      flex-direction: column;
      gap: 10px;
      display: flex;
    }
    .devin-bridge-editor-row {
      display: flex;
      gap: 12px;
    }
    .devin-bridge-editor-row .devin-bridge-field {
      flex: 1;
    }
  ` });
		//#endregion
		//#region src/client/index.tsx
		/** Settings namespace — 必须和 host 端 settingsNamespace(name) 一致。 */
		const SETTINGS_NS = "dsh-plugin-devin-bridge";
		/** Required services: slot registry + settings scope binder + connection (for llm.discoverModels)。 */
		const inject = [
			"slots",
			"settingsScope",
			"connection"
		];
		/**
		* 注册 Devin Bridge 配置卡片到 Plugins 设置页面。
		* @param ctx - 客户端插件上下文。
		*/
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NS });
			const api = ctx.get("connection").api;
			ctx.slots.inject("settings.plugin.item", function* () {
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: SETTINGS_NS,
					inject: () => ({
						scope,
						api
					})
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