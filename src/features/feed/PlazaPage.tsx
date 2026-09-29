import { Button } from '@astryxdesign/core/Button'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { RepostChange } from '~/components/PostActions'
import { PostList } from '~/components/PostList'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import type { PostFeed } from '~/lib/models'

import { useStoredSession } from '../session/session'
import { getPosts, readCachedFeed, writeCachedFeed } from './api'
import { postCategory } from './tags'


export function PlazaPage({ initialFeed }: { initialFeed: PostFeed }) {
  const { session } = useStoredSession()
  const did = session?.pds.did
  const scopedFeed = useMemo(() => readCachedFeed(did) ?? {
    ...initialFeed,
    posts: initialFeed.posts.map(({ viewer: _viewer, ...post }) => post),
  }, [did, initialFeed])
  return <PlazaFeed key={did ?? 'guest'} initialFeed={scopedFeed} />
}

function PlazaFeed({ initialFeed }: { initialFeed: PostFeed }) {
  const [feed, setFeed] = useState(initialFeed)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const { session, isReady } = useStoredSession()
  const accessJwt = session?.pds.access_jwt
  const did = session?.pds.did
  const request = useRef(0)
  useEffect(() => {
    const refresh = () => {
      request.current++
      setLoading(false)
      const cached = readCachedFeed(did)
      if (cached) setFeed(cached)
      else setReloadKey((value) => value + 1)
    }
    window.addEventListener('posts-changed', refresh)
    return () => window.removeEventListener('posts-changed', refresh)
  }, [did])

  useEffect(() => {
    request.current++
    if (!isReady) return
    if (reloadKey === 0) {
      const cachedFeed = readCachedFeed(did)
      if (cachedFeed) {
        setLoading(false)
        setError('')
        setFeed(cachedFeed)
        return () => { request.current++ }
      }
      if (!did) {
        setLoading(false)
        setError('')
        writeCachedFeed(initialFeed)
        setFeed(initialFeed)
        return () => { request.current++ }
      }
    }

    let active = true
    const current = request.current
    setLoading(true)
    setError('')
    void getPosts({
      data: {
        accessJwt,
        did,
        category: 'post',
      },
    })
      .then((nextFeed) => {
        if (!active || current !== request.current) return
        writeCachedFeed(nextFeed, did)
        setFeed(nextFeed)
      })
      .catch((reason) => {
        if (active && current === request.current) setError(reason instanceof Error ? reason.message : '帖子暂时无法加载')
      })
      .finally(() => {
        if (active && current === request.current) setLoading(false)
      })
    return () => { active = false; request.current++ }
  }, [accessJwt, did, initialFeed, isReady, reloadKey])

  const more = async () => {
    if (!feed.cursor || isLoading) return
    const current = request.current
    setLoading(true)
    setError('')
    try {
      const page = await getPosts({ data: { accessJwt, did, category: 'post', cursor: feed.cursor } })
      if (current !== request.current) return
      const next = { ...page, posts: [...new Map([...feed.posts, ...page.posts].map((post) => [post.reason?.uri ?? post.uri, post])).values()] }
      setFeed(next)
      writeCachedFeed(next, did)
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : '帖子暂时无法加载')
    } finally { if (current === request.current) setLoading(false) }
  }

  const handleRepostChange = ({ post, reason }: RepostChange) => {
    if (!did) return
    setFeed((current) => {
      const { reason: _previousReason, ...basePost } = post
      const viewer = { ...basePost.viewer, repost: reason?.uri }
      const remaining = current.posts
        .filter(
          (item) =>
            !(item.uri === post.uri && item.reason?.by.did === did),
        )
        .map((item) =>
          item.uri === post.uri ? { ...item, viewer } : item,
        )
      const posts = reason
        ? [{ ...basePost, viewer, reason }, ...remaining]
        : remaining
      return { ...current, posts }
    })
  }

  const handlePostDeleted = (postUri: string) => {
    setFeed((current) => ({
      ...current,
      posts: current.posts.filter((post) => post.uri !== postUri),
    }))
  }

  return (
    <div className="page plaza-page">
      {error ? (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          {!feed.cursor && <Button label="重试" variant="ghost" size="sm" onClick={() => setReloadKey((value) => value + 1)} />}
        </div>
      ) : null}

      <section className="feed-section">
        <PostList
          posts={feed.posts.filter((post) => postCategory(post.record) === 'post')}
          onRepostChange={handleRepostChange}
          onPostDeleted={handlePostDeleted}
        />
        {feed.cursor && <AutoLoadMore key={did ?? 'guest'} cursor={feed.cursor} loading={isLoading || !isReady} failed={!!error} onLoadMore={more} />}
      </section>

    </div>
  )
}
