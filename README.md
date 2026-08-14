# dsh-plugin-template

English | [中文](README.zh.md)

A minimal TypeScript [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin bundle. It prints `hello world` when Harness loads it.

## Start from a fork

```sh
git clone https://github.com/YOUR-USER/dsh-plugin-template.git
cd dsh-plugin-template

pnpm install
pnpm run check
dsh plugin --profile hello add .
dsh --profile hello --dump-config | grep dsh-plugin-template
dsh --profile hello
```

A successful run includes this line in the Harness output:

```text
[dsh-plugin-template] hello world
```

For development, edit `src/index.ts`, run `pnpm run build`, then restart the profile. The generated `lib/` directory is included in the package so direct Git installs can load the built JavaScript entry.

If you rename the package, keep these values in sync:

- `package.json` → `name`
- `src/index.ts` → `name`
- `cordis.patch.yml` → both `id` and `name`

Remove it with:

```sh
dsh plugin --profile hello remove dsh-plugin-template
```

## The whole plugin

```text
package.json       # declares the dsh.bundle patch and built entry
src/index.ts       # TypeScript Cordis plugin entry
lib/index.js       # generated Harness entry
cordis.patch.yml   # registers the package in a profile
tsconfig.json      # TypeScript type-checking configuration
pnpm-lock.yaml     # locked development dependencies
```

`package.json` is the only manifest Harness needs: `dsh.bundle.patch` makes the package an installable profile bundle. `cordis.patch.yml` inserts the plugin row, and `src/index.ts` is compiled to the ordinary Cordis `name`/`apply` entry point. This template uses TypeScript and `tsdown`, but intentionally has no React Client bundle, Remote contract, or test framework. Add those only when the plugin actually needs them.

## Discoverability

Add the GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) to your fork. The topic is repository metadata, not a file in the repository:

```sh
gh api --method PUT repos/YOUR-USER/dsh-plugin-template/topics \
  -H 'Accept: application/vnd.github+json' \
  -f 'names[]=dsh-plugin'
```

## License

MIT
