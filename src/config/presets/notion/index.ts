/**
 * Notion preset - configuration for Notion
 */

import type { PartialPlatformPreset } from '../../types'
import { NOTION_ANTI_PATTERNS } from './antiPatterns'
import {
  NOTION_DESCRIPTION,
  NOTION_DOMAINS,
  NOTION_ID,
  NOTION_NAME,
  NOTION_SELECTORS,
  NOTION_STYLES,
} from './preset'
import { NOTION_SUGGESTIONS } from './suggestions'
import { NOTION_WEIGHTS } from './weights'

export const notionPreset: PartialPlatformPreset = {
  id: NOTION_ID,
  name: NOTION_NAME(),
  description: NOTION_DESCRIPTION(),
  domains: NOTION_DOMAINS,
  selectors: NOTION_SELECTORS,
  styles: NOTION_STYLES,
  analysis: {
    antiPatterns: NOTION_ANTI_PATTERNS,
    weights: NOTION_WEIGHTS,
    suggestions: NOTION_SUGGESTIONS,
  },
}

// Re-export components for direct access if needed
export { NOTION_ANTI_PATTERNS } from './antiPatterns'
export {
  NOTION_DESCRIPTION,
  NOTION_DOMAINS,
  NOTION_ID,
  NOTION_NAME,
  NOTION_SELECTORS,
  NOTION_STYLES,
} from './preset'
export { NOTION_SUGGESTIONS } from './suggestions'
export { NOTION_WEIGHTS } from './weights'
