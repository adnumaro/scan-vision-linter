/**
 * Color utilities for heat zones and overlays
 */

/**
 * Parses a hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

/**
 * Converts hex color to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Converts hex color to rgb string
 */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'rgb(0, 0, 0)'
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

/**
 * Creates a color helper with multiple output formats
 */
function createColor(hex: string) {
  const rgb = hexToRgb(hex)
  const { r, g, b } = rgb ?? { r: 0, g: 0, b: 0 }

  return {
    hex,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgba: (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
    r,
    g,
    b,
  }
}

/**
 * Gets a heat color based on intensity (0-1)
 * 0 = green (high attention), 1 = red (low attention)
 */
export function getHeatColor(intensity: number, alpha: number = 0.3): string {
  const clamped = Math.max(0, Math.min(1, intensity))

  // Green (high attention) -> Yellow -> Red (low attention)
  const hue = (1 - clamped) * 120 // 120 = green, 0 = red
  const saturation = 70
  const lightness = 50

  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
}

/**
 * Scan mode outline colors (for hot spots and problems)
 */
export const SCAN_COLORS = {
  /** Blue - Headings & Emphasis */
  headings: createColor('#2563eb'),
  /** Green - Code blocks */
  code: createColor('#10b981'),
  /** Pink - Images & Media */
  images: createColor('#ec4899'),
  /** Violet - Platform-specific hot spots */
  platform: createColor('#8b5cf6'),
  /** Yellow - Callouts & Alerts */
  callouts: createColor('#eab308'),
  /** Orange - Unformatted code (problem) */
  unformattedCode: createColor('#fb923c'),
  /** Red - Dense paragraphs (problem) */
  denseParagraph: createColor('#ef4444'),
} as const

/**
 * Color palette for different modes
 */
export const COLORS = {
  // F/E Pattern colors
  pattern: {
    primary: '#3b82f6', // Blue
    secondary: '#8b5cf6', // Purple
  },

  // Heat zones
  heat: {
    high: '#22c55e', // Green - high attention
    medium: '#eab308', // Yellow - medium attention
    low: '#ef4444', // Red - low attention
  },

  // Indicators
  indicator: {
    foldLine: '#ef4444', // Red
    label: '#ffffff', // White text
  },

  // Overlays
  overlay: {
    background: 'rgba(0, 0, 0, 0.05)',
    border: 'rgba(0, 0, 0, 0.1)',
  },

  // Scan mode (reference to SCAN_COLORS)
  scan: SCAN_COLORS,
} as const

/**
 * Generates heat map gradient stops for CSS
 */
export function generateHeatGradientStops(alpha: number = 0.3): string[] {
  return [
    getHeatColor(0, alpha), // Green
    getHeatColor(0.25, alpha), // Yellow-green
    getHeatColor(0.5, alpha), // Yellow
    getHeatColor(0.75, alpha), // Orange
    getHeatColor(1, alpha), // Red
  ]
}

/**
 * Blends two colors with a ratio (0 = color1, 1 = color2)
 */
export function blendColors(color1: string, color2: string, ratio: number): string {
  // Use CSS color-mix for modern browsers
  const clamped = Math.max(0, Math.min(1, ratio))
  const percent = Math.round(clamped * 100)
  return `color-mix(in srgb, ${color2} ${percent}%, ${color1})`
}

/**
 * Creates a color with adjusted opacity
 */
export function withOpacity(color: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity))
  const percent = Math.round(clamped * 100)
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/**
 * Gets the background color of the page body
 * Falls back to white if body/html have transparent backgrounds
 */
export function getBodyBgColor(): string {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor
  if (bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent') {
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor
    if (htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
      return htmlBg
    }
    return '#ffffff'
  }
  return bodyBg
}
