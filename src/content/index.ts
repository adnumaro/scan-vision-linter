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

// Register all modes
registry.register(scanMode)
registry.register(foldLineMode)
registry.register(fPatternMode)
registry.register(ePatternMode)
registry.register(heatZonesMode)
registry.register(first5sMode)

// Create manager
const manager = createModeManager(registry)

// Types (kept for backward compatibility with popup)
interface ScanConfig {
  opacity: number
  blur: number
  presetId: string
}

interface PlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors: {
    contentArea: string
    hotSpots: string[]
    ignoreElements: string[]
  }
}

interface AnalyticsData {
  score: number
  totalTextBlocks: number
  totalAnchors: number
  problemBlocks: number
  anchorsBreakdown: {
    headings: number
    emphasis: number
    code: number
    links: number
    images: number
    lists: number
  }
}

type MessageAction = 'toggle-scan' | 'get-state' | 'update-config' | 'analyze' | 'toggle-mode'

interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
  modeId?: string
  enabled?: boolean
}

interface Response {
  isScanning: boolean
  config?: ScanConfig
  analytics?: AnalyticsData
  activeModes?: string[]
}

const DEFAULT_CONFIG: ScanConfig = {
  opacity: 0.3,
  blur: 0.5,
  presetId: 'default',
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
 */
function analyzeScannability(): AnalyticsData {
  const mainContent = getContentArea()

  const headings = mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6').length
  const emphasis = mainContent.querySelectorAll('strong, b, mark').length
  const code = mainContent.querySelectorAll('code, pre, kbd').length
  const links = mainContent.querySelectorAll('a[href]').length
  const images = mainContent.querySelectorAll('img, svg, picture, video').length
  const lists = mainContent.querySelectorAll('ul, ol').length

  // Count platform-specific hot spots
  let platformHotSpots = 0
  for (const selector of currentPreset.selectors.hotSpots) {
    platformHotSpots += mainContent.querySelectorAll(selector).length
  }

  const totalAnchors = headings + emphasis + code + links + images + lists + platformHotSpots

  const paragraphs = mainContent.querySelectorAll('p')
  const totalTextBlocks = paragraphs.length

  // Count problem blocks (paragraphs > 5 lines without anchors)
  let problemBlocks = 0
  const lineHeight = 24
  const maxLinesWithoutAnchor = 5

  paragraphs.forEach((p) => {
    const hasAnchor = p.querySelector('strong, b, mark, code, a, img') !== null
    const estimatedLines = p.scrollHeight / lineHeight

    if (!hasAnchor && estimatedLines > maxLinesWithoutAnchor) {
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

  return {
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
  (message: Message, _sender, sendResponse: (response: Response) => void) => {
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
