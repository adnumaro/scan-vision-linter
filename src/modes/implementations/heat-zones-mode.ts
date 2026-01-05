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

  protected removeOverlay(): void {
    removeOverlayElement(OVERLAY_ID)
    this.overlayElement = null
  }
}

// Export singleton instance
export const heatZonesMode = new HeatZonesMode()
