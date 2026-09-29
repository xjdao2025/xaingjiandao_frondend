import { expect, it, vi } from 'vitest'
import { resizeTextArea } from './AutoTextArea'

it('grows and shrinks to measured wrapped content while skipping hidden fields', () => {
  let contentHeight = 48
  const element = {
    clientWidth: 240,
    style: { height: '200px' },
    get scrollHeight() { return this.style.height === 'auto' ? contentHeight : 200 },
  }
  vi.stubGlobal('getComputedStyle', () => ({ borderTopWidth: '1px', borderBottomWidth: '1px' }))
  try {
    resizeTextArea(element as HTMLTextAreaElement)
    expect(element.style.height).toBe('50px')
    contentHeight = 120
    resizeTextArea(element as HTMLTextAreaElement)
    expect(element.style.height).toBe('122px')
    contentHeight = 48
    resizeTextArea(element as HTMLTextAreaElement)
    expect(element.style.height).toBe('50px')
    element.clientWidth = 0
    contentHeight = 120
    resizeTextArea(element as HTMLTextAreaElement)
    expect(element.style.height).toBe('50px')
  } finally { vi.unstubAllGlobals() }
})
