import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import { LoadingState } from '~/components/LoadingState'
import { usePagedBusinessList } from '~/components/usePagedBusinessList'
import { getNodes, type CommunityNode } from '../nodes/api'
import { useStoredSession } from '../session/session'
import { getTaskPage, type TaskPage } from './api'
import { TaskCard } from './TaskCard'
import type { RiceTask } from './types'

type TasksPageProps = { nodeId?: string; initialPage?: TaskPage; initialNodes?: CommunityNode[]; refreshError?: string }
export function TasksPage(props: TasksPageProps) {
  const { session } = useStoredSession()
  return <TaskList key={`${props.nodeId ?? 'all'}:${session?.token ?? 'guest'}`} {...props} />
}

function TaskList({ nodeId, initialPage, initialNodes, refreshError = '' }: TasksPageProps) {
  const navigate = useNavigate()
  const { session, isReady } = useStoredSession()
  const [nodes, setNodes] = useState<CommunityNode[]>(initialNodes ?? [])
  const [filter, setFilter] = useState('all')
  const usesRoutePage = Boolean(initialPage && !nodeId && filter === 'all')
  const loadPage = useCallback((before?: string) => getTaskPage({ data: {
    token: session?.token,
    nodeId: nodeId ?? (filter === 'all' || filter === 'available' ? undefined : filter),
    available: filter === 'available', sort: 'published', limit: 12, before,
  } }), [session?.token, nodeId, filter])
  const { rows: tasks, cursor: nextCursor, loading, error, visibleError, more } = usePagedBusinessList<RiceTask>({
    initialPage, useRoutePage: usesRoutePage, isReady,
    disabled: filter === 'available' && !session,
    refreshError, loadPage,
  })
  useEffect(() => { if (nodeId) return; if (initialNodes) { setNodes(initialNodes); return }; let active = true; void getNodes({ data: {} }).then((rows) => { if (active) setNodes(rows) }).catch(() => undefined); return () => { active = false } }, [initialNodes, nodeId])
  return <div className="page task-page">
    {!nodeId && <section className="task-hero"><span>TASKS · COMMUNITY COLLABORATION</span><h1>一起把事情<br />真正做完</h1><p>申请、交付、验收与稻米结算，任务进展都在这里。</p>{session ? <button type="button" className="hero-action" onClick={() => { void navigate({ to: '/me/tasks' }) }}>我的任务</button> : null}</section>}
    <div className="business-heading"><h2>{nodeId ? '社区任务' : '全部任务'}</h2>{!nodeId && <select aria-label="任务筛选" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">全部</option><option value="available">可申请</option>{nodes.map((n) => <option value={n.id} key={n.id}>{n.name}</option>)}</select>}</div>
    {visibleError && <p className="inline-error" role="alert">{visibleError}</p>}{loading && (tasks.length ? <p className="refresh-status" role="status">正在加载任务…</p> : <LoadingState label="正在加载任务…" />)}<section className="task-list" aria-busy={loading}>{tasks.map((task) => <TaskCard task={task} key={task.id} />)}</section>
    {!loading && !visibleError && !tasks.length && (filter === 'available'
      ? <EmptyState isCompact title={session ? '当前账号暂无可申请的任务。' : '登录后才能查看可申请的任务。'} description={session ? '已截止、已申请或由你发布的任务不会出现在这里。' : '你也可以继续浏览全部任务。'} actions={<Button label="查看全部任务" variant="secondary" onClick={() => setFilter('all')} />} />
      : <EmptyState isCompact title="暂时没有任务。" />)}{nextCursor && <AutoLoadMore key={`${nodeId}:${filter}:${session?.user.id}`} cursor={nextCursor} loading={loading || !isReady} failed={!!error} onLoadMore={more} />}
  </div>
}
