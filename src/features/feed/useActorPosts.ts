import { useEffect, useRef, useState } from 'react'
import type { PostFeed } from '~/lib/models'
import { useStoredSession } from '../session/session'
import { getPosts } from './api'

export function useActorPosts(actor: string | undefined, failureMessage: string) {
  const { session } = useStoredSession()
  const did = session?.pds.did
  const accessJwt = session?.pds.access_jwt
  const [feed, setFeed] = useState<PostFeed | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)

  const load = async (cursor?: string) => {
    if (!actor || (cursor && loading)) return
    const current = request.current
    setLoading(true); setError('')
    try {
      const page = await getPosts({ data: { repo: actor, did, accessJwt, cursor } })
      if (current === request.current) setFeed((previous) => cursor ? {
        ...page,
        posts: [...new Map([...(previous?.posts ?? []), ...page.posts].map((post) => [post.uri, post])).values()],
      } : page)
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : failureMessage)
    } finally { if (current === request.current) setLoading(false) }
  }

  useEffect(() => {
    ++request.current
    setFeed(null); setLoading(false); setError('')
    void load()
    return () => { ++request.current }
    // Reload only when the actor or viewer credentials change.
  }, [actor, did, accessJwt, failureMessage])

  return { feed, error, loading, more: () => feed?.cursor ? load(feed.cursor) : Promise.resolve() }
}
