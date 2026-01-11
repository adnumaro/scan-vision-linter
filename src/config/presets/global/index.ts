/**
 * Global preset - base configuration for all platforms
 */

import type { GlobalAnchors, PlatformPreset } from '../../types'
import { GLOBAL_ANTI_PATTERNS } from './antiPatterns'
import {
  GLOBAL_DESCRIPTION,
  GLOBAL_DOMAINS,
  GLOBAL_ID,
  GLOBAL_NAME,
  GLOBAL_SELECTORS,
  GLOBAL_STYLES,
} from './preset'
import { GLOBAL_SUGGESTIONS } from './suggestions'
import { GLOBAL_WEIGHTS } from './weights'

export const globalPreset: PlatformPreset<GlobalAnchors> = {
  id: GLOBAL_ID,
  name: GLOBAL_NAME(),
  description: GLOBAL_DESCRIPTION(),
  domains: GLOBAL_DOMAINS,
  selectors: GLOBAL_SELECTORS,
  styles: GLOBAL_STYLES,
  analysis: {
    antiPatterns: GLOBAL_ANTI_PATTERNS,
    weights: GLOBAL_WEIGHTS,
    suggestions: GLOBAL_SUGGESTIONS,
  },
}
