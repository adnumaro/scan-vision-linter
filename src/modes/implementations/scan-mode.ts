/**
 * Scan Mode - Core scannability visualization
 * Dims non-scannable text and highlights visual anchors
 */

import { ScanText } from 'lucide-react'
import { UNFORMATTED_CODE_CLASS } from '../../content/analysis/antiPatterns'
import type { PlatformPreset } from '../../presets/platforms'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { SCAN_COLORS } from '../utils/colors'
import { cloneModeConfig } from '../utils/config'
import { batchAnalyzeParagraphs, batchApplyProblemClasses } from '../utils/dom'
import { sanitizeCSS, sanitizeSelectors } from '../utils/security'
import { injectStylesheet, removeStylesheet } from '../utils/styles'

const MODE_ID = 'scan'
const STYLE_ID = 'scan-mode'
const PROBLEM_CLASS = 'scanvision-problem-block'

/**
 * Selectors for Confluence elements that should be excluded from analysis and styling
 * (comments, reactions, reply containers)
 */
const CONFLUENCE_EXCLUDE_SELECTORS = [
  '[data-testid="object-comment-wrapper"]',
  '[data-testid="footer-reply-container"]',
  '[data-testid="reactions-container"]',
  '[data-testid="render-reactions"]',
  '.ak-renderer-wrapper.is-comment',
]

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
 * Expands a comma-separated scope selector to properly scope a suffix
 * e.g., "#a, #b, #c" + " p" => "#a p, #b p, #c p"
 */
function scopeSelector(scope: string, suffix: string): string {
  return scope
    .split(',')
    .map((s) => `${s.trim()}${suffix}`)
    .join(', ')
}

/**
 * Expands scope with multiple element suffixes
 * e.g., "#a, #b" + [" h1", " h2"] => "#a h1, #b h1, #a h2, #b h2"
 */
function scopeSelectors(scope: string, suffixes: string[]): string {
  const scopes = scope.split(',').map((s) => s.trim())
  const results: string[] = []
  for (const suffix of suffixes) {
    for (const s of scopes) {
      results.push(`${s}${suffix}`)
    }
  }
  return results.join(', ')
}

/**
 * Creates base CSS styles for paragraphs and problem blocks
 */
function createBaseStyles(scope: string, config: ScanModeConfig): string {
  const { opacity, blur } = config.settings
  return `
  /* Dim paragraph text - only within content area */
  ${scopeSelector(scope, ' p')} {
    color: color-mix(in srgb, currentColor ${Math.round(opacity * 100)}%, transparent) !important;
    filter: blur(${blur}px) !important;
    transition: color 0.2s ease, filter 0.2s ease;
  }

  /* Problem blocks - warning highlight (dense paragraphs) */
  ${scopeSelector(scope, ` .${PROBLEM_CLASS}`)},
  .${PROBLEM_CLASS} {
    outline: 2px dashed ${SCAN_COLORS.denseParagraph.rgba(0.7)} !important;
    outline-offset: 4px;
    background-color: ${SCAN_COLORS.denseParagraph.rgba(0.05)} !important;
  }

  /* Unformatted code blocks - orange highlight (works on any text block type) */
  ${scopeSelector(scope, ` .${UNFORMATTED_CODE_CLASS}`)},
  .${UNFORMATTED_CODE_CLASS} {
    outline: 2px dashed ${SCAN_COLORS.unformattedCode.rgba(0.8)} !important;
    outline-offset: 4px;
    background-color: ${SCAN_COLORS.unformattedCode.rgba(0.08)} !important;
  }

  /* Exclude Confluence breakout resize handles and Atlassian internal classes */
  .pm-breakout-resize-handle-rail-inside-tooltip,
  [class*="pm-breakout-resize-handle"],
  [class*="_tip"] {
    outline: none !important;
    background-color: transparent !important;
  }

  /* Exclude Confluence comment/reaction containers from all styling */
  ${CONFLUENCE_EXCLUDE_SELECTORS.map((s) => `${s}, ${s} *`).join(',\n  ')} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: none !important;
    background-color: transparent !important;
  }`
}

/**
 * Creates CSS for hot spot elements (headings, code, links, etc.)
 */
function createHotSpotStyles(scope: string): string {
  return `
  /* === HOT SPOTS - Always fully visible === */

  /* Headings */
  ${scopeSelectors(scope, [' h1', ' h2', ' h3', ' h4', ' h5', ' h6'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.headings.rgba(0.5)};
    outline-offset: 2px;
  }

  /* Emphasis */
  ${scopeSelectors(scope, [' strong', ' b', ' mark', ' em'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.headings.rgba(0.5)};
    outline-offset: 1px;
  }

  /* Code */
  ${scopeSelectors(scope, [' code', ' pre', ' kbd', ' samp'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 1px dashed ${SCAN_COLORS.code.rgba(0.5)};
  }

  /* Links */
  ${scopeSelectors(scope, [' a', ' a *'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Images and media */
  ${scopeSelectors(scope, [' img', ' picture', ' video', ' canvas', ' figure'])} {
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.images.rgba(0.5)};
  }

  /* SVG icons */
  ${scopeSelectors(scope, [' svg', ' svg *'])} {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Emoji and icon elements */
  ${scopeSelectors(scope, [' [role="img"]', ' [data-emoji-id]', ' [data-testid*="emoji"]', ' .emoji', ' span:has(> img.emoji)'])} {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Tables */
  ${scopeSelectors(scope, [' table', ' th', ' td', ' tr', ' thead', ' tbody'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* Callouts and alerts */
  ${scopeSelectors(scope, [' .alert', ' .note', ' .warning', ' .tip', ' .info', ' .caution', ' [class*="alert"]', ' [class*="callout"]', ' [class*="admonition"]', ' [class*="warning"]', ' [class*="info"]', ' [class*="tip"]'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.callouts.rgba(0.5)};
  }

  /* Buttons and interactive elements */
  ${scopeSelectors(scope, [' button', ' input', ' select', ' textarea', ' [role="button"]'])} {
    filter: none !important;
    opacity: 1 !important;
  }

  /* Lists - always visible */
  ${scopeSelectors(scope, [' ul', ' ol', ' li'])} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
  }

  /* === HOT SPOTS INSIDE PARAGRAPHS === */
  /* Use CanvasText to override inherited dimmed color from parent paragraph */

  ${scopeSelectors(scope, [' p strong', ' p b', ' p mark', ' p em'])} {
    color: CanvasText !important;
    filter: none !important;
    opacity: 1 !important;
  }

  ${scopeSelectors(scope, [' p code', ' p kbd', ' p samp'])} {
    color: CanvasText !important;
    filter: none !important;
    opacity: 1 !important;
  }

  ${scopeSelectors(scope, [' p a', ' p a *'])} {
    color: CanvasText !important;
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

  // Properly expand scope with each hotspot selector
  const selectors = scopeSelectors(
    scope,
    safeHotSpots.map((s) => ` ${s}`),
  )
  const selectorsInParagraphs = scopeSelectors(
    scope,
    safeHotSpots.map((s) => ` p ${s}`),
  )

  return `
  /* Platform-specific hot spots (${preset.name}) */
  ${selectors} {
    color: inherit !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.platform.rgba(0.5)};
  }

  /* Platform-specific hot spots inside paragraphs (${preset.name}) */
  ${selectorsInParagraphs} {
    color: CanvasText !important;
    filter: none !important;
    opacity: 1 !important;
    outline: 2px solid ${SCAN_COLORS.platform.rgba(0.5)};
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
  // Include both the element and its descendants
  const suffixes: string[] = []
  for (const s of safeIgnoreElements) {
    suffixes.push(` ${s}`)
    suffixes.push(` ${s} *`)
  }
  const selectors = scopeSelectors(scope, suffixes)

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
  // Use platform-specific text block selector, fallback to 'p'
  const textBlockSelector = context.preset.selectors.textBlocks || 'p'
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)

  // Use optimized batch functions to minimize reflows
  const analyses = batchAnalyzeParagraphs(textBlocks)
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
