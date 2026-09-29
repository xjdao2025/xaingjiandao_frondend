import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { HistoryChanges } from './HistoryChanges'

it('shows only changed fields and retains the old and new image order', () => {
  const html = renderToStaticMarkup(<HistoryChanges
    before={{ title: '旧标题', description: '不变', node_id: 'old-node', node_name: '旧社区', attachment_ids: ['old-2', 'old-1'] }}
    after={{ title: '新标题', description: '不变', node_id: 'new-node', node_name: '新社区', attachment_ids: ['new-1', 'new-2'] }}
    fields={[['title', '标题'], ['description', '说明'], ['node_id', '所属社区'], ['attachment_ids', '图片']]}
  />)
  expect(html).toContain('旧标题')
  expect(html).toContain('新标题')
  expect(html).not.toContain('不变')
  expect(html).toContain('旧社区')
  expect(html).toContain('新社区')
  expect(html).not.toContain('old-node')
  expect(html.indexOf('/api/attachments/old-2')).toBeLessThan(html.indexOf('/api/attachments/old-1'))
  expect(html.indexOf('/api/attachments/new-1')).toBeLessThan(html.indexOf('/api/attachments/new-2'))
  const added = renderToStaticMarkup(<HistoryChanges before={{ attachment_ids: [] }} after={{ attachment_ids: ['new-1'] }} fields={[['attachment_ids', '图片']]} />)
  expect(added).toContain('无图片')
})
