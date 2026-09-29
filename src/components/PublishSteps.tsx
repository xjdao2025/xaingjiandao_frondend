import { Button } from '@astryxdesign/core/Button'
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'

type PublishStep = { label: string; title?: string; content: ReactNode; review: ReactNode }
const PublishValidationContext = createContext(false)
export const usePublishValidationAttempted = () => useContext(PublishValidationContext)

export function PublishSteps({ steps, busy, error, notice, onError, validate, canSaveDraft, onSaveDraft, onPublish, publishLabel, editing = false }: {
  steps: PublishStep[]
  busy: boolean
  error: string
  notice?: string
  onError: (message: string) => void
  validate: (step: number, publishing?: boolean) => string | null
  canSaveDraft: boolean
  onSaveDraft: () => Promise<boolean>
  onPublish: () => Promise<boolean>
  publishLabel: string
  editing?: boolean
}) {
  const [step, setStep] = useState(0)
  const [returnTo, setReturnTo] = useState<number | null>(null)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const review = step === steps.length
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }) }, [step])

  function go(index: number, backTo: number | null = null) {
    if (busy) return
    onError(''); setValidationAttempted(false); setValidationMessage(''); setStep(index); setReturnTo(backTo)
  }
  function next() {
    if (busy) return
    const message = validate(step)
    if (message) { setValidationAttempted(true); setValidationMessage(message); onError(message); return }
    const target = returnTo ?? step + 1
    go(target)
  }
  async function publish() {
    if (busy) return
    for (let index = 0; index < steps.length; index++) {
      const message = validate(index, true)
      if (message) { go(index, steps.length); setValidationAttempted(true); setValidationMessage(message); onError(message); return }
    }
    await onPublish()
  }

  return <PublishValidationContext.Provider value={validationAttempted}><section className="publish-steps" aria-labelledby={headingId} data-validation-attempted={validationAttempted || undefined}>
    <header className="publish-step-header"><small>第 {step + 1} 步，共 {steps.length + 1} 步</small>{!editing && <Button label="保存草稿" variant="ghost" isDisabled={!canSaveDraft || busy} clickAction={async () => { await onSaveDraft() }} />}</header>
    <h3 id={headingId} ref={heading} tabIndex={-1}>{review ? editing ? '保存前，再看一眼。' : '发布前，再看一眼。' : steps[step].title ?? steps[step].label}</h3>
    <div className="publish-step-fields">{review ? steps.map((item, index) => <section className="publish-review-section" key={item.label}>
      <header><h4>{item.label}</h4><Button label="修改" aria-label={`修改${item.label}`} variant="ghost" isDisabled={busy} onClick={() => go(index, steps.length)} /></header>
      {item.review}
    </section>) : steps[step].content}</div>
    {error && <p className={error === validationMessage ? 'visually-hidden' : 'form-error'} role="alert">{error}</p>}
    {notice && <p className="form-notice" role="status">{notice}</p>}
    <footer className="publish-step-actions">
      {(step > 0 || returnTo !== null) && <Button label={returnTo !== null ? '返回' : '上一步'} variant="ghost" isDisabled={busy} onClick={() => go(returnTo ?? step - 1)} />}
      <Button label={review ? publishLabel : returnTo !== null ? '返回确认' : '下一步'} variant="primary" isLoading={busy} isDisabled={busy} clickAction={review ? publish : async () => next()} />
    </footer>
  </section></PublishValidationContext.Provider>
}
