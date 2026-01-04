/**
 * Style injection utilities for modes
 * Optimized to avoid unnecessary DOM updates
 */

import { STYLE_PREFIX } from './constants'

/**
 * Cache for stylesheet content to avoid redundant DOM updates
 * Maps stylesheet ID to its current CSS content
 */
const stylesheetCache = new Map<string, string>()

/**
 * Injects a stylesheet into the document head
 * Optimized to skip DOM update if content hasn't changed
 *
 * @param id - Unique identifier for the stylesheet
 * @param css - CSS content to inject
 * @returns true if DOM was updated, false if skipped (no change)
 */
export function injectStylesheet(id: string, css: string): boolean {
  const fullId = STYLE_PREFIX + id

  // Check cache - skip DOM update if content is identical
  const cached = stylesheetCache.get(fullId)
  if (cached === css) {
    return false
  }

  let styleEl = document.getElementById(fullId) as HTMLStyleElement | null

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = fullId
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = css
  stylesheetCache.set(fullId, css)
  return true
}

/**
 * Removes a stylesheet by id and clears its cache entry
 */
export function removeStylesheet(id: string): void {
  const fullId = STYLE_PREFIX + id
  const styleEl = document.getElementById(fullId)
  if (styleEl) {
    styleEl.remove()
  }
  stylesheetCache.delete(fullId)
}

/**
 * Checks if a stylesheet exists
 */
export function stylesheetExists(id: string): boolean {
  return document.getElementById(STYLE_PREFIX + id) !== null
}

/**
 * Generates a CSS linear gradient string
 */
export function generateGradient(colors: string[], direction: string = 'to bottom right'): string {
  if (colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]

  const stops = colors.map((color, index) => {
    const percent = (index / (colors.length - 1)) * 100
    return `${color} ${percent}%`
  })

  return `linear-gradient(${direction}, ${stops.join(', ')})`
}

/**
 * Generates a radial gradient string
 */
export function generateRadialGradient(colors: string[], position: string = 'top left'): string {
  if (colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]

  const stops = colors.map((color, index) => {
    const percent = (index / (colors.length - 1)) * 100
    return `${color} ${percent}%`
  })

  return `radial-gradient(ellipse at ${position}, ${stops.join(', ')})`
}

/**
 * Creates CSS for a semi-transparent overlay zone
 */
export function createZoneStyles(
  selector: string,
  options: {
    backgroundColor?: string
    opacity?: number
    borderColor?: string
    borderWidth?: string
  } = {},
): string {
  const {
    backgroundColor = 'rgba(59, 130, 246, 0.1)',
    opacity = 1,
    borderColor,
    borderWidth = '2px',
  } = options

  let css = `
    ${selector} {
      background-color: ${backgroundColor};
      opacity: ${opacity};
    }
  `

  if (borderColor) {
    css += `
    ${selector} {
      border: ${borderWidth} solid ${borderColor};
    }
    `
  }

  return css
}

/**
 * Removes all mode stylesheets and clears the cache
 */
export function removeAllStylesheets(): void {
  const stylesheets = document.querySelectorAll(`[id^="${STYLE_PREFIX}"]`)
  stylesheets.forEach((sheet) => {
    sheet.remove()
  })
  stylesheetCache.clear()
}

/**
 * Gets the prefixed ID for a stylesheet
 */
export function getStylesheetId(id: string): string {
  return STYLE_PREFIX + id
}

/**
 * Gets the current cache size (for debugging/testing)
 */
export function getStylesheetCacheSize(): number {
  return stylesheetCache.size
}
