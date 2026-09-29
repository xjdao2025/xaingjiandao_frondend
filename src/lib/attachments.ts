import type { RiceAttachment } from './models'

export function publicAttachmentUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `/${path.replace(/^\/+/, '')}`
}

export function attachmentImages(attachments: RiceAttachment[] = []) {
  return attachments.map((image) => ({ src: publicAttachmentUrl(image.url), alt: image.filename }))
}
