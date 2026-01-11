/**
 * Presets module - platform-specific configurations
 *
 * Each platform has its own folder with:
 * - preset.ts: selectors and styles
 * - antiPatterns.ts: code detection patterns
 * - weights.ts: anchor scoring weights
 * - suggestions.ts: improvement suggestions
 *
 * Specific presets are merged with global (deep merge).
 * Specific values override global values.
 */

import { mergeWithGlobal } from '../merge'
import type { PlatformPreset } from '../types'
import { confluencePreset } from './confluence'
import { globalPreset } from './global'
import { notionPreset } from './notion'

// Merged presets (ready to use)
const mergedConfluence = mergeWithGlobal(globalPreset, confluencePreset)
const mergedNotion = mergeWithGlobal(globalPreset, notionPreset)

/**
 * All available presets, pre-merged with global
 */
export const PRESETS: PlatformPreset[] = [globalPreset, mergedConfluence, mergedNotion]

/**
 * Map for quick preset lookup by ID
 */
const PRESET_MAP: Record<string, PlatformPreset> = {
  global: globalPreset,
  confluence: mergedConfluence,
  notion: mergedNotion,
}

/**
 * Detects the appropriate preset based on URL
 * Returns global preset if no specific preset matches
 */
export function detectPlatform(url: string): PlatformPreset {
  try {
    const hostname = new URL(url).hostname

    // Check specific presets (not global)
    for (const preset of PRESETS) {
      if (preset.id === 'global') continue
      if (preset.domains.some((domain) => hostname.includes(domain))) {
        return preset
      }
    }
  } catch {
    // Invalid URL
  }

  return globalPreset
}

/**
 * Gets a preset by ID
 * Returns global preset if ID not found
 */
export function getPresetById(id: string): PlatformPreset {
  return PRESET_MAP[id] || globalPreset
}

// Re-export only what's actually used
export {
  calculateWeightedAnchors,
  detectUnformattedCode,
  evaluatePlatformSuggestions,
} from '../analysis'
export type { PlatformPreset } from '../types'
