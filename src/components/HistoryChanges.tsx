import { ImageGroup } from './ContentImages'
import { formatTimestamp } from '~/lib/format'
import type { HistorySnapshot } from '~/lib/models'

const dates = new Set(['application_deadline', 'execution_deadline', 'starts_at', 'ends_at'])

export function HistoryChanges({ before, after, fields }: {
  before?: HistorySnapshot | null
  after?: HistorySnapshot | null
  fields: Array<[string, string]>
}) {
  if (!before || !after) return null
  const changed = fields.filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
  if (!changed.length) return null
  const value = (key: string, snapshot: HistorySnapshot) => {
    const raw = key === 'node_id' ? snapshot.node_name ?? snapshot.node_id : snapshot[key]
    return raw == null || raw === '' ? '未填写' : dates.has(key) && typeof raw === 'string' ? formatTimestamp(raw) : String(raw)
  }
  return <dl className="publish-review-fields">{changed.map(([key, label]) => <div key={key}><dt>{label}</dt>{key === 'attachment_ids' ? <dd>
    <span>编辑前</span>{(before[key] as string[] | null)?.length ? <ImageGroup images={(before[key] as string[]).map((id, index) => ({ src: `/api/attachments/${encodeURIComponent(id)}`, alt: `编辑前第 ${index + 1} 张图片` }))} /> : <span>无图片</span>}
    <span>编辑后</span>{(after[key] as string[] | null)?.length ? <ImageGroup images={(after[key] as string[]).map((id, index) => ({ src: `/api/attachments/${encodeURIComponent(id)}`, alt: `编辑后第 ${index + 1} 张图片` }))} /> : <span>无图片</span>}
  </dd> : <dd className="publish-review-text">编辑前：{value(key, before)}<br />编辑后：{value(key, after)}</dd>}</div>)}</dl>
}
