/**
 * Confluence-specific suggestions
 * Informative only - do NOT affect the score
 */

import { t } from '../../../utils/i18n'
import type { PlatformSuggestion } from '../../types'

export const CONFLUENCE_SUGGESTIONS: PlatformSuggestion[] = [
  {
    id: 'confluence-info-panels',
    name: t('suggestionConfluenceInfoPanels'),
    description: t('suggestionConfluenceInfoPanelsDesc'),
    validate: (content) => {
      const text = content.textContent || ''
      const hasWarningText = /\b(note|warning|important|caution)\b[:\s]/i.test(text)
      const hasInfoPanel = content.querySelector('.confluence-information-macro') !== null
      return hasWarningText && !hasInfoPanel
    },
  },
  {
    id: 'confluence-status',
    name: t('suggestionConfluenceStatus'),
    description: t('suggestionConfluenceStatusDesc'),
    validate: (content) => {
      const text = content.textContent || ''
      // Common status words that could benefit from status macros
      const hasStatusText =
        /\b(status|state|phase)\s*:\s*(done|complete|in progress|pending|blocked)\b/i.test(text)
      const hasStatusMacro = content.querySelector('[class*="status-macro"]') !== null
      return hasStatusText && !hasStatusMacro
    },
  },
]
