import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('./PublishSteps', () => ({ usePublishValidationAttempted: () => true }))
import { PublishTextArea, PublishTextInput } from './PublishFields'

it('puts required prompts inside inputs and marks only empty fields invalid', () => {
  const empty = renderToStaticMarkup(<><PublishTextInput label="任务标题" value="" isRequired /><PublishTextArea label="任务说明" value="" isRequired /></>)
  expect(empty).toContain('placeholder="任务标题（必填）"')
  expect(empty).toContain('placeholder="任务说明（必填）"')
  expect(empty.match(/aria-invalid="true"/g)).toHaveLength(2)
  const filled = renderToStaticMarkup(<PublishTextInput label="任务标题" value="已有标题" isRequired />)
  expect(filled).not.toContain('aria-invalid="true"')
  const withHelp = renderToStaticMarkup(<PublishTextInput label="组织方联系方式" value="" isRequired description="将在详情中公开展示。" />)
  expect(withHelp).toContain('<small aria-hidden="true">将在详情中公开展示。</small>')
})
