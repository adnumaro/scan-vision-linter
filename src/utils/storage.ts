import type { AnalyticsData, ScanConfig } from '../types/messages'
import { DEFAULT_CONFIG } from '../types/messages'

const STORAGE_KEY = 'scanvision-config'
const ANALYTICS_KEY = 'scanvision-analytics'
const LOG_PREFIX = '[ScanVision]'

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

export async function getAnalytics(): Promise<AnalyticsData | null> {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    const stored = result[ANALYTICS_KEY] as AnalyticsData | undefined
    return stored ?? null
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to load analytics from storage:`, error)
    return null
  }
}

export async function saveAnalytics(analytics: AnalyticsData | null): Promise<void> {
  try {
    if (analytics) {
      await chrome.storage.local.set({ [ANALYTICS_KEY]: analytics })
    } else {
      await chrome.storage.local.remove(ANALYTICS_KEY)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save analytics:`, error)
  }
}

export async function clearAnalytics(): Promise<void> {
  try {
    await chrome.storage.local.remove(ANALYTICS_KEY)
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to clear analytics:`, error)
  }
}
