export const BACKEND_BASE =
  process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006'

export type JsonObject = Record<string, unknown>

export class RequestError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message)
  }
}

export function isSessionAuthError(error: unknown) {
  return error instanceof RequestError && (
    (error.status === 401 && error.code !== 'InvalidCredentials') ||
    ['ExpiredToken', 'InvalidToken', 'JwtExpired'].includes(error.code)
  )
}

const errorMessages: Record<string, string> = {
  InvalidCredentials: '账号或密码错误',
  AccountDisabled: '该账号已被禁用',
  LoginUnavailable: '登录服务暂时不可用，请稍后重试。',
  InvalidLoginRequest: '请输入账号和密码。',
  AuthMissing: '请先登录。',
  ExpiredToken: '登录状态已过期，请重新登录。',
  InvalidToken: '登录状态已失效，请重新登录。',
  JwtExpired: '登录状态已过期，请重新登录。',
  invalid_or_expired_ticket: '登录凭证无效或已过期，请重新登录。',
}

export async function readJson(response: Response) {
  if (response.status === 204) return {}
  const parsed = await response.json().catch(() => null)
  if (response.ok && (parsed === null || typeof parsed !== 'object')) {
    throw new Error('服务返回的数据不完整，请稍后重试。')
  }
  const body = (parsed && typeof parsed === 'object' ? parsed : {}) as JsonObject
  if (response.ok) return body

  const errors = body.errors as JsonObject | undefined
  const code = typeof body.error === 'string' ? body.error : ''
  if (Object.hasOwn(errorMessages, code)) throw new RequestError(errorMessages[code], response.status, code)

  const detail =
    (typeof errors?.detail === 'string' && errors.detail) ||
    (typeof body.message === 'string' && body.message)
  const fieldError = errors
    ? Object.values(errors).find((value) => Array.isArray(value) && typeof value[0] === 'string')
    : undefined
  throw new RequestError(
    detail || (Array.isArray(fieldError) ? String(fieldError[0]) : '') ||
      (response.status === 401 ? '请先登录后再试。' : '服务暂时不可用，请稍后重试。'),
    response.status,
    code,
  )
}

export async function requestJson<T>(
  input: string | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    throw new Error('网络连接失败，请检查网络后重试。')
  }
  return (await readJson(response)) as T
}
