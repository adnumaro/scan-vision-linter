/**
 * Anchor weight system for scannability analysis
 * Not all anchors contribute equally to scannability
 */

/**
 * Weight values for different anchor types
 * Higher weight = more valuable for scannability
 */
const ANCHOR_WEIGHTS = {
  // Structure (high value) - these create clear visual hierarchy
  heading: 1.0,
  codeBlock: 1.0, // <pre>, full code blocks
  image: 0.9,

  // Emphasis (medium value) - these highlight key information
  emphasis: 0.7, // <strong>, <b>, <mark>
  inlineCode: 0.6, // <code> inline
  list: 0.5, // <ul>, <ol>

  // Links (variable value)
  linkStandalone: 0.6, // Link that is the only content of a paragraph/block
  linkInline: 0.3, // Link inside text (can exist in dense paragraphs)
} as const

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
 * Standalone links are more valuable because they're easy to spot
 */
function isStandaloneLink(link: Element): boolean {
  const parent = link.parentElement
  if (!parent) return false

  // If parent is a list item, check if link is the main content
  if (parent.tagName === 'LI') {
    const parentText = parent.textContent?.trim() || ''
    const linkText = link.textContent?.trim() || ''
    // Allow some extra chars (bullet, numbering, etc.)
    return parentText.length < linkText.length + 15
  }

  // For paragraph-like elements
  const parentText = parent.textContent?.trim() || ''
  const linkText = link.textContent?.trim() || ''

  // The link is standalone if it's the only significant content
  // Allow up to 10 extra characters for punctuation, spaces, etc.
  return parentText === linkText || parentText.length < linkText.length + 10
}

/**
 * Calculates weighted anchor score for a content area
 * Returns both raw counts and weighted totals
 */
export function calculateWeightedAnchors(
  contentArea: Element,
  platformHotSpots: string[] = [],
): WeightedAnchorBreakdown {
  // Count headings
  const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const headingCount = headings.length
  const headingWeight = headingCount * ANCHOR_WEIGHTS.heading

  // Count emphasis elements (strong, b, mark)
  const emphasisElements = contentArea.querySelectorAll('strong, b, mark')
  const emphasisCount = emphasisElements.length
  const emphasisWeight = emphasisCount * ANCHOR_WEIGHTS.emphasis

  // Count code elements - distinguish block vs inline
  const allCodeElements = contentArea.querySelectorAll('code, pre, kbd')
  let codeBlockCount = 0
  let inlineCodeCount = 0

  for (const el of allCodeElements) {
    if (el.tagName === 'PRE') {
      codeBlockCount++
    } else if (el.tagName === 'CODE' || el.tagName === 'KBD') {
      // Check if it's inside a <pre> (already counted as block)
      if (!el.closest('pre')) {
        inlineCodeCount++
      }
    }
  }

  const codeBlockWeight = codeBlockCount * ANCHOR_WEIGHTS.codeBlock
  const inlineCodeWeight = inlineCodeCount * ANCHOR_WEIGHTS.inlineCode

  // Count links - distinguish standalone vs inline
  const allLinks = contentArea.querySelectorAll('a[href]')
  let standaloneLinksCount = 0
  let inlineLinksCount = 0

  for (const link of allLinks) {
    if (isStandaloneLink(link)) {
      standaloneLinksCount++
    } else {
      inlineLinksCount++
    }
  }

  const standaloneLinkWeight = standaloneLinksCount * ANCHOR_WEIGHTS.linkStandalone
  const inlineLinkWeight = inlineLinksCount * ANCHOR_WEIGHTS.linkInline

  // Count images
  const images = contentArea.querySelectorAll('img, svg, picture, video')
  const imageCount = images.length
  const imageWeight = imageCount * ANCHOR_WEIGHTS.image

  // Count lists
  const lists = contentArea.querySelectorAll('ul, ol')
  const listCount = lists.length
  const listWeight = listCount * ANCHOR_WEIGHTS.list

  // Platform-specific hot spots (count as emphasis-level)
  let platformHotSpotCount = 0
  if (platformHotSpots.length > 0) {
    try {
      const selector = platformHotSpots.join(', ')
      platformHotSpotCount = contentArea.querySelectorAll(selector).length
    } catch {
      // Invalid selector, ignore
    }
  }
  const platformWeight = platformHotSpotCount * ANCHOR_WEIGHTS.emphasis

  // Calculate totals
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
