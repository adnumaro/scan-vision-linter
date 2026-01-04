import { describe, expect, it } from 'vitest'
import {
  isValidCSS,
  isValidSelector,
  sanitizeCSS,
  sanitizeSelector,
  sanitizeSelectors,
} from '../src/modes/utils/security'

describe('sanitizeCSS', () => {
  it('returns empty string for undefined input', () => {
    expect(sanitizeCSS(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeCSS('')).toBe('')
  })

  it('passes through safe CSS unchanged', () => {
    const safeCSS = '.class { color: red; background: blue; }'
    expect(sanitizeCSS(safeCSS)).toBe(safeCSS)
  })

  it('blocks expression() pattern (IE)', () => {
    const malicious = '.class { width: expression(alert(1)); }'
    expect(sanitizeCSS(malicious)).toContain('/* blocked */')
    expect(sanitizeCSS(malicious)).not.toContain('expression')
  })

  it('blocks javascript: URLs', () => {
    const malicious = '.class { background: url(javascript:alert(1)); }'
    expect(sanitizeCSS(malicious)).toContain('/* blocked */')
  })

  it('blocks behavior: property (IE)', () => {
    const malicious = '.class { behavior: url(script.htc); }'
    expect(sanitizeCSS(malicious)).toContain('/* blocked */')
  })

  it('blocks @import rules', () => {
    const malicious = '@import url("malicious.css"); .class { color: red; }'
    expect(sanitizeCSS(malicious)).toContain('/* blocked */')
  })

  it('blocks data: URLs in url()', () => {
    const malicious = '.class { background: url(data:text/html,<script>alert(1)</script>); }'
    expect(sanitizeCSS(malicious)).toContain('/* blocked */')
  })

  it('truncates CSS exceeding maximum length', () => {
    const longCSS = 'a'.repeat(60000)
    const result = sanitizeCSS(longCSS)
    expect(result.length).toBeLessThanOrEqual(50000)
  })
})

describe('isValidCSS', () => {
  it('returns true for safe CSS', () => {
    expect(isValidCSS('.class { color: red; }')).toBe(true)
  })

  it('returns false for CSS with expression()', () => {
    expect(isValidCSS('expression(alert(1))')).toBe(false)
  })

  it('returns false for CSS with javascript:', () => {
    expect(isValidCSS('javascript:void(0)')).toBe(false)
  })

  it('returns false for CSS exceeding max length', () => {
    expect(isValidCSS('a'.repeat(60000))).toBe(false)
  })
})

describe('isValidSelector', () => {
  it('returns false for empty string', () => {
    expect(isValidSelector('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(isValidSelector('   ')).toBe(false)
  })

  it('returns true for valid class selector', () => {
    expect(isValidSelector('.my-class')).toBe(true)
  })

  it('returns true for valid ID selector', () => {
    expect(isValidSelector('#my-id')).toBe(true)
  })

  it('returns true for valid element selector', () => {
    expect(isValidSelector('div')).toBe(true)
  })

  it('returns true for valid attribute selector', () => {
    expect(isValidSelector('[data-testid="value"]')).toBe(true)
  })

  it('returns true for valid complex selector', () => {
    expect(isValidSelector('div.class > span#id[attr="value"]')).toBe(true)
  })

  it('returns false for selector with curly braces (CSS injection)', () => {
    expect(isValidSelector('.class { color: red }')).toBe(false)
  })

  it('returns false for selector with semicolon (CSS injection)', () => {
    expect(isValidSelector('.class; .other')).toBe(false)
  })

  it('returns false for selector with angle brackets', () => {
    expect(isValidSelector('<script>')).toBe(false)
  })

  it('returns false for selector exceeding max length', () => {
    expect(isValidSelector('.class' + 'a'.repeat(600))).toBe(false)
  })

  it('returns false for invalid selector syntax', () => {
    expect(isValidSelector('..invalid')).toBe(false)
  })
})

describe('sanitizeSelector', () => {
  it('returns trimmed selector for valid input', () => {
    expect(sanitizeSelector('  .my-class  ')).toBe('.my-class')
  })

  it('returns empty string for invalid selector', () => {
    expect(sanitizeSelector('.class { injection }')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeSelector('')).toBe('')
  })
})

describe('sanitizeSelectors', () => {
  it('filters out invalid selectors', () => {
    const selectors = ['.valid', '.also-valid', '.invalid { }', '#id']
    const result = sanitizeSelectors(selectors)
    expect(result).toEqual(['.valid', '.also-valid', '#id'])
  })

  it('trims whitespace from selectors', () => {
    const selectors = ['  .class  ', '  #id  ']
    const result = sanitizeSelectors(selectors)
    expect(result).toEqual(['.class', '#id'])
  })

  it('returns empty array for all invalid selectors', () => {
    const selectors = ['.invalid { }', '..bad', '']
    const result = sanitizeSelectors(selectors)
    expect(result).toEqual([])
  })

  it('handles empty array', () => {
    expect(sanitizeSelectors([])).toEqual([])
  })
})
