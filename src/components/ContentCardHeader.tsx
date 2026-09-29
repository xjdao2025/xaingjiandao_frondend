import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Avatar } from './Avatar'

export function ContentCardHeader({
  name,
  timestamp,
  profileActor,
  aside,
  avatarUrl,
  onAuthorClick,
}: {
  name: string
  timestamp: string
  profileActor?: string
  aside?: ReactNode
  avatarUrl?: string
  onAuthorClick?: () => void
}) {
  const authorTarget = (content: ReactNode, className: string, label?: string) => onAuthorClick ? (
    <button type="button" className={className} aria-label={label} onClick={onAuthorClick}>{content}</button>
  ) : profileActor ? (
    <Link to="/profile/$actor" params={{ actor: profileActor }} className={className} aria-label={label}>{content}</Link>
  ) : content

  return (
    <header className="content-card-header">
      <div className="content-card-author">
        {authorTarget(<Avatar name={name} src={avatarUrl} />, 'content-card-avatar-link', `查看 ${name} 的详情`)}
        <span className="content-card-author-copy">
          {authorTarget(<strong>{name}</strong>, 'content-card-name-link')}
          <time className="content-card-time">{timestamp}</time>
        </span>
      </div>
      {aside}
    </header>
  )
}
