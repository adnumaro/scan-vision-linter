/**
 * Shared constants for the modes system
 */

/**
 * Z-index layers for overlays
 * All scanvision overlays should use these values to avoid conflicts
 */
export const Z_INDEX = {
  /** Base overlay layer (scan dim overlays) */
  OVERLAY: 999990,
  /** Pattern overlays (F-pattern, E-pattern) - above scan highlights */
  PATTERN_OVERLAY: 999993,
  /** Heat zones layer (above patterns) */
  HEAT_OVERLAY: 999994,
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

/**
 * Scannability scoring constants
 * Used to calculate the scannability score in content script
 */
export const SCORING = {
  /** Target ratio of weighted anchors to text blocks */
  IDEAL_ANCHOR_RATIO: 1.5,
  /** Maximum points from anchor ratio (base score) */
  MAX_RATIO_SCORE: 70,
  /** Maximum penalty for dense paragraphs */
  MAX_PROBLEM_PENALTY: 30,
  /** Multiplier for problem block penalty calculation */
  PROBLEM_PENALTY_MULTIPLIER: 50,
  /** Maximum penalty for unformatted code */
  MAX_UNFORMATTED_CODE_PENALTY: 25,
  /** Penalty per unformatted code block */
  UNFORMATTED_CODE_PENALTY_PER_BLOCK: 5,
  /** Maximum bonus for headings */
  MAX_HEADING_BONUS: 15,
  /** Multiplier for heading bonus */
  HEADING_BONUS_MULTIPLIER: 3,
  /** Maximum bonus for images */
  MAX_IMAGE_BONUS: 15,
  /** Multiplier for image bonus */
  IMAGE_BONUS_MULTIPLIER: 5,
  /** Maximum bonus for code blocks */
  MAX_CODE_BONUS: 10,
  /** Multiplier for code bonus */
  CODE_BONUS_MULTIPLIER: 2,
} as const

/**
 * F-Pattern overlay proportions (relative to content area)
 */
export const F_PATTERN = {
  /** Top bar height as percentage of content height */
  TOP_BAR_HEIGHT: 0.15,
  /** Second bar height as percentage */
  SECOND_BAR_HEIGHT: 0.12,
  /** Second bar vertical position as percentage */
  SECOND_BAR_TOP: 0.22,
  /** Second bar width as percentage of content width */
  SECOND_BAR_WIDTH: 0.65,
  /** Left vertical bar width as percentage */
  LEFT_BAR_WIDTH: 0.2,
} as const

/**
 * E-Pattern overlay proportions (relative to content area)
 */
export const E_PATTERN = {
  /** Height of each horizontal bar */
  BAR_HEIGHT: 0.1,
  /** Second bar vertical position */
  SECOND_BAR_TOP: 0.18,
  /** Third bar vertical position */
  THIRD_BAR_TOP: 0.36,
  /** First bar width (longest) */
  FIRST_BAR_WIDTH: 0.85,
  /** Second bar width */
  SECOND_BAR_WIDTH: 0.7,
  /** Third bar width (shortest) */
  THIRD_BAR_WIDTH: 0.55,
  /** Left vertical bar width */
  LEFT_BAR_WIDTH: 0.18,
} as const
