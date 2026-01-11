/**
 * Notion-specific anchor weights
 * These weights correspond to the platformAnchors defined in preset.ts
 */

import type { AnchorWeights } from '../../types'

export const NOTION_WEIGHTS: Partial<AnchorWeights> = {
  // Callouts are highly visible and valuable
  callout: 1.0,
  // Toggles are very valuable for organizing content
  toggle: 0.8,
  // Embeds (bookmarks) provide visual breaks
  embed: 0.7,
  // Emojis add visual anchors but less valuable
  emoji: 0.3,
  // Databases are visual anchors
  database: 0.8,
}
