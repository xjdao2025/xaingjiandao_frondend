import { Button } from '@astryxdesign/core/Button'
import type { ComponentProps, ReactNode } from 'react'

import { DetailDialog } from './DetailDialog'

type ConfirmDialogProps = {
  title: string
  busy: boolean
  error: string
  onClose: () => void
  back: string
  confirm: string
  variant: 'primary' | 'destructive'
  isDisabled?: boolean
  onConfirm: ComponentProps<typeof Button>['clickAction']
  children: ReactNode
}

/** A confirmation step: closing is ignored while busy, and the back button closes it. */
export function ConfirmDialog({ title, busy, error, onClose, back, confirm, variant, isDisabled = false, onConfirm, children }: ConfirmDialogProps) {
  return <DetailDialog title={title} className="post-dialog business-dialog compose-close-dialog" onClose={() => { if (!busy) onClose() }}><div className="business-panel form-stack">
    <p>{children}</p>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="form-actions"><Button label={back} variant="secondary" isDisabled={busy} onClick={() => onClose()} /><Button label={confirm} variant={variant} isDisabled={busy || isDisabled} clickAction={onConfirm} /></div>
  </div></DetailDialog>
}
