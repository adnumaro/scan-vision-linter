/**
 * First 5 Seconds Mode - Shows what users see in first 5 seconds
 * Simulates quick scanning by showing only:
 * - Headings
 * - First ~10 words of paragraphs
 * - Images
 * - Emphasis (bold, etc.)
 * Everything else is heavily dimmed
 */

import { Timer } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { injectStylesheet, removeStylesheet } from '../utils/styles'

const MODE_ID = 'first-5s'
const STYLE_ID = 'first-5s-mode'

export interface First5sConfig extends ModeConfig {
  settings: {
    wordLimit: number
  }
}

const DEFAULT_CONFIG: First5sConfig = {
  enabled: false,
  settings: {
    wordLimit: 10,
  },
}

/**
 * Creates CSS for first 5 seconds mode
 */
function createStyles(): string {
  return `
  /*
   * ScanVision Linter - First 5 Seconds Mode
   * Simulates quick scanning behavior
   */

  /* Hide most text content */
  body {
    --scanvision-dim: 0.15;
  }

  /* Dim all paragraph text heavily */
  p {
    color: color-mix(in srgb, currentColor 15%, transparent) !important;
    filter: blur(1px) !important;
  }

  /* But show the first line of paragraphs */
  p::first-line {
    color: inherit !important;
    filter: none !important;
  }

  /* Dim list items */
  li {
    color: color-mix(in srgb, currentColor 20%, transparent) !important;
  }

  /* === VISIBLE ELEMENTS === */

  /* Headings - fully visible */
  h1, h2, h3, h4, h5, h6 {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    background-color: rgba(37, 99, 235, 0.1) !important;
    padding: 4px 8px !important;
    border-radius: 4px;
  }

  /* Emphasis - visible */
  strong, b, mark, em {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    background-color: rgba(250, 204, 21, 0.3) !important;
  }

  /* Images - visible with highlight */
  img, picture, video, figure {
    filter: none !important;
    opacity: 1 !important;
    outline: 3px solid rgba(236, 72, 153, 0.6) !important;
  }

  /* Icons remain visible */
  svg, [role="img"] {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Links in headings stay visible */
  h1 a, h2 a, h3 a, h4 a, h5 a, h6 a {
    color: inherit !important;
    filter: none !important;
  }

  /* Code blocks - slightly visible */
  code, pre {
    color: color-mix(in srgb, currentColor 40%, transparent) !important;
    filter: blur(0.5px) !important;
  }

  /* Navigation and buttons stay visible */
  nav, nav *, header, header * {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  button, [role="button"], input, select {
    filter: none !important;
    opacity: 1 !important;
  }
`
}

/**
 * First 5 Seconds Mode implementation
 */
export class First5sMode implements VisualizationMode {
  readonly id = MODE_ID
  readonly name = 'First 5 Seconds'
  readonly description = 'Shows only what users see during quick scanning'
  readonly icon = Timer
  readonly category = 'simulation' as const
  readonly incompatibleWith = ['scan']

  private active = false
  private config: First5sConfig = DEFAULT_CONFIG

  activate(_context: ModeContext): void {
    if (this.active) return

    injectStylesheet(STYLE_ID, createStyles())
    this.active = true
  }

  deactivate(): void {
    if (!this.active) return

    removeStylesheet(STYLE_ID)
    this.active = false
  }

  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as First5sConfig['settings']),
      },
    }

    if (this.active) {
      injectStylesheet(STYLE_ID, createStyles())
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
export const first5sMode = new First5sMode()
