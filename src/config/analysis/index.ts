/**
 * Analysis module - scannability detection logic
 * Uses patterns, weights, and suggestions from presets
 */

// Functions
export { detectUnformattedCode } from './anti-patterns'
export { evaluatePlatformSuggestions } from './suggestions'
// Types
export type { AntiPatternMatch, TriggeredSuggestion, WeightedAnchorBreakdown } from './types'
export { calculateWeightedAnchors } from './weighted-anchors'
