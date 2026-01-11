/**
 * Types for Chrome extension messaging
 * Platform types are imported from the presets module
 */

import type { TriggeredSuggestion } from '../config/analysis/types'
import type { PlatformPreset } from '../config/types'

export type { PlatformPreset } from '../config/types'

/**
 * Types of anchors that can have indicators toggled
 */
export type IndicatorType = 'headings' | 'emphasis' | 'code' | 'links' | 'images' | 'lists'

export interface ScanConfig {
  opacity: number
  blur: number
  presetId: string
}

export const DEFAULT_CONFIG: ScanConfig = {
  opacity: 0.5,
  blur: 1.5,
  presetId: 'global',
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
  | 'toggle-indicator'

export interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
  modeId?: string
  enabled?: boolean
  /** Indicator type for toggle-indicator action */
  indicatorType?: IndicatorType
}

export interface ScanResponse {
  isScanning: boolean
  config?: ScanConfig
  analytics?: AnalyticsData
  detectedPresetId?: string
  activeModes?: string[]
  /** Currently active indicator types */
  activeIndicators?: IndicatorType[]
}
