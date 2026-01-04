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
import { hexToRgba } from '../utils/colors'
import { removeOverlayElement } from '../utils/overlay'
import { onViewportChange } from '../utils/viewport'

const MODE_ID = 'e-pattern'
const OVERLAY_ID = 'e-pattern-overlay'
const OVERLAY_PREFIX = 'scanvision-overlay-'

export interface EPatternConfig extends ModeConfig {
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
    color: '#8b5cf6',
    showLabels: true,
  },
}

/**
 * E-Pattern Mode implementation
 */
export class EPatternMode implements VisualizationMode {
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
    return this.config
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

    this.overlayElement.innerHTML = `
      <div style="position: absolute; top: ${topBarTop}px; left: 0; width: ${barWidth1}px; height: ${barHeight}px; background: ${bgColor}; border-bottom: 2px solid ${borderColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 10px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8;">1st scan</span>` : ''}
      </div>
      <div style="position: absolute; top: ${secondBarTop}px; left: 0; width: ${barWidth2}px; height: ${barHeight}px; background: ${bgColor}; border-bottom: 2px solid ${borderColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 10px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8;">2nd scan</span>` : ''}
      </div>
      <div style="position: absolute; top: ${thirdBarTop}px; left: 0; width: ${barWidth3}px; height: ${barHeight}px; background: ${bgColor}; border-bottom: 2px solid ${borderColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 10px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8;">3rd scan</span>` : ''}
      </div>
      <div style="position: absolute; top: ${leftBarTop}px; left: 0; width: ${leftBarWidth}px; height: calc(100% - ${leftBarTop}px); background: ${bgColor}; border-right: 2px solid ${borderColor};">
        ${showLabels ? `<span style="position: absolute; left: 50%; top: 24px; transform: translateX(-50%); font-size: 10px; color: ${color}; font-family: system-ui; font-weight: 500; opacity: 0.8; writing-mode: vertical-rl;">Down</span>` : ''}
      </div>
    `
  }
}

// Export singleton instance
export const ePatternMode = new EPatternMode()
