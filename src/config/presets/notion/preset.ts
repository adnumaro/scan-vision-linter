/**
 * Notion preset configuration
 */

import { t } from '../../../utils/i18n'
import type { PlatformSelectors, PlatformStyles } from '../../types'

export const NOTION_ID = 'notion'

export const NOTION_NAME = (): string => t('presetNotionName')

export const NOTION_DESCRIPTION = (): string => t('presetNotionDesc')

export const NOTION_DOMAINS: string[] = ['notion.so', 'notion.site']

export const NOTION_SELECTORS: PlatformSelectors = {
  contentArea: '.notion-page-content',
  textBlocks:
    '[class*="notion-text-block"], [class*="notion-bulleted_list"], [class*="notion-numbered_list"]',
  codeBlocks: '[class*="notion-code-block"]',
  codeElements: [
    // Notion code blocks
    '[class*="notion-code"]',
  ],
  hotSpots: [
    '[class*="notion-header"]',
    '[class*="notion-callout"]',
    '[class*="notion-quote"]',
    '[class*="notion-code"]',
    '[class*="notion-toggle"]',
    '[class*="notion-bookmark"]',
    '.notion-emoji',
    '.notion-page-block',
  ],
  ignoreElements: [],
}

export const NOTION_STYLES: PlatformStyles = {
  navigationSelectors: [
    '.notion-sidebar-container',
    '.notion-sidebar',
    '.notion-topbar',
    '.notion-cursor-listener > div:first-child',
  ],
  additionalCSS: `
/* Notion page title - outside contentArea */
.notion-page-block > h1 {
  outline: 2px solid rgba(37, 99, 235, 0.5);
  outline-offset: 2px;
}`,
}
