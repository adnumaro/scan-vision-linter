/**
 * Scan overlay utilities using backdrop-filter for universal dimming
 * Works on any background color (light, dark, or colored)
 */

import { SCAN_COLORS, withOpacity } from './colors'
import { Z_INDEX } from './constants'

/** Class names for different overlay types */
const OVERLAY_CLASSES = {
  container: 'scanvision-scan-container',
  dimOverlay: 'scanvision-dim-overlay',
  problemOverlay: 'scanvision-problem-overlay',
} as const

/** Problem overlay categories */
type ProblemCategory = 'problem' | 'unformatted'

/** Configuration for scan overlays */
export interface ScanOverlayConfig {
  blur: number
  opacity: number
}

const DEFAULT_CONFIG: ScanOverlayConfig = {
  blur: 1.5,
  opacity: 0.5,
}

/**
 * Adds an overlay directly to document.body with proper z-index
 */
function addOverlayToBody(overlay: HTMLElement): void {
  overlay.style.zIndex = String(Z_INDEX.OVERLAY)
  document.body.appendChild(overlay)
}

/**
 * Gets the background color of the page body (hoisted for use in createDimOverlay)
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
 * Creates a dim overlay for a text block using backdrop-filter and body-colored background
 */
function createDimOverlay(rect: DOMRect, config: ScanOverlayConfig): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASSES.dimOverlay

  // Use body background color with opacity to dim text
  const bgColor = getBodyBgColor()
  const bgStyle = config.opacity > 0 ? `background: ${withOpacity(bgColor, config.opacity)};` : ''

  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    backdrop-filter: blur(${config.blur}px);
    -webkit-backdrop-filter: blur(${config.blur}px);
    ${bgStyle}
    pointer-events: none;
    border-radius: 2px;
  `
  return overlay
}

/**
 * Gets the outline color for a problem category
 */
function getProblemColor(category: ProblemCategory): { color: string; style: 'dashed' } {
  if (category === 'unformatted') {
    return { color: SCAN_COLORS.unformattedCode.rgba(0.8), style: 'dashed' }
  }
  return { color: SCAN_COLORS.denseParagraph.rgba(0.7), style: 'dashed' }
}

/**
 * Creates a problem overlay (for unformatted code)
 */
function createProblemOverlay(rect: DOMRect, type: ProblemCategory): HTMLElement {
  const { color, style } = getProblemColor(type)
  const bgColor =
    type === 'problem'
      ? SCAN_COLORS.denseParagraph.rgba(0.05)
      : SCAN_COLORS.unformattedCode.rgba(0.08)

  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASSES.problemOverlay
  overlay.dataset.type = type
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 2px ${style} ${color};
    border-radius: 4px;
    background: ${bgColor};
    pointer-events: none;
    box-sizing: border-box;
  `
  return overlay
}

/**
 * Tracked element data for repositioning on scroll/resize
 */
interface TrackedElement {
  element: Element
  overlay: HTMLElement
  type: 'dim' | 'problem' | 'highlight'
  category?: ProblemCategory
}

/** All currently tracked elements */
let trackedElements: TrackedElement[] = []

/** Scroll/resize handlers */
let scrollHandler: (() => void) | null = null
let resizeHandler: (() => void) | null = null
let rafId: number | null = null

/**
 * Updates all overlay positions based on current element positions
 */
function updateOverlayPositions(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }

  rafId = requestAnimationFrame(() => {
    for (const tracked of trackedElements) {
      const rect = tracked.element.getBoundingClientRect()

      if (tracked.type === 'dim') {
        tracked.overlay.style.top = `${rect.top}px`
        tracked.overlay.style.left = `${rect.left}px`
        tracked.overlay.style.width = `${rect.width}px`
        tracked.overlay.style.height = `${rect.height}px`
      } else if (tracked.type === 'highlight') {
        // Highlights have -4px vertical offset for alignment
        tracked.overlay.style.top = `${rect.top - 4}px`
        tracked.overlay.style.left = `${rect.left}px`
      } else if (tracked.type === 'problem') {
        tracked.overlay.style.top = `${rect.top - 4}px`
        tracked.overlay.style.left = `${rect.left - 4}px`
        tracked.overlay.style.width = `${rect.width + 8}px`
        tracked.overlay.style.height = `${rect.height + 8}px`
      }
    }
    rafId = null
  })
}

/**
 * Sets up scroll and resize listeners for overlay repositioning
 * Uses capture:true to catch scroll events on internal scrollable elements (like Notion)
 */
function setupPositionListeners(): void {
  if (scrollHandler) return // Already set up

  scrollHandler = () => requestAnimationFrame(updateOverlayPositions)
  resizeHandler = () => requestAnimationFrame(updateOverlayPositions)

  // Use capture:true to catch scroll on internal elements, not just window
  window.addEventListener('scroll', scrollHandler, true)
  window.addEventListener('resize', resizeHandler)
}

/**
 * Removes scroll and resize listeners
 */
function removePositionListeners(): void {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true)
    scrollHandler = null
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/** Selector for inline anchors that should be highlighted above blur */
const INLINE_ANCHOR_SELECTOR = 'strong, b, mark, em, a'

/**
 * Creates dim overlays for all text blocks in the content area
 * Also creates highlights for inline anchors within blurred paragraphs
 */
export function createDimOverlays(
  textBlocks: NodeListOf<Element> | Element[],
  config: ScanOverlayConfig = DEFAULT_CONFIG,
  ignoreSelector = '',
): void {
  const elements = ignoreSelector
    ? Array.from(textBlocks).filter((el) => !el.closest(ignoreSelector))
    : Array.from(textBlocks)

  for (const element of elements) {
    // Skip if element IS a block-level hotspot (headings, code blocks, etc.)
    if (isBlockLevelHotspot(element)) continue

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    // Create blur overlay for the paragraph
    const overlay = createDimOverlay(rect, config)
    addOverlayToBody(overlay)
    trackedElements.push({ element, overlay, type: 'dim' })

    // Create highlights for inline anchors within this paragraph
    createInlineAnchorHighlights(element, ignoreSelector)
  }

  setupPositionListeners()
}

/**
 * Determines the text opacity for an inline anchor based on attention level
 * - Different color from paragraph text → full opacity (stands out visually)
 * - Bold (strong, b, mark) → full opacity (high attention)
 * - Italic, links with same color → reduced opacity (lower attention)
 */
function getTextOpacity(anchor: HTMLElement, paragraph: Element): number {
  const anchorColor = window.getComputedStyle(anchor).color
  const paragraphColor = window.getComputedStyle(paragraph).color

  // If color is different from paragraph, it stands out → full opacity
  if (anchorColor !== paragraphColor) {
    return 1
  }

  const tagName = anchor.tagName.toUpperCase()

  // Bold text - high attention → full opacity
  if (tagName === 'STRONG' || tagName === 'B' || tagName === 'MARK') {
    return 1
  }

  // Italic, links with same color - lower attention → reduced opacity
  return 0.5
}

/**
 * Creates highlight overlays for inline anchors within a blurred paragraph
 * These highlights appear ABOVE the blur overlay to show the anchor text clearly
 */
function createInlineAnchorHighlights(paragraph: Element, ignoreSelector: string): void {
  const inlineAnchors = paragraph.querySelectorAll(INLINE_ANCHOR_SELECTOR)

  for (const anchor of inlineAnchors) {
    // Skip if inside ignored area
    if (ignoreSelector && anchor.closest(ignoreSelector)) continue

    const rect = anchor.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    // Determine text opacity based on attention level
    const textOpacity = getTextOpacity(anchor as HTMLElement, paragraph)

    // Create a highlight that clones the anchor content
    const highlight = createInlineHighlight(anchor as HTMLElement, rect, textOpacity)
    addOverlayToBody(highlight)
    trackedElements.push({ element: anchor, overlay: highlight, type: 'highlight' })
  }
}

/**
 * Creates an inline highlight element that shows anchor text above the blur
 * Background is always solid (body color), text color opacity varies by attention level
 */
function createInlineHighlight(
  anchor: HTMLElement,
  rect: DOMRect,
  textOpacity: number,
): HTMLElement {
  const highlight = document.createElement('span')
  highlight.className = 'scanvision-inline-highlight'

  // Copy the text content
  highlight.textContent = anchor.textContent

  // Get computed styles from original element
  const computed = window.getComputedStyle(anchor)

  // Get body background color for the highlight background (always solid)
  const bgColor = getBodyBgColor()

  // Apply opacity to text color only, not the whole element
  const textColor = textOpacity >= 1 ? computed.color : withOpacity(computed.color, textOpacity)

  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left}px;
    font-family: ${computed.fontFamily};
    font-size: ${computed.fontSize};
    font-weight: ${computed.fontWeight};
    font-style: ${computed.fontStyle};
    text-decoration: ${computed.textDecoration};
    color: ${textColor};
    line-height: ${computed.lineHeight};
    letter-spacing: ${computed.letterSpacing};
    background-color: ${bgColor};
    padding: 0 2px;
    margin-left: -2px;
    pointer-events: none;
    white-space: pre-wrap;
  `

  return highlight
}

/**
 * Checks if an element IS a block-level hotspot (full element is an anchor)
 * Note: Inline anchors (strong, em, a) are handled separately with highlights
 */
function isBlockLevelHotspot(element: Element): boolean {
  const blockHotspots = 'h1, h2, h3, h4, h5, h6, pre, code, img, video, table, ul, ol'
  return element.matches(blockHotspots)
}

/**
 * Updates the config for all dim overlays
 */
export function updateDimOverlayConfig(config: ScanOverlayConfig): void {
  const bgColor = getBodyBgColor()

  for (const tracked of trackedElements) {
    if (tracked.type === 'dim') {
      const blurValue = `blur(${config.blur}px)`
      tracked.overlay.style.backdropFilter = blurValue
      // Safari prefix - use type assertion for vendor prefix
      ;(tracked.overlay.style as unknown as Record<string, string>)['-webkit-backdrop-filter'] =
        blurValue
      tracked.overlay.style.background =
        config.opacity > 0 ? withOpacity(bgColor, config.opacity) : 'transparent'
    }
  }
}

/**
 * Removes all scan overlays and cleans up
 */
export function removeAllScanOverlays(): void {
  removePositionListeners()

  // Remove each overlay from the DOM
  for (const tracked of trackedElements) {
    tracked.overlay.remove()
  }
  trackedElements = []

  // Remove tooltip styles
  const tooltipStyles = document.getElementById('scanvision-tooltip-styles')
  if (tooltipStyles) {
    tooltipStyles.remove()
    tooltipStylesInjected = false
  }
}

// ============================================================================
// Unformatted Code Overlay Support (with tooltips)
// ============================================================================

/** Track if tooltip styles have been injected */
let tooltipStylesInjected = false

/**
 * Suggestions for each anti-pattern type
 */
const SUGGESTIONS: Record<string, string> = {
  command: 'Wrap terminal commands in a code block for better readability',
  json: 'Format JSON data in a code block with syntax highlighting',
  token: 'Place tokens and credentials in code blocks to distinguish them from text',
  header: 'Use a code block or table to display HTTP headers clearly',
  code: 'Move code snippets to properly formatted code blocks',
}

/**
 * Injects styles for tooltips (only once)
 */
function injectTooltipStyles(): void {
  if (tooltipStylesInjected) return

  const style = document.createElement('style')
  style.id = 'scanvision-tooltip-styles'
  style.textContent = `
    .scanvision-info-icon {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      background: #fb923c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-size: 12px;
      font-weight: bold;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .scanvision-info-icon:hover {
      transform: scale(1.1);
      background: #f97316;
    }
    .scanvision-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      background: #1f2937;
      color: white;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.4;
      width: 260px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s, transform 0.15s;
      z-index: 10001;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .scanvision-info-icon:hover .scanvision-tooltip {
      opacity: 1;
      transform: translateY(0);
    }
    .scanvision-tooltip-title {
      font-weight: 600;
      color: #fb923c;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .scanvision-tooltip-suggestion {
      color: #d1d5db;
    }
  `
  document.head.appendChild(style)
  tooltipStylesInjected = true
}

/**
 * Creates an info icon with tooltip for an overlay
 */
function createInfoIcon(type: string, description: string): HTMLDivElement {
  const icon = document.createElement('div')
  icon.className = 'scanvision-info-icon'
  icon.textContent = 'i'

  const tooltip = document.createElement('div')
  tooltip.className = 'scanvision-tooltip'

  const titleDiv = document.createElement('div')
  titleDiv.className = 'scanvision-tooltip-title'
  // Use textContent instead of innerHTML to prevent XSS
  const emoji = document.createElement('span')
  emoji.textContent = '⚠️'
  titleDiv.appendChild(emoji)
  titleDiv.appendChild(document.createTextNode(` ${description}`))

  const suggestionDiv = document.createElement('div')
  suggestionDiv.className = 'scanvision-tooltip-suggestion'
  suggestionDiv.textContent =
    SUGGESTIONS[type] || 'Consider using proper formatting for this content'

  tooltip.appendChild(titleDiv)
  tooltip.appendChild(suggestionDiv)
  icon.appendChild(tooltip)

  return icon
}

/**
 * Information about an unformatted code match
 */
export interface UnformattedCodeInfo {
  element: Element
  type: string
  description: string
}

/**
 * Creates overlays for unformatted code blocks with tooltips
 */
export function createUnformattedCodeOverlays(matches: UnformattedCodeInfo[]): void {
  // Inject tooltip styles
  injectTooltipStyles()

  for (const { element, type, description } of matches) {
    // Skip if already tracked
    if (trackedElements.some((t) => t.element === element && t.category === 'unformatted')) {
      continue
    }

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    // Create the problem overlay
    const overlay = createProblemOverlay(rect, 'unformatted')

    // Add info icon with tooltip
    const infoIcon = createInfoIcon(type, description)
    overlay.appendChild(infoIcon)

    addOverlayToBody(overlay)
    trackedElements.push({ element, overlay, type: 'problem', category: 'unformatted' })
  }

  setupPositionListeners()
}
