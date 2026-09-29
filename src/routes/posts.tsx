import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { loadCachedThread } from '~/features/feed/api'
import { PostThreadPanel } from '~/features/feed/PostThreadPanel'
import { readStoredSession, useStoredSession } from '~/features/session/session'
import { LoadingState } from '~/components/LoadingState'
import type { PostThread } from '~/lib/models'

export const Route = createFileRoute('/posts')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    uri: typeof search.uri === 'string' ? search.uri : '',
  }),
  loaderDeps: ({ search }) => {
    const session = readStoredSession()
    return { uri: search.uri, did: session?.pds.did ?? null, token: session?.pds.access_jwt ?? null }
  },
  loader: async ({ deps }): Promise<{ thread: PostThread | null; error: string }> => {
    if (!deps.uri) return { thread: null, error: '帖子不存在' }
    try {
      return { thread: await loadCachedThread({ uri: deps.uri, did: deps.did ?? undefined, accessJwt: deps.token ?? undefined }), error: '' }
    } catch (reason) {
      return { thread: null, error: reason instanceof Error ? reason.message : '帖子暂时无法显示' }
    }
  },
  component: PostPage,
})

function PostPage() {
  const { uri } = Route.useSearch()
  const { did, token } = Route.useLoaderDeps()
  const { thread, error } = Route.useLoaderData()
  const { session } = useStoredSession()
  const router = useRouter()
  useEffect(() => {
    if (did !== (session?.pds.did ?? null) || token !== (session?.pds.access_jwt ?? null)) void router.invalidate({ filter: (match) => match.routeId === '/posts' })
  }, [did, token, session?.pds.did, session?.pds.access_jwt, router])
  const current = did === (session?.pds.did ?? null) && token === (session?.pds.access_jwt ?? null)
  const focusReply = typeof window !== 'undefined' && window.location.hash === '#reply'
  if (!current) return <div className="page post-page"><LoadingState label="正在加载帖子…" /></div>

  return (
    <div className="page post-page">
      <PostThreadPanel uri={uri} focusReply={focusReply} initialThread={thread} initialError={error} />
    </div>
  )
}
