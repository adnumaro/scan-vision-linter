export interface ScanConfig {
  opacity: number
  blur: number
  presetId: string
}

export const DEFAULT_CONFIG: ScanConfig = {
  opacity: 0,
  blur: 4,
  presetId: 'default',
}

export interface PlatformStyleOverrides {
  navigationSelectors?: string[]
  additionalCSS?: string
}

/**
 * A platform-specific suggestion for improving scannability
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
 * Platform-specific analysis configuration
 */
export interface PlatformAnalysisConfig {
  /** Platform-specific suggestions (informative, don't affect score) */
  suggestions?: PlatformSuggestion[]
}

export interface PlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors: {
    contentArea: string
    /** Selectors for text blocks (paragraphs). Defaults to 'p' if not specified */
    textBlocks?: string
    /** Selectors for code blocks. Defaults to 'pre' if not specified */
    codeBlocks?: string
    hotSpots: string[]
    ignoreElements: string[]
  }
  styles?: PlatformStyleOverrides
  /** Platform-specific analysis configuration */
  analysis?: PlatformAnalysisConfig
}

/**
 * Result of a triggered platform suggestion
 */
export interface TriggeredSuggestion {
  id: string
  name: string
  description: string
}

/**
 * A detected problem that affects the score
 */
export interface DetectedProblem {
  id: string
  type: 'unformatted-code' | 'dense-paragraph' | 'missing-anchors'
  description: string
  count: number
  penalty: number
}

export interface AnalyticsData {
  score: number
  totalTextBlocks: number
  totalAnchors: number
  problemBlocks: number
  unformattedCodeBlocks: number
  anchorsBreakdown: {
    headings: number
    emphasis: number
    code: number
    links: number
    images: number
    lists: number
  }
  /** Detected problems that affect the score */
  problems?: DetectedProblem[]
  /** Platform-specific suggestions (informative, don't affect score) */
  suggestions?: TriggeredSuggestion[]
  /** Timestamp of when the analysis was performed */
  timestamp?: number
}

export type MessageAction =
  | 'toggle-scan'
  | 'get-state'
  | 'update-config'
  | 'analyze'
  | 'toggle-mode'

export interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
  modeId?: string
  enabled?: boolean
}

export interface ScanResponse {
  isScanning: boolean
  config?: ScanConfig
  analytics?: AnalyticsData
  detectedPresetId?: string
  activeModes?: string[]
}
