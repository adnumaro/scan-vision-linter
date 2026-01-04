/**
 * Shared constants for the modes system
 */

/**
 * Z-index layers for overlays
 * All scanvision overlays should use these values to avoid conflicts
 */
export const Z_INDEX = {
  /** Base overlay layer (pattern overlays, heat zones) */
  OVERLAY: 999990,
  /** Indicator layer (fold line) */
  INDICATOR: 999995,
  /** Top-most layer (labels, tooltips) */
  TOP: 999999,
} as const

/**
 * ID prefix for overlay elements
 */
export const OVERLAY_PREFIX = 'scanvision-overlay-'

/**
 * ID prefix for style elements
 */
export const STYLE_PREFIX = 'scanvision-style-'
