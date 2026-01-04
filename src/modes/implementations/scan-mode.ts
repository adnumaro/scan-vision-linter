/**
 * Scan Mode - Core scannability visualization
 * Dims non-scannable text and highlights visual anchors
 */

import { ScanText } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { injectStylesheet, removeStylesheet } from '../utils/styles'

const MODE_ID = 'scan'
const STYLE_ID = 'scan-mode'
const PROBLEM_CLASS = 'scanvision-problem-block'

export interface ScanModeConfig extends ModeConfig {
  settings: {
    opacity: number
    blur: number
  }
}

const DEFAULT_CONFIG: ScanModeConfig = {
  enabled: true,
  settings: {
    opacity: 0.3,
    blur: 0.5,
  },
}

/**
 * Creates CSS styles for scan mode
 */
function createStyles(config: ScanModeConfig, context: ModeContext): string {
  const { opacity, blur } = config.settings
  const preset = context.preset

  // Build platform-specific hot spots selector
  const platformHotSpots =
    preset.selectors.hotSpots.length > 0 ? preset.selectors.hotSpots.join(',\n  ') : ''

  // Build ignore selectors
  const ignoreSelectors =
    preset.selectors.ignoreElements.length > 0
      ? preset.selectors.ignoreElements.map((s) => `${s}, ${s} *`).join(',\n  ')
      : ''

  return `
  /*
   * ScanVision Linter - Scan Mode (${preset.name} preset)
   */

  /* Dim paragraph text */
  p {
    color: color-mix(in srgb, currentColor ${Math.round(opacity * 100)}%, transparent) !important;
    filter: blur(${blur}px) !important;
    transition: color 0.2s ease, filter 0.2s ease;
  }

  /* Problem blocks - warning highlight */
  p.${PROBLEM_CLASS} {
    outline: 2px dashed rgba(239, 68, 68, 0.7) !important;
    outline-offset: 4px;
    background-color: rgba(239, 68, 68, 0.05) !important;
  }

  /* === HOT SPOTS - Always fully visible === */

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(37, 99, 235, 0.5);
    outline-offset: 2px;
  }

  /* Emphasis */
  strong, b, mark, em {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    background-color: rgba(250, 204, 21, 0.3) !important;
  }

  /* Code */
  code, pre, kbd, samp {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 1px dashed rgba(16, 185, 129, 0.5);
  }

  /* Links */
  a, a * {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Images and media */
  img, picture, video, canvas, figure {
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(236, 72, 153, 0.5);
  }

  /* SVG icons */
  svg, svg * {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Emoji and icon elements */
  [role="img"],
  [data-emoji-id],
  [data-testid*="emoji"],
  .emoji,
  span:has(> img.emoji) {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Tables */
  table, th, td, tr, thead, tbody {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Callouts and alerts */
  .alert, .note, .warning, .tip, .info, .caution,
  [class*="alert"], [class*="callout"], [class*="admonition"],
  [class*="warning"], [class*="info"], [class*="tip"] {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(251, 146, 60, 0.5);
  }

  /* Buttons and interactive elements */
  button, input, select, textarea, [role="button"] {
    filter: none !important;
    opacity: 1 !important;
  }

  /* List items with important content */
  li:has(a), li:has(code), li:has(strong), li:has(img) {
    color: inherit !important;
    filter: none !important;
  }

  ${
    platformHotSpots
      ? `
  /* Platform-specific hot spots (${preset.name}) */
  ${platformHotSpots} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(139, 92, 246, 0.5);
  }
  `
      : ''
  }

  ${
    ignoreSelectors
      ? `
  /* Ignored elements (${preset.name}) */
  ${ignoreSelectors} {
    opacity: 0.4 !important;
    filter: none !important;
  }
  `
      : ''
  }
`
}

/**
 * Analyzes content and marks problem blocks
 */
function analyzeProblemBlocks(context: ModeContext): number {
  const contentArea = context.contentArea
  const paragraphs = contentArea.querySelectorAll('p')

  let problemBlocks = 0
  const lineHeight = 24
  const maxLinesWithoutAnchor = 5

  paragraphs.forEach((p) => {
    const hasAnchor = p.querySelector('strong, b, mark, code, a, img') !== null
    const estimatedLines = p.scrollHeight / lineHeight

    if (!hasAnchor && estimatedLines > maxLinesWithoutAnchor) {
      problemBlocks++
      p.classList.add(PROBLEM_CLASS)
    } else {
      p.classList.remove(PROBLEM_CLASS)
    }
  })

  return problemBlocks
}

/**
 * Removes problem block markers
 */
function clearProblemBlocks(): void {
  document.querySelectorAll(`.${PROBLEM_CLASS}`).forEach((el) => {
    el.classList.remove(PROBLEM_CLASS)
  })
}

/**
 * Scan Mode implementation
 */
export class ScanMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'Scan Mode'
  readonly description = 'Dims text and highlights visual anchors for scannability analysis'
  readonly icon = ScanText
  readonly category = 'simulation' as const
  readonly incompatibleWith = ['first-5s']

  private active = false
  private config: ScanModeConfig = DEFAULT_CONFIG
  private context: ModeContext | null = null

  activate(context: ModeContext): void {
    if (this.active) return

    this.context = context
    analyzeProblemBlocks(context)
    injectStylesheet(STYLE_ID, createStyles(this.config, context))
    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    removeStylesheet(STYLE_ID)
    clearProblemBlocks()
    this.context = null
    this.active = false
  }

  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as ScanModeConfig['settings']),
      },
    }

    if (this.active && this.context) {
      injectStylesheet(STYLE_ID, createStyles(this.config, this.context))
    }
  }

  isActive(): boolean {
    return this.active
  }

  getDefaultConfig(): ModeConfig {
    return DEFAULT_CONFIG
  }

  getConfig(): ModeConfig {
    return this.config
  }
}

// Export singleton instance
export const scanMode = new ScanMode()
