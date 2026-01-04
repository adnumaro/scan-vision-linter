/**
 * F-Pattern Mode - Shows the F-shaped reading pattern overlay
 * Users naturally scan content in an F shape:
 * 1. Top horizontal bar (headlines)
 * 2. Second horizontal bar (subheadlines)
 * 3. Vertical left bar (scanning down)
 */

import { LayoutTemplate } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { hexToRgba } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { createPatternZone, removeOverlayElement } from '../utils/overlay'
import { onViewportChange } from '../utils/viewport'

const MODE_ID = 'f-pattern'
const OVERLAY_ID = 'f-pattern-overlay'

interface FPatternConfig extends ModeConfig {
  settings: {
    opacity: number
    color: string
    showLabels: boolean
  }
}

const DEFAULT_CONFIG: FPatternConfig = {
  enabled: false,
  settings: {
    opacity: 0.15,
    color: '#3b82f6',
    showLabels: true,
  },
}

/**
 * F-Pattern Mode implementation
 */
class FPatternMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'F-Pattern'
  readonly description = 'Shows natural F-shaped reading pattern overlay'
  readonly icon = LayoutTemplate
  readonly category = 'overlay' as const
  readonly incompatibleWith = ['e-pattern']

  private active = false
  private config: FPatternConfig = DEFAULT_CONFIG
  private cleanup: (() => void) | null = null
  private overlayElement: HTMLElement | null = null
  private contentArea: Element | null = null

  activate(context: ModeContext): void {
    if (this.active) return

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
        ...(config.settings as FPatternConfig['settings']),
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
   * Creates the F-pattern overlay positioned over content area
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

    // F-Pattern zones (percentages of content area)
    const ch = rect.height
    const cw = rect.width

    const topBarHeight = ch * 0.15
    const secondBarHeight = ch * 0.12
    const secondBarTop = ch * 0.22
    const secondBarWidth = cw * 0.65
    const leftBarWidth = cw * 0.2
    const leftBarTop = secondBarTop + secondBarHeight

    // Top bar - primary scan zone
    const topBar = createPatternZone({
      top: 0,
      left: 0,
      width: '100%',
      height: topBarHeight,
      backgroundColor: bgColor,
      borderColor,
      borderBottom: true,
      label: showLabels ? { text: 'Primary scan zone', color, position: 'right' } : undefined,
    })
    this.overlayElement.appendChild(topBar)

    // Second bar - secondary scan
    const secondBar = createPatternZone({
      top: secondBarTop,
      left: 0,
      width: secondBarWidth,
      height: secondBarHeight,
      backgroundColor: bgColor,
      borderColor,
      borderBottom: true,
      borderRight: true,
      label: showLabels ? { text: 'Secondary scan', color, position: 'right' } : undefined,
    })
    this.overlayElement.appendChild(secondBar)

    // Left bar - vertical scan
    const leftBar = createPatternZone({
      top: leftBarTop,
      left: 0,
      width: leftBarWidth,
      height: `calc(100% - ${leftBarTop}px)`,
      backgroundColor: bgColor,
      borderColor,
      borderRight: true,
      label: showLabels ? { text: 'Vertical scan', color, position: 'vertical' } : undefined,
    })
    this.overlayElement.appendChild(leftBar)
  }
}

// Export singleton instance
export const fPatternMode = new FPatternMode()
