import { IconButton } from '@astryxdesign/core/IconButton'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function DetailDialog({ title, onClose, children, className = 'post-dialog business-dialog' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className={className} aria-labelledby={titleId}
    onCancel={(event) => {
      if (event.target !== event.currentTarget) return
      event.preventDefault(); event.stopPropagation(); onClose()
    }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="post-dialog-shell">
      <header className="post-dialog-header"><strong id={titleId}>{title}</strong><IconButton label="关闭" icon={<X size={20} />} variant="ghost" onClick={onClose} /></header>
      <div className="post-dialog-scroll">{children}</div>
    </div>
  </dialog>
}
