/**
 * DOM utilities for element measurements
 * Optimized to minimize layout thrashing (reflows)
 */

/**
 * Maximum lines without anchor before marking as problem block
 */
export const MAX_LINES_WITHOUT_ANCHOR = 5

/**
 * Gets the computed line height of an element in pixels
 */
function getLineHeight(element: Element): number {
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
 * Element measurement data from batch read
 */
interface ElementMeasurement {
  element: Element
  lineHeight: number
  height: number
  lines: number
}

/**
 * Batch estimates lines for multiple elements in a single read pass
 * This minimizes layout thrashing by reading all DOM properties first,
 * then processing the data without triggering additional reflows.
 *
 * @param elements - Array of elements to measure
 * @returns Map of element to line count
 */
function batchEstimateLines(elements: Element[]): Map<Element, number> {
  const results = new Map<Element, number>()

  if (elements.length === 0) return results

  // Phase 1: Batch read all DOM properties (triggers one reflow)
  const measurements: ElementMeasurement[] = []

  for (const element of elements) {
    const computed = window.getComputedStyle(element)
    const lineHeightValue = computed.lineHeight

    let lineHeight: number
    if (lineHeightValue === 'normal') {
      const fontSize = parseFloat(computed.fontSize)
      lineHeight = fontSize * 1.2
    } else {
      lineHeight = parseFloat(lineHeightValue)
    }

    const height = (element as HTMLElement).clientHeight || element.getBoundingClientRect().height

    measurements.push({ element, lineHeight, height, lines: 0 })
  }

  // Phase 2: Process data without DOM access (no reflow)
  for (const m of measurements) {
    if (m.lineHeight <= 0) {
      m.lines = 1
    } else {
      m.lines = Math.max(1, Math.round(m.height / m.lineHeight))
    }
    results.set(m.element, m.lines)
  }

  return results
}

/**
 * Result of analyzing a paragraph for problem detection
 */
export interface ParagraphAnalysis {
  element: Element
  hasAnchor: boolean
  lines: number
  isProblem: boolean
}

/**
 * Batch analyzes paragraphs for problem blocks
 * Optimized to minimize DOM reads and writes
 *
 * @param paragraphs - NodeList or array of paragraph elements
 * @param anchorSelector - CSS selector for anchor elements
 * @param maxLinesWithoutAnchor - Threshold for problem detection
 * @param ignoreSelector - CSS selector for elements to ignore (from preset)
 * @returns Analysis results for each paragraph
 */
export function batchAnalyzeParagraphs(
  paragraphs: NodeListOf<Element> | Element[],
  anchorSelector = 'strong, b, mark, code, a, img',
  maxLinesWithoutAnchor = MAX_LINES_WITHOUT_ANCHOR,
  ignoreSelector = '',
): ParagraphAnalysis[] {
  // Filter out paragraphs inside ignored elements
  const elements = ignoreSelector
    ? Array.from(paragraphs).filter((p) => !p.closest(ignoreSelector))
    : Array.from(paragraphs)
  if (elements.length === 0) return []

  // Phase 1: Batch check for anchors (DOM read)
  const hasAnchorMap = new Map<Element, boolean>()
  for (const p of elements) {
    hasAnchorMap.set(p, p.querySelector(anchorSelector) !== null)
  }

  // Phase 2: Batch measure lines (DOM read, triggers one reflow)
  const linesMap = batchEstimateLines(elements)

  // Phase 3: Compute results without DOM access
  const results: ParagraphAnalysis[] = []
  for (const element of elements) {
    const hasAnchor = hasAnchorMap.get(element) ?? false
    const lines = linesMap.get(element) ?? 1
    const isProblem = !hasAnchor && lines > maxLinesWithoutAnchor

    results.push({ element, hasAnchor, lines, isProblem })
  }

  return results
}

/**
 * Batch applies problem block classes based on analysis
 * Batches all DOM writes together to minimize reflows
 *
 * @param analyses - Results from batchAnalyzeParagraphs
 * @param problemClass - CSS class to apply to problem blocks
 * @returns Number of problem blocks found
 */
export function batchApplyProblemClasses(
  analyses: ParagraphAnalysis[],
  problemClass: string,
): number {
  let problemCount = 0

  // Batch all class modifications together
  for (const { element, isProblem } of analyses) {
    if (isProblem) {
      problemCount++
      element.classList.add(problemClass)
    } else {
      element.classList.remove(problemClass)
    }
  }

  return problemCount
}
