/**
 * Centralized mode metadata
 * Single source of truth for mode information used by both popup and content script
 */

import type { LucideIcon } from 'lucide-react'
import { Flame, LayoutList, LayoutTemplate, Minus, ScanText, Timer } from 'lucide-react'
import type { ModeCategory } from './types'

/**
 * Serializable mode metadata (without icon reference)
 * Used for data transfer between popup and content script
 */
export interface ModeMetadata {
  id: string
  name: string
  description: string
  category: ModeCategory
  incompatibleWith: string[]
}

/**
 * Full mode info including icon reference
 * Used by popup UI components
 */
export interface ModeInfo extends ModeMetadata {
  icon: LucideIcon
}

/**
 * Mode metadata definitions - single source of truth
 */
export const MODE_METADATA: ModeInfo[] = [
  {
    id: 'scan',
    name: 'Scan Mode',
    description: 'Dims text and highlights visual anchors',
    icon: ScanText,
    category: 'simulation',
    incompatibleWith: ['first-5s'],
  },
  {
    id: 'first-5s',
    name: 'First 5 Seconds',
    description: 'Shows what users see during quick scanning',
    icon: Timer,
    category: 'simulation',
    incompatibleWith: ['scan'],
  },
  {
    id: 'f-pattern',
    name: 'F-Pattern',
    description: 'Shows F-shaped reading pattern overlay',
    icon: LayoutTemplate,
    category: 'overlay',
    incompatibleWith: ['e-pattern'],
  },
  {
    id: 'e-pattern',
    name: 'E-Pattern',
    description: 'Shows E-shaped reading pattern overlay',
    icon: LayoutList,
    category: 'overlay',
    incompatibleWith: ['f-pattern'],
  },
  {
    id: 'heat-zones',
    name: 'Heat Zones',
    description: 'Shows attention gradient overlay',
    icon: Flame,
    category: 'overlay',
    incompatibleWith: [],
  },
  {
    id: 'fold-line',
    name: 'Fold Line',
    description: 'Shows "above the fold" indicator',
    icon: Minus,
    category: 'indicator',
    incompatibleWith: [],
  },
]

/**
 * Category labels for UI display
 */
export const CATEGORY_LABELS: Record<ModeCategory, string> = {
  simulation: 'Simulations',
  overlay: 'Overlays',
  indicator: 'Indicators',
}

/**
 * Category display order
 */
export const CATEGORY_ORDER: ModeCategory[] = ['simulation', 'overlay', 'indicator']

/**
 * Get mode metadata by ID
 */
export function getModeById(id: string): ModeInfo | undefined {
  return MODE_METADATA.find((m) => m.id === id)
}

/**
 * Get modes by category
 */
export function getModesByCategory(category: ModeCategory): ModeInfo[] {
  return MODE_METADATA.filter((m) => m.category === category)
}

/**
 * Get modes grouped by category in display order
 */
export function getModesGroupedByCategory(): Array<{
  category: ModeCategory
  label: string
  modes: ModeInfo[]
}> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    modes: getModesByCategory(category),
  }))
}
