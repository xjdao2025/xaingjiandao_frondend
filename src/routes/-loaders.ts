import { readStoredSession } from '~/features/session/session'
import { errorMessage } from '~/lib/util'

/** Whether the stored session still belongs to this account and token. */
export function isStoredSession(accountId: string, token: string) {
  const current = readStoredSession()
  return current?.user.id === accountId && current.token === token
}

/** Loads a detail for the current viewer; failures become a page error tagged with the same viewer. */
export const viewerDeps = () => ({ token: readStoredSession()?.token ?? null })
export async function viewerLoader<K extends string, T>(key: K, token: string | null, load: () => Promise<T>, fallback: string) {
  type Result = Record<K, T | null> & { error: string; viewerToken: string | null }
  try {
    return { [key]: await load(), error: '', viewerToken: token } as Result
  } catch (reason) {
    return { [key]: null, error: errorMessage(reason, fallback), viewerToken: token } as Result
  }
}

/** Background refreshes keep the last page on failure; a first load still throws. */
export type RefreshedPage<T> = { page: T; refreshError: string }
export async function keepPreviousOnError<T>(previous: RefreshedPage<T> | undefined, load: () => Promise<T>): Promise<RefreshedPage<T>> {
  try {
    return { page: await load(), refreshError: '' }
  } catch (error) {
    if (!previous) throw error
    return { ...previous, refreshError: '暂时无法更新，已保留上次显示的内容。' }
  }
}
