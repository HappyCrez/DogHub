import '@testing-library/jest-dom/vitest'

import { cleanup, render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Fragment,
  createElement,
  type JSX,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'
import { afterEach, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/auth/AuthContext'

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = () =>
      ({
        matches: false,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false
        },
        media: '',
        onchange: null,
      }) as MediaQueryList
  }

  if (typeof window.ResizeObserver === 'undefined') {
    class StubResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  }

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:stub'
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {}
  }
}

vi.mock('framer-motion', () => {
  const createMotionComponent = (tag: string) => {
    const Component = ({ children, ...rest }: PropsWithChildren<Record<string, unknown>>) =>
      createElement(tag as keyof JSX.IntrinsicElements, rest, children)
    Component.displayName = `motion.${tag}`
    return Component
  }

  const motionProxy = new Proxy(
    {},
    {
      get: (_, prop: string) => createMotionComponent(prop),
    }
  )

  return {
    AnimatePresence: ({ children }: PropsWithChildren) => createElement(Fragment, null, children),
    motion: motionProxy,
    useReducedMotion: () => true,
  }
})

afterEach(() => {
  cleanup()
})

type RouterOverrides = Omit<MemoryRouterProps, 'children'>

export interface RenderWithProvidersOptions
  extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  router?: RouterOverrides
  auth?: Partial<AuthContextValue>
}

function createAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isReady: true,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refresh: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { route = '/', router, auth, ...renderOptions } = options

  function Wrapper({ children }: PropsWithChildren): ReactElement {
    const routerProps: RouterOverrides = {
      ...router,
      initialEntries: router?.initialEntries ?? [route],
    }

    return createElement(
      AuthContext.Provider,
      { value: createAuthValue(auth) },
      createElement(MemoryRouter, routerProps, children)
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
export { userEvent }

