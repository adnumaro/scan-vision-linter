/**
 * Unified overlay tracking system
 *
 * Provides scroll/resize tracking for overlays that follow DOM elements.
 * Uses capture:true to catch scroll events on internal scrollable elements
 * (like Notion, Confluence containers).
 */

import { Z_INDEX } from './constants'

/**
 * Offset configuration for overlay positioning
 */
interface OverlayOffset {
  top?: number
  left?: number
  right?: number
  bottom?: number
  /** Extra width added to both sides */
  width?: number
  /** Extra height added to top and bottom */
  height?: number
}

/**
 * Tracked overlay entry
 */
export interface TrackedOverlay {
  element: Element
  overlay: HTMLElement
  offset: OverlayOffset
  /** Optional metadata for filtering */
  type?: string
  category?: string
}

/**
 * Overlay tracker instance state
 */
interface TrackerState {
  overlays: TrackedOverlay[]
  scrollHandler: (() => void) | null
  resizeHandler: (() => void) | null
  rafId: number | null
}

/**
 * Creates a new overlay tracker instance
 * Each mode should create its own instance to avoid conflicts
 */
export function createOverlayTracker() {
  const state: TrackerState = {
    overlays: [],
    scrollHandler: null,
    resizeHandler: null,
    rafId: null,
  }

  /**
   * Updates all overlay positions based on current element positions
   */
  function updatePositions(): void {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId)
    }

    state.rafId = requestAnimationFrame(() => {
      for (const tracked of state.overlays) {
        const rect = tracked.element.getBoundingClientRect()
        const { offset } = tracked

        const top = rect.top + (offset.top ?? 0)
        const left = rect.left + (offset.left ?? 0)
        const width = rect.width + (offset.width ?? 0)
        const height = rect.height + (offset.height ?? 0)

        tracked.overlay.style.top = `${top}px`
        tracked.overlay.style.left = `${left}px`
        tracked.overlay.style.width = `${width}px`
        tracked.overlay.style.height = `${height}px`
      }
      state.rafId = null
    })
  }

  /**
   * Sets up scroll and resize listeners
   * Uses capture:true to catch scroll on internal elements (Notion, Confluence, etc.)
   */
  function setupListeners(): void {
    if (state.scrollHandler) return // Already set up

    state.scrollHandler = () => updatePositions()
    state.resizeHandler = () => updatePositions()

    // capture:true catches scroll events on internal scrollable elements
    window.addEventListener('scroll', state.scrollHandler, true)
    window.addEventListener('resize', state.resizeHandler)
  }

  /**
   * Removes scroll and resize listeners
   */
  function removeListeners(): void {
    if (state.scrollHandler) {
      window.removeEventListener('scroll', state.scrollHandler, true)
      state.scrollHandler = null
    }
    if (state.resizeHandler) {
      window.removeEventListener('resize', state.resizeHandler)
      state.resizeHandler = null
    }
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId)
      state.rafId = null
    }
  }

  /**
   * Adds an overlay to track
   */
  function track(entry: TrackedOverlay): void {
    // Set z-index if not already set
    if (!entry.overlay.style.zIndex) {
      entry.overlay.style.zIndex = String(Z_INDEX.OVERLAY)
    }

    // Add to DOM if not already present
    if (!entry.overlay.parentElement) {
      document.body.appendChild(entry.overlay)
    }

    state.overlays.push(entry)

    // Setup listeners on first track
    if (state.overlays.length === 1) {
      setupListeners()
    }
  }

  /**
   * Adds multiple overlays to track
   */
  function trackAll(entries: TrackedOverlay[]): void {
    for (const entry of entries) {
      track(entry)
    }
  }

  /**
   * Removes a specific overlay by element
   */
  function untrack(element: Element): void {
    const index = state.overlays.findIndex((t) => t.element === element)
    if (index !== -1) {
      state.overlays[index].overlay.remove()
      state.overlays.splice(index, 1)
    }

    // Remove listeners if no more overlays
    if (state.overlays.length === 0) {
      removeListeners()
    }
  }

  /**
   * Removes all overlays and cleans up
   */
  function clear(): void {
    removeListeners()

    for (const tracked of state.overlays) {
      tracked.overlay.remove()
    }
    state.overlays = []
  }

  /**
   * Gets all tracked overlays
   */
  function getAll(): TrackedOverlay[] {
    return [...state.overlays]
  }

  /**
   * Gets overlays by type
   */
  function getByType(type: string): TrackedOverlay[] {
    return state.overlays.filter((t) => t.type === type)
  }

  /**
   * Checks if an element is already tracked
   */
  function isTracked(element: Element, category?: string): boolean {
    return state.overlays.some(
      (t) => t.element === element && (category === undefined || t.category === category),
    )
  }

  /**
   * Forces an immediate position update
   */
  function forceUpdate(): void {
    updatePositions()
  }

  return {
    track,
    trackAll,
    untrack,
    clear,
    getAll,
    getByType,
    isTracked,
    forceUpdate,
  }
}

/**
 * Type for the overlay tracker instance
 */
export type OverlayTracker = ReturnType<typeof createOverlayTracker>
