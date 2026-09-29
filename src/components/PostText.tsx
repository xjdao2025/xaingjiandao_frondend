import { Link } from '@tanstack/react-router'

import { postTextParts } from '~/features/feed/tags'

export function PostText({ text }: { text: string }) {
  return postTextParts(text).map((part, index) => part.isTag ? (
    <Link
      to="/search"
      search={{ q: part.value }}
      className="post-tag-link"
      aria-label={`搜索标签 ${part.value}`}
      onClick={(event) => event.stopPropagation()}
      key={`${part.value}:${index}`}
    >
      {part.value}
    </Link>
  ) : part.value)
}
