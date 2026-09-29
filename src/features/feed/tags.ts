import type { PostCategory, PostView } from '~/lib/models'

export const ACTIVITY_PARTICIPATION_TEXT = '参与活动'

export const POST_CATEGORIES = {
  post: {
    label: '帖子',
    fields: [],
  },
  activity: {
    label: '活动',
    fields: [
      { key: 'deadline', label: '截止时间' },
      { key: 'location', label: '活动地点' },
      { key: 'conditions', label: '参与条件' },
    ],
  },
  product: {
    label: '商品',
    fields: [
      { key: 'price', label: '参考稻米' },
      { key: 'availability', label: '可用状态' },
      { key: 'fulfillment', label: '履约说明' },
    ],
  },
} as const

export function postTags(text: string) {
  return [...new Set(text.match(/#[\p{L}\p{N}_-]+/gu) ?? [])]
}

export function hasPostTag(text: string, tag: string) {
  const expected = (tag.startsWith('#') ? tag : `#${tag}`).toLocaleLowerCase()
  return postTags(text).some((value) => value.toLocaleLowerCase() === expected)
}

export function postCategory(record: PostView['record']): PostCategory {
  return record.xjdaoCategory === 'activity' || record.xjdaoCategory === 'product'
    ? record.xjdaoCategory
    : 'post'
}

export function postFieldValues(text: string, category: PostCategory) {
  const values: Record<string, string> = {}
  for (const field of POST_CATEGORIES[category].fields) {
    const prefix = `${field.label}：`
    const line = text.split('\n').find((value) => value.startsWith(prefix))
    if (line) values[field.key] = line.slice(prefix.length).trim()
  }
  return values
}

export function postDisplayText(text: string, category: PostCategory) {
  const fields = POST_CATEGORIES[category].fields
  return text
    .split('\n')
    .filter((line) => !fields.some((field) => line.startsWith(`${field.label}：`)))
    .join('\n')
    .trim()
}

export function formatPostFieldValue(key: string, value?: string) {
  if (!value) return '—'
  return key === 'deadline' ? value.replace('T', ' ') : value
}

export function postTextParts(text: string) {
  return text
    .split(/(#[\p{L}\p{N}_-]+)/gu)
    .filter(Boolean)
    .map((value) => ({ value, isTag: /^#[\p{L}\p{N}_-]+$/u.test(value) }))
}
