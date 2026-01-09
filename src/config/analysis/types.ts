/**
 * Types for analysis module
 */

/**
 * Result of an anti-pattern match
 */
export interface AntiPatternMatch {
  type: string
  description: string
  element: Element
  textSnippet: string
}

/**
 * Breakdown of weighted anchor counts
 */
export interface WeightedAnchorBreakdown {
  headings: { count: number; weight: number }
  emphasis: { count: number; weight: number }
  codeBlocks: { count: number; weight: number }
  inlineCode: { count: number; weight: number }
  standaloneLinks: { count: number; weight: number }
  inlineLinks: { count: number; weight: number }
  images: { count: number; weight: number }
  lists: { count: number; weight: number }
  totalWeighted: number
  totalRaw: number
}

/**
 * Result of a triggered suggestion (for display)
 */
export interface TriggeredSuggestion {
  id: string
  name: string
  description: string
}
