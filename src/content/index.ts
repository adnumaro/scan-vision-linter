/**
 * ScanVision Linter - Content Script
 * Uses the modes system for visualization
 */

import type { ModeContext, ModesState } from '../modes'
import { createModeManager, getViewportInfo, registry } from '../modes'
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

// Register all modes
registry.register(scanMode)
registry.register(foldLineMode)
registry.register(fPatternMode)
registry.register(ePatternMode)
registry.register(heatZonesMode)
registry.register(first5sMode)

// Create manager
const manager = createModeManager(registry)

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
 */
function getContentArea(): Element {
  const selectors = currentPreset.selectors.contentArea.split(',').map((s) => s.trim())
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) return element
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

  const paragraphs = mainContent.querySelectorAll('p')
  const totalTextBlocks = paragraphs.length

  // Count problem blocks (paragraphs > 5 lines without anchors)
  let problemBlocks = 0

  paragraphs.forEach((p) => {
    const hasAnchor = p.querySelector('strong, b, mark, code, a, img') !== null
    const lines = estimateLines(p)

    if (!hasAnchor && lines > MAX_LINES_WITHOUT_ANCHOR) {
      problemBlocks++
    }
  })

  // Calculate score
  let score = 100

  if (totalTextBlocks > 0) {
    const anchorRatio = totalAnchors / totalTextBlocks
    const idealRatio = 2

    const ratioScore = Math.min(70, (anchorRatio / idealRatio) * 70)
    const problemPenalty = Math.min(30, (problemBlocks / totalTextBlocks) * 50)
    const headingBonus = Math.min(15, headings * 3)
    const imageBonus = Math.min(15, images * 5)

    score = Math.round(
      Math.max(0, Math.min(100, ratioScore - problemPenalty + headingBonus + imageBonus)),
    )
  }

  const data: AnalyticsData = {
    score,
    totalTextBlocks,
    totalAnchors,
    problemBlocks,
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

      const modeId = message.modeId
      const enabled = message.enabled

      if (modeId) {
        // Initialize manager if not already done
        if (!manager.getContext()) {
          initializeManager()
        }

        // Sync scan mode config if toggling scan
        if (modeId === 'scan') {
          syncScanModeConfig()
        }

        if (enabled) {
          manager.activate(modeId)
        } else {
          manager.deactivate(modeId)
        }
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
