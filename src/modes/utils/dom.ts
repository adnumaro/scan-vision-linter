/**
 * DOM utilities for element measurements
 */

/**
 * Gets the computed line height of an element in pixels
 */
export function getLineHeight(element: Element): number {
  const computed = window.getComputedStyle(element)
  const lineHeight = computed.lineHeight

  if (lineHeight === 'normal') {
    // 'normal' is typically 1.2 * font-size
    const fontSize = parseFloat(computed.fontSize)
    return fontSize * 1.2
  }

  return parseFloat(lineHeight)
}

/**
 * Estimates the number of visible lines in an element
 */
export function estimateLines(element: Element): number {
  const lineHeight = getLineHeight(element)
  if (lineHeight <= 0) return 1

  // Use clientHeight to get content height excluding borders
  const height = (element as HTMLElement).clientHeight || element.getBoundingClientRect().height
  return Math.max(1, Math.round(height / lineHeight))
}

/**
 * Default line height fallback when computation fails
 */
export const DEFAULT_LINE_HEIGHT = 24

/**
 * Maximum lines without anchor before marking as problem block
 */
export const MAX_LINES_WITHOUT_ANCHOR = 5
