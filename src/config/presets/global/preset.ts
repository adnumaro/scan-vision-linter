/**
 * Global preset configuration
 * Used as base for all platforms and as fallback for unknown domains
 */

import { t } from '../../../utils/i18n'
import type { PlatformSelectors, PlatformStyles } from '../../types'

export const GLOBAL_ID = 'global'

export const GLOBAL_NAME = (): string => t('presetDefaultName')

export const GLOBAL_DESCRIPTION = (): string => t('presetDefaultDesc')

export const GLOBAL_DOMAINS: string[] = []

export const GLOBAL_SELECTORS: PlatformSelectors = {
  contentArea: 'main, article, [role="main"], .content, #content, body',
  textBlocks: 'p',
  codeBlocks: 'pre',
  codeElements: [
    // Standard HTML code elements
    'pre',
    'code',
    'kbd',
    'samp',
    // Common code highlighting classes
    '.highlight',
    '.code-block',
    '[data-language]',
  ],
  hotSpots: [],
  ignoreElements: [],
}

export const GLOBAL_STYLES: PlatformStyles | undefined = undefined
