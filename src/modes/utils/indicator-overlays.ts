/**
 * Anchor type indicators - visual markers for different anchor types
 * Shows colored borders and badges on elements to identify their type
 */

import type { IndicatorType } from '../../types/messages'
import type { ModeContext } from '../types'
import { SCAN_COLORS } from './colors'
import { Z_INDEX } from './constants'
import { createOverlayTracker, type OverlayTracker } from './overlay-tracker'

/**
 * Configuration for each indicator type
 */
interface IndicatorConfig {
  /** Color helper from SCAN_COLORS or custom */
  color: { r: number; g: number; b: number; rgba: (alpha: number) => string }
  /** Short label for the badge */
  label: string
  /** Selector key in htmlAnchors */
  selectorKey: 'headings' | 'emphasis' | 'codeBlocks' | 'inlineCode' | 'links' | 'images' | 'lists'
}

/**
 * Color for links (blue)
 */
const LINK_COLOR = {
  r: 59,
  g: 130,
  b: 246,
  rgba: (alpha: number) => `rgba(59, 130, 246, ${alpha})`,
}

/**
 * Color for lists (purple)
 */
const LIST_COLOR = {
  r: 168,
  g: 85,
  b: 247,
  rgba: (alpha: number) => `rgba(168, 85, 247, ${alpha})`,
}

/**
 * Color for emphasis (amber)
 */
const EMPHASIS_COLOR = {
  r: 245,
  g: 158,
  b: 11,
  rgba: (alpha: number) => `rgba(245, 158, 11, ${alpha})`,
}

/**
 * Indicator configurations for each type
 */
const INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  headings: {
    color: SCAN_COLORS.headings,
    label: 'H',
    selectorKey: 'headings',
  },
  emphasis: {
    color: EMPHASIS_COLOR,
    label: 'B',
    selectorKey: 'emphasis',
  },
  code: {
    color: SCAN_COLORS.code,
    label: '<>',
    selectorKey: 'codeBlocks',
  },
  links: {
    color: LINK_COLOR,
    label: 'A',
    selectorKey: 'links',
  },
  images: {
    color: SCAN_COLORS.images,
    label: 'IMG',
    selectorKey: 'images',
  },
  lists: {
    color: LIST_COLOR,
    label: 'UL',
    selectorKey: 'lists',
  },
}

/**
 * Creates an indicator overlay with border and badge
 */
function createIndicatorOverlay(
  rect: DOMRect,
  config: IndicatorConfig,
  tagName?: string,
): HTMLElement {
  const container = document.createElement('div')
  container.className = `scanvision-indicator scanvision-indicator-${config.selectorKey}`

  // Border overlay
  container.style.cssText = `
    position: fixed;
    top: ${rect.top - 2}px;
    left: ${rect.left - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    border: 2px solid ${config.color.rgba(0.8)};
    border-radius: 4px;
    pointer-events: none;
    z-index: ${Z_INDEX.INDICATOR};
    box-sizing: border-box;
  `

  // Badge
  const badge = document.createElement('span')
  badge.textContent = tagName ? `${ config.label }${ tagName.replace(/[^0-9]/g, '') }` : config.label
  badge.style.cssText = `
    position: absolute;
    top: -10px;
    right: -10px;
    background: rgb(${config.color.r}, ${config.color.g}, ${config.color.b});
    color: white;
    font-size: 9px;
    font-weight: 600;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 2px 5px;
    border-radius: 3px;
    line-height: 1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
  `
  container.appendChild(badge)

  return container
}

/**
 * Gets the selector for an indicator type from the preset
 */
function getSelector(type: IndicatorType, context: ModeContext): string {
  const config = INDICATOR_CONFIGS[type]
  const { htmlAnchors } = context.preset.selectors

  // Special case: code includes both codeBlocks and inlineCode
  if (type === 'code') {
    const selectors: string[] = []
    if (htmlAnchors.codeBlocks) selectors.push(htmlAnchors.codeBlocks)
    if (htmlAnchors.inlineCode) selectors.push(htmlAnchors.inlineCode)
    return selectors.join(', ')
  }

  return htmlAnchors[config.selectorKey] || ''
}

/**
 * Gets all elements for an indicator type
 */
function getElements(type: IndicatorType, context: ModeContext): Element[] {
  const selector = getSelector(type, context)
  if (!selector) return []

  const ignoreSelector = context.preset.selectors.ignore?.join(', ') || ''

  try {
    const elements = context.contentArea.querySelectorAll(selector)
    if (!ignoreSelector) return Array.from(elements)

    return Array.from(elements).filter((el) => !el.closest(ignoreSelector))
  } catch {
    return []
  }
}

/**
 * Manager interface for indicators
 */
export interface IndicatorManager {
  activate(type: IndicatorType, context: ModeContext): void
  deactivate(type: IndicatorType): void
  deactivateAll(): void
  getActiveTypes(): IndicatorType[]
  isActive(type: IndicatorType): boolean
}

/**
 * Creates an indicator manager instance
 */
export function createIndicatorManager(): IndicatorManager {
  const trackers = new Map<IndicatorType, OverlayTracker>()
  const contexts = new Map<IndicatorType, ModeContext>()

  function activate(type: IndicatorType, context: ModeContext): void {
    // Deactivate first if already active
    if (trackers.has(type)) {
      deactivate(type)
    }

    const config = INDICATOR_CONFIGS[type]
    const elements = getElements(type, context)
    if (elements.length === 0) return

    const tracker = createOverlayTracker()
    contexts.set(type, context)

    // Limit elements to avoid performance issues
    const maxElements = 150
    const elementsToShow = elements.slice(0, maxElements)

    for (const element of elementsToShow) {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      // Get tag name for headings (H1, H2, etc.)
      const tagName = type === 'headings' ? element.tagName : undefined

      const overlay = createIndicatorOverlay(rect, config, tagName)
      tracker.track({
        element,
        overlay,
        offset: { top: -2, left: -2, width: 4, height: 4 },
        type: `indicator-${type}`,
        category: 'indicator',
      })
    }

    trackers.set(type, tracker)
  }

  function deactivate(type: IndicatorType): void {
    const tracker = trackers.get(type)
    if (tracker) {
      tracker.clear()
      trackers.delete(type)
      contexts.delete(type)
    }
  }

  function deactivateAll(): void {
    for (const type of trackers.keys()) {
      deactivate(type)
    }
  }

  function getActiveTypes(): IndicatorType[] {
    return Array.from(trackers.keys())
  }

  function isActive(type: IndicatorType): boolean {
    return trackers.has(type)
  }

  return {
    activate,
    deactivate,
    deactivateAll,
    getActiveTypes,
    isActive,
  }
}
