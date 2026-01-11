/**
 * Confluence-specific anchor weights
 * These weights correspond to the platformAnchors defined in preset.ts
 */

import type { AnchorWeights } from '../../types'

export const CONFLUENCE_WEIGHTS: Partial<AnchorWeights> = {
  // Callouts (info panels) are highly valuable for scannability
  callout: 1.0,
  // Toggles (expand sections) help organize long content
  toggle: 0.8,
  // Badges (status macros) help quickly identify state
  badge: 0.9,
  // Emojis add visual anchors but less valuable
  emoji: 0.3,
}
