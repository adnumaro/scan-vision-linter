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
import { removeOverlayElement } from '../utils/overlay'
import { onViewportChange } from '../utils/viewport'

const MODE_ID = 'f-pattern'
const OVERLAY_ID = 'f-pattern-overlay'
const OVERLAY_PREFIX = 'scanvision-overlay-'

export interface FPatternConfig extends ModeConfig {
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
export class FPatternMode implements VisualizationMode {
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
    return this.config
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
      z-index: 999990;
      pointer-events: none;
      overflow: hidden;
    `

    // F-Pattern zones (percentages of content area)
    const cw = rect.width
    const ch = rect.height

    const topBarHeight = ch * 0.15
    const secondBarHeight = ch * 0.12
    const secondBarTop = ch * 0.22
    const secondBarWidth = cw * 0.65
    const leftBarWidth = cw * 0.2
    const leftBarTop = secondBarTop + secondBarHeight

    this.overlayElement.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: ${topBarHeight}px; background: ${bgColor}; border-bottom: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 11px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8;">Primary scan zone</span>` : ''}
      </div>
      <div style="position: absolute; top: ${secondBarTop}px; left: 0; width: ${secondBarWidth}px; height: ${secondBarHeight}px; background: ${bgColor}; border-bottom: 2px solid ${borderColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 11px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8;">Secondary scan</span>` : ''}
      </div>
      <div style="position: absolute; top: ${leftBarTop}px; left: 0; width: ${leftBarWidth}px; height: calc(100% - ${leftBarTop}px); background: ${bgColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; left: 50%; top: 24px; transform: translateX(-50%); font-size: 11px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8; writing-mode: vertical-rl;">Vertical scan</span>` : ''}
      </div>
    `
  }
}

// Export singleton instance
export const fPatternMode = new FPatternMode()
