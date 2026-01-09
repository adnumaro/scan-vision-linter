/**
 * Deep merge utilities for preset configuration
 * Specific presets override global presets
 */

import type { PartialPlatformPreset, PlatformPreset } from './types'

/**
 * Checks if a value is a plain object (not array, null, or other types)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deep merges two objects
 * - Objects are recursively merged
 * - Arrays are concatenated (base first, then override)
 * - Primitives from override win
 *
 * @param base - Base object (global preset)
 * @param override - Override object (specific preset)
 * @returns Merged object
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }

  for (const key in override) {
    if (!Object.hasOwn(override, key)) continue

    const overrideValue = override[key]
    const baseValue = result[key]

    // Skip undefined values in override
    if (overrideValue === undefined) continue

    if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      // Recursively merge objects
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>,
      ) as T[typeof key]
    } else if (Array.isArray(overrideValue) && Array.isArray(baseValue)) {
      // Concatenate arrays: base patterns first, then specific patterns
      result[key] = [...baseValue, ...overrideValue] as T[typeof key]
    } else {
      // Primitives: override wins
      result[key] = overrideValue as T[typeof key]
    }
  }

  return result
}

/**
 * Merges a specific platform preset with the global preset
 * The specific preset takes priority over global
 *
 * @param globalPreset - Complete global preset (base)
 * @param specificPreset - Partial specific preset (overrides)
 * @returns Complete merged preset
 */
export function mergeWithGlobal(
  globalPreset: PlatformPreset,
  specificPreset: PartialPlatformPreset,
): PlatformPreset {
  // Start with global as base
  const merged = deepMerge(
    globalPreset as unknown as Record<string, unknown>,
    specificPreset as unknown as Record<string, unknown>,
  ) as unknown as PlatformPreset

  // Ensure analysis has all required fields after merge
  merged.analysis = {
    antiPatterns: merged.analysis?.antiPatterns ?? globalPreset.analysis.antiPatterns,
    weights: {
      ...globalPreset.analysis.weights,
      ...(merged.analysis?.weights ?? {}),
    },
    suggestions: merged.analysis?.suggestions ?? globalPreset.analysis.suggestions,
  }

  // Ensure selectors has all required fields
  merged.selectors = {
    contentArea: merged.selectors?.contentArea ?? globalPreset.selectors.contentArea,
    textBlocks: merged.selectors?.textBlocks ?? globalPreset.selectors.textBlocks,
    codeBlocks: merged.selectors?.codeBlocks ?? globalPreset.selectors.codeBlocks,
    hotSpots: merged.selectors?.hotSpots ?? globalPreset.selectors.hotSpots,
    ignoreElements: merged.selectors?.ignoreElements ?? globalPreset.selectors.ignoreElements,
  }

  return merged
}
