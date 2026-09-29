import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'
import type { CommunityNode } from '../nodes/api'
import type { RiceTask } from './types'

const captured = vi.hoisted(() => ({ props: null as null | {
  steps: Array<{ label: string; content: { props: { fields: Array<{ label: string; required?: boolean }>; isReadOnly?: boolean } } }>
  validate: (step: number) => string | null
} }))
vi.mock('~/components/PublishSteps', () => ({ PublishSteps: (props: typeof captured.props) => { captured.props = props; return null }, usePublishValidationAttempted: () => false }))

import { TaskCreatePage } from './TaskCreatePage'

function renderTask(applicationDeadline: string | null, executionDeadline: string | null, contact = 'contact', editing = false, status: RiceTask['status'] = 'draft') {
  const draft = {
    id: 'task-1', node: { id: 'node-1', name: '社区', logo: null }, title: '任务', description: '说明',
    requirement: '要求', organizer_contact: contact, reward_amount: 1, attachments: [], status,
    application_deadline: applicationDeadline, execution_deadline: executionDeadline,
  } as unknown as RiceTask
  renderToStaticMarkup(<TaskCreatePage session={{ token: 'token' } as RiceSession} nodes={[{ id: 'node-1', name: '社区' } as CommunityNode]} initialDraft={draft} editing={editing} onPublished={() => undefined} onCloseStateChange={() => undefined} />)
  return captured.props!
}

it('gives each required task deadline its own step and validates them separately', () => {
  const empty = renderTask(null, null)
  expect(empty.steps.map(step => step.label)).toEqual(['基本信息', '内容', '申请截止', '交付截止', '参与与稻米'])
  expect(empty.steps[2].content.props.fields).toEqual([expect.objectContaining({ label: '申请截止', required: true })])
  expect(empty.steps[3].content.props.fields).toEqual([expect.objectContaining({ label: '交付截止', required: true })])
  expect(empty.validate(2)).toContain('请选择申请截止')
  expect(empty.validate(3)).toContain('请选择交付截止')
  expect(renderTask(null, null, '').validate(0)).toContain('组织方联系方式')

  const ordered = renderTask('2099-01-01T10:00:00+08:00', '2099-01-02T10:00:00+08:00')
  expect(ordered.validate(2)).toBeNull()
  expect(ordered.validate(3)).toBeNull()
  expect(renderTask('2099-01-02T10:00:00+08:00', '2099-01-01T10:00:00+08:00').validate(3)).toContain('晚于')
})

it('allows unchanged past deadlines when editing an active task', () => {
  const edit = renderTask('2020-01-01T10:00:00+08:00', '2020-01-02T10:00:00+08:00', 'contact', true, 'open')
  expect(edit.validate(2)).toBeNull()
  expect(edit.validate(3)).toBeNull()
})

it('requires a future application deadline before reopening a cancelled or expired task', () => {
  for (const status of ['cancelled', 'expired'] as const) {
    expect(renderTask('2020-01-01T10:00:00+08:00', '2020-01-02T10:00:00+08:00', 'contact', true, status).validate(2)).toContain('晚于当前时间')
    expect(renderTask('2099-01-01T10:00:00+08:00', '2099-01-02T10:00:00+08:00', 'contact', true, status).validate(2)).toBeNull()
  }
})

it('keeps an ongoing task reward read-only while allowing terminal reward edits', () => {
  expect(renderTask(null, null, 'contact', true, 'open').steps[4].content.props.isReadOnly).toBe(true)
  expect(renderTask(null, null, 'contact', true, 'cancelled').steps[4].content.props.isReadOnly).toBe(false)
})

it('locks the community selector only while editing an active task', () => {
  const select = (status: RiceTask['status']) => renderToStaticMarkup(renderTask(null, null, 'contact', true, status).steps[0].content as unknown as ReactNode).match(/<select[^>]*>/)?.[0]
  expect(select('open')).toContain('disabled')
  expect(select('cancelled')).not.toContain('disabled')
})
