/**
 * Global anchor weights for scannability scoring
 * These weights apply to all platforms as defaults
 */

import type { AnchorWeights } from '../../types'

export const GLOBAL_WEIGHTS: AnchorWeights = {
  // Structure (high value) - these create clear visual hierarchy
  heading: 1.0,
  codeBlock: 1.0,
  image: 0.9,

  // Emphasis (medium value) - these highlight key information
  emphasis: 0.7,
  inlineCode: 0.6,
  list: 0.5,

  // Links (variable value)
  linkStandalone: 0.6, // Link that is the only content of a block
  linkInline: 0.3, // Link inside text (can exist in dense paragraphs)
}
