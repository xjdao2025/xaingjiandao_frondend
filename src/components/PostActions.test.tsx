import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PostView, RiceSession } from '~/lib/models'

const state = vi.hoisted(() => ({ session: null as RiceSession | null }))
vi.mock('~/features/session/session', () => ({ useStoredSession: () => ({ session: state.session }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, 'aria-label': label }: { children: ReactNode; 'aria-label'?: string }) => <a aria-label={label}>{children}</a> }))
import { PostActions } from './PostActions'

afterEach(() => { state.session = null })

const post: PostView = {
  uri: 'at://did:author/app.bsky.feed.post/one', cid: 'cid', indexedAt: '2026-09-16',
  author: { did: 'did:author', handle: 'author.test' }, record: { text: '公共帖子', createdAt: '2026-09-16' },
  replyCount: 0, likeCount: 1, repostCount: 1,
  viewer: { like: 'at://did:alice/app.bsky.feed.like/one', repost: 'at://did:alice/app.bsky.feed.repost/one' },
}
const render = () => renderToStaticMarkup(<PostActions post={post} onOpenComments={() => undefined} />)

describe('post interaction rendering', () => {
  it('does not highlight A interactions in a cached post rendered for B', () => {
    state.session = { user: { id: 'bob' }, pds: { did: 'did:bob' } } as RiceSession
    const html = render()
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2)
    expect(html).not.toContain('aria-pressed="true"')
  })

  it('highlights only interaction URIs belonging to the active account', () => {
    state.session = { user: { id: 'alice' }, pds: { did: 'did:alice' } } as RiceSession
    expect(render().match(/aria-pressed="true"/g)).toHaveLength(2)
  })

  it('shows no mutation controls for a guest with cached viewer metadata', () => {
    expect(render()).toBe('')
  })

  it('offers reply on a comment and hides the action on a second-level reply', () => {
    state.session = { user: { id: 'alice' }, pds: { did: 'did:alice' } } as RiceSession
    expect(renderToStaticMarkup(<PostActions post={post} onOpenComments={() => undefined} commentAction="reply" />)).toContain('回复评论')
    expect(renderToStaticMarkup(<PostActions post={post} commentAction="hidden" />)).not.toContain('条评论')
  })

  it('shows the exact two-level comment count only after it is known', () => {
    state.session = { user: { id: 'alice' }, pds: { did: 'did:alice' } } as RiceSession
    const directOnly = { ...post, replyCount: 1 }
    const pending = renderToStaticMarkup(<PostActions post={directOnly} />)
    expect(pending).toContain('aria-label="评论"')
    expect(pending).not.toContain('1 条评论')
    const loaded = renderToStaticMarkup(<PostActions post={directOnly} commentCount={2} />)
    expect(loaded).toContain('aria-label="2 条评论"')
  })
})
