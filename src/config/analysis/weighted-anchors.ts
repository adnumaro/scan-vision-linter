/**
 * Weighted anchor calculation logic
 * All selectors come from platform presets - no hardcoded values
 */

import type { AnchorWeights, HtmlAnchors } from '../types'
import type { WeightedAnchorBreakdown } from './types'

/**
 * Options for calculating weighted anchors
 */
export interface WeightedAnchorsOptions {
  /** HTML anchor selectors from preset */
  htmlAnchors: HtmlAnchors
  /** Platform-specific anchor selectors (type -> selector) */
  platformAnchors: Record<string, string>
  /** Weight values for anchor types */
  weights: AnchorWeights
  /** Selector for elements to ignore */
  ignoreSelector?: string
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
 * All selectors come from platform presets
 */
export function calculateWeightedAnchors(
  contentArea: Element,
  options: WeightedAnchorsOptions,
): WeightedAnchorBreakdown {
  const { htmlAnchors, platformAnchors, weights, ignoreSelector = '' } = options

  const filterIgnored = <T extends Element>(elements: NodeListOf<T> | T[]): T[] => {
    if (!ignoreSelector) return Array.from(elements)
    return Array.from(elements).filter((el) => !el.closest(ignoreSelector))
  }

  // Count headings using preset selector
  const headings = filterIgnored(contentArea.querySelectorAll(htmlAnchors.headings))
  const headingCount = headings.length
  const headingWeight = headingCount * weights.heading

  // Count emphasis elements using preset selector
  const emphasisElements = filterIgnored(contentArea.querySelectorAll(htmlAnchors.emphasis))
  const emphasisCount = emphasisElements.length
  const emphasisWeight = emphasisCount * weights.emphasis

  // Count code blocks using preset selector
  const codeBlocks = filterIgnored(contentArea.querySelectorAll(htmlAnchors.codeBlocks))
  const codeBlockCount = codeBlocks.length
  const codeBlockWeight = codeBlockCount * weights.codeBlock

  // Count inline code elements using preset selector (exclude those inside code blocks)
  const inlineCodeElements = filterIgnored(contentArea.querySelectorAll(htmlAnchors.inlineCode))
  let inlineCodeCount = 0
  for (const el of inlineCodeElements) {
    if (!el.closest(htmlAnchors.codeBlocks)) inlineCodeCount++
  }
  const inlineCodeWeight = inlineCodeCount * weights.inlineCode

  // Count links using preset selector - distinguish standalone vs inline
  const allLinks = filterIgnored(contentArea.querySelectorAll(htmlAnchors.links))
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

  // Count images using preset selector (excluding small images, avatars, etc.)
  const allImages = filterIgnored(contentArea.querySelectorAll(htmlAnchors.images))
  const contentImages = allImages.filter((img) => {
    // For img elements, check src for common non-content images
    if (img.tagName === 'IMG') {
      const src = (img as HTMLImageElement).src || ''
      if (src.includes('aa-avatar') || src.includes('/avatar')) return false
      if (src.includes('/emoji/') || src.includes('emoji-service')) return false
      if (src.includes('favicon')) return false
      const imgEl = img as HTMLImageElement
      if (imgEl.width > 0 && imgEl.width < 32) return false
      if (imgEl.height > 0 && imgEl.height < 32) return false
    }
    // For SVG, check for icon-like dimensions or class names
    if (img.tagName === 'svg' || img.tagName === 'SVG') {
      const svgEl = img as SVGSVGElement
      const width = svgEl.width?.baseVal?.value || svgEl.getBoundingClientRect().width
      const height = svgEl.height?.baseVal?.value || svgEl.getBoundingClientRect().height
      if (width > 0 && width < 32) return false
      if (height > 0 && height < 32) return false
      const className = svgEl.getAttribute('class') || ''
      if (className.includes('icon') || className.includes('Icon')) return false
    }
    return true
  })
  const imageCount = contentImages.length
  const imageWeight = imageCount * weights.image

  // Count lists using preset selector
  const lists = filterIgnored(contentArea.querySelectorAll(htmlAnchors.lists))
  const listCount = lists.length
  const listWeight = listCount * weights.list

  // Count platform-specific anchors dynamically
  let platformAnchorCount = 0
  let platformAnchorWeight = 0
  for (const [type, selector] of Object.entries(platformAnchors)) {
    if (!selector) continue
    try {
      const elements = filterIgnored(contentArea.querySelectorAll(selector))
      const count = elements.length
      const weight = weights[type] ?? weights.platformAnchorDefault
      platformAnchorCount += count
      platformAnchorWeight += count * weight
    } catch {
      // Invalid selector, skip
    }
  }

  const totalWeighted =
    headingWeight +
    emphasisWeight +
    codeBlockWeight +
    inlineCodeWeight +
    standaloneLinkWeight +
    inlineLinkWeight +
    imageWeight +
    listWeight +
    platformAnchorWeight

  const totalRaw =
    headingCount +
    emphasisCount +
    codeBlockCount +
    inlineCodeCount +
    standaloneLinksCount +
    inlineLinksCount +
    imageCount +
    listCount +
    platformAnchorCount

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
