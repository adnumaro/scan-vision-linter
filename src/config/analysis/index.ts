/**
 * Analysis module - scannability detection logic
 * Uses patterns, weights, and suggestions from presets
 * All selectors come from platform presets - no hardcoded values
 */

export { detectUnformattedCode } from './anti-patterns'
export { evaluatePlatformSuggestions } from './suggestions'
export { calculateWeightedAnchors } from './weighted-anchors'
