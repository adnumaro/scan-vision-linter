/**
 * Notion-specific anchor weights
 * Notion has specific blocks that are highly valuable for scannability
 */

import type { AnchorWeights } from '../../types'

export const NOTION_WEIGHTS: Partial<AnchorWeights> = {
  // Toggles are very valuable in Notion for organizing content
  toggle: 1.0,
  // Callouts are highly visible
  callout: 1.0,
  // Bookmarks provide visual breaks
  bookmark: 0.8,
}
