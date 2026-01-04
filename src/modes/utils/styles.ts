/**
 * Style injection utilities for modes
 */

const STYLE_PREFIX = 'scanvision-style-'

/**
 * Injects a stylesheet into the document head
 */
export function injectStylesheet(id: string, css: string): void {
  const fullId = STYLE_PREFIX + id
  let styleEl = document.getElementById(fullId) as HTMLStyleElement | null

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = fullId
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = css
}

/**
 * Removes a stylesheet by id
 */
export function removeStylesheet(id: string): void {
  const styleEl = document.getElementById(STYLE_PREFIX + id)
  if (styleEl) {
    styleEl.remove()
  }
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
 * Removes all mode stylesheets
 */
export function removeAllStylesheets(): void {
  const stylesheets = document.querySelectorAll(`[id^="${STYLE_PREFIX}"]`)
  stylesheets.forEach((sheet) => {
    sheet.remove()
  })
}

/**
 * Gets the prefixed ID for a stylesheet
 */
export function getStylesheetId(id: string): string {
  return STYLE_PREFIX + id
}
