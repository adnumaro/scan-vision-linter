/**
 * First 5 Seconds Mode - Shows what users see in first 5 seconds
 *
 * Uses overlay system (like scan mode) but with stronger dimming
 * to simulate what users perceive in quick scanning:
 * - Headings remain visible (not dimmed)
 * - Bold/emphasis text highlighted
 * - Images outlined
 * - Regular text heavily dimmed
 */

import { Timer } from 'lucide-react'
import { t } from '../../utils/i18n'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { COLORS, getBodyBgColor, SCAN_COLORS, withOpacity } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { Z_INDEX } from '../utils/constants'
import { createOverlayTracker, type OverlayTracker } from '../utils/overlay-tracker'

const MODE_ID = 'first-5s'

interface First5sConfig extends ModeConfig {
  settings: {
    /** Blur amount for dimmed text (higher than scan mode) */
    blur: number
    /** Opacity for dim overlay (higher = more dimming) */
    opacity: number
  }
}

const DEFAULT_CONFIG: First5sConfig = {
  enabled: false,
  settings: {
    blur: 2,
    opacity: 0.7,
  },
}

/**
 * Creates a dim overlay for text blocks
 */
function createDimOverlay(rect: DOMRect, config: First5sConfig['settings']): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'scanvision-first5s-dim'

  const bgColor = getBodyBgColor()

  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    backdrop-filter: blur(${config.blur}px);
    -webkit-backdrop-filter: blur(${config.blur}px);
    background: ${withOpacity(bgColor, config.opacity)};
    pointer-events: none;
    z-index: ${Z_INDEX.OVERLAY};
    border-radius: 2px;
  `
  return overlay
}

/**
 * Creates a highlight overlay for headings
 */
function createHeadingHighlight(rect: DOMRect): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'scanvision-first5s-heading'

  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 8}px;
    width: ${rect.width + 16}px;
    height: ${rect.height + 8}px;
    background: ${SCAN_COLORS.headings.rgba(0.1)};
    border-left: 3px solid ${SCAN_COLORS.headings.rgba(0.6)};
    pointer-events: none;
    z-index: ${Z_INDEX.OVERLAY};
    border-radius: 4px;
  `
  return overlay
}

/**
 * Creates an outline overlay for images
 */
function createImageOutline(rect: DOMRect): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'scanvision-first5s-image'

  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 3}px;
    left: ${rect.left - 3}px;
    width: ${rect.width + 6}px;
    height: ${rect.height + 6}px;
    border: 3px solid ${SCAN_COLORS.images.rgba(0.6)};
    pointer-events: none;
    z-index: ${Z_INDEX.OVERLAY};
    border-radius: 4px;
    box-sizing: border-box;
  `
  return overlay
}

/**
 * Checks if an element is a block-level hotspot (should not be dimmed)
 */
function isHotspot(element: Element): boolean {
  return element.matches('h1, h2, h3, h4, h5, h6, img, picture, video, figure, pre, code, table')
}

/**
 * Checks if an element is completely above the fold line
 */
function isAboveFold(rect: DOMRect, foldY: number): boolean {
  return rect.bottom <= foldY
}

/**
 * Creates a full blur overlay for elements below the fold (no highlights)
 */
function createBelowFoldOverlay(rect: DOMRect, config: First5sConfig['settings']): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'scanvision-first5s-below-fold'

  const bgColor = getBodyBgColor()

  // Stronger blur and opacity for below-fold content
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    backdrop-filter: blur(${config.blur * 1.5}px);
    -webkit-backdrop-filter: blur(${config.blur * 1.5}px);
    background: ${withOpacity(bgColor, Math.min(config.opacity * 1.3, 0.9))};
    pointer-events: none;
    z-index: ${Z_INDEX.OVERLAY};
    border-radius: 2px;
  `
  return overlay
}

/**
 * Creates the fold line indicator
 */
function createFoldLine(tracker: OverlayTracker, contentArea: Element, foldY: number): void {
  const contentRect = contentArea.getBoundingClientRect()
  const foldOffsetY = foldY - contentRect.top
  const color = COLORS.indicator.foldLine

  // Create dotted line
  const line = document.createElement('div')
  line.className = 'scanvision-fold-line'
  line.style.cssText = `
    position: fixed;
    top: ${foldY}px;
    left: ${contentRect.left}px;
    width: ${contentRect.width}px;
    height: 0;
    border-top: 2px dotted ${color};
    pointer-events: none;
    z-index: ${Z_INDEX.INDICATOR};
  `

  tracker.track({
    element: contentArea,
    overlay: line,
    offset: { top: foldOffsetY, left: 0, width: 0 },
    type: 'fold-line',
    fixedDimensions: true,
  })

  // Create label
  const label = document.createElement('div')
  label.className = 'scanvision-fold-label'
  label.textContent = t('patternAboveTheFold')
  label.style.cssText = `
    position: fixed;
    top: ${foldY - 24}px;
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

  tracker.track({
    element: contentArea,
    overlay: label,
    offset: { top: foldOffsetY - 24, left: contentRect.width - 110 },
    type: 'fold-label',
    fixedDimensions: true,
  })
}

/**
 * Creates all overlays for the content area using the tracker
 * Only shows highlights for elements above the initial fold line
 */
function createOverlays(
  tracker: OverlayTracker,
  context: ModeContext,
  config: First5sConfig['settings'],
  foldY: number,
): void {
  const { contentArea, preset } = context
  const ignoreSelector = preset.selectors.ignoreElements?.join(', ') || ''
  const textBlockSelector = preset.selectors.textBlocks || 'p'

  // Get text blocks to dim
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)

  for (const element of textBlocks) {
    // Skip if inside ignored area
    if (ignoreSelector && element.closest(ignoreSelector)) continue

    // Skip hotspots (headings, images, etc.) - but only above fold
    if (isHotspot(element)) continue

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    const overlay = createDimOverlay(rect, config)
    tracker.track({
      element,
      overlay,
      offset: { top: 0, left: 0, width: 0, height: 0 },
      type: 'dim',
    })
  }

  // Process headings - only highlight if above fold
  const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6')
  for (const heading of headings) {
    if (ignoreSelector && heading.closest(ignoreSelector)) continue

    const rect = heading.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    if (isAboveFold(rect, foldY)) {
      // Above fold: show highlight
      const overlay = createHeadingHighlight(rect)
      tracker.track({
        element: heading,
        overlay,
        offset: { top: -4, left: -8, width: 16, height: 8 },
        type: 'highlight',
      })
    } else {
      // Below fold: blur without highlight
      const overlay = createBelowFoldOverlay(rect, config)
      tracker.track({
        element: heading,
        overlay,
        offset: { top: 0, left: 0, width: 0, height: 0 },
        type: 'below-fold',
      })
    }
  }

  // Process images - only outline if above fold
  const images = contentArea.querySelectorAll('img, picture, video')
  for (const img of images) {
    if (ignoreSelector && img.closest(ignoreSelector)) continue

    // Skip small images (likely icons)
    const imgEl = img as HTMLImageElement
    if (imgEl.width > 0 && imgEl.width < 48) continue
    if (imgEl.height > 0 && imgEl.height < 48) continue

    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    if (isAboveFold(rect, foldY)) {
      // Above fold: show outline
      const overlay = createImageOutline(rect)
      tracker.track({
        element: img,
        overlay,
        offset: { top: -3, left: -3, width: 6, height: 6 },
        type: 'image-outline',
      })
    } else {
      // Below fold: blur without outline
      const overlay = createBelowFoldOverlay(rect, config)
      tracker.track({
        element: img,
        overlay,
        offset: { top: 0, left: 0, width: 0, height: 0 },
        type: 'below-fold',
      })
    }
  }

  // Add fold line indicator
  createFoldLine(tracker, contentArea, foldY)
}

/**
 * First 5 Seconds Mode implementation using overlays
 * Captures fold position on activation and only highlights content above it
 */
class First5sMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'First 5 Seconds'
  readonly description = 'Shows only what users see during quick scanning'
  readonly icon = Timer
  readonly category = 'simulation' as const
  readonly incompatibleWith = ['scan']

  private active = false
  private config: First5sConfig = DEFAULT_CONFIG
  private context: ModeContext | null = null
  private tracker: OverlayTracker | null = null
  /** Fold line position captured at activation time */
  private initialFoldY: number = 0

  activate(context: ModeContext): void {
    if (this.active) return

    // Clean up any previous state
    this.tracker?.clear()

    // Capture fold position at activation time
    this.initialFoldY = window.innerHeight

    this.context = context
    this.tracker = createOverlayTracker()
    createOverlays(this.tracker, context, this.config.settings, this.initialFoldY)
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

  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as First5sConfig['settings']),
      },
    }

    // Recreate overlays with new config (keep same foldY)
    if (this.active && this.context && this.tracker) {
      this.tracker.clear()
      this.tracker = createOverlayTracker()
      createOverlays(this.tracker, this.context, this.config.settings, this.initialFoldY)
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
export const first5sMode = new First5sMode()
