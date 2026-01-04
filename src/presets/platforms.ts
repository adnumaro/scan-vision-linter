import type { PlatformPreset } from '../types/messages'

// Re-export for convenience
export type { PlatformPreset, PlatformStyleOverrides } from '../types/messages'

export const PRESETS: PlatformPreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Generic settings for any website',
    domains: [],
    selectors: {
      contentArea: 'main, article, [role="main"], .content, #content, body',
      hotSpots: [],
      ignoreElements: [],
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Optimized for GitHub READMEs and docs',
    domains: ['github.com', 'gist.github.com'],
    selectors: {
      contentArea: '.markdown-body',
      hotSpots: [
        '.anchor',
        '.octicon',
        '.task-list-item-checkbox',
        '.highlight',
        '.blob-code',
        '.contains-task-list',
        '.task-list-item',
      ],
      ignoreElements: ['.file-navigation', '.footer', '.drag-handle'],
    },
    styles: {
      navigationSelectors: ['.AppHeader', '.UnderlineNav', '.Layout-sidebar'],
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Optimized for Notion pages',
    domains: ['notion.so', 'notion.site'],
    selectors: {
      contentArea: '.notion-page-content',
      hotSpots: [
        '[class*="notion-header"]',
        '[class*="notion-callout"]',
        '[class*="notion-quote"]',
        '[class*="notion-code"]',
        '[class*="notion-toggle"]',
        '[class*="notion-bookmark"]',
        '.notion-emoji',
        '.notion-page-block',
      ],
      ignoreElements: [],
    },
    styles: {
      navigationSelectors: [
        '.notion-sidebar-container',
        '.notion-sidebar',
        '.notion-topbar',
        '.notion-cursor-listener > div:first-child',
      ],
      additionalCSS: `
  /* Notion page title - outside contentArea */
  .notion-page-block > h1 {
    outline: 2px solid rgba(37, 99, 235, 0.5);
    outline-offset: 2px;
  }`,
    },
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Optimized for Atlassian Confluence',
    domains: ['atlassian.net', 'confluence.com'],
    selectors: {
      contentArea: '#content-body, [data-testid="page-content"], .wiki-content',
      hotSpots: [
        '[data-testid*="emoji"]',
        '.confluence-information-macro',
        '.code-block',
        '.panel',
        '[class*="status-macro"]',
        '.expand-control',
        '[data-testid="title-wrapper"]',
      ],
      ignoreElements: [],
    },
    styles: {
      navigationSelectors: [
        '[data-testid="grid-left-sidebar"]',
        '[data-testid="space-navigation"]',
        '[data-vc="space-navigation"]',
        'nav[aria-label]',
      ],
    },
  },
  {
    id: 'mdn',
    name: 'MDN Web Docs',
    description: 'Optimized for Mozilla Developer Network',
    domains: ['developer.mozilla.org'],
    selectors: {
      contentArea: '.main-content, article',
      hotSpots: [
        '.notecard',
        '.warning',
        '.callout',
        '.code-example',
        '.bc-table',
        '.section-content > dl',
      ],
      ignoreElements: ['.sidebar', '.document-toc', '.top-navigation'],
    },
    styles: {
      navigationSelectors: [
        '.sidebar',
        '.document-toc',
        '.top-navigation',
        '.main-menu',
        '.header-main',
      ],
    },
  },
  {
    id: 'readme',
    name: 'ReadMe.io',
    description: 'Optimized for ReadMe documentation',
    domains: ['readme.io', 'readme.com'],
    selectors: {
      contentArea: '.markdown-body, [class*="content"]',
      hotSpots: ['.callout', '[class*="Callout"]', '.code-tabs', '[class*="CodeTabs"]', '.embed'],
      ignoreElements: ['.rm-Sidebar', '[class*="Sidebar"]'],
    },
    styles: {
      navigationSelectors: ['.rm-Sidebar', '[class*="Sidebar"]', '.rm-Header', '[class*="Header"]'],
    },
  },
  {
    id: 'gitbook',
    name: 'GitBook',
    description: 'Optimized for GitBook documentation',
    domains: ['gitbook.io', 'gitbook.com'],
    selectors: {
      contentArea: '[data-testid="page.contentEditor"], .markdown-section',
      hotSpots: ['.hint', '.tabs', '.code-block', '[class*="expandable"]'],
      ignoreElements: ['[data-testid="table-of-contents"]', '[class*="sidebar"]'],
    },
    styles: {
      navigationSelectors: [
        '[data-testid="table-of-contents"]',
        '[class*="sidebar"]',
        '[data-testid="space.header"]',
      ],
    },
  },
  {
    id: 'docusaurus',
    name: 'Docusaurus',
    description: 'Optimized for Docusaurus sites',
    domains: [], // Many custom domains, detected by structure
    selectors: {
      contentArea: '.markdown, article',
      hotSpots: ['.admonition', '.alert', '.tabs-container', '.prism-code'],
      ignoreElements: ['.navbar', '.table-of-contents', '.pagination-nav', '.footer'],
    },
    styles: {
      navigationSelectors: [
        '.navbar',
        '.table-of-contents',
        '.pagination-nav',
        '.menu',
        '.sidebar',
      ],
    },
  },
]

export function detectPlatform(url: string): PlatformPreset {
  try {
    const hostname = new URL(url).hostname

    for (const preset of PRESETS) {
      if (preset.domains.some((domain) => hostname.includes(domain))) {
        return preset
      }
    }
  } catch {
    // Invalid URL
  }

  return PRESETS[0] // Return default
}

export function getPresetById(id: string): PlatformPreset {
  return PRESETS.find((p) => p.id === id) || PRESETS[0]
}
