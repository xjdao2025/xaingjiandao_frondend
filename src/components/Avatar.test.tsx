import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('shared avatar', () => {
  it.each([[' 青禾社区 ', '青'], ['alice.test', 'A'], ['𠮷田', '𠮷'], ['', '?']])('uses a single fallback initial for %s', (name, initial) => {
    const html = renderToStaticMarkup(<Avatar name={name} />)
    expect(html).toContain(`<span class="avatar-initial">${initial}</span>`)
    expect(html).not.toContain('<img')
  })

  it.each(['uploads/avatar.png', 'https://example.com/avatar.png', 'blob:https://example.com/preview'])('keeps image sources usable for %s', (src) => {
    const html = renderToStaticMarkup(<Avatar name="青禾" src={src} size="large" />)
    expect(html).toContain('class="avatar avatar--large"')
    expect(html).toContain(`src="${src.startsWith('uploads/') ? `/${src}` : src}"`)
    expect(html).not.toContain('avatar-initial')
  })
})
