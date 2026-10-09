import { describe, expect, it } from 'vitest'
import { avatarUrl, thumbUrl } from './pds'

describe('rice thumbnails', () => {
  const did = 'did:plc:3ch55vps4vmaow6akmt7ju7s'
  const cid = 'bafkreigvhe27mxgh3oxh7wsuselayboznw4btcweizdxo2mwkgfuqd7zpy'

  it('builds same-origin preset paths', () => {
    expect(thumbUrl('feed', did, cid)).toBe(`/img/feed/${did}/${cid}`)
  })

  it('swaps AppView avatars for the 256px thumbnail and leaves other URLs alone', () => {
    expect(avatarUrl(`https://bsky.xjdao.net/img/avatar/plain/${did}/${cid}@jpeg`)).toBe(`/img/avatar/${did}/${cid}`)
    expect(avatarUrl('/api/attachments/0ABCDEF123456')).toBe('/api/attachments/0ABCDEF123456')
    expect(avatarUrl('https://cdn.example/avatar.jpg')).toBe('https://cdn.example/avatar.jpg')
  })
})
