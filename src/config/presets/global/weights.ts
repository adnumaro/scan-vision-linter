/**
 * Global anchor weights for scannability scoring
 * These weights apply to all platforms as defaults
 *
 * Platform-specific weights (callout, toggle, badge, etc.)
 * are defined in each platform's weights.ts file
 */

import type { AnchorWeights } from '../../types'

export const GLOBAL_WEIGHTS: AnchorWeights = {
  // HTML Anchors - Structure (high value)
  heading: 1.0,
  codeBlock: 1.0,
  image: 0.9,

  // HTML Anchors - Emphasis (medium value)
  emphasis: 0.7,
  inlineCode: 0.6,
  list: 0.5,

  // HTML Anchors - Links (variable value)
  linkStandalone: 0.6,
  linkInline: 0.3,

  // Default weight for platform anchors not explicitly defined
  platformAnchorDefault: 0.7,
}
