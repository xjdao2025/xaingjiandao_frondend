export type PostDraft = {
  text: string
  files: File[]
  request: { rkey: string; createdAt: string } | null
}

function draftRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('当前浏览器无法保存帖子草稿。')); return }
    const opening = indexedDB.open('xiangjian-post-drafts', 1)
    let blocked = false
    opening.onupgradeneeded = () => {
      if (!opening.result.objectStoreNames.contains('drafts')) opening.result.createObjectStore('drafts')
    }
    opening.onerror = () => reject(opening.error ?? new Error('无法打开帖子草稿。'))
    opening.onblocked = () => { blocked = true; reject(new Error('帖子草稿暂时不可用，请关闭其他页面后重试。')) }
    opening.onsuccess = () => {
      const database = opening.result
      if (blocked) { database.close(); return }
      database.onversionchange = () => database.close()
      let transaction: IDBTransaction | undefined
      try {
        transaction = database.transaction('drafts', mode)
        const request = run(transaction.objectStore('drafts'))
        transaction.oncomplete = () => { database.close(); resolve(request.result) }
        const fail = () => { database.close(); reject(transaction?.error ?? new Error('帖子草稿保存或读取失败。')) }
        transaction.onerror = fail
        transaction.onabort = fail
      } catch (error) {
        transaction?.abort()
        database.close()
        reject(error)
      }
    }
  })
}

function isPostDraft(value: unknown): value is PostDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<PostDraft>
  return typeof draft.text === 'string' && Array.isArray(draft.files) &&
    draft.files.every(file => typeof File !== 'undefined' && file instanceof File) &&
    (draft.request === null || (typeof draft.request === 'object' &&
      typeof draft.request.rkey === 'string' && typeof draft.request.createdAt === 'string'))
}

export async function readPostDraft(did: string): Promise<PostDraft | null> {
  const value = await draftRequest<unknown>('readonly', store => store.get(did))
  return isPostDraft(value) ? value : null
}

export async function savePostDraft(did: string, draft: PostDraft): Promise<void> {
  await draftRequest('readwrite', store => store.put(draft, did))
}

export async function deletePostDraft(did: string): Promise<void> {
  await draftRequest('readwrite', store => store.delete(did))
}
