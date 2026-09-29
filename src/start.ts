import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { serverFunctionFetch } from './lib/server-function-fetch'

export const startInstance = createStart(() => ({
  // A custom start entry replaces Start's implicit CSRF middleware.
  requestMiddleware: [createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })],
  serverFns: { fetch: serverFunctionFetch },
}))
