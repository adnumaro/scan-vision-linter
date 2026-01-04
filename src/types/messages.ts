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

export interface PlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors: {
    contentArea: string
    hotSpots: string[]
    ignoreElements: string[]
  }
}

export interface AnalyticsData {
  score: number
  totalTextBlocks: number
  totalAnchors: number
  problemBlocks: number
  anchorsBreakdown: {
    headings: number
    emphasis: number
    code: number
    links: number
    images: number
    lists: number
  }
}

export type MessageAction = 'toggle-scan' | 'get-state' | 'update-config' | 'analyze'

export interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
}

export interface ScanResponse {
  isScanning: boolean
  config?: ScanConfig
  analytics?: AnalyticsData
  detectedPresetId?: string
}
