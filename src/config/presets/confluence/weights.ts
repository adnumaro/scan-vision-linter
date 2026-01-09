/**
 * Confluence-specific anchor weights
 * Confluence has specific elements that are highly valuable for scannability
 */

import type { AnchorWeights } from '../../types'

export const CONFLUENCE_WEIGHTS: Partial<AnchorWeights> = {
  // Info panels are very valuable in Confluence
  infoPanel: 1.0,
  // Status macros help quickly identify state
  statusMacro: 0.9,
  // Expand sections help organize long content
  expandSection: 0.8,
}
