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
 *
 * HTML anchor weights are standard. Platform-specific weights
 * are defined by each platform and accessed via index signature.
 */
export interface AnchorWeights {
  // HTML Anchors - Structure (high value)
  heading: number
  codeBlock: number
  image: number
  // HTML Anchors - Emphasis (medium value)
  emphasis: number
  inlineCode: number
  list: number
  // HTML Anchors - Links (variable value)
  linkStandalone: number
  linkInline: number
  // Default weight for platform anchors not explicitly defined
  platformAnchorDefault: number
  // Platform-specific weights (callout, toggle, badge, emoji, database, etc.)
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
 * Anchors HTML estándar (igual para todas las plataformas)
 */
export interface HtmlAnchors {
  /** Heading elements: h1-h6 or platform equivalents */
  headings: string
  /** Emphasis elements: strong, b, mark */
  emphasis: string
  /** Code block elements: pre or platform equivalents */
  codeBlocks: string
  /** Inline code elements: code, kbd (within paragraphs) */
  inlineCode: string
  /** Link elements: a[href] */
  links: string
  /** Image/media elements: img, picture, video, svg */
  images: string
  /** List elements: ul, ol */
  lists: string
}

/**
 * Anchors específicos de Confluence - TODOS requeridos
 * Index signature allows usage as Record<string, string>
 */
export interface ConfluenceAnchors {
  /** Info macros, panels, warnings */
  callouts: string
  /** Expand sections */
  toggles: string
  /** Status macros, labels */
  badges: string
  /** Emoji elements */
  emojis: string
  /** Index signature for Record<string, string> compatibility */
  [key: string]: string
}

/**
 * Anchors específicos de Notion - TODOS requeridos
 * Index signature allows usage as Record<string, string>
 */
export interface NotionAnchors {
  /** Callout blocks */
  callouts: string
  /** Toggle blocks */
  toggles: string
  /** Bookmark embeds */
  embeds: string
  /** Emoji elements */
  emojis: string
  /** Database/collection views */
  databases: string
  /** Index signature for Record<string, string> compatibility */
  [key: string]: string
}

/**
 * Global no tiene anchors de plataforma
 * Uses empty Record which is compatible with Record<string, string>
 */
export type GlobalAnchors = Record<string, string>

/**
 * Selector configuration for a platform
 * Generic over platform-specific anchors
 */
export interface PlatformSelectors<
  TAnchors extends Record<string, string> = Record<string, string>,
> {
  /** Main content area selector */
  content: string
  /** Selectors for text blocks to measure density */
  textBlocks: string
  /** Standard HTML anchor selectors */
  htmlAnchors: HtmlAnchors
  /** Platform-specific anchor selectors */
  platformAnchors: TAnchors
  /** Elements to ignore during analysis */
  ignore: string[]
}

// Concrete selector types for each platform
export type GlobalSelectors = PlatformSelectors<GlobalAnchors>
export type ConfluenceSelectors = PlatformSelectors<ConfluenceAnchors>
export type NotionSelectors = PlatformSelectors<NotionAnchors>

/**
 * Complete platform preset configuration
 */
export interface PlatformPreset<TAnchors extends Record<string, string> = Record<string, string>> {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description of the preset */
  description: string
  /** Domains this preset applies to */
  domains: string[]
  /** CSS selectors for content detection */
  selectors: PlatformSelectors<TAnchors>
  /** Style overrides */
  styles?: PlatformStyles
  /** Analysis configuration */
  analysis: PlatformAnalysis
}

/**
 * Partial HTML anchors for platform-specific overrides
 */
interface PartialHtmlAnchors {
  headings?: string
  emphasis?: string
  codeBlocks?: string
  inlineCode?: string
  links?: string
  images?: string
  lists?: string
}

/**
 * Partial selectors for platform-specific overrides
 */
export interface PartialPlatformSelectors<
  TAnchors extends Record<string, string> = Record<string, string>,
> {
  content?: string
  textBlocks?: string
  htmlAnchors?: PartialHtmlAnchors
  platformAnchors?: TAnchors
  ignore?: string[]
}

/**
 * Partial preset for platform-specific overrides
 * Used before merging with global preset
 */
export interface PartialPlatformPreset<
  TAnchors extends Record<string, string> = Record<string, string>,
> {
  id: string
  name: string
  description: string
  domains: string[]
  selectors?: PartialPlatformSelectors<TAnchors>
  styles?: PlatformStyles
  analysis?: {
    antiPatterns?: AntiPattern[]
    weights?: Partial<AnchorWeights>
    suggestions?: PlatformSuggestion[]
  }
}
