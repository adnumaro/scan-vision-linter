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
  hotspotOverlay: 'scanvision-hotspot-overlay',
  problemOverlay: 'scanvision-problem-overlay',
} as const

/** Hotspot categories for different outline colors */
export type HotspotCategory =
  | 'heading'
  | 'code'
  | 'image'
  | 'callout'
  | 'platform'
  | 'problem'
  | 'unformatted'

/** Configuration for scan overlays */
export interface ScanOverlayConfig {
  blur: number
  opacity: number
}

const DEFAULT_CONFIG: ScanOverlayConfig = {
  blur: 2,
  opacity: 0,
}

/**
 * Adds an overlay directly to document.body with proper z-index
 */
function addOverlayToBody(overlay: HTMLElement): void {
  overlay.style.zIndex = String(Z_INDEX.OVERLAY)
  document.body.appendChild(overlay)
}

/**
 * Creates a dim overlay for a text block using backdrop-filter
 */
function createDimOverlay(rect: DOMRect, config: ScanOverlayConfig): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASSES.dimOverlay
  // Use transparent background, only backdrop-filter for blur effect
  const bgStyle = config.opacity > 0 ? `background: rgba(128, 128, 128, ${config.opacity});` : ''
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
 * Gets the outline color for a hotspot category
 */
function getHotspotColor(category: HotspotCategory): { color: string; style: 'solid' | 'dashed' } {
  switch (category) {
    case 'heading':
      return { color: SCAN_COLORS.headings.rgba(0.6), style: 'solid' }
    case 'code':
      return { color: SCAN_COLORS.code.rgba(0.6), style: 'dashed' }
    case 'image':
      return { color: SCAN_COLORS.images.rgba(0.6), style: 'solid' }
    case 'callout':
      return { color: SCAN_COLORS.callouts.rgba(0.6), style: 'solid' }
    case 'platform':
      return { color: SCAN_COLORS.platform.rgba(0.6), style: 'solid' }
    case 'problem':
      return { color: SCAN_COLORS.denseParagraph.rgba(0.7), style: 'dashed' }
    case 'unformatted':
      return { color: SCAN_COLORS.unformattedCode.rgba(0.8), style: 'dashed' }
    default:
      return { color: SCAN_COLORS.headings.rgba(0.5), style: 'solid' }
  }
}

/**
 * Creates a hotspot overlay (colored border) for an anchor element
 */
function createHotspotOverlay(rect: DOMRect, category: HotspotCategory): HTMLElement {
  const { color, style } = getHotspotColor(category)
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASSES.hotspotOverlay
  overlay.dataset.category = category
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 2}px;
    left: ${rect.left - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    border: 2px ${style} ${color};
    border-radius: 3px;
    pointer-events: none;
    box-sizing: border-box;
  `
  return overlay
}

/**
 * Creates a problem overlay (for dense paragraphs or unformatted code)
 */
function createProblemOverlay(rect: DOMRect, type: 'problem' | 'unformatted'): HTMLElement {
  const { color, style } = getHotspotColor(type)
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
  type: 'dim' | 'hotspot' | 'problem' | 'highlight'
  category?: HotspotCategory
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
      } else if (tracked.type === 'hotspot') {
        tracked.overlay.style.top = `${rect.top - 2}px`
        tracked.overlay.style.left = `${rect.left - 2}px`
        tracked.overlay.style.width = `${rect.width + 4}px`
        tracked.overlay.style.height = `${rect.height + 4}px`
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
 * Gets the background color of the page body
 */
function getBodyBackgroundColor(): string {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor
  // If body is transparent, try html element
  if (bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent') {
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor
    if (htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
      return htmlBg
    }
    // Default to white if both are transparent
    return '#ffffff'
  }
  return bodyBg
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
  const bgColor = getBodyBackgroundColor()

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
 * Creates hotspot overlays for anchor elements
 */
export function createHotspotOverlays(
  contentArea: Element,
  preset: { hotSpots?: string[]; codeBlocks?: string },
  ignoreSelector = '',
): void {
  // Define hotspot selectors with their categories
  const hotspotGroups: Array<{ selector: string; category: HotspotCategory }> = [
    { selector: 'h1, h2, h3, h4, h5, h6', category: 'heading' },
    { selector: 'strong, b, mark, em', category: 'heading' },
    { selector: 'code, pre, kbd, samp', category: 'code' },
    { selector: 'img, picture, video, canvas, figure', category: 'image' },
    {
      selector:
        '[class*="alert"], [class*="callout"], [class*="admonition"], [class*="warning"], [class*="info"], [class*="tip"], [class*="note"]',
      category: 'callout',
    },
  ]

  // Add platform-specific code blocks
  if (preset.codeBlocks) {
    hotspotGroups.push({ selector: preset.codeBlocks, category: 'code' })
  }

  // Add platform-specific hotspots
  if (preset.hotSpots && preset.hotSpots.length > 0) {
    hotspotGroups.push({ selector: preset.hotSpots.join(', '), category: 'platform' })
  }

  const processedElements = new Set<Element>()

  for (const { selector, category } of hotspotGroups) {
    try {
      const elements = contentArea.querySelectorAll(selector)

      for (const element of elements) {
        // Skip if already processed or inside ignored area
        if (processedElements.has(element)) continue
        if (ignoreSelector && element.closest(ignoreSelector)) continue

        // Skip inline elements inside paragraphs (they'll be visible through the blur)
        // Only highlight block-level hotspots
        const isInline = ['STRONG', 'B', 'MARK', 'EM', 'CODE', 'KBD', 'SAMP', 'A'].includes(
          element.tagName,
        )
        if (isInline && element.closest('p')) continue

        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue

        const overlay = createHotspotOverlay(rect, category)
        addOverlayToBody(overlay)
        trackedElements.push({ element, overlay, type: 'hotspot', category })
        processedElements.add(element)
      }
    } catch {
      // Invalid selector, skip
    }
  }

  setupPositionListeners()
}

/**
 * Creates problem overlays for dense paragraphs
 */
export function createProblemOverlays(
  problemElements: Element[],
  type: 'problem' | 'unformatted' = 'problem',
): void {
  for (const element of problemElements) {
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    const overlay = createProblemOverlay(rect, type)
    addOverlayToBody(overlay)
    trackedElements.push({ element, overlay, type: 'problem', category: type })
  }

  setupPositionListeners()
}

/**
 * Updates the config for all dim overlays
 */
export function updateDimOverlayConfig(config: ScanOverlayConfig): void {
  for (const tracked of trackedElements) {
    if (tracked.type === 'dim') {
      const blurValue = `blur(${config.blur}px)`
      tracked.overlay.style.backdropFilter = blurValue
      // Safari prefix - use type assertion for vendor prefix
      ;(tracked.overlay.style as unknown as Record<string, string>)['-webkit-backdrop-filter'] =
        blurValue
      tracked.overlay.style.background =
        config.opacity > 0 ? `rgba(128, 128, 128, ${config.opacity})` : 'transparent'
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
  titleDiv.innerHTML = `<span>⚠️</span> ${description}`

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
