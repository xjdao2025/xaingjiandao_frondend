import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'

vi.mock('@tanstack/react-router', async original => ({
  ...await original<typeof import('@tanstack/react-router')>(),
  useNavigate: () => async () => undefined,
  useBlocker: () => undefined,
}))
vi.mock('../session/session', () => ({ useStoredSession: () => ({ session: { token: 'token', user: { id: 'account' }, pds: { did: 'did:example:account' } } as RiceSession, isReady: true }) }))

import { ComposePanel, type ComposeInitialData } from './ComposePanel'

it.each([['task', 'taskDraft', '任务'], ['activity', 'eventDraft', '活动']] as const)('blocks direct edits of completed %s records', (kind, draftKey, label) => {
  const initialData = {
    token: 'token', kind, editId: 'done', managedNodes: [{ id: 'node', name: '社区' }],
    nodesError: '', postDraft: null, postDraftError: '', taskDraft: null, taskDraftError: '', eventDraft: null, eventDraftError: '',
    [draftKey]: { id: 'done', status: 'completed', allowed_actions: ['edit'] },
  } as unknown as ComposeInitialData
  const html = renderToStaticMarkup(<ComposePanel initialKind={kind} editId="done" initialData={initialData} />)
  expect(html).toContain(`此${label}目前不能编辑。`)
})
