# dsh-plugin-template

[English](README.md) | 中文

这是一个使用 **TypeScript + tsdown** 开发的最小 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件 bundle。Harness 加载它时会输出 `hello world`。

## 从 fork 开始

```sh
git clone https://github.com/YOUR-USER/dsh-plugin-template.git
cd dsh-plugin-template

pnpm install
pnpm run check
dsh plugin --profile hello add .
dsh --profile hello --dump-config | grep dsh-plugin-template
dsh --profile hello
```

Harness 输出中出现下面一行，就表示插件已经加载：

```text
[dsh-plugin-template] hello world
```

开发时编辑 `src/index.ts`，执行 `pnpm run build`，然后重启 profile。生成的 `lib/` 会包含在 package 中，因此直接从 Git 安装时可以加载已经构建好的 JavaScript 入口。

如果要改插件名，以下位置必须保持一致：

- `package.json` → `name`
- `src/index.ts` → `name`
- `cordis.patch.yml` → `id` 和 `name`

卸载：

```sh
dsh plugin --profile hello remove dsh-plugin-template
```

## 插件全部内容

```text
package.json       # 声明 dsh.bundle patch 和构建入口
src/index.ts       # TypeScript Cordis 插件入口
lib/index.js       # 自动生成的 Harness 入口
cordis.patch.yml   # 把 package 注册进 profile
tsconfig.json      # TypeScript 类型检查配置
pnpm-lock.yaml     # 依赖锁定
```

Harness 唯一需要的 manifest 是 `package.json` 中的 `dsh.bundle.patch`：它让 package 成为可安装的 profile bundle。`cordis.patch.yml` 插入插件行，`src/index.ts` 编译后导出普通 Cordis `name`/`apply` 入口。

当前模板只升级到 TypeScript + `tsdown`，仍然保持 Host-only，不加入 React Client、Remote contract 或测试框架。只有实际需要 Web UI、远程调用或复杂测试时，再引入对应方案。

## 被发现

给 fork 添加 GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)。topic 是 GitHub 仓库元数据，不是仓库文件：

```sh
gh api --method PUT repos/YOUR-USER/dsh-plugin-template/topics \
  -H 'Accept: application/vnd.github+json' \
  -f 'names[]=dsh-plugin'
```

## 许可证

MIT
