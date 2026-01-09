/**
 * Scan Mode - Core scannability visualization using overlays
 *
 * Uses backdrop-filter blur for universal dimming that works on any background.
 * No CSS injection, no !important, no specificity battles.
 */

import { ScanText } from 'lucide-react'
import { detectUnformattedCode } from '../../config/presets'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { cloneModeConfig } from '../utils/config'
import { batchAnalyzeParagraphs } from '../utils/dom'
import {
  createDimOverlays,
  createUnformattedCodeOverlays,
  removeAllScanOverlays,
  type ScanOverlayConfig,
  updateDimOverlayConfig,
} from '../utils/scan-overlays'

const MODE_ID = 'scan'

interface ScanModeConfig extends ModeConfig {
  settings: {
    /** Blur amount in pixels (0-3) */
    blur: number
    /** Background opacity for dim effect (0-0.2) */
    opacity: number
  }
}

const DEFAULT_CONFIG: ScanModeConfig = {
  enabled: true,
  settings: {
    blur: 1.5,
    opacity: 0.5,
  },
}

/**
 * Gets the text block selector for the current platform
 */
function getTextBlockSelector(context: ModeContext): string {
  return context.preset.selectors.textBlocks || 'p'
}

/**
 * Gets the ignore selector for the current platform
 */
function getIgnoreSelector(context: ModeContext): string {
  return context.preset.selectors.ignoreElements?.join(', ') || ''
}

/**
 * Analyzes content and returns problem blocks (dense paragraphs without anchors)
 */
function findProblemBlocks(context: ModeContext): Element[] {
  const textBlockSelector = getTextBlockSelector(context)
  const ignoreSelector = getIgnoreSelector(context)
  const textBlocks = context.contentArea.querySelectorAll(textBlockSelector)

  const analyses = batchAnalyzeParagraphs(textBlocks, undefined, undefined, ignoreSelector)
  return analyses.filter((a) => a.isProblem).map((a) => a.element)
}

/**
 * Finds all text blocks that should be dimmed
 */
function findTextBlocks(context: ModeContext): Element[] {
  const textBlockSelector = getTextBlockSelector(context)
  const ignoreSelector = getIgnoreSelector(context)
  const textBlocks = context.contentArea.querySelectorAll(textBlockSelector)

  if (ignoreSelector) {
    return Array.from(textBlocks).filter((el) => !el.closest(ignoreSelector))
  }
  return Array.from(textBlocks)
}

/**
 * Scan Mode implementation using overlays
 */
class ScanMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'Scan Mode'
  readonly description = 'Dims text and highlights visual anchors for scannability analysis'
  readonly icon = ScanText
  readonly category = 'simulation' as const
  readonly incompatibleWith = ['first-5s']

  private active = false
  private config: ScanModeConfig = DEFAULT_CONFIG

  activate(context: ModeContext): void {
    if (this.active) return

    const ignoreSelector = getIgnoreSelector(context)
    const textBlockSelector = getTextBlockSelector(context)
    const codeElements = context.preset.selectors.codeElements || []

    // 1. Detect problems FIRST to exclude them from blur
    const problemBlocks = findProblemBlocks(context)
    const unformattedCode = detectUnformattedCode(
      context.contentArea,
      context.preset.analysis.antiPatterns,
      codeElements,
      textBlockSelector,
      ignoreSelector,
    )

    // Collect all problem elements to exclude from blur
    const problemElements = new Set<Element>([
      ...problemBlocks,
      ...unformattedCode.map((m) => m.element),
    ])

    // 2. Create dim overlays for text blocks (excluding problems)
    const textBlocks = findTextBlocks(context)
    const textBlocksToBlur = textBlocks.filter((el) => !problemElements.has(el))
    createDimOverlays(
      textBlocksToBlur,
      {
        blur: this.config.settings.blur,
        opacity: this.config.settings.opacity,
      },
      ignoreSelector,
    )

    // 3. Create overlays for unformatted code (antipatterns)
    const overlayInfos = unformattedCode.map(({ element, type, description }) => ({
      element,
      type,
      description,
    }))
    createUnformattedCodeOverlays(overlayInfos)

    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    removeAllScanOverlays()
    this.active = false
  }

  update(config: ModeConfig): void {
    const newSettings = config.settings as ScanModeConfig['settings'] | undefined

    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...newSettings,
      },
    }

    // Update dim overlays if active
    if (this.active) {
      updateDimOverlayConfig({
        blur: this.config.settings.blur,
        opacity: this.config.settings.opacity,
      } satisfies ScanOverlayConfig)
    }
  }

  isActive(): boolean {
    return this.active
  }

  getDefaultConfig(): ModeConfig {
    return DEFAULT_CONFIG
  }

  getConfig(): ModeConfig {
    return cloneModeConfig(this.config)
  }
}

// Export singleton instance
export const scanMode = new ScanMode()
