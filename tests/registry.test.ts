import { beforeEach, describe, expect, it } from 'vitest'
import { ModeRegistry } from '../src/modes/registry'
import type { ModeCategory, ModeConfig, ModeContext, VisualizationMode } from '../src/modes/types'

// Mock mode for testing
function createMockMode(
  id: string,
  options: { category?: ModeCategory; incompatibleWith?: string[] } = {},
): VisualizationMode {
  const { category = 'overlay', incompatibleWith = [] } = options
  let active = false
  let config: ModeConfig = { enabled: false, settings: {} }

  return {
    id,
    name: `Mock ${id}`,
    description: `Mock mode ${id}`,
    icon: {} as VisualizationMode['icon'],
    category,
    incompatibleWith,
    activate: () => {
      active = true
    },
    deactivate: () => {
      active = false
    },
    update: (newConfig: ModeConfig) => {
      config = newConfig
    },
    isActive: () => active,
    getDefaultConfig: () => ({ enabled: false, settings: {} }),
    getConfig: () => config,
  }
}

describe('ModeRegistry', () => {
  let registry: ModeRegistry

  beforeEach(() => {
    registry = new ModeRegistry()
  })

  describe('register', () => {
    it('registers a mode successfully', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)
      expect(registry.has('test-mode')).toBe(true)
    })

    it('overwrites existing mode with same id', () => {
      const mode1 = createMockMode('test-mode')
      const mode2 = createMockMode('test-mode')
      registry.register(mode1)
      registry.register(mode2)
      expect(registry.get('test-mode')).toBe(mode2)
    })
  })

  describe('unregister', () => {
    it('removes a registered mode', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)
      const result = registry.unregister('test-mode')
      expect(result).toBe(true)
      expect(registry.has('test-mode')).toBe(false)
    })

    it('returns false for non-existent mode', () => {
      const result = registry.unregister('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('get', () => {
    it('returns mode by id', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)
      expect(registry.get('test-mode')).toBe(mode)
    })

    it('returns undefined for non-existent mode', () => {
      expect(registry.get('non-existent')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true for registered mode', () => {
      registry.register(createMockMode('test-mode'))
      expect(registry.has('test-mode')).toBe(true)
    })

    it('returns false for non-existent mode', () => {
      expect(registry.has('non-existent')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('returns all registered modes', () => {
      registry.register(createMockMode('mode-1'))
      registry.register(createMockMode('mode-2'))
      registry.register(createMockMode('mode-3'))
      expect(registry.getAll()).toHaveLength(3)
    })

    it('returns empty array when no modes registered', () => {
      expect(registry.getAll()).toEqual([])
    })
  })

  describe('getByCategory', () => {
    it('returns modes filtered by category', () => {
      registry.register(createMockMode('overlay-1', { category: 'overlay' }))
      registry.register(createMockMode('overlay-2', { category: 'overlay' }))
      registry.register(createMockMode('simulation-1', { category: 'simulation' }))

      const overlays = registry.getByCategory('overlay')
      expect(overlays).toHaveLength(2)
      expect(overlays.every((m) => m.category === 'overlay')).toBe(true)
    })
  })

  describe('areCompatible', () => {
    it('returns true for same mode id', () => {
      registry.register(createMockMode('mode-a'))
      expect(registry.areCompatible('mode-a', 'mode-a')).toBe(true)
    })

    it('returns true for compatible modes', () => {
      registry.register(createMockMode('mode-a'))
      registry.register(createMockMode('mode-b'))
      expect(registry.areCompatible('mode-a', 'mode-b')).toBe(true)
    })

    it('returns false when first mode lists second as incompatible', () => {
      registry.register(createMockMode('mode-a', { incompatibleWith: ['mode-b'] }))
      registry.register(createMockMode('mode-b'))
      expect(registry.areCompatible('mode-a', 'mode-b')).toBe(false)
    })

    it('returns false when second mode lists first as incompatible', () => {
      registry.register(createMockMode('mode-a'))
      registry.register(createMockMode('mode-b', { incompatibleWith: ['mode-a'] }))
      expect(registry.areCompatible('mode-a', 'mode-b')).toBe(false)
    })

    it('returns true for non-existent modes', () => {
      expect(registry.areCompatible('non-existent-a', 'non-existent-b')).toBe(true)
    })
  })

  describe('getIncompatibleModes', () => {
    it('returns all incompatible modes', () => {
      registry.register(createMockMode('mode-a', { incompatibleWith: ['mode-b', 'mode-c'] }))
      registry.register(createMockMode('mode-b'))
      registry.register(createMockMode('mode-c'))
      registry.register(createMockMode('mode-d', { incompatibleWith: ['mode-a'] }))

      const incompatible = registry.getIncompatibleModes('mode-a')
      expect(incompatible).toContain('mode-b')
      expect(incompatible).toContain('mode-c')
      expect(incompatible).toContain('mode-d')
    })

    it('returns empty array for non-existent mode', () => {
      expect(registry.getIncompatibleModes('non-existent')).toEqual([])
    })
  })

  describe('clear', () => {
    it('removes all registered modes', () => {
      registry.register(createMockMode('mode-1'))
      registry.register(createMockMode('mode-2'))
      registry.clear()
      expect(registry.size).toBe(0)
    })
  })

  describe('size', () => {
    it('returns correct count of registered modes', () => {
      expect(registry.size).toBe(0)
      registry.register(createMockMode('mode-1'))
      expect(registry.size).toBe(1)
      registry.register(createMockMode('mode-2'))
      expect(registry.size).toBe(2)
    })
  })
})
