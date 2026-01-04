import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createModeManager, ModeManager } from '../src/modes/manager'
import { ModeRegistry } from '../src/modes/registry'
import type { ModeCategory, ModeConfig, ModeContext, VisualizationMode } from '../src/modes/types'

// Mock mode factory
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
    activate: vi.fn(() => {
      active = true
    }),
    deactivate: vi.fn(() => {
      active = false
    }),
    update: vi.fn((newConfig: ModeConfig) => {
      config = newConfig
    }),
    isActive: () => active,
    getDefaultConfig: () => ({ enabled: false, settings: {} }),
    getConfig: () => config,
  }
}

// Mock context
const mockContext: ModeContext = {
  contentArea: document.createElement('div'),
  viewport: { width: 1920, height: 1080, scrollY: 0, foldLine: 1080 },
  preset: {
    id: 'test',
    name: 'Test',
    description: 'Test preset',
    domains: [],
    selectors: { contentArea: 'body', hotSpots: [], ignoreElements: [] },
  },
}

describe('ModeManager', () => {
  let registry: ModeRegistry
  let manager: ModeManager

  beforeEach(() => {
    registry = new ModeRegistry()
    manager = createModeManager(registry)
  })

  describe('initialize', () => {
    it('sets the context', () => {
      manager.initialize(mockContext)
      expect(manager.getContext()).toEqual(mockContext)
    })
  })

  describe('activate', () => {
    it('fails when manager not initialized', () => {
      registry.register(createMockMode('test-mode'))
      const result = manager.activate('test-mode')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN')
      }
    })

    it('fails for non-existent mode', () => {
      manager.initialize(mockContext)
      const result = manager.activate('non-existent')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('activates a registered mode', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)
      manager.initialize(mockContext)

      const result = manager.activate('test-mode')
      expect(result.success).toBe(true)
      expect(mode.activate).toHaveBeenCalledWith(mockContext)
      expect(manager.isActive('test-mode')).toBe(true)
    })

    it('fails when mode is already active', () => {
      registry.register(createMockMode('test-mode'))
      manager.initialize(mockContext)
      manager.activate('test-mode')

      const result = manager.activate('test-mode')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_ACTIVE')
      }
    })

    it('fails when incompatible mode is active', () => {
      registry.register(createMockMode('mode-a', { incompatibleWith: ['mode-b'] }))
      registry.register(createMockMode('mode-b'))
      manager.initialize(mockContext)
      manager.activate('mode-a')

      const result = manager.activate('mode-b')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INCOMPATIBLE')
        expect(result.error.conflictsWith).toContain('mode-a')
      }
    })
  })

  describe('deactivate', () => {
    it('fails for non-existent mode', () => {
      const result = manager.deactivate('non-existent')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('fails when mode is not active', () => {
      registry.register(createMockMode('test-mode'))
      const result = manager.deactivate('test-mode')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_ACTIVE')
      }
    })

    it('deactivates an active mode', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)
      manager.initialize(mockContext)
      manager.activate('test-mode')

      const result = manager.deactivate('test-mode')
      expect(result.success).toBe(true)
      expect(mode.deactivate).toHaveBeenCalled()
      expect(manager.isActive('test-mode')).toBe(false)
    })
  })

  describe('toggle', () => {
    it('activates inactive mode', () => {
      registry.register(createMockMode('test-mode'))
      manager.initialize(mockContext)

      const result = manager.toggle('test-mode')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe(true)
      }
      expect(manager.isActive('test-mode')).toBe(true)
    })

    it('deactivates active mode', () => {
      registry.register(createMockMode('test-mode'))
      manager.initialize(mockContext)
      manager.activate('test-mode')

      const result = manager.toggle('test-mode')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe(false)
      }
      expect(manager.isActive('test-mode')).toBe(false)
    })
  })

  describe('updateConfig', () => {
    it('fails for non-existent mode', () => {
      const result = manager.updateConfig('non-existent', { enabled: true, settings: {} })
      expect(result.success).toBe(false)
    })

    it('updates mode config', () => {
      const mode = createMockMode('test-mode')
      registry.register(mode)

      const newConfig = { enabled: true, settings: { opacity: 0.5 } }
      const result = manager.updateConfig('test-mode', newConfig)
      expect(result.success).toBe(true)
      expect(mode.update).toHaveBeenCalled()
    })
  })

  describe('deactivateAll', () => {
    it('deactivates all active modes', () => {
      const mode1 = createMockMode('mode-1')
      const mode2 = createMockMode('mode-2')
      registry.register(mode1)
      registry.register(mode2)
      manager.initialize(mockContext)
      manager.activate('mode-1')
      manager.activate('mode-2')

      manager.deactivateAll()
      expect(manager.getActiveModes()).toEqual([])
    })
  })

  describe('getActiveModes', () => {
    it('returns list of active mode ids', () => {
      registry.register(createMockMode('mode-1'))
      registry.register(createMockMode('mode-2'))
      registry.register(createMockMode('mode-3'))
      manager.initialize(mockContext)
      manager.activate('mode-1')
      manager.activate('mode-3')

      const active = manager.getActiveModes()
      expect(active).toContain('mode-1')
      expect(active).toContain('mode-3')
      expect(active).not.toContain('mode-2')
    })
  })

  describe('canActivate', () => {
    it('returns false for non-existent mode', () => {
      expect(manager.canActivate('non-existent')).toBe(false)
    })

    it('returns false for already active mode', () => {
      registry.register(createMockMode('test-mode'))
      manager.initialize(mockContext)
      manager.activate('test-mode')
      expect(manager.canActivate('test-mode')).toBe(false)
    })

    it('returns false when incompatible mode is active', () => {
      registry.register(createMockMode('mode-a', { incompatibleWith: ['mode-b'] }))
      registry.register(createMockMode('mode-b'))
      manager.initialize(mockContext)
      manager.activate('mode-a')
      expect(manager.canActivate('mode-b')).toBe(false)
    })

    it('returns true for compatible inactive mode', () => {
      registry.register(createMockMode('mode-a'))
      registry.register(createMockMode('mode-b'))
      manager.initialize(mockContext)
      manager.activate('mode-a')
      expect(manager.canActivate('mode-b')).toBe(true)
    })
  })

  describe('destroy', () => {
    it('deactivates all modes and clears context', () => {
      registry.register(createMockMode('test-mode'))
      manager.initialize(mockContext)
      manager.activate('test-mode')

      manager.destroy()
      expect(manager.getActiveModes()).toEqual([])
      expect(manager.getContext()).toBeNull()
    })
  })
})
