/**
 * Color utilities for heat zones and overlays
 */

/**
 * Converts hex color to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(0, 0, 0, ${alpha})`

  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
 * Gets attention zone color based on position
 * Top-left = high attention (green), Bottom-right = low attention (red)
 */
export function getAttentionColor(
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number = 0.2,
): string {
  // Calculate distance from top-left (0,0) as percentage
  const xPercent = x / width
  const yPercent = y / height

  // Weighted average - vertical position matters more for reading
  const intensity = xPercent * 0.3 + yPercent * 0.7

  return getHeatColor(intensity, alpha)
}

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
