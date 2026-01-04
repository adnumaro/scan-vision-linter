/**
 * Fold Line Mode - Shows "above the fold" indicator
 * Displays a horizontal line at the viewport height within content area
 */

import { Minus } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { COLORS } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { removeOverlayElement } from '../utils/overlay'
import { getFoldLinePosition, onViewportChange } from '../utils/viewport'

const MODE_ID = 'fold-line'
const LINE_ID = 'fold-line-line'
const LABEL_ID = 'fold-line-label'

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
  private cleanup: (() => void) | null = null
  private lineElement: HTMLElement | null = null
  private labelElement: HTMLElement | null = null
  private contentArea: Element | null = null

  activate(context: ModeContext): void {
    if (this.active) return

    this.contentArea = context.contentArea
    this.createElements()
    this.positionElements()

    // Update on resize and scroll
    this.cleanup = onViewportChange(() => {
      this.positionElements()
    })

    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    removeOverlayElement(LINE_ID)
    removeOverlayElement(LABEL_ID)

    this.cleanup?.()
    this.cleanup = null
    this.lineElement = null
    this.labelElement = null
    this.contentArea = null
    this.active = false
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

    if (this.active && this.contentArea) {
      // Update styles without recreating elements
      this.updateElementStyles()
      this.positionElements()
    }
  }

  /**
   * Updates element styles without recreating them
   */
  private updateElementStyles(): void {
    const { color, showLabel, labelText } = this.config.settings

    if (this.lineElement) {
      this.lineElement.style.borderTopColor = color
    }

    if (this.labelElement) {
      if (showLabel) {
        this.labelElement.textContent = labelText
        this.labelElement.style.backgroundColor = color
        this.labelElement.style.display = 'block'
      } else {
        this.labelElement.style.display = 'none'
      }
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

  /**
   * Creates the line and label elements constrained to content area
   */
  private createElements(): void {
    const { color, showLabel, labelText } = this.config.settings

    // Create line element
    const lineFullId = OVERLAY_PREFIX + LINE_ID
    let lineEl = document.getElementById(lineFullId)
    if (!lineEl) {
      lineEl = document.createElement('div')
      lineEl.id = lineFullId
      document.body.appendChild(lineEl)
    }
    lineEl.style.cssText = `
      position: fixed;
      height: 0;
      border-top: 2px dashed ${color};
      z-index: ${Z_INDEX.INDICATOR};
      pointer-events: none;
    `
    this.lineElement = lineEl

    // Create label element
    if (showLabel) {
      const labelFullId = OVERLAY_PREFIX + LABEL_ID
      let labelEl = document.getElementById(labelFullId)
      if (!labelEl) {
        labelEl = document.createElement('div')
        labelEl.id = labelFullId
        document.body.appendChild(labelEl)
      }
      labelEl.textContent = labelText
      labelEl.style.cssText = `
        position: fixed;
        padding: 4px 8px;
        background-color: ${color};
        color: ${COLORS.indicator.label};
        font-size: 11px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 500;
        border-radius: 4px;
        z-index: ${Z_INDEX.TOP};
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      `
      this.labelElement = labelEl
    }
  }

  /**
   * Positions the line and label at the fold within content area
   */
  private positionElements(): void {
    if (!this.contentArea) return

    const rect = this.contentArea.getBoundingClientRect()
    const foldY = getFoldLinePosition()

    // Only show if fold line is within content area bounds
    const showLine = foldY > rect.top && foldY < rect.bottom

    if (this.lineElement) {
      if (showLine) {
        this.lineElement.style.display = 'block'
        this.lineElement.style.top = `${foldY}px`
        this.lineElement.style.left = `${rect.left}px`
        this.lineElement.style.width = `${rect.width}px`
      } else {
        this.lineElement.style.display = 'none'
      }
    }

    if (this.labelElement) {
      if (showLine) {
        this.labelElement.style.display = 'block'
        this.labelElement.style.top = `${foldY - 24}px`
        this.labelElement.style.left = `${rect.left + rect.width - 100}px`
      } else {
        this.labelElement.style.display = 'none'
      }
    }
  }
}

// Export singleton instance
export const foldLineMode = new FoldLineMode()
