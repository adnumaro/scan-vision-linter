export interface ScanConfig {
  opacity: number
  blur: number
  presetId: string
}

export const DEFAULT_CONFIG: ScanConfig = {
  opacity: 0.3,
  blur: 0.5,
  presetId: 'default',
}

export interface PlatformStyleOverrides {
  navigationSelectors?: string[]
  additionalCSS?: string
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
    hotSpots: string[]
    ignoreElements: string[]
  }
  styles?: PlatformStyleOverrides
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
