/**
 * Overlay utilities for creating and managing DOM overlays
 */

import { COLORS } from './colors'
import { OVERLAY_PREFIX, Z_INDEX } from './constants'

/**
 * Creates a positioned overlay element
 */
export function createOverlayElement(id: string, zIndex: number = Z_INDEX.TOP): HTMLElement {
  const existingOverlay = document.getElementById(OVERLAY_PREFIX + id)
  if (existingOverlay) {
    return existingOverlay
  }

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_PREFIX + id
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: ${zIndex};
    pointer-events: none;
    transition: opacity 0.2s ease;
  `

  document.body.appendChild(overlay)
  return overlay
}

/**
 * Removes an overlay element by id
 */
export function removeOverlayElement(id: string): void {
  const overlay = document.getElementById(OVERLAY_PREFIX + id)
  if (overlay) {
    overlay.remove()
  }
}

/**
 * Positions an overlay element to match a DOMRect
 */
export function positionOverlay(element: HTMLElement, rect: DOMRect): void {
  element.style.top = `${rect.top}px`
  element.style.left = `${rect.left}px`
  element.style.width = `${rect.width}px`
  element.style.height = `${rect.height}px`
}

/**
 * Creates a horizontal line element
 */
export function createLineElement(
  id: string,
  options: {
    color?: string
    width?: string
    style?: 'solid' | 'dashed' | 'dotted'
    zIndex?: number
  } = {},
): HTMLElement {
  const { color = COLORS.indicator.foldLine, width = '2px', style = 'dashed', zIndex = Z_INDEX.INDICATOR } = options

  const existingLine = document.getElementById(OVERLAY_PREFIX + id)
  if (existingLine) {
    return existingLine
  }

  const line = document.createElement('div')
  line.id = OVERLAY_PREFIX + id
  line.style.cssText = `
    position: fixed;
    left: 0;
    width: 100%;
    height: 0;
    border-top: ${width} ${style} ${color};
    z-index: ${zIndex};
    pointer-events: none;
    transition: top 0.1s ease;
  `

  document.body.appendChild(line)
  return line
}

/**
 * Creates a label element
 */
export function createLabelElement(
  id: string,
  text: string,
  options: {
    backgroundColor?: string
    textColor?: string
    fontSize?: string
    zIndex?: number
  } = {},
): HTMLElement {
  const {
    backgroundColor = COLORS.indicator.foldLine,
    textColor = COLORS.indicator.label,
    fontSize = '11px',
    zIndex = Z_INDEX.TOP,
  } = options

  const existingLabel = document.getElementById(OVERLAY_PREFIX + id)
  if (existingLabel) {
    existingLabel.textContent = text
    return existingLabel
  }

  const label = document.createElement('div')
  label.id = OVERLAY_PREFIX + id
  label.textContent = text
  label.style.cssText = `
    position: fixed;
    padding: 4px 8px;
    background-color: ${backgroundColor};
    color: ${textColor};
    font-size: ${fontSize};
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 500;
    border-radius: 4px;
    z-index: ${zIndex};
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  `

  document.body.appendChild(label)
  return label
}

/**
 * Creates an SVG overlay element
 */
export function createSvgOverlay(id: string, zIndex: number = Z_INDEX.OVERLAY): SVGSVGElement {
  const existingSvg = document.getElementById(OVERLAY_PREFIX + id) as SVGSVGElement | null
  if (existingSvg) {
    return existingSvg
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = OVERLAY_PREFIX + id
  svg.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: ${zIndex};
    pointer-events: none;
  `

  document.body.appendChild(svg)
  return svg
}

/**
 * Gets the prefixed ID for an overlay
 */
export function getOverlayId(id: string): string {
  return OVERLAY_PREFIX + id
}

/**
 * Checks if an overlay exists
 */
export function overlayExists(id: string): boolean {
  return document.getElementById(OVERLAY_PREFIX + id) !== null
}

/**
 * Removes all overlays with the prefix
 */
export function removeAllOverlays(): void {
  const overlays = document.querySelectorAll(`[id^="${OVERLAY_PREFIX}"]`)
  overlays.forEach((overlay) => {
    overlay.remove()
  })
}

/**
 * Options for creating a pattern zone
 */
export interface PatternZoneOptions {
  top: number | string
  left: number | string
  width: number | string
  height: number | string
  backgroundColor: string
  borderColor: string
  borderBottom?: boolean
  borderRight?: boolean
  label?: {
    text: string
    color: string
    position: 'right' | 'left' | 'vertical'
  }
}

/**
 * Creates a pattern zone element safely without innerHTML
 * Used by F-Pattern and E-Pattern modes
 */
export function createPatternZone(options: PatternZoneOptions): HTMLElement {
  const zone = document.createElement('div')

  const formatValue = (v: number | string): string => (typeof v === 'number' ? `${v}px` : v)

  const borderStyles = [
    options.borderBottom ? `border-bottom: 2px solid ${options.borderColor}` : '',
    options.borderRight ? `border-right: 2px solid ${options.borderColor}` : '',
  ]
    .filter(Boolean)
    .join('; ')

  zone.style.cssText = `
    position: absolute;
    top: ${formatValue(options.top)};
    left: ${formatValue(options.left)};
    width: ${formatValue(options.width)};
    height: ${formatValue(options.height)};
    background: ${options.backgroundColor};
    ${borderStyles};
  `

  if (options.label) {
    const label = document.createElement('span')
    label.textContent = options.label.text // Safe: uses textContent, not innerHTML
    label.style.cssText = `
      position: absolute;
      font-size: 10px;
      color: ${options.label.color};
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 500;
      opacity: 0.8;
      ${
        options.label.position === 'vertical'
          ? 'left: 50%; top: 24px; transform: translateX(-50%); writing-mode: vertical-rl;'
          : options.label.position === 'right'
            ? 'right: 16px; top: 50%; transform: translateY(-50%);'
            : 'left: 16px; top: 50%; transform: translateY(-50%);'
      }
    `
    zone.appendChild(label)
  }

  return zone
}
