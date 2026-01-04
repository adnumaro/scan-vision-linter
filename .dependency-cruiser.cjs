/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Modules that are not imported by any other module (except entry points)',
      from: {
        orphan: true,
        pathNot: [
          // Entry points
          '(^|/)main\\.tsx$',
          '(^|/)content/index\\.ts$',
          // Config files
          '\\.config\\.(js|ts|cjs|mjs)$',
          // Type declarations
          '\\.d\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      severity: 'error',
      comment: 'Avoid using deprecated Node.js core modules',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: ['^(punycode|domain|constants|sys|_linklist|_stream_wrap)$'],
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Imports must be resolvable',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-duplicate-dep-types',
      severity: 'error',
      comment: 'Avoid having the same dependency in multiple places in package.json',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ['type-only'],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.app.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
}
