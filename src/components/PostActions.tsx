import { Button } from '@astryxdesign/core/Button'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@tanstack/react-router'
import { Heart, MessageCircle, PackageCheck, Repeat2, Trash2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  clearCachedFeed,
  deletePost,
  hideDeletedPost,
  loadCachedThread,
  ownedInteractionUri,
  toggleLike,
  toggleRepost,
} from '~/features/feed/api'
import { postCategory, postFieldValues } from '~/features/feed/tags'
import type { PostView, RiceSession } from '~/lib/models'
import { useStoredSession } from '~/features/session/session'

export type RepostChange = {
  post: PostView
  reason?: NonNullable<PostView['reason']>
}

type PostActionsProps = {
  post: PostView
  commentCount?: number
  onOpenComments?: () => void
  commentAction?: 'reply' | 'hidden'
  onRepostChange?: (change: RepostChange) => void
  onPostDeleted?: (uri: string) => void
}

export function PostActions(props: PostActionsProps) {
  const { session } = useStoredSession()
  return session ? <SessionPostActions key={`${props.post.uri}:${session.pds.did}`} {...props} session={session} /> : null
}

function SessionPostActions({ post, commentCount, onOpenComments, commentAction, onRepostChange, onPostDeleted, session }: PostActionsProps & { session: RiceSession }) {
  const [likeUri, setLikeUri] = useState(() => ownedInteractionUri(post.viewer?.like, session.pds.did, 'app.bsky.feed.like'))
  const [repostUri, setRepostUri] = useState(() => ownedInteractionUri(post.viewer?.repost, session.pds.did, 'app.bsky.feed.repost'))
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0)
  const [repostCount, setRepostCount] = useState(post.repostCount ?? 0)
  const [pending, setPending] = useState<'like' | 'repost' | 'delete' | null>(null)
  const [error, setError] = useState('')
  const category = postCategory(post.record)
  const actions = useRef<HTMLDivElement>(null)
  const [resolvedCount, setResolvedCount] = useState<{ uri: string; direct: number; total: number } | null>(null)
  const needsCount = category === 'post' && !onOpenComments && !commentAction && commentCount === undefined && post.replyCount > 0
  const exactCount = commentCount ?? (needsCount
    ? resolvedCount?.uri === post.uri && resolvedCount.direct === post.replyCount ? resolvedCount.total : undefined
    : !onOpenComments && post.replyCount === 0 ? 0 : undefined)
  const commentLabel = exactCount === undefined ? '评论' : `${exactCount} 条评论`
  const fields = postFieldValues(post.record.text, category)
  const canDelete = Boolean(
    session &&
    session.pds.did === post.author.did &&
    !post.record.reply,
  )

  useEffect(() => {
    setLikeUri(ownedInteractionUri(post.viewer?.like, session.pds.did, 'app.bsky.feed.like'))
    setRepostUri(ownedInteractionUri(post.viewer?.repost, session.pds.did, 'app.bsky.feed.repost'))
    setLikeCount(post.likeCount ?? 0)
    setRepostCount(post.repostCount ?? 0)
  }, [post, session.pds.did])

  useEffect(() => {
    if (!needsCount || exactCount !== undefined || !actions.current) return
    let active = true
    const observer = new IntersectionObserver((entries) => {
      if (!active || !entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void loadCachedThread({ uri: post.uri, did: session.pds.did, accessJwt: session.pds.access_jwt }).then((thread) => {
        if (active) setResolvedCount({ uri: post.uri, direct: post.replyCount, total: thread.replies.length })
      }).catch(() => { /* Keep the count hidden if the thread cannot be loaded. */ })
    })
    observer.observe(actions.current)
    return () => { active = false; observer.disconnect() }
  }, [needsCount, exactCount, post.uri, post.replyCount, session])

  const handleLike = async () => {
    const activeSession = session
    if (pending) return
    setPending('like')
    setError('')
    try {
      const result = await toggleLike({
        data: {
          did: activeSession.pds.did,
          accessJwt: activeSession.pds.access_jwt,
          postUri: post.uri,
          postCid: post.cid,
          recordUri: likeUri,
        },
      })
      if (!mounted.current) return
      clearCachedFeed(activeSession.pds.did)
      setLikeCount((count) => Math.max(0, count + (likeUri ? -1 : 1)))
      setLikeUri(result.recordUri ?? undefined)
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : '点赞失败')
    } finally {
      if (mounted.current) setPending(null)
    }
  }

  const handleRepost = async () => {
    const activeSession = session
    if (pending) return
    setPending('repost')
    setError('')
    try {
      const result = await toggleRepost({
        data: {
          did: activeSession.pds.did,
          accessJwt: activeSession.pds.access_jwt,
          postUri: post.uri,
          postCid: post.cid,
          recordUri: repostUri,
        },
      })
      if (!mounted.current) return
      clearCachedFeed(activeSession.pds.did)
      setRepostCount((count) => Math.max(0, count + (repostUri ? -1 : 1)))
      const nextUri = result.recordUri ?? undefined
      setRepostUri(nextUri)
      onRepostChange?.({
        post,
        reason: nextUri && result.indexedAt
          ? {
              $type: 'app.bsky.feed.defs#reasonRepost',
              by: {
                did: activeSession.pds.did,
                handle: activeSession.pds.handle,
                displayName: activeSession.user.nickname ?? undefined,
              },
              uri: nextUri,
              indexedAt: result.indexedAt,
            }
          : undefined,
      })
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : '转发失败')
    } finally {
      if (mounted.current) setPending(null)
    }
  }

  const handleDelete = async () => {
    if (!session || !canDelete || pending) return
    if (!window.confirm('删除后无法恢复，确定删除这条帖子吗？')) return

    setPending('delete')
    setError('')
    try {
      await deletePost({
        data: {
          did: session.pds.did,
          accessJwt: session.pds.access_jwt,
          uri: post.uri,
        },
      })
      if (!mounted.current) return
      hideDeletedPost(post.uri, session.pds.did)
      onPostDeleted?.(post.uri)
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : '删除失败')
    } finally {
      if (mounted.current) setPending(null)
    }
  }

  return (
    <>
      <div ref={actions} className="content-card-actions post-actions" aria-label="帖子互动">
        {commentAction === 'hidden' ? null : category === 'activity' ? (
          <span className="post-action special-post-state" aria-label={`${post.replyCount ?? 0} 人参与`}>
            <Users size={18} aria-hidden="true" /> 参与 {post.replyCount ?? 0}
          </span>
        ) : category === 'product' ? (
          <span className="post-action special-post-state" aria-label={`商品状态：${fields.availability || '待确认'}`}>
            <PackageCheck size={18} aria-hidden="true" /> {fields.availability || '状态待确认'}
          </span>
        ) : onOpenComments ? (
          <Button
            label={commentAction === 'reply' ? '回复评论' : commentLabel}
            variant="ghost"
            size="sm"
            icon={<MessageCircle size={18} aria-hidden="true" />}
            className="post-action"
            onClick={onOpenComments}
          >
            {commentAction === 'reply' ? '回复' : exactCount ?? '评论'}
          </Button>
        ) : (
          <Link
            to="/posts"
            search={{ uri: post.uri }}
            hash="reply"
            className="post-action"
            aria-label={commentLabel}
          >
            <MessageCircle size={18} aria-hidden="true" />
            {exactCount ?? '评论'}
          </Link>
        )}
        {category === 'post' ? (
          <Button
            label={repostUri ? '取消转发' : '转发'}
            variant="ghost"
            size="sm"
            icon={<Repeat2 size={18} aria-hidden="true" />}
            className={`post-action ${repostUri ? 'active' : ''}`}
            clickAction={handleRepost}
            isDisabled={pending !== null}
            aria-pressed={Boolean(repostUri)}
          >
            {repostCount}
          </Button>
        ) : null}
        <Button
          label={likeUri ? '取消点赞' : '点赞'}
          variant="ghost"
          size="sm"
          icon={<Heart size={18} fill={likeUri ? 'currentColor' : 'none'} aria-hidden="true" />}
          className={`post-action ${likeUri ? 'active' : ''}`}
          clickAction={handleLike}
          isDisabled={pending !== null}
          aria-pressed={Boolean(likeUri)}
        >
          {likeCount}
        </Button>
        {canDelete ? (
          <IconButton
            label="删除帖子"
            variant="ghost"
            size="sm"
            icon={<Trash2 size={18} aria-hidden="true" />}
            className="post-action"
            clickAction={handleDelete}
            isLoading={pending === 'delete'}
            isDisabled={pending !== null}
          />
        ) : null}
      </div>
      {error ? <div className="post-action-error" role="status">{error}</div> : null}
    </>
  )
}
