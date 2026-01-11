/**
 * Notion preset configuration
 */

import { t } from '../../../utils/i18n'
import type { NotionSelectors, PlatformStyles } from '../../types'

export const NOTION_ID = 'notion'

export const NOTION_NAME = (): string => t('presetNotionName')

export const NOTION_DESCRIPTION = (): string => t('presetNotionDesc')

export const NOTION_DOMAINS: string[] = ['notion.so', 'notion.site']

export const NOTION_SELECTORS: NotionSelectors = {
  content: '.notion-page-content',
  textBlocks:
    '[class*="notion-text-block"], [class*="notion-bulleted_list"], [class*="notion-numbered_list"]',
  htmlAnchors: {
    headings: '[class*="notion-header"], h1, h2, h3, h4, h5, h6',
    emphasis: 'strong, b, mark',
    codeBlocks: '[class*="notion-code-block"]',
    inlineCode: 'code, kbd',
    links: 'a[href]',
    images: 'img, picture, video, svg, [class*="notion-image"]',
    lists: 'ul, ol',
  },
  platformAnchors: {
    callouts: '[class*="notion-callout"]',
    toggles: '[class*="notion-toggle"]',
    embeds: '[class*="notion-bookmark"]',
    emojis: '.notion-emoji',
    databases: '[class*="notion-collection"]',
  },
  ignore: [],
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
