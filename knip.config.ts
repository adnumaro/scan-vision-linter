import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/main.tsx',
    'src/content/index.ts',
    // Public API barrel exports
    'src/modes/index.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['**/*.d.ts'],
  ignoreDependencies: [
    // Used by vitest for coverage but not directly imported
    '@vitest/coverage-v8',
  ],
  ignoreBinaries: [
    // Graphviz binary for depcruise graph generation (optional)
    'dot',
  ],
}

export default config
