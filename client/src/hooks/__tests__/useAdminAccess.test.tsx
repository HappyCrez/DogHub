import { describe, expect, it } from 'vitest'

import { useAdminAccess } from '../useAdminAccess'

import { renderWithProviders, screen } from '@/test/setup'

function Probe() {
  const { isAdmin, role, token } = useAdminAccess()
  return (
    <div>
      <span data-testid="is-admin">{isAdmin ? 'yes' : 'no'}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
    </div>
  )
}

describe('useAdminAccess', () => {
  it('returns admin access when role is Администратор', () => {
    renderWithProviders(<Probe />, {
      auth: {
        isAuthenticated: true,
        user: { role: 'Администратор' },
        token: 'jwt-123',
      },
    })

    expect(screen.getByTestId('is-admin').textContent).toBe('yes')
    expect(screen.getByTestId('role').textContent).toBe('Администратор')
    expect(screen.getByTestId('token').textContent).toBe('jwt-123')
  })

  it('returns non-admin values when role differs', () => {
    renderWithProviders(<Probe />, {
      auth: {
        isAuthenticated: true,
        user: { role: 'Пользователь' },
        token: 'jwt-456',
      },
    })

    expect(screen.getByTestId('is-admin').textContent).toBe('no')
    expect(screen.getByTestId('role').textContent).toBe('Пользователь')
  })
})



