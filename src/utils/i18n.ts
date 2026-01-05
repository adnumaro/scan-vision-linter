/**
 * Internationalization helper for Chrome extension
 *
 * Uses Chrome's built-in i18n API which automatically
 * detects browser language and falls back to default_locale.
 */

/**
 * Get a localized message by key
 * @param key - Message key from messages.json
 * @param substitutions - Optional array of substitution strings for placeholders
 * @returns Localized string or the key if not found
 */
export function t(key: string, substitutions?: string | string[]): string {
  const message = chrome.i18n.getMessage(key, substitutions)
  // Return key as fallback for debugging (shows missing translations)
  return message || key
}

/**
 * Get the current UI language
 * @returns Language code (e.g., 'en', 'es')
 */
export function getUILanguage(): string {
  return chrome.i18n.getUILanguage()
}
