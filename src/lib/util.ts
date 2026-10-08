import { RequestError } from './http'

export const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback

/** Concatenation order, one entry per key: the first position wins, the last value replaces it. */
export const mergeBy = <T,>(items: T[], key: (item: T) => unknown) => [...new Map(items.map((item) => [key(item), item])).values()]

/** Same content, same retry id for as long as the map lives: a timed-out send retried later can only be charged once. */
export const requestIdFor = (ids: Map<string, string>, key: string) => ids.get(key) ?? ids.set(key, crypto.randomUUID()).get(key)!

/** A 4xx means the server refused it; a timeout, network error or 5xx may still have gone through. */
export const sendErrorMessage = (reason: unknown, fallback: string) => {
  const message = errorMessage(reason, fallback)
  return reason instanceof RequestError && reason.status < 500 ? message : `${message} 可能已经送出，改动前请先查看稻米记录。`
}
