import { Button } from '@astryxdesign/core/Button'
import { useRef, useState } from 'react'
import { AutoLoadMore } from '~/components/AutoLoadMore'
import { TextArea } from '~/components/AutoTextArea'
import { ContentCardHeader } from '~/components/ContentCardHeader'
import { LoadingState } from '~/components/LoadingState'
import { formatTimestamp } from '~/lib/format'
import { LoginLink } from '../session/LoginLink'
import { readStoredSession, useStoredSession } from '../session/session'
import { getProposalComments, postProposalComment, type ProposalComment } from './api'
import { useGovernanceList } from './useGovernanceList'
import './proposal-comments.css'
import { errorMessage } from '~/lib/util'

const MAX_COMMENT_LENGTH = 512

export function ProposalComments({ proposalId }: { proposalId: string }) {
  const { session, isReady } = useStoredSession()
  const token = session?.token
  const comments = useGovernanceList<ProposalComment>(proposalId, (before) => getProposalComments({ data: { id: proposalId, before } }), '评论加载失败。')
  const { page, loading, error } = comments
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const sending = useRef(false)

  const submit = async () => {
    const body = draft.trim()
    if (!token || !page || !body || body.length > MAX_COMMENT_LENGTH || sending.current || readStoredSession()?.token !== token) return
    const version = comments.version()
    sending.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      const created = await postProposalComment({ data: { id: proposalId, token, body } })
      if (version !== comments.version() || readStoredSession()?.token !== token) return
      comments.update((current) => ({ ...current, data: [created, ...current.data.filter((item) => item.id !== created.id)] }))
      setDraft('')
    } catch (reason) {
      if (version === comments.version() && readStoredSession()?.token === token) setSubmitError(errorMessage(reason, '评论发布失败。'))
    } finally {
      sending.current = false
      setSubmitting(false)
    }
  }

  return <section className="business-section reply-section proposal-comments" aria-label="提案评论">
    <h2>评论</h2>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!page && (error ? <Button label="重试" variant="secondary" onClick={comments.retry} /> : <LoadingState label="正在加载评论…" />)}
    {page && page.data.length > 0 && <div className="reply-list">
      {page.data.map((comment) => <article className="reply-row" key={comment.id}>
        <ContentCardHeader name={comment.author?.nickname || comment.author?.handle || '用户'} profileActor={comment.author?.did} avatarUrl={comment.author?.avatar?.url} timestamp={formatTimestamp(comment.inserted_at)} />
        <p>{comment.body}</p>
      </article>)}
    </div>}
    {page?.meta.next_cursor && <AutoLoadMore cursor={page.meta.next_cursor} loading={loading} failed={!!error} onLoadMore={comments.more} />}
    {isReady && (session ? <div className="reply-composer">
      <TextArea label="评论内容" isLabelHidden value={draft} onChange={setDraft} maxLength={MAX_COMMENT_LENGTH} width="100%" placeholder="发表你的评论…" isDisabled={submitting} />
      {submitError && <p className="inline-error" role="alert">{submitError}</p>}
      <div className="form-actions"><Button label="发表评论" variant="primary" clickAction={submit} isLoading={submitting} isDisabled={!page || !draft.trim() || draft.length > MAX_COMMENT_LENGTH || submitting} /></div>
    </div> : <LoginLink className="primary-link">登录后发表评论</LoginLink>)}
  </section>
}
