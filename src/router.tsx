import { createRouter, Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import { needsPageReload } from './lib/server-function-fetch'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    // Keep the current screen until the next route's required data is ready.
    defaultPendingMs: Infinity,
    defaultErrorComponent: RouteLoadError,
    scrollRestoration: true,
  })
}

function RouteLoadError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const reload = needsPageReload(error)
  return <div className="page"><h1>{reload ? '页面需要刷新' : '页面暂时无法加载'}</h1><p role="alert">{reload ? '页面可能已更新，请刷新页面后重试。' : '请检查网络后重试。'}</p><div className="button-row"><button type="button" className="primary-link" onClick={() => { if (reload) window.location.reload(); else void router.invalidate().then(reset) }}>{reload ? '刷新页面' : '重试'}</button><Link to="/">返回广场</Link></div></div>
}
