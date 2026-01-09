/**
 * Confluence preset - configuration for Atlassian Confluence
 */

import type { PartialPlatformPreset } from '../../types'
import { CONFLUENCE_ANTI_PATTERNS } from './antiPatterns'
import {
  CONFLUENCE_DESCRIPTION,
  CONFLUENCE_DOMAINS,
  CONFLUENCE_ID,
  CONFLUENCE_NAME,
  CONFLUENCE_SELECTORS,
  CONFLUENCE_STYLES,
} from './preset'
import { CONFLUENCE_SUGGESTIONS } from './suggestions'
import { CONFLUENCE_WEIGHTS } from './weights'

export const confluencePreset: PartialPlatformPreset = {
  id: CONFLUENCE_ID,
  name: CONFLUENCE_NAME(),
  description: CONFLUENCE_DESCRIPTION(),
  domains: CONFLUENCE_DOMAINS,
  selectors: CONFLUENCE_SELECTORS,
  styles: CONFLUENCE_STYLES,
  analysis: {
    antiPatterns: CONFLUENCE_ANTI_PATTERNS,
    weights: CONFLUENCE_WEIGHTS,
    suggestions: CONFLUENCE_SUGGESTIONS,
  },
}

// Re-export components for direct access if needed
export { CONFLUENCE_ANTI_PATTERNS } from './antiPatterns'
export {
  CONFLUENCE_DESCRIPTION,
  CONFLUENCE_DOMAINS,
  CONFLUENCE_ID,
  CONFLUENCE_NAME,
  CONFLUENCE_SELECTORS,
  CONFLUENCE_STYLES,
} from './preset'
export { CONFLUENCE_SUGGESTIONS } from './suggestions'
export { CONFLUENCE_WEIGHTS } from './weights'
