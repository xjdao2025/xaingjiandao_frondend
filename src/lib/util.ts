export const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback

/** Concatenation order, one entry per key: the first position wins, the last value replaces it. */
export const mergeBy = <T,>(items: T[], key: (item: T) => unknown) => [...new Map(items.map((item) => [key(item), item])).values()]
