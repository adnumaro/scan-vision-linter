/**
 * Global preset configuration
 * Used as base for all platforms and as fallback for unknown domains
 */

import { t } from '../../../utils/i18n'
import type { GlobalSelectors, PlatformStyles } from '../../types'

export const GLOBAL_ID = 'global'

export const GLOBAL_NAME = (): string => t('presetDefaultName')

export const GLOBAL_DESCRIPTION = (): string => t('presetDefaultDesc')

export const GLOBAL_DOMAINS: string[] = []

export const GLOBAL_SELECTORS: GlobalSelectors = {
  content: 'main, article, [role="main"], .content, #content, body',
  textBlocks: 'p',
  htmlAnchors: {
    headings: 'h1, h2, h3, h4, h5, h6',
    emphasis: 'strong, b, mark',
    codeBlocks: 'pre',
    inlineCode: 'code, kbd',
    links: 'a[href]',
    images: 'img, picture, video, svg',
    lists: 'ul, ol',
  },
  platformAnchors: {},
  ignore: [],
}

export const GLOBAL_STYLES: PlatformStyles | undefined = undefined
