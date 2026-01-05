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
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { SCAN_COLORS, withOpacity } from '../utils/colors'
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
 * Gets the background color of the page body
 */
function getBodyBgColor(): string {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor
  if (bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent') {
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor
    if (htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
      return htmlBg
    }
    return '#ffffff'
  }
  return bodyBg
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
 * Creates all overlays for the content area using the tracker
 */
function createOverlays(
  tracker: OverlayTracker,
  context: ModeContext,
  config: First5sConfig['settings'],
): void {
  const { contentArea, preset } = context
  const ignoreSelector = preset.selectors.ignoreElements?.join(', ') || ''
  const textBlockSelector = preset.selectors.textBlocks || 'p'

  // Get text blocks to dim
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)

  for (const element of textBlocks) {
    // Skip if inside ignored area
    if (ignoreSelector && element.closest(ignoreSelector)) continue

    // Skip hotspots (headings, images, etc.)
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

  // Highlight headings
  const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6')
  for (const heading of headings) {
    if (ignoreSelector && heading.closest(ignoreSelector)) continue

    const rect = heading.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    const overlay = createHeadingHighlight(rect)
    tracker.track({
      element: heading,
      overlay,
      offset: { top: -4, left: -8, width: 16, height: 8 },
      type: 'highlight',
    })
  }

  // Outline images
  const images = contentArea.querySelectorAll('img, picture, video')
  for (const img of images) {
    if (ignoreSelector && img.closest(ignoreSelector)) continue

    // Skip small images (likely icons)
    const imgEl = img as HTMLImageElement
    if (imgEl.width > 0 && imgEl.width < 48) continue
    if (imgEl.height > 0 && imgEl.height < 48) continue

    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    const overlay = createImageOutline(rect)
    tracker.track({
      element: img,
      overlay,
      offset: { top: -3, left: -3, width: 6, height: 6 },
      type: 'image-outline',
    })
  }
}

/**
 * First 5 Seconds Mode implementation using overlays
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

  activate(context: ModeContext): void {
    if (this.active) return

    // Clean up any previous state
    this.tracker?.clear()

    this.context = context
    this.tracker = createOverlayTracker()
    createOverlays(this.tracker, context, this.config.settings)
    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    this.tracker?.clear()
    this.tracker = null
    this.context = null
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

    // Recreate overlays with new config
    if (this.active && this.context && this.tracker) {
      this.tracker.clear()
      this.tracker = createOverlayTracker()
      createOverlays(this.tracker, this.context, this.config.settings)
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
