import type { CustomFetch } from '@tanstack/react-start'
import { fetchWithTimeout, UPLOAD_REQUEST_TIMEOUT_MS } from './http'

export class PageReloadRequiredError extends Error {
  constructor() {
    super('页面可能已更新，请刷新页面后重试。')
    this.name = 'PageReloadRequiredError'
  }
}

export function needsPageReload(error: unknown) {
  return error instanceof Error && (
    error.name === 'PageReloadRequiredError' ||
    error.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Failed to load module script/i.test(error.message)
  )
}

// Start's ordinary JSON branch can unwrap an HTTP error as an undefined result.
// Check its transport boundary once, leaving serialized business errors intact.
export const serverFunctionFetch: CustomFetch = async (input, init) => {
  // RPCs may include uploads; backend JSON calls keep their shorter timeout.
  const response = await fetchWithTimeout(input, init, UPLOAD_REQUEST_TIMEOUT_MS, (response) => response)

  if (response.headers.has('x-tss-serialized') || response.headers.get('x-tss-raw') === 'true') return response

  const body: unknown = response.headers.get('content-type')?.includes('application/json')
    ? await response.clone().json().catch(() => null)
    : null
  const envelope = body && typeof body === 'object' ? body as Record<string, unknown> : null
  if (envelope?.isSerializedRedirect || envelope?.isNotFound === true) return response
  if (response.ok && envelope && Object.hasOwn(envelope, 'result')) return response

  if (response.status === 401) throw new Error('登录状态已失效，请重新登录。')
  if (response.status === 403) throw new Error('请求验证失败，请刷新页面后重试。')
  if (!response.ok && response.status !== 404 && !envelope?.unhandled) {
    throw new Error('服务暂时不可用，请稍后重试。')
  }
  throw new PageReloadRequiredError()
}
