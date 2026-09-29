import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ComposePanel, type ComposeInitialData, type ComposeKind } from '~/features/feed/ComposePanel'
import { readPostDraft } from '~/features/feed/post-draft'
import { getNodes } from '~/features/nodes/api'
import { getTask, getTasks } from '~/features/tasks/api'
import { getEvent, getEvents } from '~/features/events/api'
import { readStoredSession, useStoredSession } from '~/features/session/session'

const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback
export const Route = createFileRoute('/compose')({
  ssr: false,
  staleTime: 0,
  preloadStaleTime: 0,
  validateSearch: (search: Record<string, unknown>): { kind?: ComposeKind; editId?: string } => {
    const kind = search.kind === 'task' || search.kind === 'activity' ? search.kind : undefined
    return { kind, editId: kind && typeof search.editId === 'string' && search.editId ? search.editId : undefined }
  },
  loaderDeps: ({ search }) => {
    const session = readStoredSession()
    return { kind: search.kind ?? 'post', editId: search.editId, accountId: session?.user.id ?? null, token: session?.token ?? null, did: session?.pds.did ?? null }
  },
  loader: async ({ deps }): Promise<ComposeInitialData | null> => {
    if (!deps.token || !deps.did) return null
    const [nodesResult, postDraftResult, taskResult, eventResult] = await Promise.allSettled([
      getNodes({ data: { token: deps.token, mine: 'managed' } }),
      deps.editId ? Promise.resolve(null) : readPostDraft(deps.did),
      deps.kind === 'task' ? deps.editId ? getTask({ data: { token: deps.token, id: deps.editId } }) : getTasks({ data: { token: deps.token, mine: 'created', status: 'draft', limit: 1 } }).then(([draft]) => draft ?? null) : Promise.resolve(undefined),
      deps.kind === 'activity' ? deps.editId ? getEvent({ data: { token: deps.token, id: deps.editId } }) : getEvents({ data: { token: deps.token, mine: 'created', status: 'draft' } }).then((page) => page.data[0] ?? null) : Promise.resolve(undefined),
    ])
    const current = readStoredSession()
    if (current?.token !== deps.token || current.pds.did !== deps.did || current.user.id !== deps.accountId) return null
    return {
      token: deps.token,
      kind: deps.kind,
      editId: deps.editId,
      managedNodes: nodesResult.status === 'fulfilled' ? nodesResult.value : [],
      nodesError: nodesResult.status === 'rejected' ? errorMessage(nodesResult.reason, '暂时无法加载发布选项') : '',
      postDraft: postDraftResult.status === 'fulfilled' ? postDraftResult.value : null,
      postDraftError: postDraftResult.status === 'rejected' ? '无法读取帖子草稿，请检查浏览器存储权限。' : '',
      taskDraft: taskResult.status === 'fulfilled' ? taskResult.value ?? null : null,
      taskDraftError: taskResult.status === 'rejected' ? errorMessage(taskResult.reason, deps.editId ? '任务暂时无法加载' : '任务草稿暂时无法加载') : '',
      eventDraft: eventResult.status === 'fulfilled' ? eventResult.value ?? null : null,
      eventDraftError: eventResult.status === 'rejected' ? errorMessage(eventResult.reason, deps.editId ? '活动暂时无法加载' : '活动草稿暂时无法加载') : '',
    }
  },
  component: ComposePage,
})
function ComposePage() {
  const { kind, editId } = Route.useSearch()
  const initialData = Route.useLoaderData()
  const { token: loaderToken } = Route.useLoaderDeps()
  const { session } = useStoredSession()
  const router = useRouter()
  useEffect(() => {
    if (session && loaderToken !== session.token) void router.invalidate({ filter: (match) => match.routeId === '/compose' })
  }, [loaderToken, router, session?.token])
  return <ComposePanel key={`${session?.user.id ?? 'guest'}:${initialData?.token ?? 'pending'}:${editId ?? ''}`} initialKind={kind} editId={editId} initialData={initialData} />
}
