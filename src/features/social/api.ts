import { createServerFn } from '@tanstack/react-start'

import { BACKEND_BASE, requestJson } from '~/lib/http'
import type { RicePublicUser, SocialConnectionPage, SocialProfile } from '~/lib/models'
import { appviewImageUrl, createPdsRecord, deletePdsRecord, recordKeyFromUri } from '~/lib/pds'

export type SocialConnectionKind = 'followers' | 'following'

export type UserSearchPage = {
  data: RicePublicUser[]
  meta: { next_cursor: string | null }
}

export async function loadUserSearch(data: { q: string; before?: string }) {
  const q = data.q.trim()
  if (!q) return { data: [], meta: { next_cursor: null } } satisfies UserSearchPage
  const params = new URLSearchParams({ q, limit: '10' })
  if (data.before) params.set('before', data.before)
  return requestJson<UserSearchPage>(`${BACKEND_BASE}/api/users/search?${params}`)
}

export const searchUsers = createServerFn({ method: 'POST' })
  .validator((data: { q: string; before?: string }) => data)
  .handler(({ data }) => loadUserSearch(data))

const authHeaders = (accessJwt?: string) =>
  accessJwt ? { Authorization: `Bearer ${accessJwt}` } : undefined

export function normalizeSocialProfile(value: unknown): SocialProfile {
  const profile = (value ?? {}) as Record<string, unknown>
  if (typeof profile.did !== 'string' || typeof profile.handle !== 'string') {
    throw new Error('用户资料暂时无法显示')
  }

  const viewer = (profile.viewer ?? {}) as Record<string, unknown>
  return {
    did: profile.did,
    handle: profile.handle,
    ...(typeof profile.displayName === 'string' && profile.displayName
      ? { displayName: profile.displayName }
      : {}),
    ...(typeof profile.description === 'string' && profile.description
      ? { description: profile.description }
      : {}),
    ...(typeof profile.avatar === 'string' && profile.avatar
      ? { avatar: appviewImageUrl(profile.avatar) }
      : {}),
    followersCount: typeof profile.followersCount === 'number' ? profile.followersCount : 0,
    followsCount: typeof profile.followsCount === 'number' ? profile.followsCount : 0,
    postsCount: typeof profile.postsCount === 'number' ? profile.postsCount : 0,
    ...(typeof viewer.following === 'string' || typeof viewer.followedBy === 'string'
      ? {
          viewer: {
            ...(typeof viewer.following === 'string' ? { following: viewer.following } : {}),
            ...(typeof viewer.followedBy === 'string' ? { followedBy: viewer.followedBy } : {}),
          },
        }
      : {}),
  }
}

export async function loadSocialProfile(actor: string, accessJwt?: string) {
  const params = new URLSearchParams({ actor })
  const [pds, rice] = await Promise.allSettled([
    requestJson<unknown>(`${BACKEND_BASE}/${accessJwt ? 'pds' : 'bsky'}/xrpc/app.bsky.actor.getProfile?${params}`, { headers: authHeaders(accessJwt) }),
    requestJson<{ data: RicePublicUser }>(`${BACKEND_BASE}/api/users/${encodeURIComponent(actor)}/profile`),
  ])
  const social = pds.status === 'fulfilled' ? normalizeSocialProfile(pds.value) : null
  if (rice.status === 'fulfilled') {
    const profile = rice.value.data
    return { ...(social ?? { followersCount: 0, followsCount: 0, postsCount: 0 }), socialAvailable: Boolean(social), did: profile.did, handle: profile.handle, displayName: profile.nickname || social?.displayName, description: profile.bio || social?.description, avatar: profile.avatar?.url || social?.avatar } satisfies SocialProfile
  }
  if (social) return social
  throw new Error('用户资料暂时无法显示')
}

export async function loadSocialConnections(data: {
  actor: string
  kind: SocialConnectionKind
  cursor?: string
  accessJwt?: string
}): Promise<SocialConnectionPage> {
  const method = data.kind === 'followers' ? 'getFollowers' : 'getFollows'
  const listKey = data.kind === 'followers' ? 'followers' : 'follows'
  const params = new URLSearchParams({ actor: data.actor, limit: '30' })
  if (data.cursor) params.set('cursor', data.cursor)

  const body = await requestJson<Record<string, unknown>>(
    `${BACKEND_BASE}/${data.accessJwt ? 'pds' : 'bsky'}/xrpc/app.bsky.graph.${method}?${params}`,
    { headers: authHeaders(data.accessJwt) },
  )
  const profiles = Array.isArray(body[listKey]) ? body[listKey] : []
  return {
    subject: normalizeSocialProfile(body.subject),
    profiles: profiles.map(normalizeSocialProfile),
    ...(typeof body.cursor === 'string' ? { cursor: body.cursor } : {}),
  }
}

export async function updateFollowRecord(data: {
  did: string
  accessJwt: string
  targetDid: string
  recordUri?: string
}) {
  const collection = 'app.bsky.graph.follow'
  if (data.recordUri) {
    await deletePdsRecord(data.accessJwt, {
      repo: data.did,
      collection,
      rkey: recordKeyFromUri(data.recordUri, collection),
    })
    return { recordUri: null }
  }
  if (data.did === data.targetDid) throw new Error('不能关注自己')

  const record = await createPdsRecord(data.accessJwt, {
    repo: data.did,
    collection,
    record: {
      $type: collection,
      subject: data.targetDid,
      createdAt: new Date().toISOString(),
    },
  })
  return { recordUri: record.uri }
}

export const getSocialProfile = createServerFn({ method: 'POST' })
  .validator((data: { actor: string; accessJwt?: string }) => data)
  .handler(({ data }) => loadSocialProfile(data.actor, data.accessJwt))

export const getSocialConnections = createServerFn({ method: 'POST' })
  .validator((data: {
    actor: string
    kind: SocialConnectionKind
    cursor?: string
    accessJwt?: string
  }) => data)
  .handler(({ data }) => loadSocialConnections(data))

export const toggleFollow = createServerFn({ method: 'POST' })
  .validator((data: {
    did: string
    accessJwt: string
    targetDid: string
    recordUri?: string
  }) => data)
  .handler(({ data }) => updateFollowRecord(data))
