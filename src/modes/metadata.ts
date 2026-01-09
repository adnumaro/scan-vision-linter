/**
 * Centralized mode metadata
 * Single source of truth for mode information used by both popup and content script
 */

import type { LucideIcon } from 'lucide-react'
import { Flame, LayoutList, LayoutTemplate, ScanText, Timer } from 'lucide-react'
import { t } from '../utils/i18n'
import type { ModeCategory } from './types'

/**
 * Serializable mode metadata (without icon reference)
 * Used for data transfer between popup and content script
 */
export interface ModeMetadata {
  id: string
  name: string
  description: string
  useCase?: string
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
 * Uses i18n for localized names and descriptions
 */
export function getModeMetadata(): ModeInfo[] {
  return [
    {
      id: 'scan',
      name: t('modeScanName'),
      description: t('modeScanDesc'),
      useCase: t('modeScanUse'),
      icon: ScanText,
      category: 'simulation',
      incompatibleWith: ['first-5s'],
    },
    {
      id: 'first-5s',
      name: t('modeFirst5sName'),
      description: t('modeFirst5sDesc'),
      useCase: t('modeFirst5sUse'),
      icon: Timer,
      category: 'simulation',
      incompatibleWith: ['scan'],
    },
    {
      id: 'f-pattern',
      name: t('modeFPatternName'),
      description: t('modeFPatternDesc'),
      useCase: t('modeFPatternUse'),
      icon: LayoutTemplate,
      category: 'overlay',
      incompatibleWith: ['e-pattern'],
    },
    {
      id: 'e-pattern',
      name: t('modeEPatternName'),
      description: t('modeEPatternDesc'),
      useCase: t('modeEPatternUse'),
      icon: LayoutList,
      category: 'overlay',
      incompatibleWith: ['f-pattern'],
    },
    {
      id: 'heat-zones',
      name: t('modeHeatZonesName'),
      description: t('modeHeatZonesDesc'),
      useCase: t('modeHeatZonesUse'),
      icon: Flame,
      category: 'overlay',
      incompatibleWith: [],
    },
  ]
}

// For backward compatibility - lazily evaluated
export const MODE_METADATA: ModeInfo[] = getModeMetadata()

/**
 * Category labels for UI display
 */
export function getCategoryLabels(): Record<ModeCategory, string> {
  return {
    simulation: t('catSimulations'),
    overlay: t('catOverlays'),
  }
}

// For backward compatibility
export const CATEGORY_LABELS: Record<ModeCategory, string> = getCategoryLabels()

/**
 * Category descriptions for UI display
 */
export function getCategoryDescriptions(): Record<ModeCategory, string> {
  return {
    simulation: t('catSimulationsDesc'),
    overlay: t('catOverlaysDesc'),
  }
}

export const CATEGORY_DESCRIPTIONS: Record<ModeCategory, string> = getCategoryDescriptions()

/**
 * Category display order
 */
export const CATEGORY_ORDER: ModeCategory[] = ['simulation', 'overlay']

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
  description: string
  modes: ModeInfo[]
}> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    description: CATEGORY_DESCRIPTIONS[category],
    modes: getModesByCategory(category),
  }))
}
