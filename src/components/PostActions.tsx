import { Button } from '@astryxdesign/core/Button'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@tanstack/react-router'
import { Heart, MessageCircle, PackageCheck, Repeat2, Trash2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { clearCachedFeed, deletePost, hideDeletedPost, loadCachedThread, ownedInteractionUri, toggleLike, toggleRepost } from '~/features/feed/api'
import { postCategory, postFieldValues } from '~/features/feed/tags'
import type { PostView, RiceSession } from '~/lib/models'
import { useStoredSession } from '~/features/session/session'
import { errorMessage } from '~/lib/util'

export type RepostChange = { post: PostView; reason?: NonNullable<PostView['reason']> }

export type PostActionsProps = {
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

const viewerState = (post: PostView, did: string) => ({
  likeUri: ownedInteractionUri(post.viewer?.like, did, 'app.bsky.feed.like'),
  repostUri: ownedInteractionUri(post.viewer?.repost, did, 'app.bsky.feed.repost'),
  likeCount: post.likeCount ?? 0,
  repostCount: post.repostCount ?? 0,
})

function SessionPostActions({ post, commentCount, onOpenComments, commentAction, onRepostChange, onPostDeleted, session }: PostActionsProps & { session: RiceSession }) {
  const [{ likeUri, repostUri, likeCount, repostCount }, setViewer] = useState(() => viewerState(post, session.pds.did))
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
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
  const canDelete = session.pds.did === post.author.did && !post.record.reply

  useEffect(() => { setViewer(viewerState(post, session.pds.did)) }, [post, session.pds.did])

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

  const run = async (kind: 'like' | 'repost' | 'delete', fallback: string, action: () => Promise<void>) => {
    if (pending) return
    setPending(kind)
    setError('')
    try {
      await action()
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason, fallback))
    } finally {
      if (mounted.current) setPending(null)
    }
  }
  const interaction = { did: session.pds.did, accessJwt: session.pds.access_jwt, postUri: post.uri, postCid: post.cid }

  const handleLike = () => run('like', '点赞失败', async () => {
    const result = await toggleLike({ data: { ...interaction, recordUri: likeUri } })
    if (!mounted.current) return
    clearCachedFeed(session.pds.did)
    setViewer((viewer) => ({ ...viewer, likeCount: Math.max(0, viewer.likeCount + (likeUri ? -1 : 1)), likeUri: result.recordUri ?? undefined }))
  })

  const handleRepost = () => run('repost', '转发失败', async () => {
    const result = await toggleRepost({ data: { ...interaction, recordUri: repostUri } })
    if (!mounted.current) return
    clearCachedFeed(session.pds.did)
    const nextUri = result.recordUri ?? undefined
    setViewer((viewer) => ({ ...viewer, repostCount: Math.max(0, viewer.repostCount + (repostUri ? -1 : 1)), repostUri: nextUri }))
    onRepostChange?.({
      post,
      reason: nextUri && result.indexedAt ? {
        $type: 'app.bsky.feed.defs#reasonRepost',
        by: { did: session.pds.did, handle: session.pds.handle, displayName: session.user.nickname ?? undefined },
        uri: nextUri,
        indexedAt: result.indexedAt,
      } : undefined,
    })
  })

  const handleDelete = async () => {
    if (!canDelete || pending || !window.confirm('删除后无法恢复，确定删除这条帖子吗？')) return
    await run('delete', '删除失败', async () => {
      await deletePost({ data: { did: session.pds.did, accessJwt: session.pds.access_jwt, uri: post.uri } })
      if (!mounted.current) return
      hideDeletedPost(post.uri, session.pds.did)
      onPostDeleted?.(post.uri)
    })
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
          <Button label={commentAction === 'reply' ? '回复评论' : commentLabel} variant="ghost" size="sm"
            icon={<MessageCircle size={18} aria-hidden="true" />} className="post-action" onClick={onOpenComments}>
            {commentAction === 'reply' ? '回复' : exactCount ?? '评论'}
          </Button>
        ) : (
          <Link to="/posts" search={{ uri: post.uri }} hash="reply" className="post-action" aria-label={commentLabel}>
            <MessageCircle size={18} aria-hidden="true" />
            {exactCount ?? '评论'}
          </Link>
        )}
        {category === 'post' ? (
          <Button label={repostUri ? '取消转发' : '转发'} variant="ghost" size="sm" icon={<Repeat2 size={18} aria-hidden="true" />}
            className={`post-action ${repostUri ? 'active' : ''}`} clickAction={handleRepost} isDisabled={pending !== null} aria-pressed={Boolean(repostUri)}>
            {repostCount}
          </Button>
        ) : null}
        <Button label={likeUri ? '取消点赞' : '点赞'} variant="ghost" size="sm" icon={<Heart size={18} fill={likeUri ? 'currentColor' : 'none'} aria-hidden="true" />}
          className={`post-action ${likeUri ? 'active' : ''}`} clickAction={handleLike} isDisabled={pending !== null} aria-pressed={Boolean(likeUri)}>
          {likeCount}
        </Button>
        {canDelete ? (
          <IconButton label="删除帖子" variant="ghost" size="sm" icon={<Trash2 size={18} aria-hidden="true" />} className="post-action"
            clickAction={handleDelete} isLoading={pending === 'delete'} isDisabled={pending !== null} />
        ) : null}
      </div>
      {error ? <div className="post-action-error" role="status">{error}</div> : null}
    </>
  )
}
