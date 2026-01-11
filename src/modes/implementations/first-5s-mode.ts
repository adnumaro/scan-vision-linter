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
 * Checks if an element is above the fold line
 * foldOffset is the distance from contentArea top to the fold
 * We compare the element's position relative to contentArea
 */
function isAboveFold(elementRect: DOMRect, contentAreaRect: DOMRect, foldOffset: number): boolean {
  // Element's bottom position relative to contentArea top
  const elementBottomRelative = elementRect.bottom - contentAreaRect.top
  return elementBottomRelative <= foldOffset
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
 * Finds the scrollable ancestor of an element (not window)
 */
function getScrollableAncestor(element: Element): Element | null {
  let current = element.parentElement
  while (current) {
    const style = window.getComputedStyle(current)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      if (current.scrollHeight > current.clientHeight) {
        return current
      }
    }
    current = current.parentElement
  }
  return null
}

/**
 * Calculates the fold offset from the top of contentArea
 * This represents how much content is visible when the page first loads (scroll = 0)
 */
function calculateFoldOffset(contentArea: Element): number {
  const scrollContainer = getScrollableAncestor(contentArea)

  if (scrollContainer) {
    // Scroll is in an internal container (like Confluence)
    const containerRect = scrollContainer.getBoundingClientRect()
    const contentRect = contentArea.getBoundingClientRect()
    const scrollTop = scrollContainer.scrollTop

    // Position of contentArea relative to scroll container when scroll = 0
    const contentTopInContainer = contentRect.top - containerRect.top + scrollTop

    // Visible height of the scroll container
    const containerVisibleHeight = containerRect.height

    // Fold offset from contentArea top
    return containerVisibleHeight - contentTopInContainer
  }
  // Scroll is in window
  const contentRect = contentArea.getBoundingClientRect()
  const contentTopInDocument = contentRect.top + window.scrollY
  return window.innerHeight - contentTopInDocument
}

/**
 * Creates the fold line indicator
 * Uses position: fixed with scroll event listener for correct positioning
 */
function createFoldLine(
  contentArea: Element,
  foldOffset: number,
): { elements: HTMLElement[]; cleanup: () => void } {
  const color = COLORS.indicator.foldLine
  const scrollContainer = getScrollableAncestor(contentArea)

  // Create container
  const container = document.createElement('div')
  container.className = 'scanvision-fold-container'

  // Create dotted line
  const line = document.createElement('div')
  line.className = 'scanvision-fold-line'
  container.appendChild(line)

  // Create label
  const label = document.createElement('div')
  label.className = 'scanvision-fold-label'
  label.textContent = t('patternAboveTheFold')
  container.appendChild(label)

  document.body.appendChild(container)

  // Function to update position
  const updatePosition = () => {
    const contentRect = contentArea.getBoundingClientRect()
    const foldViewportY = contentRect.top + foldOffset

    container.style.cssText = `
      position: fixed;
      top: ${foldViewportY}px;
      left: ${contentRect.left}px;
      width: ${contentRect.width}px;
      height: 0;
      pointer-events: none;
      z-index: ${Z_INDEX.INDICATOR};
    `

    line.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 0;
      border-top: 2px dotted ${color};
      pointer-events: none;
    `

    label.style.cssText = `
      position: absolute;
      top: -24px;
      right: 0;
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
  }

  // Initial position
  updatePosition()

  // Listen to scroll on the correct container
  const scrollTarget = scrollContainer || window
  scrollTarget.addEventListener('scroll', updatePosition, { passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })

  const cleanup = () => {
    scrollTarget.removeEventListener('scroll', updatePosition)
    window.removeEventListener('resize', updatePosition)
    container.remove()
  }

  return { elements: [container], cleanup }
}

/**
 * Creates all overlays for the content area using the tracker
 * Only shows highlights for elements above the initial fold line
 */
function createOverlays(
  tracker: OverlayTracker,
  context: ModeContext,
  config: First5sConfig['settings'],
  foldOffset: number,
): void {
  const { contentArea, preset } = context
  const { selectors } = preset
  const ignoreSelector = selectors.ignore?.join(', ') || ''
  const textBlockSelector = selectors.textBlocks || 'p'
  const headingsSelector = selectors.htmlAnchors.headings
  const imagesSelector = selectors.htmlAnchors.images
  const contentAreaRect = contentArea.getBoundingClientRect()

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
  const headings = contentArea.querySelectorAll(headingsSelector)
  for (const heading of headings) {
    if (ignoreSelector && heading.closest(ignoreSelector)) continue

    const rect = heading.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    if (isAboveFold(rect, contentAreaRect, foldOffset)) {
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
  const images = contentArea.querySelectorAll(imagesSelector)
  for (const img of images) {
    if (ignoreSelector && img.closest(ignoreSelector)) continue

    // Skip small images (likely icons)
    const imgEl = img as HTMLImageElement
    if (imgEl.width > 0 && imgEl.width < 48) continue
    if (imgEl.height > 0 && imgEl.height < 48) continue

    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    if (isAboveFold(rect, contentAreaRect, foldOffset)) {
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
  /** Fold line cleanup function */
  private foldLineCleanup: (() => void) | null = null
  /** Fold offset from contentArea top (calculated once at activation) */
  private foldOffset: number = 0

  private clearFoldLine(): void {
    this.foldLineCleanup?.()
    this.foldLineCleanup = null
  }

  activate(context: ModeContext): void {
    if (this.active) return

    // Clean up any previous state
    this.tracker?.clear()
    this.clearFoldLine()

    // Calculate fold offset (how much content is visible when scroll = 0)
    this.foldOffset = calculateFoldOffset(context.contentArea)

    this.context = context
    this.tracker = createOverlayTracker()
    createOverlays(this.tracker, context, this.config.settings, this.foldOffset)

    // Create fold line with its own scroll handling
    const foldLine = createFoldLine(context.contentArea, this.foldOffset)
    this.foldLineCleanup = foldLine.cleanup

    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    this.tracker?.clear()
    this.clearFoldLine()
    this.tracker = null
    this.context = null
    this.foldOffset = 0
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

    // Recreate overlays with new config (keep same foldOffset)
    if (this.active && this.context && this.tracker) {
      this.tracker.clear()
      this.clearFoldLine()
      this.tracker = createOverlayTracker()
      createOverlays(this.tracker, this.context, this.config.settings, this.foldOffset)
      const foldLine = createFoldLine(this.context.contentArea, this.foldOffset)
      this.foldLineCleanup = foldLine.cleanup
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
