/**
 * Scan Mode - Core scannability visualization
 * Dims non-scannable text and highlights visual anchors
 */

import { ScanText } from 'lucide-react'
import type { PlatformPreset } from '../../presets/platforms'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { cloneModeConfig } from '../utils/config'
import { batchAnalyzeParagraphs, batchApplyProblemClasses } from '../utils/dom'
import { sanitizeCSS, sanitizeSelectors } from '../utils/security'
import { injectStylesheet, removeStylesheet } from '../utils/styles'

const MODE_ID = 'scan'
const STYLE_ID = 'scan-mode'
const PROBLEM_CLASS = 'scanvision-problem-block'

interface ScanModeConfig extends ModeConfig {
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
 * Creates base CSS styles for paragraphs and problem blocks
 */
function createBaseStyles(scope: string, config: ScanModeConfig): string {
  const { opacity, blur } = config.settings
  return `
  /* Dim paragraph text - only within content area */
  ${scope} p {
    color: color-mix(in srgb, currentColor ${Math.round(opacity * 100)}%, transparent) !important;
    filter: blur(${blur}px) !important;
    transition: color 0.2s ease, filter 0.2s ease;
  }

  /* Problem blocks - warning highlight */
  ${scope} p.${PROBLEM_CLASS} {
    outline: 2px dashed rgba(239, 68, 68, 0.7) !important;
    outline-offset: 4px;
    background-color: rgba(239, 68, 68, 0.05) !important;
  }`
}

/**
 * Creates CSS for hot spot elements (headings, code, links, etc.)
 */
function createHotSpotStyles(scope: string): string {
  return `
  /* === HOT SPOTS - Always fully visible === */

  /* Headings */
  ${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4, ${scope} h5, ${scope} h6 {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(37, 99, 235, 0.5);
    outline-offset: 2px;
  }

  /* Emphasis */
  ${scope} strong, ${scope} b, ${scope} mark, ${scope} em {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(37, 99, 235, 0.5);
    outline-offset: 1px;
  }

  /* Code */
  ${scope} code, ${scope} pre, ${scope} kbd, ${scope} samp {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 1px dashed rgba(16, 185, 129, 0.5);
  }

  /* Links */
  ${scope} a, ${scope} a * {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Images and media */
  ${scope} img, ${scope} picture, ${scope} video, ${scope} canvas, ${scope} figure {
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(236, 72, 153, 0.5);
  }

  /* SVG icons */
  ${scope} svg, ${scope} svg * {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Emoji and icon elements */
  ${scope} [role="img"],
  ${scope} [data-emoji-id],
  ${scope} [data-testid*="emoji"],
  ${scope} .emoji,
  ${scope} span:has(> img.emoji) {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Tables */
  ${scope} table, ${scope} th, ${scope} td, ${scope} tr, ${scope} thead, ${scope} tbody {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Callouts and alerts */
  ${scope} .alert, ${scope} .note, ${scope} .warning, ${scope} .tip, ${scope} .info, ${scope} .caution,
  ${scope} [class*="alert"], ${scope} [class*="callout"], ${scope} [class*="admonition"],
  ${scope} [class*="warning"], ${scope} [class*="info"], ${scope} [class*="tip"] {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(251, 146, 60, 0.5);
  }

  /* Buttons and interactive elements */
  ${scope} button, ${scope} input, ${scope} select, ${scope} textarea, ${scope} [role="button"] {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Lists - always visible */
  ${scope} ul, ${scope} ol, ${scope} li {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }`
}

/**
 * Creates CSS for platform-specific hot spots
 * Sanitizes selectors to prevent CSS injection attacks
 */
function createPlatformHotSpotStyles(preset: PlatformPreset, scope: string): string {
  if (preset.selectors.hotSpots.length === 0) return ''

  // Sanitize selectors to prevent CSS injection
  const safeHotSpots = sanitizeSelectors(preset.selectors.hotSpots)
  if (safeHotSpots.length === 0) return ''

  const selectors = safeHotSpots.map((s) => `${scope} ${s}`).join(',\n  ')
  return `
  /* Platform-specific hot spots (${preset.name}) */
  ${selectors} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid rgba(139, 92, 246, 0.5);
  }`
}

/**
 * Creates CSS for ignore elements - SCOPED to content area to prevent global pollution
 * Sanitizes selectors to prevent CSS injection attacks
 */
function createIgnoreElementStyles(preset: PlatformPreset, scope: string): string {
  if (preset.selectors.ignoreElements.length === 0) return ''

  // Sanitize selectors to prevent CSS injection
  const safeIgnoreElements = sanitizeSelectors(preset.selectors.ignoreElements)
  if (safeIgnoreElements.length === 0) return ''

  // Scope to content area to prevent affecting navigation/sidebars
  const selectors = safeIgnoreElements.map((s) => `${scope} ${s}, ${scope} ${s} *`).join(',\n  ')
  return `
  /* Ignored elements - scoped to content area (${preset.name}) */
  ${selectors} {
    opacity: 0.4 !important;
    filter: none !important;
  }`
}

/**
 * Creates CSS for navigation visibility
 * Uses platform-specific selectors if available, otherwise falls back to generic selectors
 * Sanitizes selectors to prevent CSS injection attacks
 */
function createNavigationStyles(preset: PlatformPreset): string {
  const navSelectors = preset.styles?.navigationSelectors

  if (navSelectors && navSelectors.length > 0) {
    // Sanitize navigation selectors
    const safeNavSelectors = sanitizeSelectors(navSelectors)
    if (safeNavSelectors.length > 0) {
      // Platform-specific navigation selectors
      return `
  /* Platform-specific navigation (${preset.name}) */
  ${safeNavSelectors.join(',\n  ')} {
    opacity: 0.5 !important;
    filter: none !important;
    pointer-events: auto !important;
  }`
    }
  }

  // More specific fallback selectors to avoid false positives
  return `
  /* Generic navigation visibility - using specific patterns */
  body > nav,
  body > header,
  body > aside,
  body > footer,
  [role="navigation"],
  [role="banner"],
  [role="complementary"],
  [aria-label*="navigation" i],
  [aria-label*="sidebar" i],
  [aria-label*="menu" i],
  .site-header,
  .site-nav,
  .site-sidebar,
  .site-footer,
  .main-nav,
  .main-header,
  .page-header,
  #header,
  #nav,
  #sidebar,
  #footer {
    opacity: 0.5 !important;
    filter: none !important;
    pointer-events: auto !important;
  }`
}

/**
 * Creates CSS styles for scan mode
 * Styles are scoped to contentArea to avoid affecting page navigation/UI
 *
 * NOTE: !important is used extensively because as a browser extension,
 * we need to override page styles reliably. CSS Cascade Layers could be
 * an alternative in the future, but !important ensures consistent behavior
 * across all documentation platforms.
 */
function createStyles(config: ScanModeConfig, context: ModeContext): string {
  const preset = context.preset
  const scope = preset.selectors.contentArea

  const sections = [
    `  /*`,
    `   * ScanVision Linter - Scan Mode (${preset.name} preset)`,
    `   * Scoped to: ${scope}`,
    `   */`,
    createBaseStyles(scope, config),
    createHotSpotStyles(scope),
    createPlatformHotSpotStyles(preset, scope),
    createIgnoreElementStyles(preset, scope),
    createNavigationStyles(preset),
    sanitizeCSS(preset.styles?.additionalCSS),
  ]

  return sections.filter(Boolean).join('\n')
}

/**
 * Analyzes content and marks problem blocks
 * Uses batch DOM operations to minimize layout thrashing
 */
function analyzeProblemBlocks(context: ModeContext): number {
  const contentArea = context.contentArea
  const paragraphs = contentArea.querySelectorAll('p')

  // Use optimized batch functions to minimize reflows
  const analyses = batchAnalyzeParagraphs(paragraphs)
  return batchApplyProblemClasses(analyses, PROBLEM_CLASS)
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
class ScanMode implements VisualizationMode {
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
    return cloneModeConfig(this.config)
  }
}

// Export singleton instance
export const scanMode = new ScanMode()
