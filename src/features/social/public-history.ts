export type HistorySource = 'created' | 'participated'
export type HistoryCursors = Record<HistorySource, string | null>
export type HistoryPage<T> = { data: T[]; meta?: { next_cursor?: string | null } }
export type PublicHistory<T> = { items: T[]; cursors: HistoryCursors }

export const hasMoreHistory = (cursors: HistoryCursors) => Boolean(cursors.created || cursors.participated)

export async function loadPublicHistoryPage<T extends { id: string; inserted_at: string }>(
  fetchPage: (source: HistorySource, before?: string) => Promise<HistoryPage<T>>,
  previous?: PublicHistory<T>,
): Promise<PublicHistory<T>> {
  const sources: HistorySource[] = previous
    ? (['created', 'participated'] as const).filter((source) => Boolean(previous.cursors[source]))
    : ['created', 'participated']
  const pages = await Promise.all(sources.map((source) => fetchPage(source, previous?.cursors[source] ?? undefined)))
  const cursors: HistoryCursors = previous ? { ...previous.cursors } : { created: null, participated: null }
  sources.forEach((source, index) => { cursors[source] = pages[index].meta?.next_cursor ?? null })
  const items = [...new Map([...(previous?.items ?? []), ...pages.flatMap((page) => page.data)].map((item) => [item.id, item])).values()]
    .sort((a, b) => b.inserted_at.localeCompare(a.inserted_at))
  return { items, cursors }
}
