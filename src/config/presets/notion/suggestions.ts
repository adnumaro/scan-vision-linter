/**
 * Notion-specific suggestions
 * Informative only - do NOT affect the score
 */

import { t } from '../../../utils/i18n'
import type { PlatformSuggestion } from '../../types'

export const NOTION_SUGGESTIONS: PlatformSuggestion[] = [
  {
    id: 'notion-callouts',
    name: t('suggestionNotionCallouts'),
    description: t('suggestionNotionCalloutsDesc'),
    validate: (content) => {
      const text = content.textContent || ''
      const hasImportantText = /\b(important|note|tip|warning|caution)\b[:\s]/i.test(text)
      const hasCallout = content.querySelector('[class*="notion-callout"]') !== null
      return hasImportantText && !hasCallout
    },
  },
  {
    id: 'notion-toggles',
    name: t('suggestionNotionToggles'),
    description: t('suggestionNotionTogglesDesc'),
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
    name: t('suggestionNotionCodeBlocks'),
    description: t('suggestionNotionCodeBlocksDesc'),
    validate: (content) => {
      const hasCodeBlock = content.querySelector('[class*="notion-code"]') !== null
      // If there's unformatted code detected but no code blocks, suggest
      const text = content.textContent || ''
      const hasCodePatterns =
        /\{"\w+":\s*["{[\d]/.test(text) || /\b(curl|npm|git|docker)\s+\w+/i.test(text)
      return hasCodePatterns && !hasCodeBlock
    },
  },
]
