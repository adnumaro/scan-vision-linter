/**
 * ScanVision Visualization Modes
 *
 * Public API for the modes system
 */

// Manager
export { createModeManager, ModeManager } from './manager'
export type { ModeInfo, ModeMetadata } from './metadata'
// Metadata
export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getModeById,
  getModesByCategory,
  getModesGroupedByCategory,
  MODE_METADATA,
} from './metadata'
// Registry
export { ModeRegistry, registry } from './registry'
// Types
export type {
  ExtendedScanConfig,
  ModeCategory,
  ModeConfig,
  ModeContext,
  ModeError,
  ModeResult,
  ModesState,
  ViewportInfo,
  VisualizationMode,
} from './types'
export * from './utils/colors'
// Config defaults and utilities
export { DEFAULT_MODES_STATE } from './utils/config'
// Utilities
export * from './utils/overlay'
export * from './utils/styles'
export * from './utils/viewport'
