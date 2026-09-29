// Only retain in-app destinations; a login link must never become an open redirect.
export function loginReturnTo(value: unknown) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) &&
    !/[\\\u0000-\u0020]/.test(value) && !/^\/login(?:[/?#]|$)/.test(value)
    ? value : '/'
}
