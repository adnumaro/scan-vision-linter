/**
 * F-Pattern Mode - Shows the F-shaped reading pattern overlay
 * Users naturally scan content in an F shape:
 * 1. Top horizontal bar (headlines)
 * 2. Second horizontal bar (subheadlines)
 * 3. Vertical left bar (scanning down)
 */

import { LayoutTemplate } from 'lucide-react'
import { t } from '../../utils/i18n'
import type { ModeConfig } from '../types'
import { ViewportTrackingMode } from '../utils/base-mode'
import { COLORS, hexToRgba } from '../utils/colors'
import { F_PATTERN, OVERLAY_PREFIX, Z_INDEX } from '../utils/constants'
import { createPatternZone, removeOverlayElement } from '../utils/overlay'

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
    color: COLORS.pattern.primary,
    showLabels: true,
  },
}

/**
 * F-Pattern Mode implementation
 */
class FPatternMode extends ViewportTrackingMode<FPatternConfig> {
  readonly id = MODE_ID
  readonly name = 'F-Pattern'
  readonly description = 'Shows natural F-shaped reading pattern overlay'
  readonly icon = LayoutTemplate
  readonly category = 'overlay' as const
  readonly incompatibleWith = ['e-pattern']

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
    const { opacity, color, showLabels } = this.config.settings
    const bgColor = hexToRgba(color, opacity)
    const borderColor = hexToRgba(color, opacity + 0.1)

    // Calculate visible area (intersection of content area and viewport)
    const viewportHeight = window.innerHeight
    const visibleTop = Math.max(rect.top, 0)
    const visibleBottom = Math.min(rect.bottom, viewportHeight)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)

    // Position overlay to match visible content area
    this.overlayElement.style.cssText = `
      position: fixed;
      top: ${visibleTop}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${visibleHeight}px;
      z-index: ${Z_INDEX.PATTERN_OVERLAY};
      pointer-events: none;
      overflow: hidden;
    `

    // Clear previous content safely
    this.overlayElement.textContent = ''

    // F-Pattern zones (percentages of VISIBLE area, not total content)
    const ch = visibleHeight
    const cw = rect.width

    const topBarHeight = ch * F_PATTERN.TOP_BAR_HEIGHT
    const secondBarHeight = ch * F_PATTERN.SECOND_BAR_HEIGHT
    const secondBarTop = ch * F_PATTERN.SECOND_BAR_TOP
    const secondBarWidth = cw * F_PATTERN.SECOND_BAR_WIDTH
    const leftBarWidth = cw * F_PATTERN.LEFT_BAR_WIDTH
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
      label: showLabels ? { text: t('patternPrimaryScan'), color, position: 'right' } : undefined,
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
      label: showLabels ? { text: t('patternSecondaryScan'), color, position: 'right' } : undefined,
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
      label: showLabels
        ? { text: t('patternVerticalScan'), color, position: 'vertical' }
        : undefined,
    })
    this.overlayElement.appendChild(leftBar)
  }

  protected removeOverlay(): void {
    removeOverlayElement(OVERLAY_ID)
    this.overlayElement = null
  }
}

// Export singleton instance
export const fPatternMode = new FPatternMode()
