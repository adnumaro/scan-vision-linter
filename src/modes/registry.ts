/**
 * Mode Registry - Central registry for all visualization modes
 */

import type { ModeCategory, VisualizationMode } from './types'

/**
 * Registry for managing visualization modes
 */
class ModeRegistry {
  private modes: Map<string, VisualizationMode> = new Map()

  /**
   * Registers a new mode
   */
  register(mode: VisualizationMode): void {
    if (this.modes.has(mode.id)) {
      console.warn(`Mode "${mode.id}" is already registered. Overwriting.`)
    }
    this.modes.set(mode.id, mode)
  }

  /**
   * Unregisters a mode by id
   */
  unregister(id: string): boolean {
    return this.modes.delete(id)
  }

  /**
   * Gets a mode by id
   */
  get(id: string): VisualizationMode | undefined {
    return this.modes.get(id)
  }

  /**
   * Checks if a mode exists
   */
  has(id: string): boolean {
    return this.modes.has(id)
  }

  /**
   * Gets all registered modes
   */
  getAll(): VisualizationMode[] {
    return Array.from(this.modes.values())
  }

  /**
   * Gets all mode IDs
   */
  getAllIds(): string[] {
    return Array.from(this.modes.keys())
  }

  /**
   * Gets modes by category
   */
  getByCategory(category: ModeCategory): VisualizationMode[] {
    return this.getAll().filter((mode) => mode.category === category)
  }

  /**
   * Checks if two modes are compatible (can run together)
   */
  areCompatible(idA: string, idB: string): boolean {
    if (idA === idB) return true

    const modeA = this.modes.get(idA)
    const modeB = this.modes.get(idB)

    if (!modeA || !modeB) return true

    // Check if either mode lists the other as incompatible
    const aIncompatible = modeA.incompatibleWith.includes(idB)
    const bIncompatible = modeB.incompatibleWith.includes(idA)

    return !aIncompatible && !bIncompatible
  }

  /**
   * Gets all modes that are incompatible with a given mode
   */
  getIncompatibleModes(id: string): string[] {
    const mode = this.modes.get(id)
    if (!mode) return []

    const incompatible = new Set<string>(mode.incompatibleWith)

    // Also check for modes that list this mode as incompatible
    for (const [otherId, otherMode] of this.modes) {
      if (otherId !== id && otherMode.incompatibleWith.includes(id)) {
        incompatible.add(otherId)
      }
    }

    return Array.from(incompatible)
  }

  /**
   * Clears all registered modes
   */
  clear(): void {
    this.modes.clear()
  }

  /**
   * Gets the number of registered modes
   */
  get size(): number {
    return this.modes.size
  }
}

// Singleton instance
export const registry = new ModeRegistry()

// Export the class for testing
export { ModeRegistry }
