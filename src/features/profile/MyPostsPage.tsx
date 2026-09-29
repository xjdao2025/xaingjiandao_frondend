import { LoginLink } from '../session/LoginLink'
import { PostList } from '~/components/PostList'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import { LoadingState } from '~/components/LoadingState'
import { useActorPosts } from '~/features/feed/useActorPosts'

import { useStoredSession } from '../session/session'

export function MyPostsPage() {
  const { session, isReady } = useStoredSession()
  const { feed, error, loading, more } = useActorPosts(session?.pds.did, '帖子暂时无法加载')

  if (isReady && !session) {
    return (
      <div className="page signed-out-state">
        <strong>登录后查看我的帖子</strong>
        <LoginLink className="primary-link">前往登录</LoginLink>
      </div>
    )
  }

  return (
    <div className="page my-posts-page">
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      {feed ? <PostList posts={feed.posts} /> : !error ? <LoadingState label="正在加载帖子…" /> : null}
      {feed?.cursor && <AutoLoadMore key={session?.pds.did} cursor={feed.cursor} loading={loading} failed={!!error} onLoadMore={more} />}
    </div>
  )
}
