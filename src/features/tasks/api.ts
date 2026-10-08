import { createServerFn } from '@tanstack/react-start'

import { BACKEND_BASE, requestJson } from '~/lib/http'

import type { RiceTask, TaskListStatus, TaskMine } from './types'

export type TaskListInput = {
  token?: string
  mine?: TaskMine
  status?: TaskListStatus
  participantDid?: string
  creatorDid?: string
  q?: string
  nodeId?: string
  available?: boolean
  sort?: 'published'
  limit?: number
  before?: string
}

export type TaskPage = {
  data: RiceTask[]
  meta: { next_cursor: string | null }
}

const authHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined

/** 任务接口的 URL：每一段都编码，id 里带 `../` 也越不出 /api/tasks。 */
const taskUrl = (...segments: string[]) =>
  [`${BACKEND_BASE}/api/tasks`, ...segments.map(encodeURIComponent)].join('/')

export function buildTaskListQuery(data: TaskListInput) {
  const query = new URLSearchParams()
  if (data.nodeId) query.set('node_id', data.nodeId)
  if (data.available) query.set('available', 'true')
  if (data.mine) query.set('mine', data.mine)
  if (data.status) query.set('status', data.status)
  if (data.participantDid) query.set('participant_did', data.participantDid)
  if (data.creatorDid) query.set('creator_did', data.creatorDid)
  if (data.q?.trim()) query.set('q', data.q.trim())
  if (data.sort) query.set('sort', data.sort)
  if (data.limit) query.set('limit', String(data.limit))
  if (data.before) query.set('before', data.before)
  return query.toString()
}

export async function fetchTaskPage(data: TaskListInput) {
  const query = buildTaskListQuery(data)
  const suffix = query ? `?${query}` : ''
  const page = await requestJson<TaskPage>(`${BACKEND_BASE}/api/tasks${suffix}`, {
    headers: authHeaders(data.token),
  })
  return data.mine ? page : { ...page, data: page.data.filter((task) => task.status !== 'cancelled') }
}

export const getTasks = createServerFn({ method: 'POST' })
  .validator((data: TaskListInput) => data)
  .handler(async ({ data }) => (await fetchTaskPage(data)).data)

export const getTaskPage = createServerFn({ method: 'POST' })
  .validator((data: TaskListInput) => data)
  .handler(async ({ data }) => fetchTaskPage(data))

export const getTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string; token?: string }) => data)
  .handler(async ({ data }) => {
    const body = await requestJson<{ data: RiceTask }>(taskUrl(data.id), {
      headers: authHeaders(data.token),
    })
    return body.data
  })

type TaskFields = {
  token: string
  title: string
  description: string
  applicationDeadline?: string | null
  rewardAmount: number
  capacity: number
  nodeId?: string
  requirement?: string
  executionDeadline?: string | null
  clientRequestId?: string
  attachmentIds?: string[]
  organizerContact?: string
}

export const taskDraftBody = (data: TaskFields) => ({
  title: data.title,
  description: data.description,
  application_deadline: data.applicationDeadline,
  reward_amount: data.rewardAmount,
  capacity: data.capacity,
  node_id: data.nodeId || undefined,
  requirement: data.requirement,
  execution_deadline: data.executionDeadline,
  client_request_id: data.clientRequestId,
  attachment_ids: data.attachmentIds,
  organizer_contact: data.organizerContact,
})

export const createTask = createServerFn({ method: 'POST' })
  .validator((data: TaskFields & { status: 'draft' | 'open'; applicationDeadline?: string }) => data)
  .handler(async ({ data }) => {
    const body = await requestJson<{ data: RiceTask }>(`${BACKEND_BASE}/api/tasks`, {
      method: 'POST',
      headers: { ...authHeaders(data.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskDraftBody(data), status: data.status }),
    })
    return body.data
  })

const send = async (token: string, method: 'POST' | 'PATCH', segments: string[], payload?: object) => {
  const body = await requestJson<{ data: RiceTask }>(taskUrl(...segments), {
    method,
    headers: payload ? { ...authHeaders(token), 'Content-Type': 'application/json' } : authHeaders(token),
    body: payload && JSON.stringify(payload),
  })
  return body.data
}

export const updateTask = createServerFn({ method: 'POST' })
  .validator((data: TaskFields & { taskId: string; applicationDeadline: string | null }) => data)
  .handler(({ data }) => send(data.token, 'PATCH', [data.taskId], taskDraftBody(data)))

type TaskRef = { token: string; taskId: string }
type ApplicationRef = TaskRef & { applicationId: string }

export const publishTask = createServerFn({ method: 'POST' })
  .validator((data: TaskRef) => data)
  .handler(({ data }) => send(data.token, 'POST', [data.taskId, 'publish']))

export const cancelTask = createServerFn({ method: 'POST' })
  .validator((data: TaskRef) => data)
  .handler(({ data }) => send(data.token, 'POST', [data.taskId, 'cancel']))

/** 多人任务提前结束：已验收的保留，其余承接者撤销指派，没发出去的稻米退回节点。 */
export const closeTask = createServerFn({ method: 'POST' })
  .validator((data: TaskRef) => data)
  .handler(({ data }) => send(data.token, 'POST', [data.taskId, 'close']))

/** 多人任务撤销一个人的指派：名额让出来，奖励不发。 */
export const releaseTaskAssignee = createServerFn({ method: 'POST' })
  .validator((data: ApplicationRef & { reason: string }) => data)
  .handler(({ data }) =>
    send(data.token, 'POST', [data.taskId, 'applications', data.applicationId, 'release'], { reason: data.reason }))

export const applyForTask = createServerFn({ method: 'POST' })
  .validator((data: TaskRef & { reason: string; contact: string }) => data)
  .handler(({ data }) =>
    send(data.token, 'POST', [data.taskId, 'applications'], { reason: data.reason, contact: data.contact }))

export const appointTaskApplication = createServerFn({ method: 'POST' })
  .validator((data: ApplicationRef & { appointmentReason: string }) => data)
  .handler(({ data }) =>
    send(data.token, 'POST', [data.taskId, 'applications', data.applicationId, 'appoint'], {
      appointment_reason: data.appointmentReason,
    }))

export const rejectTaskApplicationRequest = (data: ApplicationRef) =>
  send(data.token, 'POST', [data.taskId, 'applications', data.applicationId, 'reject'])

export const rejectTaskApplication = createServerFn({ method: 'POST' })
  .validator((data: ApplicationRef) => data)
  .handler(({ data }) => rejectTaskApplicationRequest(data))

export const submitTaskResult = createServerFn({ method: 'POST' })
  .validator((data: TaskRef & { body: string }) => data)
  .handler(({ data }) => send(data.token, 'POST', [data.taskId, 'submissions'], { body: data.body }))

type SubmissionReview = TaskRef & { submissionId: string; reason?: string }

const reviewTask = (data: SubmissionReview, action: 'approve' | 'request_changes') =>
  send(data.token, 'POST', [data.taskId, 'submissions', data.submissionId, action], { reason: data.reason })

export const approveTaskResult = createServerFn({ method: 'POST' })
  .validator((data: SubmissionReview) => data)
  .handler(({ data }) => reviewTask(data, 'approve'))

export const requestTaskChanges = createServerFn({ method: 'POST' })
  .validator((data: SubmissionReview & { reason: string }) => data)
  .handler(({ data }) => reviewTask(data, 'request_changes'))
