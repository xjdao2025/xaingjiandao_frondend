import { createFileRoute } from '@tanstack/react-router'

import { MyTasksPage } from '~/features/tasks/MyTasksPage'
import { getTaskPage } from '~/features/tasks/api'
import type { RiceTask, TaskMine } from '~/features/tasks/types'
import { readStoredSession } from '~/features/session/session'

export type MyTasksInitialData = { accountId: string; sessionToken: string; tasks: RiceTask[] }

export const Route = createFileRoute('/me/tasks')({
  ssr: false,
  staleTime: 30_000,
  preloadStaleTime: 30_000,
  loaderDeps: () => {
    const session = readStoredSession()
    return { accountId: session?.user.id ?? null, token: session?.token ?? null }
  },
  beforeLoad: ({ matches }): { previousData: MyTasksInitialData | null } => {
    const previous = matches.find((match) => match.routeId === '/me/tasks')?.loaderData as { initialData: MyTasksInitialData | null } | undefined
    return { previousData: previous?.initialData ?? null }
  },
  loader: { staleReloadMode: 'background', handler: async ({ deps, context }) => {
    const empty = { initialData: null, error: '' }
    const { accountId, token } = deps
    if (!accountId || !token) return empty
    const sameSession = () => {
      const current = readStoredSession()
      return current?.user.id === accountId && current.token === token
    }
    if (!sameSession()) return empty
    try {
      const mine: TaskMine[] = ['managed', 'applied', 'assigned']
      // ponytail: fetch the small personal history for accurate tabs; add server counts if history grows large.
      const groups = await Promise.all(mine.map(async (value) => {
        const rows: RiceTask[] = []; let before: string | undefined
        do { const page = await getTaskPage({ data: { token, mine: value, limit: 100, before } }); rows.push(...page.data); before = page.meta.next_cursor ?? undefined } while (before && sameSession())
        return rows
      }))
      if (!sameSession()) return empty
      return { initialData: { accountId, sessionToken: token, tasks: [...new Map(groups.flat().map((task) => [task.id, task])).values()] }, error: '' }
    } catch (reason) {
      if (!sameSession()) return empty
      const previous = context.previousData
      return { initialData: previous?.accountId === accountId && previous.sessionToken === token ? previous : null, error: reason instanceof Error ? reason.message : '任务暂时无法加载，请稍后重试。' }
    }
  } },
  component: MyTasksRoute,
})

function MyTasksRoute() {
  const { initialData, error } = Route.useLoaderData()
  const { token } = Route.useLoaderDeps()
  return <MyTasksPage initialData={initialData} initialError={error} loaderToken={token} />
}
