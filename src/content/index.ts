/**
 * ScanVision Linter - Content Script
 * Uses the modes system for visualization
 */

import type { ModeContext, ModesState } from '../modes'
import {
  createModeManager,
  getViewportInfo,
  registry,
  removeAllOverlays,
  removeAllStylesheets,
} from '../modes'
import { ePatternMode } from '../modes/implementations/e-pattern-mode'
import { fPatternMode } from '../modes/implementations/f-pattern-mode'
import { first5sMode } from '../modes/implementations/first-5s-mode'
import { foldLineMode } from '../modes/implementations/fold-line-mode'
import { heatZonesMode } from '../modes/implementations/heat-zones-mode'
import { scanMode } from '../modes/implementations/scan-mode'
import { estimateLines, MAX_LINES_WITHOUT_ANCHOR } from '../modes/utils/dom'
import { getPresetById, PRESETS } from '../presets/platforms'
import type {
  AnalyticsData,
  DetectedProblem,
  Message,
  PlatformPreset,
  ScanConfig,
  ScanResponse,
} from '../types/messages'
import { DEFAULT_CONFIG } from '../types/messages'
import {
  clearUnformattedCodeMarkers,
  detectUnformattedCode,
  markUnformattedCodeBlocks,
} from './analysis/antiPatterns'
import { evaluatePlatformSuggestions } from './analysis/suggestions'
import { calculateWeightedAnchors } from './analysis/weights'

// Register all modes
registry.register(scanMode)
registry.register(foldLineMode)
registry.register(fPatternMode)
registry.register(ePatternMode)
registry.register(heatZonesMode)
registry.register(first5sMode)

// Create manager
const manager = createModeManager(registry)

/**
 * Validates that a modeId is registered in the registry
 * Returns the modeId if valid, null otherwise
 */
function validateModeId(modeId: unknown): string | null {
  if (typeof modeId !== 'string' || !modeId.trim()) {
    return null
  }
  const trimmedId = modeId.trim()
  return registry.has(trimmedId) ? trimmedId : null
}

// Use the first preset (default) from platforms.ts - single source of truth
const DEFAULT_PRESET = PRESETS[0]

let currentConfig: ScanConfig = DEFAULT_CONFIG
let currentPreset: PlatformPreset = DEFAULT_PRESET

// Analytics cache to avoid recalculating on every toggle
interface AnalyticsCache {
  data: AnalyticsData | null
  timestamp: number
  contentHash: string
}

let analyticsCache: AnalyticsCache = {
  data: null,
  timestamp: 0,
  contentHash: '',
}

const CACHE_TTL = 1000 // 1 second TTL

/**
 * Computes a simple hash of content area for cache invalidation
 */
function getContentHash(contentArea: Element): string {
  return `${contentArea.childElementCount}-${contentArea.textContent?.length || 0}-${currentPreset.id}`
}

/**
 * Invalidates the analytics cache
 */
function invalidateCache(): void {
  analyticsCache = { data: null, timestamp: 0, contentHash: '' }
}

/**
 * Gets the main content area element
 * Safely handles empty or invalid selectors
 */
function getContentArea(): Element {
  const contentAreaSelector = currentPreset.selectors.contentArea
  if (!contentAreaSelector || !contentAreaSelector.trim()) {
    return document.body
  }

  const selectors = contentAreaSelector
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      if (element) return element
    } catch {
      // Invalid selector, skip to next
      console.warn(`[ScanVision] Invalid selector: ${selector}`)
    }
  }
  return document.body
}

/**
 * Creates a ModeContext from current state
 */
function createContext(): ModeContext {
  return {
    contentArea: getContentArea(),
    viewport: getViewportInfo(),
    preset: currentPreset,
  }
}

/**
 * Initializes the mode manager with current context
 */
function initializeManager(): void {
  const context = createContext()
  manager.initialize(context)
}

/**
 * Analyzes scannability and returns analytics data
 * Uses caching to avoid recalculating on rapid toggles
 */
function analyzeScannability(forceRefresh = false): AnalyticsData {
  const mainContent = getContentArea()
  const currentHash = getContentHash(mainContent)
  const now = Date.now()

  // Check if cache is valid
  if (
    !forceRefresh &&
    analyticsCache.data &&
    analyticsCache.contentHash === currentHash &&
    now - analyticsCache.timestamp < CACHE_TTL
  ) {
    return analyticsCache.data
  }

  // Use platform-specific selectors, with fallbacks
  const textBlockSelector = currentPreset.selectors.textBlocks || 'p'
  const codeBlockSelector = currentPreset.selectors.codeBlocks || 'pre'
  const ignoreSelector = currentPreset.selectors.ignoreElements?.join(', ') || ''

  // Calculate weighted anchors for more accurate scannability scoring
  const weightedAnchors = calculateWeightedAnchors(
    mainContent,
    currentPreset.selectors.hotSpots,
    ignoreSelector,
    codeBlockSelector,
  )

  // Extract counts for display (UI breakdown)
  const headings = weightedAnchors.headings.count
  const emphasis = weightedAnchors.emphasis.count
  const code = weightedAnchors.codeBlocks.count + weightedAnchors.inlineCode.count
  const links = weightedAnchors.standaloneLinks.count + weightedAnchors.inlineLinks.count
  const images = weightedAnchors.images.count
  const lists = weightedAnchors.lists.count
  const totalAnchors = weightedAnchors.totalRaw
  const textBlocks = mainContent.querySelectorAll(textBlockSelector)
  const totalTextBlocks = textBlocks.length

  // Count problem blocks (text blocks > 5 lines without anchors)
  let problemBlocks = 0

  textBlocks.forEach((block) => {
    // Skip blocks inside ignored elements
    if (ignoreSelector && block.closest(ignoreSelector)) {
      return
    }

    const hasAnchor = block.querySelector('strong, b, mark, code, a, img') !== null
    const lines = estimateLines(block)

    if (!hasAnchor && lines > MAX_LINES_WITHOUT_ANCHOR) {
      problemBlocks++
    }
  })

  // Detect unformatted code blocks
  const unformattedCodeMatches = detectUnformattedCode(
    mainContent,
    textBlockSelector,
    ignoreSelector,
  )
  const unformattedCodeBlocks = unformattedCodeMatches.length

  // Mark unformatted code blocks visually (cleared on deactivate)
  if (manager.isActive('scan')) {
    clearUnformattedCodeMarkers()
    markUnformattedCodeBlocks(unformattedCodeMatches)
  }

  // Calculate score using weighted anchors
  // Weighted anchors give more value to high-impact elements (headings, code blocks)
  // and less value to inline links which can exist in dense text
  let score = 100
  const problems: DetectedProblem[] = []

  if (totalTextBlocks > 0) {
    // Use weighted total for ratio calculation
    const anchorRatio = weightedAnchors.totalWeighted / totalTextBlocks
    const idealRatio = 1.5 // Slightly lower since weights are more meaningful

    const ratioScore = Math.min(70, (anchorRatio / idealRatio) * 70)
    const problemPenalty = Math.round(Math.min(30, (problemBlocks / totalTextBlocks) * 50))
    const unformattedCodePenalty = Math.min(25, unformattedCodeBlocks * 5)

    // Build problems array with penalties
    if (problemBlocks > 0) {
      problems.push({
        id: 'dense-paragraphs',
        type: 'dense-paragraph',
        description: 'Dense paragraphs without visual anchors',
        count: problemBlocks,
        penalty: problemPenalty,
      })
    }

    if (unformattedCodeBlocks > 0) {
      problems.push({
        id: 'unformatted-code',
        type: 'unformatted-code',
        description: 'Code that should be in code blocks',
        count: unformattedCodeBlocks,
        penalty: unformattedCodePenalty,
      })
    }

    // Bonuses based on weighted values (not raw counts)
    const headingBonus = Math.min(15, weightedAnchors.headings.weight * 3)
    const imageBonus = Math.min(15, weightedAnchors.images.weight * 5)
    // Code blocks are valuable - small bonus for proper code formatting
    const codeBonus = Math.min(10, weightedAnchors.codeBlocks.weight * 2)

    score = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          ratioScore -
            problemPenalty -
            unformattedCodePenalty +
            headingBonus +
            imageBonus +
            codeBonus,
        ),
      ),
    )
  }

  // Evaluate platform-specific suggestions (informative only, don't affect score)
  // Use local preset (with validate functions) instead of message-passed preset
  // because Chrome messaging strips functions during serialization
  const localPreset = getPresetById(currentPreset.id)
  const platformSuggestions = localPreset.analysis?.suggestions || []
  const triggeredSuggestions = evaluatePlatformSuggestions(platformSuggestions, mainContent)

  const data: AnalyticsData = {
    score,
    totalTextBlocks,
    totalAnchors,
    problemBlocks,
    unformattedCodeBlocks,
    anchorsBreakdown: {
      headings,
      emphasis,
      code,
      links,
      images,
      lists,
    },
    problems: problems.length > 0 ? problems : undefined,
    suggestions: triggeredSuggestions.length > 0 ? triggeredSuggestions : undefined,
    timestamp: Date.now(),
  }

  // Update cache
  analyticsCache = {
    data,
    timestamp: now,
    contentHash: currentHash,
  }

  return data
}

/**
 * Syncs scan mode config with current settings
 */
function syncScanModeConfig(): void {
  const modesState: ModesState = {
    scan: {
      enabled: manager.isActive('scan'),
      settings: {
        opacity: currentConfig.opacity,
        blur: currentConfig.blur,
      },
    },
  }

  manager.updateConfig('scan', modesState.scan)
}

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: ScanResponse) => void) => {
    if (message.action === 'get-state') {
      sendResponse({
        isScanning: manager.isActive('scan'),
        config: currentConfig,
        activeModes: manager.getActiveModes(),
      })
      return true
    }

    if (message.action === 'analyze') {
      const analytics = analyzeScannability()
      sendResponse({
        isScanning: manager.isActive('scan'),
        config: currentConfig,
        analytics,
        activeModes: manager.getActiveModes(),
      })
      return true
    }

    if (message.action === 'update-config') {
      if (message.config) {
        currentConfig = message.config
      }
      if (message.preset) {
        // Check if preset changed BEFORE updating to avoid race condition
        const presetChanged = message.preset.id !== currentPreset.id
        currentPreset = message.preset
        if (presetChanged) {
          invalidateCache()
        }
      }

      if (manager.isActive('scan')) {
        // Re-initialize with new context and sync config
        initializeManager()
        syncScanModeConfig()
      }

      sendResponse({
        isScanning: manager.isActive('scan'),
        config: currentConfig,
        activeModes: manager.getActiveModes(),
      })
      return true
    }

    if (message.action === 'toggle-mode') {
      if (message.config) {
        currentConfig = message.config
      }
      if (message.preset) {
        currentPreset = message.preset
      }

      // Validate modeId against registered modes
      const validatedModeId = validateModeId(message.modeId)
      const enabled = message.enabled

      if (validatedModeId) {
        // Initialize manager if not already done
        if (!manager.getContext()) {
          initializeManager()
        }

        // Sync scan mode config if toggling scan
        if (validatedModeId === 'scan') {
          syncScanModeConfig()
        }

        if (enabled) {
          manager.activate(validatedModeId)
        } else {
          manager.deactivate(validatedModeId)
        }
      } else if (message.modeId) {
        // Log warning for invalid modeId attempts (helps debugging)
        console.warn(`[ScanVision] Invalid modeId received: ${message.modeId}`)
      }

      const analytics = manager.isActive('scan') ? analyzeScannability() : undefined

      sendResponse({
        isScanning: manager.isActive('scan'),
        config: currentConfig,
        activeModes: manager.getActiveModes(),
        analytics,
      })
      return true
    }

    if (message.action === 'toggle-scan') {
      if (message.config) {
        currentConfig = message.config
      }
      if (message.preset) {
        currentPreset = message.preset
      }

      if (manager.isActive('scan')) {
        // Deactivate
        manager.deactivate('scan')
        sendResponse({
          isScanning: false,
          config: currentConfig,
          activeModes: manager.getActiveModes(),
        })
      } else {
        // Activate
        initializeManager()
        syncScanModeConfig()
        manager.activate('scan')

        // Analyze AFTER activating so markers get applied
        const analytics = analyzeScannability()

        sendResponse({
          isScanning: true,
          config: currentConfig,
          analytics,
          activeModes: manager.getActiveModes(),
        })
      }
      return true
    }

    return false
  },
)

/**
 * Global cleanup function
 * Called when page unloads or extension context invalidates
 */
function cleanup(): void {
  try {
    manager.destroy()
    removeAllOverlays()
    removeAllStylesheets()
    clearUnformattedCodeMarkers()
    invalidateCache()
  } catch {
    // Silently handle errors during cleanup
    // Context may already be invalidated
  }
}

// Clean up when page unloads
window.addEventListener('beforeunload', cleanup)

// Clean up when extension context invalidates (extension update/disable)
// This happens when the extension is updated or disabled while the page is open
if (chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
    // Check if context is still valid - if not, clean up
    try {
      void chrome.runtime.id
    } catch {
      cleanup()
    }
    return false
  })
}

// Handle visibility change to clean up when tab becomes hidden and extension updates
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Don't fully cleanup, but prepare for potential context invalidation
    // Full cleanup happens on beforeunload or context invalidation
  }
})
