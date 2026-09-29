import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useCallback, useEffect, useRef, useState } from 'react'

import { PostList } from '~/components/PostList'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import { LoadingState } from '~/components/LoadingState'
import { useActorPosts } from '~/features/feed/useActorPosts'
import { getTaskPage } from '~/features/tasks/api'
import { TaskCard } from '~/features/tasks/TaskCard'
import { getEvents } from '../events/api'
import { EventCard } from '../events/EventsPage'
import { postCategory } from '../feed/tags'

import { useStoredSession } from '../session/session'
import { hasMoreHistory, loadPublicHistoryPage, type HistoryPage, type HistorySource, type PublicHistory } from './public-history'

type ProfileTab = 'tasks' | 'activities' | 'posts'

const tabs: Array<{ value: ProfileTab; label: string }> = [
  { value: 'tasks', label: '任务' },
  { value: 'activities', label: '活动' },
  { value: 'posts', label: '帖子' },
]

export function PublicProfileContent({ actor }: { actor: string }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const { session } = useStoredSession()
  const contentKey = `${actor}:${session?.token ?? 'guest'}`

  return (
    <>
      <div className="social-profile-tabs filter-buttons" role="group" aria-label="用户公开内容">
        {tabs.map((tab) => (
          <Button
            label={tab.label}
            variant="ghost"
            size="sm"
            className={activeTab === tab.value ? 'active' : undefined}
            aria-pressed={activeTab === tab.value}
            clickAction={() => setActiveTab(tab.value)}
            key={tab.value}
          />
        ))}
      </div>

      {activeTab === 'posts' ? <PublicPosts key={contentKey} actor={actor} /> : null}
      {activeTab === 'activities' ? <PublicActivities key={contentKey} actor={actor} /> : null}
      {activeTab === 'tasks' ? <PublicTasks key={contentKey} actor={actor} /> : null}
    </>
  )
}

function PublicPosts({ actor }: { actor: string }) {
  const { session } = useStoredSession()
  const { feed, error, loading, more } = useActorPosts(actor, '帖子暂时无法显示')
  const posts = feed?.posts ?? null

  if (!posts || (posts.length === 0 && !feed?.cursor)) {
    return <ProfileContentState error={error} items={posts} empty="还没有发布帖子" />
  }
  return <>{error && <div className="inline-error" role="alert">{error}</div>}<PostList posts={posts.filter((p) => postCategory(p.record) === 'post')} />{feed?.cursor && <AutoLoadMore key={`${actor}:${session?.pds.did}`} cursor={feed.cursor} loading={loading} failed={!!error} onLoadMore={more} />}</>
}

function PublicTasks({ actor }: { actor: string }) {
  const { session } = useStoredSession()
  const fetchPage = useCallback((source: HistorySource, before?: string) => getTaskPage({ data: {
    token: session?.token,
    ...(source === 'created' ? { creatorDid: actor } : { participantDid: actor }),
    before,
  } }), [actor, session?.token])
  const { history, loading, error, more } = usePublicRiceHistory(fetchPage, '任务记录暂时无法显示')
  if (!history || (!history.items.length && !hasMoreHistory(history.cursors))) return <ProfileContentState error={error} items={history?.items ?? null} empty="还没有任务记录" />
  return <>{error && <div className="inline-error" role="alert">{error}</div>}
    <section className="task-list public-profile-list">{history.items.map((task) => <TaskCard task={task} key={task.id} />)}</section>
    {hasMoreHistory(history.cursors) && <AutoLoadMore cursor={JSON.stringify(history.cursors)} loading={loading} failed={!!error} onLoadMore={more} />}
  </>
}

function PublicActivities({ actor }: { actor: string }) {
  const { session } = useStoredSession()
  const fetchPage = useCallback((source: HistorySource, before?: string) => getEvents({ data: {
    token: session?.token,
    ...(source === 'created' ? { creatorDid: actor } : { participantDid: actor }),
    before,
  } }), [actor, session?.token])
  const { history, loading, error, more } = usePublicRiceHistory(fetchPage, '活动记录暂时无法显示')
  if (!history || (!history.items.length && !hasMoreHistory(history.cursors))) return <ProfileContentState error={error} items={history?.items ?? null} empty="还没有活动记录" />
  return <>{error && <div className="inline-error" role="alert">{error}</div>}
    <section className="task-list public-profile-list">{history.items.map((event) => <EventCard event={event} key={event.id} />)}</section>
    {hasMoreHistory(history.cursors) && <AutoLoadMore cursor={JSON.stringify(history.cursors)} loading={loading} failed={!!error} onLoadMore={more} />}
  </>
}

function usePublicRiceHistory<T extends { id: string; inserted_at: string }>(
  fetchPage: (source: HistorySource, before?: string) => Promise<HistoryPage<T>>,
  failureMessage: string,
) {
  const [history, setHistory] = useState<PublicHistory<T> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)

  useEffect(() => {
    const current = ++request.current
    setHistory(null); setError('')
    void loadPublicHistoryPage(fetchPage)
      .then((page) => { if (current === request.current) setHistory(page) })
      .catch((reason) => { if (current === request.current) setError(reason instanceof Error ? reason.message : failureMessage) })
    return () => { request.current++ }
  }, [fetchPage, failureMessage])

  const more = async () => {
    if (!history || !hasMoreHistory(history.cursors) || loading) return
    const current = request.current
    setLoading(true); setError('')
    try {
      const page = await loadPublicHistoryPage(fetchPage, history)
      if (current === request.current) setHistory(page)
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : failureMessage)
    } finally { if (current === request.current) setLoading(false) }
  }
  return { history, loading, error, more }
}

function ProfileContentState<T>({
  error,
  items,
  empty,
}: {
  error: string
  items: T[] | null
  empty: string
}) {
  if (error) return <div className="form-error public-profile-state" role="alert">{error}</div>
  if (!items) return <LoadingState label="正在加载…" className="loading-line public-profile-state" />
  return (
    <div className="empty-panel public-profile-state">
      <EmptyState title={empty} description="该用户的公开记录会显示在这里。" />
    </div>
  )
}
