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
      ignoreElements: [
        '[data-testid="end-page-rec-wrapper"]',
        '[data-testid="object-comment-wrapper"]',
        '[data-testid="footer-reply-container"]',
        '[data-testid="reactions-container"]',
        '[data-testid="render-reactions"]',
        '.ak-renderer-wrapper.is-comment',
      ],
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
