import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],
  outDir: 'lib',
  platform: 'node',
  sourcemap: true,
  target: 'node22',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
})
