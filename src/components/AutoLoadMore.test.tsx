import type { ReactElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({
  refs: [] as Array<{ current: unknown }>, index: 0,
  effect: (() => undefined) as () => void | (() => void),
}))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useRef: (value: unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index - 1] = { current: value }),
  useEffect: (effect: typeof hooks.effect) => { hooks.effect = effect },
}))

import { AutoLoadMore } from './AutoLoadMore'

afterEach(() => { vi.unstubAllGlobals(); hooks.refs = [] })

it('loads each intersecting page once, pauses on failure, and permits only explicit retry until the cursor advances', async () => {
  const observers: Array<{ fire: (visible: boolean) => void; disconnect: ReturnType<typeof vi.fn> }> = []
  vi.stubGlobal('IntersectionObserver', class {
    disconnect = vi.fn()
    observe = vi.fn()
    constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observers.push({ fire: (visible) => callback([{ isIntersecting: visible }]), disconnect: this.disconnect })
    }
  })
  const onLoadMore = vi.fn().mockResolvedValue(undefined)
  let cleanup = () => {}
  const render = (cursor: string, loading = false, failed = false) => {
    cleanup()
    hooks.index = 0
    const view = AutoLoadMore({ cursor, loading, failed, onLoadMore })
    hooks.refs[0].current = {}
    cleanup = hooks.effect() ?? (() => {})
    return view
  }

  render('2')
  observers[0].fire(false)
  expect(onLoadMore).not.toHaveBeenCalled()
  observers[0].fire(true)
  observers[0].fire(true)
  expect(onLoadMore).toHaveBeenCalledTimes(1)
  render('2', true)
  observers[0].fire(true)
  const failedView = render('2', false, true)
  expect(observers).toHaveLength(1)
  expect(onLoadMore).toHaveBeenCalledTimes(1)
  const retry = failedView.props.children as ReactElement<{ clickAction: () => Promise<void> }>
  await retry.props.clickAction()
  expect(onLoadMore).toHaveBeenCalledTimes(2)
  render('2')
  expect(observers).toHaveLength(1)
  render('3')
  observers[1].fire(true)
  expect(onLoadMore).toHaveBeenCalledTimes(3)
  render('4')
  cleanup()
  observers[2].fire(true)
  expect(onLoadMore).toHaveBeenCalledTimes(3)
})
