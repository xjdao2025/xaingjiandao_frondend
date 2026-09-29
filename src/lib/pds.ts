import { BACKEND_BASE, requestJson, type JsonObject } from './http'
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
  const { blob } = await requestJson<{ blob: PdsImage['image'] }>(
    `${BACKEND_BASE}/pds/xrpc/com.atproto.repo.uploadBlob`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': contentType }, body: bytes },
  )
  if (blob?.$type !== 'blob' || !blob.ref?.$link || !POST_IMAGE_TYPES.includes(blob.mimeType) || !Number.isFinite(blob.size) || blob.size <= 0 || blob.size > MAX_POST_IMAGE_BYTES) {
    throw new Error('图片上传失败，请重试。')
  }
  return blob
}

export function pdsBlobUrl(did: string, cid: string) {
  return `/pds/xrpc/com.atproto.sync.getBlob?${new URLSearchParams({ did, cid })}`
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

export function createPdsRecord(
  accessJwt: string,
  body: { repo: string; collection: string; record: JsonObject; rkey?: string },
) {
  return requestJson<{ uri: string; cid: string }>(
    `${BACKEND_BASE}/pds/xrpc/com.atproto.repo.createRecord`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
}

export async function deletePdsRecord(
  accessJwt: string,
  body: { repo: string; collection: string; rkey: string },
) {
  await requestJson(
    `${BACKEND_BASE}/pds/xrpc/com.atproto.repo.deleteRecord`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
}
