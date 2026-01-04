/**
 * Tests for content script helper functions
 * Tests the validation and cleanup logic used in the content script
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModeConfig } from '../src/modes'
import { ModeRegistry } from '../src/modes'
import { cloneModeConfig } from '../src/modes/utils/config'

describe('cloneModeConfig', () => {
  it('creates a new object reference', () => {
    const original: ModeConfig = { enabled: true, settings: { opacity: 0.5 } }
    const cloned = cloneModeConfig(original)

    expect(cloned).not.toBe(original)
  })

  it('creates a deep copy of settings', () => {
    const original: ModeConfig = {
      enabled: true,
      settings: { opacity: 0.5, nested: { value: 1 } },
    }
    const cloned = cloneModeConfig(original)

    expect(cloned.settings).not.toBe(original.settings)
    expect((cloned.settings as Record<string, unknown>).nested).not.toBe(
      (original.settings as Record<string, unknown>).nested,
    )
  })

  it('preserves all values', () => {
    const original: ModeConfig = {
      enabled: true,
      settings: { opacity: 0.5, color: '#ff0000', showLabels: true },
    }
    const cloned = cloneModeConfig(original)

    expect(cloned.enabled).toBe(original.enabled)
    expect(cloned.settings).toEqual(original.settings)
  })

  it('mutations on clone do not affect original', () => {
    const original: ModeConfig = {
      enabled: true,
      settings: { opacity: 0.5 },
    }
    const cloned = cloneModeConfig(original)

    cloned.enabled = false
    ;(cloned.settings as Record<string, number>).opacity = 0.9

    expect(original.enabled).toBe(true)
    expect((original.settings as Record<string, number>).opacity).toBe(0.5)
  })
})

describe('validateModeId logic', () => {
  let registry: ModeRegistry

  beforeEach(() => {
    registry = new ModeRegistry()
    // Register some test modes
    registry.register({
      id: 'scan',
      name: 'Scan',
      description: 'Test',
      icon: {} as never,
      category: 'simulation',
      incompatibleWith: [],
      activate: vi.fn(),
      deactivate: vi.fn(),
      update: vi.fn(),
      isActive: () => false,
      getDefaultConfig: () => ({ enabled: false, settings: {} }),
      getConfig: () => ({ enabled: false, settings: {} }),
    })
    registry.register({
      id: 'f-pattern',
      name: 'F-Pattern',
      description: 'Test',
      icon: {} as never,
      category: 'overlay',
      incompatibleWith: ['e-pattern'],
      activate: vi.fn(),
      deactivate: vi.fn(),
      update: vi.fn(),
      isActive: () => false,
      getDefaultConfig: () => ({ enabled: false, settings: {} }),
      getConfig: () => ({ enabled: false, settings: {} }),
    })
  })

  // Helper function that mirrors the validateModeId function in content/index.ts
  function validateModeId(modeId: unknown): string | null {
    if (typeof modeId !== 'string' || !modeId.trim()) {
      return null
    }
    const trimmedId = modeId.trim()
    return registry.has(trimmedId) ? trimmedId : null
  }

  it('returns null for undefined', () => {
    expect(validateModeId(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(validateModeId(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(validateModeId('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(validateModeId('   ')).toBeNull()
  })

  it('returns null for non-string values', () => {
    expect(validateModeId(123)).toBeNull()
    expect(validateModeId({})).toBeNull()
    expect(validateModeId([])).toBeNull()
    expect(validateModeId(true)).toBeNull()
  })

  it('returns null for unregistered mode id', () => {
    expect(validateModeId('non-existent-mode')).toBeNull()
  })

  it('returns the modeId for registered modes', () => {
    expect(validateModeId('scan')).toBe('scan')
    expect(validateModeId('f-pattern')).toBe('f-pattern')
  })

  it('trims whitespace from valid mode ids', () => {
    expect(validateModeId('  scan  ')).toBe('scan')
    expect(validateModeId('\tf-pattern\n')).toBe('f-pattern')
  })

  it('returns null for similar but incorrect mode ids', () => {
    expect(validateModeId('Scan')).toBeNull() // Case sensitive
    expect(validateModeId('scan-mode')).toBeNull() // Different id
    expect(validateModeId('f_pattern')).toBeNull() // Underscore instead of hyphen
  })
})

describe('analytics cache invalidation', () => {
  interface AnalyticsCache {
    data: unknown
    timestamp: number
    contentHash: string
  }

  let analyticsCache: AnalyticsCache

  function invalidateCache(): void {
    analyticsCache = { data: null, timestamp: 0, contentHash: '' }
  }

  beforeEach(() => {
    analyticsCache = {
      data: { score: 75, totalAnchors: 10 },
      timestamp: Date.now(),
      contentHash: 'abc123',
    }
  })

  it('clears all cache fields on invalidation', () => {
    invalidateCache()

    expect(analyticsCache.data).toBeNull()
    expect(analyticsCache.timestamp).toBe(0)
    expect(analyticsCache.contentHash).toBe('')
  })

  it('can be called multiple times safely', () => {
    invalidateCache()
    invalidateCache()
    invalidateCache()

    expect(analyticsCache.data).toBeNull()
  })
})
