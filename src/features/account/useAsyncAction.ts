import { useState } from 'react'

import { errorMessage } from '~/lib/util'

/** Busy/error state for a form action; a failure shows its message or the fallback. */
export function useAsyncAction() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fallback: string, action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (reason) {
      setError(errorMessage(reason, fallback))
    } finally {
      setBusy(false)
    }
  }
  return { error, setError, busy, run }
}
