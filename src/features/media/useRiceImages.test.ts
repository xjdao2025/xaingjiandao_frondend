import { expect, it, vi } from 'vitest'
import type { RiceAttachment } from '~/lib/models'
import { uploadImageSelection } from './useRiceImages'

it('reuses successful uploads after a later failure and preserves the edited selection order', async () => {
  const first = new File(['first'], 'first.png', { type: 'image/png' })
  const second = new File(['second'], 'second.png', { type: 'image/png' })
  const attachment = (id: string): RiceAttachment => ({ id, kind: 'image', filename: `${id}.png`, content_type: 'image/png', byte_size: 5, url: `/api/attachments/${id}` })
  const saved = { src: '/api/attachments/existing', alt: '', attachment: attachment('existing') }
  const selected = [{ src: 'blob:first', alt: '', file: first }, { src: 'blob:second', alt: '', file: second }]
  const cache = new WeakMap<File, RiceAttachment>()
  const upload = vi.fn().mockResolvedValueOnce(attachment('first')).mockRejectedValueOnce(new Error('network'))
  await expect(uploadImageSelection([saved, ...selected], cache, upload)).rejects.toThrow('network')
  upload.mockResolvedValueOnce(attachment('second'))
  expect(await uploadImageSelection([selected[1], saved, selected[0]], cache, upload)).toEqual(['second', 'existing', 'first'])
  expect(upload.mock.calls.map(([file]) => file)).toEqual([first, second, second])
  expect(await uploadImageSelection([], cache, upload)).toEqual([])
})
