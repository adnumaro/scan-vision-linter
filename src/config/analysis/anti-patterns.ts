/**
 * Anti-pattern detection logic
 */

import type { AntiPattern } from '../types'
import type { AntiPatternMatch } from './types'

/**
 * Extracts text content from an element, excluding code elements
 */
function getTextWithoutCodeElements(element: Element, codeElementsSelector: string): string {
  const clone = element.cloneNode(true) as Element
  if (codeElementsSelector) {
    for (const el of clone.querySelectorAll(codeElementsSelector)) {
      el.remove()
    }
  }
  return clone.textContent || ''
}

/**
 * Detects unformatted code patterns in text blocks
 */
export function detectUnformattedCode(
  contentArea: Element,
  patterns: AntiPattern[],
  codeElements: string[],
  textBlockSelector = 'p',
  ignoreSelector = '',
): AntiPatternMatch[] {
  const matches: AntiPatternMatch[] = []
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)
  const codeElementsSelector = codeElements.join(', ')

  for (const block of textBlocks) {
    // Skip if block is inside a code element
    if (codeElementsSelector && block.closest(codeElementsSelector)) continue

    // Skip if block contains a code element (wrapper element)
    if (codeElementsSelector && block.querySelector(codeElementsSelector)) continue

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

    const textWithoutCode = getTextWithoutCodeElements(block, codeElementsSelector)

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
