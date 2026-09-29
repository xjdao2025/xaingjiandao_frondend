import { createFileRoute } from '@tanstack/react-router'

import { MyPostsPage } from '~/features/profile/MyPostsPage'

export const Route = createFileRoute('/me/posts')({ component: MyPostsPage })
