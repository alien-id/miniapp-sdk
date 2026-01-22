import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  treeshake: true,
  noExternal: ['jose'],
  target: 'esnext',
});
