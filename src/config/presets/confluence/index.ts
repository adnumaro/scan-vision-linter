/**
 * Confluence preset - configuration for Atlassian Confluence
 */

import type { ConfluenceAnchors, PartialPlatformPreset } from '../../types'
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

export const confluencePreset: PartialPlatformPreset<ConfluenceAnchors> = {
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
