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
  ignoreSelector = '',
  codeBlockSelector = 'pre',
): WeightedAnchorBreakdown {
  // Helper to filter out elements inside ignored areas
  const filterIgnored = <T extends Element>(elements: NodeListOf<T> | T[]): T[] => {
    if (!ignoreSelector) return Array.from(elements)
    return Array.from(elements).filter((el) => !el.closest(ignoreSelector))
  }
  // Count headings
  const headings = filterIgnored(contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const headingCount = headings.length
  const headingWeight = headingCount * ANCHOR_WEIGHTS.heading

  // Count emphasis elements (strong, b, mark)
  const emphasisElements = filterIgnored(contentArea.querySelectorAll('strong, b, mark'))
  const emphasisCount = emphasisElements.length
  const emphasisWeight = emphasisCount * ANCHOR_WEIGHTS.emphasis

  // Count code blocks using platform-specific selector
  const codeBlocks = filterIgnored(contentArea.querySelectorAll(codeBlockSelector))
  const codeBlockCount = codeBlocks.length

  // Count inline code elements (code, kbd not inside a code block)
  const inlineCodeElements = filterIgnored(contentArea.querySelectorAll('code, kbd'))
  let inlineCodeCount = 0

  for (const el of inlineCodeElements) {
    // Check if it's inside a code block (already counted)
    const isInsideCodeBlock = el.closest(codeBlockSelector)
    if (!isInsideCodeBlock) {
      inlineCodeCount++
    }
  }

  const codeBlockWeight = codeBlockCount * ANCHOR_WEIGHTS.codeBlock
  const inlineCodeWeight = inlineCodeCount * ANCHOR_WEIGHTS.inlineCode

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

  const standaloneLinkWeight = standaloneLinksCount * ANCHOR_WEIGHTS.linkStandalone
  const inlineLinkWeight = inlineLinksCount * ANCHOR_WEIGHTS.linkInline

  // Count images (excluding svg, avatars, emojis, favicons - not content images)
  const allImages = filterIgnored(contentArea.querySelectorAll('img, picture, video'))
  const contentImages = allImages.filter((img) => {
    const src = (img as HTMLImageElement).src || ''
    // Exclude avatars, emojis, favicons, and other non-content images
    if (src.includes('aa-avatar') || src.includes('/avatar')) return false
    if (src.includes('/emoji/') || src.includes('emoji-service')) return false
    if (src.includes('favicon')) return false
    // Exclude very small images (likely icons)
    const imgEl = img as HTMLImageElement
    if (imgEl.width > 0 && imgEl.width < 32) return false
    if (imgEl.height > 0 && imgEl.height < 32) return false
    return true
  })
  const imageCount = contentImages.length
  const imageWeight = imageCount * ANCHOR_WEIGHTS.image

  // Count lists
  const lists = filterIgnored(contentArea.querySelectorAll('ul, ol'))
  const listCount = lists.length
  const listWeight = listCount * ANCHOR_WEIGHTS.list

  // Platform-specific hot spots (count as emphasis-level)
  let platformHotSpotCount = 0
  if (platformHotSpots.length > 0) {
    try {
      const selector = platformHotSpots.join(', ')
      platformHotSpotCount = filterIgnored(contentArea.querySelectorAll(selector)).length
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
