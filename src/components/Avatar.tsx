import { useState } from 'react'
import { publicAttachmentUrl } from '~/lib/attachments'

export function Avatar({ name, src, size = 'normal' }: { name: string; src?: string | null; size?: 'normal' | 'large' }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageUrl = src ? (/^(blob:|data:)/.test(src) ? src : publicAttachmentUrl(src)) : null
  const initial = Array.from(name.trim())[0]?.toUpperCase() || '?'

  return <span className={`avatar avatar--${size}`} aria-hidden="true">
    {imageUrl && imageUrl !== failedSrc
      ? <img src={imageUrl} alt="" onError={() => setFailedSrc(imageUrl)} />
      : <span className="avatar-initial">{initial}</span>}
  </span>
}
