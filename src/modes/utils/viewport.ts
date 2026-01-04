/**
 * Viewport utilities for positioning and fold line calculations
 */

import type { ViewportInfo } from '../types'

/**
 * Simple debounce function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Gets current viewport information
 */
export function getViewportInfo(): ViewportInfo {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollY: window.scrollY,
    foldLine: window.innerHeight,
  }
}

/**
 * Gets the fold line position (viewport height from top of document)
 */
export function getFoldLinePosition(): number {
  return window.innerHeight
}

/**
 * Gets the visible viewport bounds in document coordinates
 */
export function getVisibleBounds(): DOMRect {
  return new DOMRect(window.scrollX, window.scrollY, window.innerWidth, window.innerHeight)
}

/**
 * Checks if an element is above the fold
 */
export function isAboveTheFold(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return rect.bottom <= window.innerHeight
}

/**
 * Checks if an element is in the viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  )
}

/**
 * Options for viewport change subscription
 */
export interface ViewportChangeOptions {
  /** Debounce delay in ms (default: 16ms for ~60fps) */
  debounceMs?: number
  /** Whether to call immediately on subscribe (default: false) */
  immediate?: boolean
}

/**
 * Subscribes to viewport changes (resize and scroll) with debouncing
 * Returns a cleanup function
 */
export function onViewportChange(
  callback: () => void,
  options: ViewportChangeOptions = {},
): () => void {
  const { debounceMs = 16, immediate = false } = options

  const debouncedCallback = debounceMs > 0 ? debounce(callback, debounceMs) : callback

  const handleResize = () => debouncedCallback()
  const handleScroll = () => debouncedCallback()

  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })

  if (immediate) {
    callback()
  }

  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleScroll)
  }
}

/**
 * Subscribes only to resize events
 * Returns a cleanup function
 */
export function onResize(callback: () => void): () => void {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

/**
 * Subscribes only to scroll events
 * Returns a cleanup function
 */
export function onScroll(callback: () => void): () => void {
  window.addEventListener('scroll', callback, { passive: true })
  return () => window.removeEventListener('scroll', callback)
}

/**
 * Gets the percentage of the page that is above the fold
 */
export function getAboveFoldPercentage(): number {
  const docHeight = document.documentElement.scrollHeight
  if (docHeight === 0) return 100

  return Math.min(100, (window.innerHeight / docHeight) * 100)
}

/**
 * Gets the current scroll percentage
 */
export function getScrollPercentage(): number {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  if (docHeight <= 0) return 0

  return Math.min(100, (window.scrollY / docHeight) * 100)
}
