/**
 * Shared types for the preset system
 * Each platform can define its own analysis configuration
 */

/**
 * Pattern for detecting unformatted code in plain text
 */
export interface AntiPattern {
  /** Regex pattern to match */
  pattern: RegExp
  /** Category of the pattern (command, json, code, etc.) */
  type: string
  /** Human-readable description */
  description: string
}

/**
 * Weight values for different anchor types
 * Higher weight = more valuable for scannability
 */
export interface AnchorWeights {
  // Structure (high value)
  heading: number
  codeBlock: number
  image: number
  // Emphasis (medium value)
  emphasis: number
  inlineCode: number
  list: number
  // Links (variable value)
  linkStandalone: number
  linkInline: number
  // Platform-specific weights can be added
  [key: string]: number
}

/**
 * Platform-specific suggestion for improving scannability
 * Suggestions are informative only - they do NOT affect the score
 */
export interface PlatformSuggestion {
  /** Unique identifier for this suggestion */
  id: string
  /** Display name */
  name: string
  /** Description shown to the user */
  description: string
  /** Selector that, if NOT present, triggers the suggestion */
  missingSelector?: string
  /** Selector that, if present, triggers the suggestion (anti-pattern) */
  presentSelector?: string
  /** Custom validation function (optional) */
  validate?: (contentArea: Element) => boolean
}

/**
 * Analysis configuration for a platform
 */
export interface PlatformAnalysis {
  /** Patterns to detect unformatted code */
  antiPatterns: AntiPattern[]
  /** Weight values for anchor types */
  weights: AnchorWeights
  /** Platform-specific suggestions */
  suggestions: PlatformSuggestion[]
}

/**
 * Style overrides for a platform
 */
export interface PlatformStyles {
  /** Selectors for navigation elements to exclude */
  navigationSelectors?: string[]
  /** Additional CSS to inject */
  additionalCSS?: string
}

/**
 * Selector configuration for a platform
 */
export interface PlatformSelectors {
  /** Main content area selector */
  contentArea: string
  /** Selectors for text blocks (defaults to 'p') */
  textBlocks?: string
  /** Selectors for code blocks (defaults to 'pre') */
  codeBlocks?: string
  /** Selectors for code elements to exclude during anti-pattern detection */
  codeElements?: string[]
  /** Selectors for platform-specific anchor elements */
  hotSpots: string[]
  /** Selectors for elements to ignore during analysis */
  ignoreElements: string[]
}

/**
 * Complete platform preset configuration
 */
export interface PlatformPreset {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description of the preset */
  description: string
  /** Domains this preset applies to */
  domains: string[]
  /** CSS selectors for content detection */
  selectors: PlatformSelectors
  /** Style overrides */
  styles?: PlatformStyles
  /** Analysis configuration */
  analysis: PlatformAnalysis
}

/**
 * Partial preset for platform-specific overrides
 * Used before merging with global preset
 */
export interface PartialPlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors?: Partial<PlatformSelectors>
  styles?: PlatformStyles
  analysis?: {
    antiPatterns?: AntiPattern[]
    weights?: Partial<AnchorWeights>
    suggestions?: PlatformSuggestion[]
  }
}
