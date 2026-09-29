import type { NotificationView } from '~/lib/models'
import { NOTIFICATIONS_READ_EVENT } from './api'

type LocalState = Record<string, 'read' | 'hidden'>
export const NOTIFICATION_STORAGE_PREFIX = 'xiangjian-notifications:'

export function notificationSource(notification: NotificationView) {
  return notification.subjectType || notification.taskId ? 'business' : 'social'
}

function notificationKey(notification: NotificationView) {
  return JSON.stringify([notificationSource(notification), notification.uri, notification.reason])
}

export function mergeNotificationRows(current: NotificationView[], next: NotificationView[]) {
  return [...new Map([...current, ...next].map((notification) => [notificationKey(notification), notification])).values()]
    .sort((a, b) => b.indexedAt.localeCompare(a.indexedAt))
}

function readState(account: string): LocalState {
  if (typeof window === 'undefined') return {}
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(NOTIFICATION_STORAGE_PREFIX + account) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).filter(([, state]) => state === 'read' || state === 'hidden')) : {}
  } catch { return {} }
}

export function applyNotificationState(account: string, notifications: NotificationView[]) {
  const state = readState(account)
  return notifications.filter((notification) => state[notificationKey(notification)] !== 'hidden')
    .map((notification) => state[notificationKey(notification)] === 'read' ? { ...notification, isRead: true } : notification)
}

// ponytail: precise reads and dismissals stay in this browser; shared sync needs a per-notification inbox API.
export function saveNotificationState(account: string, notifications: NotificationView[], state: 'read' | 'hidden') {
  const next = readState(account)
  for (const notification of notifications) {
    if (next[notificationKey(notification)] !== 'hidden') next[notificationKey(notification)] = state
  }
  window.localStorage.setItem(NOTIFICATION_STORAGE_PREFIX + account, JSON.stringify(next))
  window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT))
}
