/**
 * Heat Zones Mode - Shows attention gradient overlay
 * Green (top-left) = high attention
 * Red (bottom-right) = low attention
 */

import { Flame } from 'lucide-react'
import type { ModeConfig } from '../types'
import { ViewportTrackingMode } from '../utils/base-mode'
import { generateHeatGradientStops } from '../utils/colors'
import { OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { removeOverlayElement } from '../utils/overlay'
import { generateRadialGradient } from '../utils/styles'

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
class HeatZonesMode extends ViewportTrackingMode<HeatZonesConfig> {
  readonly id = MODE_ID
  readonly name = 'Heat Zones'
  readonly description = 'Shows attention gradient (green = high, red = low)'
  readonly icon = Flame
  readonly category = 'overlay' as const
  readonly incompatibleWith: string[] = []

  private overlayElement: HTMLElement | null = null

  constructor() {
    super(DEFAULT_CONFIG)
  }

  protected createOverlay(): void {
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

  protected updateOverlay(): void {
    if (!this.overlayElement || !this.contentArea) return

    const rect = this.contentArea.getBoundingClientRect()
    const { intensity } = this.config.settings
    // Increased alpha for more visible gradient (was 0.25, now 0.5)
    const alpha = intensity * 0.5

    // Calculate visible area (intersection of content area and viewport)
    const viewportHeight = window.innerHeight
    const visibleTop = Math.max(rect.top, 0)
    const visibleBottom = Math.min(rect.bottom, viewportHeight)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)

    const gradientStops = generateHeatGradientStops(alpha)
    const gradient = generateRadialGradient(gradientStops, 'top left')

    // Position overlay to match visible content area
    // Uses HEAT_OVERLAY z-index to appear above scan overlays
    this.overlayElement.style.cssText = `
      position: fixed;
      top: ${visibleTop}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${visibleHeight}px;
      z-index: ${Z_INDEX.HEAT_OVERLAY};
      pointer-events: none;
      background: ${gradient};
      mix-blend-mode: multiply;
    `
  }

  protected removeOverlay(): void {
    removeOverlayElement(OVERLAY_ID)
    this.overlayElement = null
  }
}

// Export singleton instance
export const heatZonesMode = new HeatZonesMode()
