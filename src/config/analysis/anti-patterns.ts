/**
 * Anti-pattern detection logic
 * All selectors come from platform presets - no hardcoded values
 */

import type { AntiPattern, HtmlAnchors } from '../types'
import type { AntiPatternMatch } from './types'

/**
 * Options for detecting unformatted code
 */
export interface UnformattedCodeOptions {
  /** HTML anchor selectors from preset */
  htmlAnchors: HtmlAnchors
  /** Anti-patterns to detect */
  patterns: AntiPattern[]
  /** Selector for text blocks to analyze */
  textBlockSelector?: string
  /** Selector for elements to ignore */
  ignoreSelector?: string
}

/**
 * Builds a combined selector for all code elements (blocks + inline)
 */
function buildCodeSelector(htmlAnchors: HtmlAnchors): string {
  const selectors: string[] = []
  if (htmlAnchors.codeBlocks) selectors.push(htmlAnchors.codeBlocks)
  if (htmlAnchors.inlineCode) selectors.push(htmlAnchors.inlineCode)
  return selectors.join(', ')
}

/**
 * Extracts text content from an element, excluding code elements
 */
function getTextWithoutCodeElements(element: Element, codeSelector: string): string {
  const clone = element.cloneNode(true) as Element
  if (codeSelector) {
    for (const el of clone.querySelectorAll(codeSelector)) {
      el.remove()
    }
  }
  return clone.textContent || ''
}

/**
 * Detects unformatted code patterns in text blocks
 * All selectors come from platform presets
 */
export function detectUnformattedCode(
  contentArea: Element,
  options: UnformattedCodeOptions,
): AntiPatternMatch[] {
  const { htmlAnchors, patterns, textBlockSelector = 'p', ignoreSelector = '' } = options

  const matches: AntiPatternMatch[] = []
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)
  const codeSelector = buildCodeSelector(htmlAnchors)

  for (const block of textBlocks) {
    // Skip if block is inside a code element
    if (codeSelector && block.closest(codeSelector)) continue

    // Skip if block contains a code element (wrapper element)
    if (codeSelector && block.querySelector(codeSelector)) continue

    // Skip if block or ancestors have code-editor-like classes
    const blockClasses = block.className || ''
    if (/\b(cm-|monaco-|ace-|code|editor|highlight)\b/i.test(blockClasses)) continue

    // Check if any ancestor has code-editor-like patterns
    if (
      block.closest('[class*="cm-"], [class*="monaco-"], [class*="ace-"], [class*="code-block"]')
    ) {
      continue
    }

    // Skip blocks inside ignored elements
    if (ignoreSelector && block.closest(ignoreSelector)) continue

    const textWithoutCode = getTextWithoutCodeElements(block, codeSelector)

    // Skip very short blocks
    if (textWithoutCode.length < 10) continue

    for (const { pattern, type, description } of patterns) {
      if (pattern.test(textWithoutCode)) {
        matches.push({
          type,
          description,
          element: block,
          textSnippet: textWithoutCode.slice(0, 100),
        })
        break // One match per block is enough
      }
    }
  }

  return matches
}
