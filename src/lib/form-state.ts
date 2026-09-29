import { useCallback, useEffect, useRef, useState } from 'react'

export type FormCloseState = { dirty: boolean; busy: boolean; saveDraft?: () => Promise<boolean> }

// Server drafts are the saved baseline; unsaved edits stay in this account's mounted form.
export function useFormCloseState(snapshot: string, ready: boolean, busy: boolean, notify: (state: FormCloseState) => void, save: () => Promise<boolean>) {
  const [saved, setSaved] = useState<string | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save
  const saveDraft = useCallback(() => saveRef.current(), [])
  useEffect(() => {
    if (ready && saved === null) setSaved(snapshot)
    notify({ dirty: saved !== null && saved !== snapshot, busy, saveDraft })
  }, [snapshot, ready, busy, notify, saved, saveDraft])
  return () => { setSaved(snapshot); notify({ dirty: false, busy: false, saveDraft }) }
}
