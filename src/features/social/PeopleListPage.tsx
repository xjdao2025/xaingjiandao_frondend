import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { authorDisplayName } from '~/lib/format'
import { Avatar } from '~/components/Avatar'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import type { SocialConnectionPage } from '~/lib/models'

import { useStoredSession } from '../session/session'
import {
  getSocialConnections,
  type SocialConnectionKind,
} from './api'

export function PeopleListPage({
  actor,
  kind,
  initialPage,
  loaderAccessJwt,
}: {
  actor: string
  kind: SocialConnectionKind
  initialPage: SocialConnectionPage
  loaderAccessJwt: string | null
}) {
  const { session, isReady } = useStoredSession()
  const router = useRouter()
  const [more, setMore] = useState<{ base: SocialConnectionPage; page: SocialConnectionPage } | null>(null)
  const [failure, setFailure] = useState<{ base: SocialConnectionPage; message: string } | null>(null)
  const [isLoading, setLoading] = useState(false)
  const request = useRef(0)
  const page = more?.base === initialPage ? more.page : initialPage
  const error = failure?.base === initialPage ? failure.message : ''
  const title = kind === 'followers' ? '粉丝' : '关注'

  const load = async () => {
    if (!page.cursor || isLoading || loaderAccessJwt !== (session?.pds.access_jwt ?? null)) return
    const currentRequest = request.current
    setLoading(true)
    setFailure(null)
    try {
      const next = await getSocialConnections({
        data: {
          actor,
          kind,
          cursor: page.cursor,
          accessJwt: loaderAccessJwt ?? undefined,
        },
      })
      if (currentRequest !== request.current) return
      setMore({ base: initialPage, page: {
        subject: next.subject,
        profiles: [...new Map([...page.profiles, ...next.profiles].map((profile) => [profile.did, profile])).values()],
        cursor: next.cursor,
      } })
    } catch (reason) {
      if (currentRequest === request.current) setFailure({ base: initialPage, message: reason instanceof Error ? reason.message : `${title}列表暂时无法显示` })
    } finally {
      if (currentRequest === request.current) setLoading(false)
    }
  }

  useEffect(() => {
    ++request.current
    setLoading(false)
    setFailure(null)
    return () => { ++request.current }
  }, [actor, kind, initialPage, session?.pds.access_jwt])
  useEffect(() => { if (isReady && loaderAccessJwt !== (session?.pds.access_jwt ?? null)) void router.invalidate({ filter: (match) => match.routeId === `/profile/$actor/${kind}` }) }, [isReady, loaderAccessJwt, session?.pds.access_jwt, kind, router])

  return (
    <div className="page people-list-page">
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      {page.profiles.length ? (
        <div className="people-list">
          {page.profiles.map((profile) => (
            <Link
              to="/profile/$actor"
              params={{ actor: profile.did }}
              className="person-row"
              key={profile.did}
            >
              <Avatar name={authorDisplayName(profile)} src={profile.avatar} />
              <span className="person-copy">
                <strong>{authorDisplayName(profile)}</strong>
                <small>@{profile.handle}</small>
                {profile.description ? <p>{profile.description}</p> : null}
              </span>
            </Link>
          ))}
        </div>
      ) : !error ? (
        <div className="empty-panel">
          <EmptyState
            title={kind === 'followers' ? '还没有粉丝' : '还没有关注任何人'}
            description="这里会显示真实的关注关系。"
          />
        </div>
      ) : null}
      {page.cursor && <AutoLoadMore key={`${actor}:${kind}:${session?.pds.did}`} cursor={page.cursor} loading={isLoading} failed={!!error} onLoadMore={load} />}
    </div>
  )
}
