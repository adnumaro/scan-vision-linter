/**
 * Fold Line Mode - Shows "above the fold" indicator
 * Captures fold position on activation and tracks it with scroll
 */

import { Minus } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { COLORS } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { Z_INDEX } from '../utils/constants'
import { createOverlayTracker, type OverlayTracker } from '../utils/overlay-tracker'

const MODE_ID = 'fold-line'

interface FoldLineConfig extends ModeConfig {
  settings: {
    color: string
    showLabel: boolean
    labelText: string
  }
}

const DEFAULT_CONFIG: FoldLineConfig = {
  enabled: false,
  settings: {
    color: COLORS.indicator.foldLine,
    showLabel: true,
    labelText: 'Above the fold',
  },
}

/**
 * Fold Line Mode implementation
 * Captures fold position on activation and uses tracker to follow scroll
 */
class FoldLineMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'Fold Line'
  readonly description = 'Shows what users see without scrolling'
  readonly icon = Minus
  readonly category = 'indicator' as const
  readonly incompatibleWith: string[] = []

  private active = false
  private config: FoldLineConfig = DEFAULT_CONFIG
  private context: ModeContext | null = null
  private tracker: OverlayTracker | null = null
  /** Fold position captured at activation */
  private initialFoldY: number = 0

  activate(context: ModeContext): void {
    if (this.active) return

    this.tracker?.clear()

    // Capture fold position at activation
    this.initialFoldY = window.innerHeight

    this.context = context
    this.tracker = createOverlayTracker()
    this.createFoldLine()
    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    this.tracker?.clear()
    this.tracker = null
    this.context = null
    this.initialFoldY = 0
    this.active = false
  }

  private createFoldLine(): void {
    if (!this.context || !this.tracker) return

    const { contentArea } = this.context
    const { color, showLabel, labelText } = this.config.settings
    const contentRect = contentArea.getBoundingClientRect()

    // Calculate offset relative to contentArea
    const foldOffsetY = this.initialFoldY - contentRect.top

    // Create dotted line
    const line = document.createElement('div')
    line.className = 'scanvision-fold-line'
    line.style.cssText = `
      position: fixed;
      top: ${this.initialFoldY}px;
      left: ${contentRect.left}px;
      width: ${contentRect.width}px;
      height: 0;
      border-top: 2px dotted ${color};
      pointer-events: none;
      z-index: ${Z_INDEX.INDICATOR};
    `

    // Track line relative to contentArea
    this.tracker.track({
      element: contentArea,
      overlay: line,
      offset: { top: foldOffsetY, left: 0, width: 0 },
      type: 'fold-line',
      fixedDimensions: true,
    })

    // Create label if enabled
    if (showLabel) {
      const label = document.createElement('div')
      label.className = 'scanvision-fold-label'
      label.textContent = labelText
      label.style.cssText = `
        position: fixed;
        top: ${this.initialFoldY - 24}px;
        left: ${contentRect.left + contentRect.width - 110}px;
        padding: 4px 8px;
        background-color: ${color};
        color: ${COLORS.indicator.label};
        font-size: 11px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 500;
        border-radius: 4px;
        pointer-events: none;
        z-index: ${Z_INDEX.TOP};
        white-space: nowrap;
      `

      this.tracker.track({
        element: contentArea,
        overlay: label,
        offset: { top: foldOffsetY - 24, left: contentRect.width - 110 },
        type: 'fold-label',
        fixedDimensions: true,
      })
    }
  }

  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as FoldLineConfig['settings']),
      },
    }

    // Recreate with new config
    if (this.active && this.context && this.tracker) {
      this.tracker.clear()
      this.tracker = createOverlayTracker()
      this.createFoldLine()
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
export const foldLineMode = new FoldLineMode()
