/**
 * Mode Manager - Coordinates mode activation and handles conflicts
 */

import type { ModeRegistry } from './registry'
import type { ModeConfig, ModeContext, ModeError, ModeResult, ModesState } from './types'

/**
 * Creates a success result
 */
function success<T>(value: T): ModeResult<T> {
  return { success: true, value }
}

/**
 * Creates an error result
 */
function error(err: ModeError): ModeResult<never> {
  return { success: false, error: err }
}

/**
 * Manager for coordinating visualization modes
 */
export class ModeManager {
  private registry: ModeRegistry
  private activeModes: Set<string> = new Set()
  private context: ModeContext | null = null

  constructor(registry: ModeRegistry) {
    this.registry = registry
  }

  /**
   * Initializes the manager with a context
   */
  initialize(context: ModeContext): void {
    this.context = context
  }

  /**
   * Updates the context (e.g., when viewport changes)
   */
  updateContext(context: Partial<ModeContext>): void {
    if (this.context) {
      this.context = { ...this.context, ...context }
    }
  }

  /**
   * Gets the current context
   */
  getContext(): ModeContext | null {
    return this.context
  }

  /**
   * Activates a mode by id
   */
  activate(modeId: string): ModeResult<void> {
    if (!this.context) {
      return error({
        code: 'UNKNOWN',
        message: 'Manager not initialized. Call initialize() first.',
        modeId,
      })
    }

    const mode = this.registry.get(modeId)
    if (!mode) {
      return error({
        code: 'NOT_FOUND',
        message: `Mode "${modeId}" not found`,
        modeId,
      })
    }

    if (this.activeModes.has(modeId)) {
      return error({
        code: 'ALREADY_ACTIVE',
        message: `Mode "${modeId}" is already active`,
        modeId,
      })
    }

    // Check for incompatibilities
    const conflicts = this.getActiveConflicts(modeId)
    if (conflicts.length > 0) {
      return error({
        code: 'INCOMPATIBLE',
        message: `Mode "${modeId}" conflicts with: ${conflicts.join(', ')}`,
        modeId,
        conflictsWith: conflicts,
      })
    }

    try {
      mode.activate(this.context)
      this.activeModes.add(modeId)
      return success(undefined)
    } catch (err) {
      return error({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error activating mode',
        modeId,
      })
    }
  }

  /**
   * Deactivates a mode by id
   */
  deactivate(modeId: string): ModeResult<void> {
    const mode = this.registry.get(modeId)
    if (!mode) {
      return error({
        code: 'NOT_FOUND',
        message: `Mode "${modeId}" not found`,
        modeId,
      })
    }

    if (!this.activeModes.has(modeId)) {
      return error({
        code: 'NOT_ACTIVE',
        message: `Mode "${modeId}" is not active`,
        modeId,
      })
    }

    try {
      mode.deactivate()
      this.activeModes.delete(modeId)
      return success(undefined)
    } catch (err) {
      return error({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error deactivating mode',
        modeId,
      })
    }
  }

  /**
   * Toggles a mode on/off
   */
  toggle(modeId: string): ModeResult<boolean> {
    if (this.activeModes.has(modeId)) {
      const result = this.deactivate(modeId)
      if (!result.success) return result
      return success(false)
    } else {
      const result = this.activate(modeId)
      if (!result.success) return result
      return success(true)
    }
  }

  /**
   * Updates a mode's configuration
   */
  updateConfig(modeId: string, config: Partial<ModeConfig>): ModeResult<void> {
    const mode = this.registry.get(modeId)
    if (!mode) {
      return error({
        code: 'NOT_FOUND',
        message: `Mode "${modeId}" not found`,
        modeId,
      })
    }

    try {
      const currentConfig = mode.getConfig()
      mode.update({ ...currentConfig, ...config })
      return success(undefined)
    } catch (err) {
      return error({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error updating mode',
        modeId,
      })
    }
  }

  /**
   * Activates multiple modes (stops on first error)
   */
  activateMany(modeIds: string[]): ModeResult<void>[] {
    return modeIds.map((id) => this.activate(id))
  }

  /**
   * Deactivates all active modes
   */
  deactivateAll(): void {
    for (const modeId of this.activeModes) {
      const mode = this.registry.get(modeId)
      if (mode) {
        try {
          mode.deactivate()
        } catch {
          // Continue deactivating others even if one fails
        }
      }
    }
    this.activeModes.clear()
  }

  /**
   * Gets all active mode IDs
   */
  getActiveModes(): string[] {
    return Array.from(this.activeModes)
  }

  /**
   * Checks if a mode is active
   */
  isActive(modeId: string): boolean {
    return this.activeModes.has(modeId)
  }

  /**
   * Gets active modes that would conflict with a given mode
   */
  getActiveConflicts(modeId: string): string[] {
    const conflicts: string[] = []

    for (const activeId of this.activeModes) {
      if (!this.registry.areCompatible(modeId, activeId)) {
        conflicts.push(activeId)
      }
    }

    return conflicts
  }

  /**
   * Checks if a mode can be activated (no conflicts)
   */
  canActivate(modeId: string): boolean {
    if (!this.registry.has(modeId)) return false
    if (this.activeModes.has(modeId)) return false
    return this.getActiveConflicts(modeId).length === 0
  }

  /**
   * Restores modes state from storage
   */
  restoreState(state: ModesState): void {
    if (!this.context) return

    for (const [modeId, config] of Object.entries(state)) {
      const mode = this.registry.get(modeId)
      if (mode) {
        mode.update(config)
        if (config.enabled && !this.activeModes.has(modeId)) {
          this.activate(modeId)
        }
      }
    }
  }

  /**
   * Gets current modes state for storage
   */
  getState(): ModesState {
    const state: ModesState = {}

    for (const mode of this.registry.getAll()) {
      state[mode.id] = {
        ...mode.getConfig(),
        enabled: this.activeModes.has(mode.id),
      }
    }

    return state
  }

  /**
   * Destroys the manager and deactivates all modes
   */
  destroy(): void {
    this.deactivateAll()
    this.context = null
  }
}

/**
 * Creates a new ModeManager instance
 */
export function createModeManager(registry: ModeRegistry): ModeManager {
  return new ModeManager(registry)
}
