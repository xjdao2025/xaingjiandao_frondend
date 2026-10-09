import { backend, type BackendInit, type JsonObject } from './http'
import { IMAGE_TYPES, MAX_IMAGE_COUNT } from './images'
import type { PdsImage } from './models'

// The deployed PDS image lexicon still limits each blob to 1,000,000 bytes.
export const MAX_POST_IMAGE_BYTES = 1_000_000
export const MAX_POST_IMAGES = MAX_IMAGE_COUNT
export const POST_IMAGE_TYPES = IMAGE_TYPES
export const MAX_POST_TEXT_LENGTH = 300

export async function uploadPdsImage(accessJwt: string, base64: string, contentType: string) {
  if (!POST_IMAGE_TYPES.includes(contentType)) throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片。')
  if (!base64 || base64.length > Math.ceil(MAX_POST_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('帖子图片每张不能超过 1 MB。')
  }
  const bytes = Buffer.from(base64, 'base64')
  if (!bytes.length || bytes.length > MAX_POST_IMAGE_BYTES) throw new Error('帖子图片每张不能超过 1 MB。')
  const { blob } = await backend<{ blob: PdsImage['image'] }>('/pds/xrpc/com.atproto.repo.uploadBlob', {
    method: 'POST', token: accessJwt, headers: { 'Content-Type': contentType }, body: bytes,
  })
  if (blob?.$type !== 'blob' || !blob.ref?.$link || !POST_IMAGE_TYPES.includes(blob.mimeType) || !Number.isFinite(blob.size) || blob.size <= 0 || blob.size > MAX_POST_IMAGE_BYTES) {
    throw new Error('图片上传失败，请重试。')
  }
  return blob
}

// rice 按档位缩好的 WebP（见 Rice.Thumbs）：信息流 800px 约 100KB，原图要 1MB
export function thumbUrl(preset: 'feed' | 'full' | 'avatar', did: string, cid: string) {
  return `/img/${preset}/${did}/${cid}`
}

const APPVIEW_AVATAR = /\/img\/avatar\/plain\/(did:plc:[a-z2-7]+)\/(bafkrei[a-z2-7]+)@/
export function avatarUrl(url: string) {
  const match = APPVIEW_AVATAR.exec(url)
  return match ? thumbUrl('avatar', match[1], match[2]) : url
}

export function appviewImageUrl(url: string) {
  try {
    const parsed = new URL(url)
    const origins = (process.env.XIANGJIAN_APPVIEW_IMAGE_ORIGINS ?? '').split(',').map((origin) => origin.trim())
    return origins.includes(parsed.origin) && parsed.pathname.startsWith('/img/')
      ? `/bsky${parsed.pathname}${parsed.search}`
      : url
  } catch { return url }
}

let lastPostTimestamp = 0n
export function newPostRecordKey() {
  // AT Protocol TID: microsecond timestamp, 10-bit clock ID, sortable base32.
  // https://atproto.com/specs/tid
  lastPostTimestamp = BigInt(Math.max(Date.now() * 1000, Number(lastPostTimestamp) + 1))
  const clock = crypto.getRandomValues(new Uint16Array(1))[0] & 1023
  return ((lastPostTimestamp << 10n) | BigInt(clock)).toString(32).padStart(13, '0')
    .replace(/./g, (digit) => '234567abcdefghijklmnopqrstuvwxyz'[parseInt(digit, 32)])
}

export function recordKeyFromUri(uri: string, collection: string) {
  const parts = uri.split('/')
  const collectionIndex = parts.lastIndexOf(collection)
  const recordKey = parts[collectionIndex + 1]
  if (collectionIndex < 0 || !recordKey) throw new Error('记录地址无效')
  return recordKey
}

/** GET an XRPC method: signed-in readers use their PDS, guests the public AppView. */
export function xrpcGet<T>(method: string, params: URLSearchParams, accessJwt?: string) {
  return backend<T>(`/${accessJwt ? 'pds' : 'bsky'}/xrpc/${method}?${params}`, { token: accessJwt })
}

export function pdsGet<T>(method: string, params: URLSearchParams | string, accessJwt: string) {
  return backend<T>(`/pds/xrpc/${method}?${params}`, { token: accessJwt })
}

export function pdsPost<T = JsonObject>(method: string, accessJwt: string, init?: BackendInit) {
  return backend<T>(`/pds/xrpc/${method}`, { method: 'POST', token: accessJwt, ...init })
}

export function createPdsRecord(
  accessJwt: string,
  body: { repo: string; collection: string; record: JsonObject; rkey?: string },
) {
  return pdsPost<{ uri: string; cid: string }>('com.atproto.repo.createRecord', accessJwt, { json: body })
}

export async function deletePdsRecord(accessJwt: string, body: { repo: string; collection: string; rkey: string }) {
  await pdsPost('com.atproto.repo.deleteRecord', accessJwt, { json: body })
}

export function deleteOwnRecord(accessJwt: string, did: string, collection: string, uri: string) {
  return deletePdsRecord(accessJwt, { repo: did, collection, rkey: recordKeyFromUri(uri, collection) })
}
