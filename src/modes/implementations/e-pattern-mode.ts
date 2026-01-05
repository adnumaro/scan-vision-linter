/**
 * E-Pattern Mode - Shows the E-shaped reading pattern overlay
 * Similar to F-Pattern but with an additional middle bar:
 * 1. Top horizontal bar (headlines)
 * 2. Middle horizontal bar (subheadlines)
 * 3. Third horizontal bar (additional content)
 * 4. Vertical left bar (scanning down)
 */

import { LayoutList } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { COLORS, hexToRgba } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { createPatternZone, removeOverlayElement } from '../utils/overlay'
import { onViewportChange } from '../utils/viewport'

const MODE_ID = 'e-pattern'
const OVERLAY_ID = 'e-pattern-overlay'

interface EPatternConfig extends ModeConfig {
  settings: {
    opacity: number
    color: string
    showLabels: boolean
  }
}

const DEFAULT_CONFIG: EPatternConfig = {
  enabled: false,
  settings: {
    opacity: 0.15,
    color: COLORS.pattern.secondary,
    showLabels: true,
  },
}

/**
 * E-Pattern Mode implementation
 */
class EPatternMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'E-Pattern'
  readonly description = 'Shows E-shaped reading pattern (3 horizontal bars)'
  readonly icon = LayoutList
  readonly category = 'overlay' as const
  readonly incompatibleWith = ['f-pattern']

  private active = false
  private config: EPatternConfig = DEFAULT_CONFIG
  private cleanup: (() => void) | null = null
  private overlayElement: HTMLElement | null = null
  private contentArea: Element | null = null

  activate(context: ModeContext): void {
    if (this.active) return

    // Clean up previous listener to prevent memory leak
    this.cleanup?.()

    this.contentArea = context.contentArea
    this.createOverlay()

    // Update on resize and scroll (content area position changes)
    this.cleanup = onViewportChange(() => {
      this.updateOverlay()
    })

    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    removeOverlayElement(OVERLAY_ID)
    this.cleanup?.()
    this.cleanup = null
    this.overlayElement = null
    this.contentArea = null
    this.active = false
  }

  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as EPatternConfig['settings']),
      },
    }

    if (this.active) {
      this.updateOverlay()
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
   * Creates the E-pattern overlay positioned over content area
   */
  private createOverlay(): void {
    const fullId = OVERLAY_PREFIX + OVERLAY_ID
    let overlay = document.getElementById(fullId)

    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = fullId
      document.body.appendChild(overlay)
    }

    this.overlayElement = overlay
    this.updateOverlay()
  }

  /**
   * Updates the overlay with current content area dimensions
   * Uses DOM manipulation instead of innerHTML for security
   */
  private updateOverlay(): void {
    if (!this.overlayElement || !this.contentArea) return

    const rect = this.contentArea.getBoundingClientRect()
    const { opacity, color, showLabels } = this.config.settings
    const bgColor = hexToRgba(color, opacity)
    const borderColor = hexToRgba(color, opacity + 0.1)

    // Position overlay to match content area bounds
    this.overlayElement.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      z-index: ${Z_INDEX.OVERLAY};
      pointer-events: none;
      overflow: hidden;
    `

    // Clear previous content safely
    this.overlayElement.textContent = ''

    // E-Pattern zones (percentages of content area)
    const cw = rect.width
    const ch = rect.height

    const barHeight = ch * 0.1
    const topBarTop = 0
    const secondBarTop = ch * 0.18
    const thirdBarTop = ch * 0.36
    const barWidth1 = cw * 0.85
    const barWidth2 = cw * 0.7
    const barWidth3 = cw * 0.55
    const leftBarWidth = cw * 0.18
    const leftBarTop = thirdBarTop + barHeight

    // First scan bar
    const firstBar = createPatternZone({
      top: topBarTop,
      left: 0,
      width: barWidth1,
      height: barHeight,
      backgroundColor: bgColor,
      borderColor,
      borderBottom: true,
      borderRight: true,
      label: showLabels ? { text: '1st scan', color, position: 'right' } : undefined,
    })
    this.overlayElement.appendChild(firstBar)

    // Second scan bar
    const secondBar = createPatternZone({
      top: secondBarTop,
      left: 0,
      width: barWidth2,
      height: barHeight,
      backgroundColor: bgColor,
      borderColor,
      borderBottom: true,
      borderRight: true,
      label: showLabels ? { text: '2nd scan', color, position: 'right' } : undefined,
    })
    this.overlayElement.appendChild(secondBar)

    // Third scan bar
    const thirdBar = createPatternZone({
      top: thirdBarTop,
      left: 0,
      width: barWidth3,
      height: barHeight,
      backgroundColor: bgColor,
      borderColor,
      borderBottom: true,
      borderRight: true,
      label: showLabels ? { text: '3rd scan', color, position: 'right' } : undefined,
    })
    this.overlayElement.appendChild(thirdBar)

    // Vertical down bar
    const downBar = createPatternZone({
      top: leftBarTop,
      left: 0,
      width: leftBarWidth,
      height: `calc(100% - ${leftBarTop}px)`,
      backgroundColor: bgColor,
      borderColor,
      borderRight: true,
      label: showLabels ? { text: 'Down', color, position: 'vertical' } : undefined,
    })
    this.overlayElement.appendChild(downBar)
  }
}

// Export singleton instance
export const ePatternMode = new EPatternMode()
