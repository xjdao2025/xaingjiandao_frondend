import { useEffect, useState } from 'react'
import { getAuthOptions, type AuthOptions } from './api'

export function useAuthOptions() {
  const [options, setOptions] = useState<AuthOptions>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getAuthOptions().then((value) => { if (active) setOptions(value) })
      .catch(() => { if (active) setError('登录方式暂时无法获取，请刷新后重试。') })
    return () => { active = false }
  }, [])
  return { options, error }
}
