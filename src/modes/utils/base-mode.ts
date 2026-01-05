/**
 * Base class for visualization modes that track viewport changes
 *
 * Provides common functionality:
 * - Viewport change tracking (scroll/resize)
 * - Content area reference management
 * - Config update pattern
 * - Memory leak prevention
 */

import type { LucideIcon } from 'lucide-react'
import type { ModeConfig, ModeContext, VisualizationMode } from '../types'
import { cloneModeConfig } from './config'
import { onViewportChange } from './viewport'

/**
 * Base class for modes that need to track viewport changes
 * Subclasses must implement createOverlay() and updateOverlay()
 */
export abstract class ViewportTrackingMode<TConfig extends ModeConfig>
  implements VisualizationMode
{
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly icon: LucideIcon
  abstract readonly category: 'overlay' | 'indicator' | 'simulation'
  abstract readonly incompatibleWith: string[]

  protected active = false
  protected config: TConfig
  protected cleanup: (() => void) | null = null
  protected contentArea: Element | null = null
  protected readonly defaultConfig: TConfig

  constructor(defaultConfig: TConfig) {
    this.defaultConfig = defaultConfig
    this.config = defaultConfig
  }

  /**
   * Activates the mode with the given context
   * Subclasses should NOT override this - implement createOverlay() instead
   */
  activate(context: ModeContext): void {
    if (this.active) return

    // Clean up previous listener to prevent memory leak
    this.cleanup?.()

    this.contentArea = context.contentArea
    this.createOverlay()

    // Update on resize and scroll
    this.cleanup = onViewportChange(() => {
      this.updateOverlay()
    })

    this.active = true
  }

  /**
   * Deactivates the mode and cleans up resources
   * Subclasses can override but should call super.deactivate()
   */
  deactivate(): void {
    if (!this.active) return

    this.removeOverlay()
    this.cleanup?.()
    this.cleanup = null
    this.contentArea = null
    this.active = false
  }

  /**
   * Updates the mode configuration
   * Subclasses can override to add custom update logic
   */
  update(config: ModeConfig): void {
    this.config = {
      ...this.config,
      ...config,
      settings: {
        ...this.config.settings,
        ...(config.settings as TConfig['settings']),
      },
    }

    if (this.active) {
      this.updateOverlay()
    }
  }

  isActive(): boolean {
    return this.active
  }

  getDefaultConfig(): ModeConfig {
    return this.defaultConfig
  }

  getConfig(): ModeConfig {
    return cloneModeConfig(this.config)
  }

  /**
   * Creates the overlay element(s)
   * Called once when mode is activated
   */
  protected abstract createOverlay(): void

  /**
   * Updates the overlay position and content
   * Called on every viewport change (scroll/resize)
   */
  protected abstract updateOverlay(): void

  /**
   * Removes the overlay element(s) from DOM
   * Called when mode is deactivated
   */
  protected abstract removeOverlay(): void
}
