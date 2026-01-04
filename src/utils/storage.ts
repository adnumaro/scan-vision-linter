import type { ScanConfig } from '../types/messages'
import { DEFAULT_CONFIG } from '../types/messages'

const STORAGE_KEY = 'scanvision-config'

export async function getConfig(): Promise<ScanConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const stored = result[STORAGE_KEY] as ScanConfig | undefined
    return stored ?? DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: ScanConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config })
}

export async function resetConfig(): Promise<ScanConfig> {
  await chrome.storage.local.remove(STORAGE_KEY)
  return DEFAULT_CONFIG
}
