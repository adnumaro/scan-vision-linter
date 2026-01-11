/**
 * Confluence preset configuration
 */

import { t } from '../../../utils/i18n'
import type { ConfluenceSelectors, PlatformStyles } from '../../types'

export const CONFLUENCE_ID = 'confluence'

export const CONFLUENCE_NAME = (): string => t('presetConfluenceName')

export const CONFLUENCE_DESCRIPTION = (): string => t('presetConfluenceDesc')

export const CONFLUENCE_DOMAINS: string[] = ['atlassian.net', 'confluence.com']

export const CONFLUENCE_SELECTORS: ConfluenceSelectors = {
  content: '.ak-editor-content-area, #content-body, [data-testid="page-content"], .wiki-content',
  textBlocks: 'p, [data-node-type="text"], [data-node-type="paragraph"]',
  htmlAnchors: {
    headings: 'h1, h2, h3, h4, h5, h6',
    emphasis: 'strong, b, mark',
    codeBlocks: '[data-prosemirror-node-name="codeBlock"], pre',
    inlineCode: 'code, kbd',
    links: 'a[href]',
    images: 'img, picture, video, svg',
    lists: 'ul, ol',
  },
  platformAnchors: {
    callouts: '.confluence-information-macro, .panel',
    toggles: '.expand-control',
    badges: '[class*="status-macro"]',
    emojis: '[data-testid*="emoji"]',
  },
  ignore: [
    // Navigation and header
    '[data-testid="grid-left-sidebar"]',
    '[data-testid="space-navigation"]',
    '[data-testid="toolbar-above-title-wrapper"]',
    '[data-vc="space-navigation"]',
    'nav[aria-label]',
    'header',
    '[role="navigation"]',
    '[role="banner"]',
    // Atlaskit UI portals (modals, tooltips, dialogs, etc.)
    '.atlaskit-portal-container',
    '[data-testid="help-widget"]',
    '[data-testid="confluence-account-menu"]',
    '[data-testid="right-sidebar-panel"]',
    '[role="dialog"]',
    // Page header (author, date, etc.)
    '[data-testid="object-header-container"]',
    '[data-testid="content-topper-wrapper"]',
    '[data-testid="byline-single-line"]',
    // Sidebar
    '[data-testid="object-sidebar-container"]',
    // Related content and comments
    '[data-testid="end-page-rec-wrapper"]',
    '[data-testid="object-comment-wrapper"]',
    '[data-testid="footer-reply-container"]',
    '[data-testid="reactions-container"]',
    '[data-testid="render-reactions"]',
    '.ak-renderer-wrapper.is-comment',
  ],
}

export const CONFLUENCE_STYLES: PlatformStyles = {
  navigationSelectors: [
    '[data-testid="grid-left-sidebar"]',
    '[data-testid="space-navigation"]',
    '[data-vc="space-navigation"]',
    'nav[aria-label]',
  ],
}
