export type RiceUser = {
  id: string
  did: string
  handle: string
  nickname: string | null
  bio: string | null
  avatar: null | {
    id: string
    kind: string
    filename: string
    content_type: string
    byte_size: number
    url: string
  }
  grain_balance: number
  grain_frozen_balance: number
  node_member: boolean
  can_publish_tasks: boolean
  email: string | null
  phone: string | null
  phone_region: string | null
  wallet_address: string | null
  inserted_at: string
}

export type RiceAttachment = NonNullable<RiceUser['avatar']>
export type HistorySnapshot = Record<string, string | number | string[] | null>
export type RicePublicUser = Pick<
  RiceUser,
  'id' | 'did' | 'handle' | 'nickname' | 'bio' | 'avatar' | 'node_member'
>

export type RiceSession = {
  token: string
  user: RiceUser
  pds: {
    service: string
    did: string
    handle: string
    access_jwt: string
    refresh_jwt: string
  }
}

export type PostCategory = 'post' | 'activity' | 'product'

export type PostImage = {
  src: string
  fullsize?: string
  alt: string
  width?: number
  height?: number
}

export type PdsImage = {
  image: {
    $type: 'blob'
    ref: { $link: string }
    mimeType: string
    size: number
  }
  alt: string
  aspectRatio?: { width: number; height: number }
}

type PostImageEmbed = {
  $type: string
  images?: Array<PdsImage | {
    thumb: string
    fullsize: string
    alt: string
    aspectRatio?: { width: number; height: number }
  }>
  items?: Array<PdsImage & { $type: 'app.bsky.embed.gallery#image' }>
}
type PostEmbed = PostImageEmbed & { media?: PostImageEmbed }

export type PostView = {
  uri: string
  cid: string
  indexedAt: string
  author: {
    did: string
    handle: string
    displayName?: string
    avatar?: string
  }
  record: {
    text: string
    createdAt: string
    xjdaoCategory?: PostCategory
    embed?: PostEmbed
    reply?: {
      root: { uri: string; cid: string }
      parent: { uri: string; cid: string }
    }
  }
  embed?: PostEmbed
  images?: PostImage[]
  replyCount: number
  repostCount: number
  likeCount: number
  viewer?: {
    like?: string
    repost?: string
  }
  reason?: {
    $type: 'app.bsky.feed.defs#reasonRepost'
    by: {
      did: string
      handle: string
      displayName?: string
    }
    uri?: string
    cid?: string
    indexedAt: string
  }
}

export type PostFeed = {
  posts: PostView[]
  cursor?: string | null
}

export type PostThread = {
  post: PostView
  replies: Array<{ post: PostView; parentUri: string }>
}

export type NotificationView = {
  uri: string
  author: {
    did?: string
    handle: string
    displayName?: string
  }
  reason: string
  reasonSubject?: string
  recordSubjectUri?: string
  text: string
  isRead: boolean
  indexedAt: string
  taskId?: string
  subjectType?: string
  subjectId?: string
}

export type SocialProfile = {
  socialAvailable?: boolean
  did: string
  handle: string
  displayName?: string
  description?: string
  avatar?: string
  followersCount: number
  followsCount: number
  postsCount: number
  viewer?: {
    following?: string
    followedBy?: string
  }
}

export type SocialConnectionPage = {
  subject: SocialProfile
  profiles: SocialProfile[]
  cursor?: string
}
