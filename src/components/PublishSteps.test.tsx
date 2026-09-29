import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, actions: new Map<string, () => unknown>() }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (state.values[index] === undefined) state.values[index] = initial
    return [state.values[index], (value: unknown) => { state.values[index] = value }]
  },
}))
vi.mock('@astryxdesign/core/Button', () => ({ Button: (props: { label: string; 'aria-label'?: string; isDisabled?: boolean; clickAction?: () => unknown; onClick?: () => unknown }) => {
  state.actions.set(props['aria-label'] || props.label, props.clickAction || props.onClick!)
  return <button disabled={props.isDisabled}>{props.label}</button>
} }))

import { PublishSteps, usePublishValidationAttempted } from './PublishSteps'

beforeEach(() => { state.values = []; state.actions.clear() })

it('validates each card, retains earlier fields, and rechecks every card before publishing', async () => {
  const steps = ['基本信息', '内容', '时间', '参与与稻米'].map(label => ({ label, content: <input defaultValue={`${label}已填写`} />, review: `${label}完整预览` }))
  const errors = ['', '', '', '']
  const onError = vi.fn()
  const onPublish = vi.fn().mockResolvedValue(true)
  const onSaveDraft = vi.fn().mockResolvedValue(true)
  const validate = vi.fn((step: number, _publishing?: boolean) => errors[step] || null)
  const render = (busy = false) => {
    state.cursor = 0; state.actions.clear()
    return renderToStaticMarkup(<PublishSteps {...{ steps, busy, onError, onPublish, onSaveDraft, validate }} error="" canSaveDraft publishLabel="发布任务" />)
  }
  errors[0] = '标题不能为空'
  render(); await state.actions.get('下一步')!()
  expect(onError).toHaveBeenLastCalledWith('标题不能为空')
  expect(render()).toContain('第 1 步，共 5 步')
  errors[0] = ''
  for (let i = 0; i < 4; i++) { render(); await state.actions.get('下一步')!() }
  const preview = render()
  expect(preview).toContain('第 5 步，共 5 步')
  for (const step of steps) expect(preview).toContain(step.review)
  expect(onPublish).not.toHaveBeenCalled()
  expect(onSaveDraft).not.toHaveBeenCalled()

  await state.actions.get('修改基本信息')!()
  expect(render()).toContain('基本信息已填写')
  await state.actions.get('返回确认')!()
  render()
  errors[2] = '截止时间已过期'
  await state.actions.get('发布任务')!()
  expect(render()).toContain('第 3 步，共 5 步')
  expect(onPublish).not.toHaveBeenCalled()
  expect(onError).toHaveBeenLastCalledWith('截止时间已过期')
  errors[2] = ''
  await state.actions.get('返回确认')!()
  render(true); await state.actions.get('发布任务')!()
  expect(onPublish).not.toHaveBeenCalled()
  render(); validate.mockClear()
  await state.actions.get('发布任务')!()
  expect(validate.mock.calls.map(([index]) => index)).toEqual([0, 1, 2, 3])
  expect(validate.mock.calls.every(call => call[1] === true)).toBe(true)
  expect(onPublish).toHaveBeenCalledOnce()
})

it('announces validation errors without showing a large alert below the fields', async () => {
  let error = ''
  const Attempted = () => <span data-attempted={usePublishValidationAttempted()} />
  const render = () => {
    state.cursor = 0; state.actions.clear()
    return renderToStaticMarkup(<PublishSteps steps={[{ label: '基本信息', content: <Attempted />, review: '' }]}
      busy={false} error={error} onError={value => { error = value }} validate={() => '请填写任务标题。'}
      canSaveDraft={false} onSaveDraft={async () => false} onPublish={async () => false} publishLabel="发布任务" />)
  }
  render(); await state.actions.get('下一步')!()
  const markup = render()
  expect(markup).toContain('data-attempted="true"')
  expect(markup).toContain('class="visually-hidden" role="alert"')
  expect(markup).not.toContain('class="form-error"')
})
