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
import type {
  AnalyticsData,
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

const DEFAULT_PRESET: PlatformPreset = {
  id: 'default',
  name: 'Default',
  description: 'Generic settings',
  domains: [],
  selectors: {
    contentArea: 'main, article, [role="main"], .content, #content, body',
    hotSpots: [],
    ignoreElements: [],
  },
}

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

  // Combine all anchor queries into a single querySelectorAll for better performance
  const anchorSelectors = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6', // headings
    'strong',
    'b',
    'mark', // emphasis
    'code',
    'pre',
    'kbd', // code
    'a[href]', // links
    'img',
    'svg',
    'picture',
    'video', // images
    'ul',
    'ol', // lists
    ...currentPreset.selectors.hotSpots, // platform-specific
  ].join(', ')

  const allAnchors = mainContent.querySelectorAll(anchorSelectors)

  // Count by type using a single pass through results
  let headings = 0
  let emphasis = 0
  let code = 0
  let links = 0
  let images = 0
  let lists = 0

  for (const el of allAnchors) {
    const tag = el.tagName.toLowerCase()
    if (/^h[1-6]$/.test(tag)) headings++
    else if (tag === 'strong' || tag === 'b' || tag === 'mark') emphasis++
    else if (tag === 'code' || tag === 'pre' || tag === 'kbd') code++
    else if (tag === 'a') links++
    else if (tag === 'img' || tag === 'svg' || tag === 'picture' || tag === 'video') images++
    else if (tag === 'ul' || tag === 'ol') lists++
    // Platform hot spots are counted in totalAnchors but not in breakdown
  }

  const totalAnchors = allAnchors.length

  // Use platform-specific text block selector, fallback to 'p'
  const textBlockSelector = currentPreset.selectors.textBlocks || 'p'
  const textBlocks = mainContent.querySelectorAll(textBlockSelector)
  const totalTextBlocks = textBlocks.length

  // Count problem blocks (text blocks > 5 lines without anchors)
  let problemBlocks = 0

  textBlocks.forEach((block) => {
    const hasAnchor = block.querySelector('strong, b, mark, code, a, img') !== null
    const lines = estimateLines(block)

    if (!hasAnchor && lines > MAX_LINES_WITHOUT_ANCHOR) {
      problemBlocks++
    }
  })

  // Detect unformatted code blocks
  const unformattedCodeMatches = detectUnformattedCode(mainContent, textBlockSelector)
  const unformattedCodeBlocks = unformattedCodeMatches.length

  // Mark unformatted code blocks visually (cleared on deactivate)
  if (manager.isActive('scan')) {
    clearUnformattedCodeMarkers()
    markUnformattedCodeBlocks(unformattedCodeMatches)
  }

  // Calculate score
  let score = 100

  if (totalTextBlocks > 0) {
    const anchorRatio = totalAnchors / totalTextBlocks
    const idealRatio = 2

    const ratioScore = Math.min(70, (anchorRatio / idealRatio) * 70)
    const problemPenalty = Math.min(30, (problemBlocks / totalTextBlocks) * 50)
    const unformattedCodePenalty = Math.min(25, unformattedCodeBlocks * 5)
    const headingBonus = Math.min(15, headings * 3)
    const imageBonus = Math.min(15, images * 5)

    score = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          ratioScore - problemPenalty - unformattedCodePenalty + headingBonus + imageBonus,
        ),
      ),
    )
  }

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
        // Invalidate cache when preset changes
        if (message.preset.id !== currentPreset.id) {
          invalidateCache()
        }
        currentPreset = message.preset
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

        const analytics = analyzeScannability()
        manager.activate('scan')

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
