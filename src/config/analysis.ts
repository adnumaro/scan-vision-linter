/**
 * Analysis logic for scannability detection
 * Uses patterns, weights, and suggestions from presets
 */

import type { AnchorWeights, AntiPattern, PlatformSuggestion } from './types'

// ============================================================================
// Anti-Pattern Detection
// ============================================================================

/**
 * Result of an anti-pattern match
 */
export interface AntiPatternMatch {
  type: string
  description: string
  element: Element
  textSnippet: string
}

/**
 * Extracts text content from an element, excluding code elements
 */
function getTextWithoutCodeElements(element: Element, codeElementsSelector: string): string {
  const clone = element.cloneNode(true) as Element
  for (const el of clone.querySelectorAll(codeElementsSelector)) {
    el.remove()
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
    if (block.closest(codeElementsSelector)) continue

    // Skip if block contains a code element (wrapper element)
    if (block.querySelector(codeElementsSelector)) continue

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

// ============================================================================
// Weighted Anchor Calculation
// ============================================================================

/**
 * Breakdown of weighted anchor counts
 */
export interface WeightedAnchorBreakdown {
  headings: { count: number; weight: number }
  emphasis: { count: number; weight: number }
  codeBlocks: { count: number; weight: number }
  inlineCode: { count: number; weight: number }
  standaloneLinks: { count: number; weight: number }
  inlineLinks: { count: number; weight: number }
  images: { count: number; weight: number }
  lists: { count: number; weight: number }
  totalWeighted: number
  totalRaw: number
}

/**
 * Checks if a link is standalone (the only significant content of its parent)
 */
function isStandaloneLink(link: Element): boolean {
  const parent = link.parentElement
  if (!parent) return false

  if (parent.tagName === 'LI') {
    const parentText = parent.textContent?.trim() || ''
    const linkText = link.textContent?.trim() || ''
    return parentText.length < linkText.length + 15
  }

  const parentText = parent.textContent?.trim() || ''
  const linkText = link.textContent?.trim() || ''
  return parentText === linkText || parentText.length < linkText.length + 10
}

/**
 * Calculates weighted anchor score for a content area
 */
export function calculateWeightedAnchors(
  contentArea: Element,
  weights: AnchorWeights,
  platformHotSpots: string[] = [],
  ignoreSelector = '',
  codeBlockSelector = 'pre',
): WeightedAnchorBreakdown {
  const filterIgnored = <T extends Element>(elements: NodeListOf<T> | T[]): T[] => {
    if (!ignoreSelector) return Array.from(elements)
    return Array.from(elements).filter((el) => !el.closest(ignoreSelector))
  }

  // Count headings
  const headings = filterIgnored(contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const headingCount = headings.length
  const headingWeight = headingCount * weights.heading

  // Count emphasis elements
  const emphasisElements = filterIgnored(contentArea.querySelectorAll('strong, b, mark'))
  const emphasisCount = emphasisElements.length
  const emphasisWeight = emphasisCount * weights.emphasis

  // Count code blocks
  const codeBlocks = filterIgnored(contentArea.querySelectorAll(codeBlockSelector))
  const codeBlockCount = codeBlocks.length

  // Count inline code elements
  const inlineCodeElements = filterIgnored(contentArea.querySelectorAll('code, kbd'))
  let inlineCodeCount = 0
  for (const el of inlineCodeElements) {
    if (!el.closest(codeBlockSelector)) inlineCodeCount++
  }

  const codeBlockWeight = codeBlockCount * weights.codeBlock
  const inlineCodeWeight = inlineCodeCount * weights.inlineCode

  // Count links - distinguish standalone vs inline
  const allLinks = filterIgnored(contentArea.querySelectorAll('a[href]'))
  let standaloneLinksCount = 0
  let inlineLinksCount = 0
  for (const link of allLinks) {
    if (isStandaloneLink(link)) {
      standaloneLinksCount++
    } else {
      inlineLinksCount++
    }
  }

  const standaloneLinkWeight = standaloneLinksCount * weights.linkStandalone
  const inlineLinkWeight = inlineLinksCount * weights.linkInline

  // Count images (excluding avatars, emojis, favicons)
  const allImages = filterIgnored(contentArea.querySelectorAll('img, picture, video'))
  const contentImages = allImages.filter((img) => {
    const src = (img as HTMLImageElement).src || ''
    if (src.includes('aa-avatar') || src.includes('/avatar')) return false
    if (src.includes('/emoji/') || src.includes('emoji-service')) return false
    if (src.includes('favicon')) return false
    const imgEl = img as HTMLImageElement
    if (imgEl.width > 0 && imgEl.width < 32) return false
    return !(imgEl.height > 0 && imgEl.height < 32)
  })
  const imageCount = contentImages.length
  const imageWeight = imageCount * weights.image

  // Count lists
  const lists = filterIgnored(contentArea.querySelectorAll('ul, ol'))
  const listCount = lists.length
  const listWeight = listCount * weights.list

  // Platform-specific hot spots
  let platformHotSpotCount = 0
  if (platformHotSpots.length > 0) {
    try {
      const selector = platformHotSpots.join(', ')
      platformHotSpotCount = filterIgnored(contentArea.querySelectorAll(selector)).length
    } catch {
      // Invalid selector, ignore
    }
  }
  const platformWeight = platformHotSpotCount * weights.emphasis

  const totalWeighted =
    headingWeight +
    emphasisWeight +
    codeBlockWeight +
    inlineCodeWeight +
    standaloneLinkWeight +
    inlineLinkWeight +
    imageWeight +
    listWeight +
    platformWeight

  const totalRaw =
    headingCount +
    emphasisCount +
    codeBlockCount +
    inlineCodeCount +
    standaloneLinksCount +
    inlineLinksCount +
    imageCount +
    listCount +
    platformHotSpotCount

  return {
    headings: { count: headingCount, weight: headingWeight },
    emphasis: { count: emphasisCount, weight: emphasisWeight },
    codeBlocks: { count: codeBlockCount, weight: codeBlockWeight },
    inlineCode: { count: inlineCodeCount, weight: inlineCodeWeight },
    standaloneLinks: { count: standaloneLinksCount, weight: standaloneLinkWeight },
    inlineLinks: { count: inlineLinksCount, weight: inlineLinkWeight },
    images: { count: imageCount, weight: imageWeight },
    lists: { count: listCount, weight: listWeight },
    totalWeighted,
    totalRaw,
  }
}

// ============================================================================
// Platform Suggestions
// ============================================================================

/**
 * Result of a triggered suggestion (for display)
 */
export interface TriggeredSuggestion {
  id: string
  name: string
  description: string
}

/**
 * Evaluates all suggestions for a platform against the content area
 */
export function evaluatePlatformSuggestions(
  suggestions: PlatformSuggestion[],
  contentArea: Element,
): TriggeredSuggestion[] {
  const results: TriggeredSuggestion[] = []

  for (const suggestion of suggestions) {
    const { id, name, description, missingSelector, presentSelector, validate } = suggestion
    let triggered = false

    // Check missingSelector - triggers if element is NOT found
    if (missingSelector) {
      try {
        if (!contentArea.querySelector(missingSelector)) triggered = true
      } catch {
        // Invalid selector
      }
    }

    // Check presentSelector - triggers if element IS found (anti-pattern)
    if (presentSelector && !triggered) {
      try {
        if (contentArea.querySelector(presentSelector)) triggered = true
      } catch {
        // Invalid selector
      }
    }

    // Run custom validation
    if (validate && !triggered) {
      try {
        triggered = validate(contentArea)
      } catch {
        // Validation error
      }
    }

    if (triggered) {
      results.push({ id, name, description })
    }
  }

  return results
}
