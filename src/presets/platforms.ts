export interface PlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors: {
    contentArea: string
    hotSpots: string[]
    ignoreElements: string[]
  }
}

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
      contentArea: '.markdown-body, .readme, article',
      hotSpots: ['.anchor', '.octicon', '.task-list-item-checkbox', '.highlight', '.blob-code'],
      ignoreElements: ['.file-navigation', '.repository-content > :not(.readme)', '.footer'],
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Optimized for Notion pages',
    domains: ['notion.so', 'notion.site'],
    selectors: {
      contentArea: '.notion-page-content, [class*="notion-page"]',
      hotSpots: [
        '[class*="notion-header"]',
        '[class*="notion-callout"]',
        '[class*="notion-quote"]',
        '[class*="notion-code"]',
        '[class*="notion-toggle"]',
        '[class*="notion-bookmark"]',
        '.notion-emoji',
      ],
      ignoreElements: ['.notion-sidebar', '.notion-topbar'],
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
      ],
      ignoreElements: ['#navigation', '.page-metadata', '#footer'],
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
