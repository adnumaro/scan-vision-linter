/**
 * Configuration utilities and defaults for modes
 */

import type { ModeConfig, ModesState } from '../types'
import { COLORS } from './colors'

/**
 * Default modes configuration
 */
export const DEFAULT_MODES_STATE: ModesState = {
  scan: { enabled: true, settings: {} },
  'f-pattern': { enabled: false, settings: { opacity: 0.15, color: COLORS.pattern.primary, showLabels: true } },
  'e-pattern': { enabled: false, settings: { opacity: 0.15, color: COLORS.pattern.secondary, showLabels: true } },
  'heat-zones': { enabled: false, settings: { intensity: 0.5 } },
  'fold-line': {
    enabled: false,
    settings: { color: COLORS.indicator.foldLine, showLabel: true, labelText: 'Above the fold' },
  },
  'first-5s': { enabled: false, settings: { wordLimit: 10 } },
}

/**
 * Creates a deep clone of a ModeConfig to prevent external mutation
 * Uses structuredClone for deep copy of settings object
 */
export function cloneModeConfig<T extends ModeConfig>(config: T): T {
  return {
    ...config,
    settings: structuredClone(config.settings),
  } as T
}
