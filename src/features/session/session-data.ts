import type { RiceSession, RiceUser } from '~/lib/models'

export type SessionCredentials = Pick<RiceSession, 'token' | 'pds'>

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export function isSessionUser(value: unknown): value is RiceUser {
  return record(value) && text(value.id) && text(value.did) && text(value.handle)
}

export function isPdsSession(value: unknown): value is RiceSession['pds'] {
  return record(value) && ['service', 'did', 'handle', 'access_jwt', 'refresh_jwt'].every((key) => text(value[key]))
}

export function hasSessionCredentials(value: unknown): value is SessionCredentials {
  return record(value) && text(value.token) && isPdsSession(value.pds)
}

export function isRiceSession(value: unknown): value is RiceSession {
  return hasSessionCredentials(value) && 'user' in value && isSessionUser(value.user) && value.user.did === value.pds.did
}
