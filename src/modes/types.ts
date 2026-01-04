import type { LucideIcon } from 'lucide-react'
import type { AnalyticsData, PlatformPreset } from '../types/messages'

/**
 * Viewport information for overlay positioning
 */
export interface ViewportInfo {
  width: number
  height: number
  scrollY: number
  foldLine: number
}

/**
 * Context passed to modes when activated
 */
export interface ModeContext {
  contentArea: Element
  viewport: ViewportInfo
  analytics?: AnalyticsData
  preset: PlatformPreset
}

/**
 * Per-mode configuration
 */
export interface ModeConfig {
  enabled: boolean
  settings: Record<string, unknown>
}

/**
 * Result type for operations that can fail
 */
export type ModeResult<T = void> =
  | { success: true; value: T }
  | { success: false; error: ModeError }

/**
 * Error information for mode operations
 */
export interface ModeError {
  code: 'INCOMPATIBLE' | 'NOT_FOUND' | 'ALREADY_ACTIVE' | 'NOT_ACTIVE' | 'UNKNOWN'
  message: string
  modeId?: string
  conflictsWith?: string[]
}

/**
 * Base interface for all visualization modes
 */
export interface VisualizationMode {
  // Metadata
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: LucideIcon
  readonly category: ModeCategory

  // Compatibility
  readonly incompatibleWith: string[]

  // Lifecycle
  activate(context: ModeContext): void
  deactivate(): void
  update(config: ModeConfig): void

  // State
  isActive(): boolean

  // Configuration
  getDefaultConfig(): ModeConfig
  getConfig(): ModeConfig
}

/**
 * Categories for grouping modes in UI
 */
export type ModeCategory = 'overlay' | 'indicator' | 'simulation'

/**
 * Mode state stored in chrome.storage
 */
export interface ModesState {
  [modeId: string]: ModeConfig
}

/**
 * Extended ScanConfig with modes
 */
export interface ExtendedScanConfig {
  opacity: number
  blur: number
  presetId: string
  modes: ModesState
}

/**
 * Default modes configuration
 */
export const DEFAULT_MODES_STATE: ModesState = {
  scan: { enabled: true, settings: {} },
  'f-pattern': { enabled: false, settings: { opacity: 0.15, color: '#3b82f6', showLabels: true } },
  'e-pattern': { enabled: false, settings: { opacity: 0.15, color: '#8b5cf6', showLabels: true } },
  'heat-zones': { enabled: false, settings: { intensity: 0.5 } },
  'fold-line': {
    enabled: false,
    settings: { color: '#ef4444', showLabel: true, labelText: 'Above the fold' },
  },
  'first-5s': { enabled: false, settings: { wordLimit: 10 } },
}
