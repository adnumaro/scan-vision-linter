import type { AnalyticsData, ScanConfig } from '../types/messages'
import { DEFAULT_CONFIG } from '../types/messages'

const STORAGE_KEY = 'scanvision-config'
const ANALYTICS_KEY = 'scanvision-analytics'
const LOG_PREFIX = '[ScanVision]'

type AnalyticsStore = Record<string, AnalyticsData>

/**
 * Normalizes a URL to use as a storage key
 * Removes hash and query params for consistency
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

export async function getConfig(): Promise<ScanConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const stored = result[STORAGE_KEY] as ScanConfig | undefined
    return stored ?? DEFAULT_CONFIG
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to load config from storage:`, error)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: ScanConfig): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: config })
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save config:`, error)
  }
}

export async function resetConfig(): Promise<ScanConfig> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY)
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to reset config:`, error)
  }
  return DEFAULT_CONFIG
}

export async function getAnalytics(url: string): Promise<AnalyticsData | null> {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    const store = (result[ANALYTICS_KEY] as AnalyticsStore) ?? {}
    const key = normalizeUrl(url)
    return store[key] ?? null
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to load analytics from storage:`, error)
    return null
  }
}

export async function saveAnalytics(url: string, analytics: AnalyticsData | null): Promise<void> {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    const store = (result[ANALYTICS_KEY] as AnalyticsStore) ?? {}
    const key = normalizeUrl(url)

    if (analytics) {
      store[key] = analytics
    } else {
      delete store[key]
    }

    await chrome.storage.local.set({ [ANALYTICS_KEY]: store })
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save analytics:`, error)
  }
}

export async function clearAnalytics(url: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    const store = (result[ANALYTICS_KEY] as AnalyticsStore) ?? {}
    const key = normalizeUrl(url)

    delete store[key]
    await chrome.storage.local.set({ [ANALYTICS_KEY]: store })
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to clear analytics:`, error)
  }
}
