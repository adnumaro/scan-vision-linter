/**
 * Heat Zones Mode - Shows attention gradient overlay
 * Green (top-left) = high attention
 * Red (bottom-right) = low attention
 */

import { Flame } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { generateHeatGradientStops } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { removeOverlayElement } from '../utils/overlay'
import { generateRadialGradient } from '../utils/styles'
import { onViewportChange } from '../utils/viewport'

const MODE_ID = 'heat-zones'
const OVERLAY_ID = 'heat-zones-overlay'

interface HeatZonesConfig extends ModeConfig {
  settings: {
    intensity: number
  }
}

const DEFAULT_CONFIG: HeatZonesConfig = {
  enabled: false,
  settings: {
    intensity: 0.5,
  },
}

/**
 * Heat Zones Mode implementation
 */
class HeatZonesMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'Heat Zones'
  readonly description = 'Shows attention gradient (green = high, red = low)'
  readonly icon = Flame
  readonly category = 'overlay' as const
  readonly incompatibleWith: string[] = []

  private active = false
  private config: HeatZonesConfig = DEFAULT_CONFIG
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
        ...(config.settings as HeatZonesConfig['settings']),
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
   * Creates the heat zones overlay positioned over content area
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
   */
  private updateOverlay(): void {
    if (!this.overlayElement || !this.contentArea) return

    const rect = this.contentArea.getBoundingClientRect()
    const { intensity } = this.config.settings
    const alpha = intensity * 0.25

    const gradientStops = generateHeatGradientStops(alpha)
    const gradient = generateRadialGradient(gradientStops, 'top left')

    // Position overlay to match content area bounds
    this.overlayElement.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      z-index: ${Z_INDEX.OVERLAY};
      pointer-events: none;
      background: ${gradient};
      mix-blend-mode: multiply;
    `
  }
}

// Export singleton instance
export const heatZonesMode = new HeatZonesMode()
