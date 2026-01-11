/**
 * Vitest setup file
 * Mocks Chrome extension APIs for testing
 */

import { vi } from 'vitest'

// Mock chrome.i18n API
const chromeMock = {
  i18n: {
    getMessage: vi.fn((key: string) => key),
    getUILanguage: vi.fn(() => 'en'),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
}

// Assign to global
;(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock
