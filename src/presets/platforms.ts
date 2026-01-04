import type { PlatformPreset } from '../types/messages'

// Re-export for convenience
export type { PlatformPreset } from '../types/messages'

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
      textBlocks:
        '[class*="notion-text-block"], [class*="notion-bulleted_list"], [class*="notion-numbered_list"]',
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
    analysis: {
      suggestions: [
        {
          id: 'notion-callouts',
          name: 'Use Callout Blocks',
          description: 'Highlight important notes with callout blocks',
          validate: (content) => {
            const text = content.textContent || ''
            const hasImportantText = /\b(important|note|tip|warning|caution)\b[:\s]/i.test(text)
            const hasCallout = content.querySelector('[class*="notion-callout"]') !== null
            return hasImportantText && !hasCallout
          },
        },
        {
          id: 'notion-toggles',
          name: 'Use Toggle Blocks',
          description: 'Organize long lists with collapsible toggles',
          validate: (content) => {
            const lists = content.querySelectorAll('[class*="notion-bulleted_list"]')
            // Check if any list has more than 8 items (siblings)
            let hasLongList = false
            for (const list of lists) {
              const parent = list.parentElement
              if (parent) {
                const siblings = parent.querySelectorAll('[class*="notion-bulleted_list"]')
                if (siblings.length > 8) {
                  hasLongList = true
                  break
                }
              }
            }
            const hasToggles = content.querySelector('[class*="notion-toggle"]') !== null
            return hasLongList && !hasToggles
          },
        },
        {
          id: 'notion-code-blocks',
          name: 'Use Code Blocks',
          description: 'Format code snippets with proper code blocks',
          validate: (content) => {
            const hasCodeBlock = content.querySelector('[class*="notion-code"]') !== null
            // If there's unformatted code detected but no code blocks, suggest
            const text = content.textContent || ''
            const hasCodePatterns =
              /\{"\w+":\s*["{[\d]/.test(text) || /\b(curl|npm|git|docker)\s+\w+/i.test(text)
            return hasCodePatterns && !hasCodeBlock
          },
        },
      ],
    },
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Optimized for Atlassian Confluence',
    domains: ['atlassian.net', 'confluence.com'],
    selectors: {
      contentArea: '#content-body, [data-testid="page-content"], .wiki-content',
      textBlocks: 'p, [data-node-type="text"], [data-node-type="paragraph"]',
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
    analysis: {
      suggestions: [
        {
          id: 'confluence-info-panels',
          name: 'Use Info Panels',
          description: 'Highlight notes and warnings with Info Panels',
          validate: (content) => {
            const text = content.textContent || ''
            const hasWarningText = /\b(note|warning|important|caution)\b[:\s]/i.test(text)
            const hasInfoPanel = content.querySelector('.confluence-information-macro') !== null
            return hasWarningText && !hasInfoPanel
          },
        },
        {
          id: 'confluence-expand',
          name: 'Use Expand Sections',
          description: 'Long documents benefit from expandable sections',
          validate: (content) => {
            const paragraphs = content.querySelectorAll('p')
            const hasExpand = content.querySelector('.expand-control') !== null
            return paragraphs.length > 20 && !hasExpand
          },
        },
        {
          id: 'confluence-status',
          name: 'Use Status Macros',
          description: 'Show project status with colored status labels',
          validate: (content) => {
            const text = content.textContent || ''
            // Common status words that could benefit from status macros
            const hasStatusText =
              /\b(status|state|phase)\s*:\s*(done|complete|in progress|pending|blocked)\b/i.test(
                text,
              )
            const hasStatusMacro = content.querySelector('[class*="status-macro"]') !== null
            return hasStatusText && !hasStatusMacro
          },
        },
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
    domains: [
      'docusaurus.io',
      'reactnative.dev',
      'redux.js.org',
      'jestjs.io',
      'prettier.io',
      'babel.dev',
      'create-react-app.dev',
      'reactrouter.com',
      'relay.dev',
      'pnpm.io',
    ],
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
