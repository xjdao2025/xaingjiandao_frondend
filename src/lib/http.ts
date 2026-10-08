import { businessCopy } from './business-copy'

export const BACKEND_BASE =
  process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006'

const JSON_REQUEST_TIMEOUT_MS = 30_000
export const UPLOAD_REQUEST_TIMEOUT_MS = 120_000

export type JsonObject = Record<string, unknown>

export class RequestError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message)
  }
}

export function isSessionAuthError(error: unknown) {
  return error instanceof RequestError && error.status < 500 && (
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
  const parsed = await response.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null
    throw error
  })
  if (response.ok && (parsed === null || typeof parsed !== 'object')) {
    throw new Error('服务返回的数据不完整，请稍后重试。')
  }
  const body = (parsed && typeof parsed === 'object' ? parsed : {}) as JsonObject
  if (response.ok) return body

  const errors = body.errors as JsonObject | undefined
  const code = typeof body.error === 'string' ? body.error : ''
  if (Object.hasOwn(errorMessages, code)) {
    const message = response.status >= 500 && ['ExpiredToken', 'InvalidToken', 'JwtExpired', 'AuthMissing'].includes(code)
      ? '服务暂时不可用，请稍后重试。' : errorMessages[code]
    throw new RequestError(message, response.status, code)
  }

  const detail =
    (typeof errors?.detail === 'string' && errors.detail) ||
    (typeof body.message === 'string' && body.message)
  const fieldError = errors
    ? Object.values(errors).find((value) => Array.isArray(value) && typeof value[0] === 'string')
    : undefined
  throw new RequestError(
    businessCopy(detail || (Array.isArray(fieldError) ? String(fieldError[0]) : '') ||
      (response.status === 401 ? '请先登录后再试。' : '服务暂时不可用，请稍后重试。')),
    response.status,
    code,
  )
}

/** fetch with a deadline, mapping timeouts and network failures to user-facing errors. */
export async function fetchWithTimeout<T>(
  input: string | URL | Request,
  init: RequestInit | undefined,
  timeoutMs: number,
  read: (response: Response) => T | Promise<T>,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  try {
    return await read(await fetch(input, { ...init, signal }))
  } catch (error) {
    init?.signal?.throwIfAborted()
    if (timeout.aborted) throw new Error('请求超时，请稍后重试。')
    if (error instanceof TypeError) throw new Error('网络连接失败，请检查网络后重试。')
    throw error
  }
}

export function requestJson<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const timeoutMs = init?.body && typeof init.body !== 'string' ? UPLOAD_REQUEST_TIMEOUT_MS : JSON_REQUEST_TIMEOUT_MS
  return fetchWithTimeout(input, init, timeoutMs, async (response) => (await readJson(response)) as T)
}

export const bearer = (token?: string) => token ? { Authorization: `Bearer ${token}` } : undefined

export type BackendInit = Omit<RequestInit, 'headers'> & { token?: string; json?: unknown; headers?: Record<string, string> }

/** Calls the rice backend; `json` becomes the body, and headers stay undefined when none apply. */
export function backend<T = JsonObject>(path: string, { token, json, headers, ...init }: BackendInit = {}) {
  const merged = { ...bearer(token), ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }
  return requestJson<T>(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: Object.keys(merged).length ? merged : undefined,
    ...(json === undefined ? {} : { body: JSON.stringify(json) }),
  })
}

export async function backendData<T>(path: string, init?: BackendInit) {
  return (await backend<{ data: T }>(path, init)).data
}

type QueryValue = string | number | boolean | null | undefined

/** Builds query params in key order, skipping undefined, null, false and empty strings (but not 0). */
export function searchParams(entries: Record<string, QueryValue>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== null && value !== false && value !== '') query.set(key, String(value))
  }
  return query
}

export function withQuery(path: string, entries: Record<string, QueryValue>) {
  const query = searchParams(entries)
  return query.size ? `${path}?${query}` : path
}
