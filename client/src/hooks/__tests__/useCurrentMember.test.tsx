import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { useCurrentMember } from '../useCurrentMember'

import { getUsers } from '@/api/client'
import { createApiUserRow } from '@/test/fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    getUsers: vi.fn(),
  }
})

const mockedGetUsers = vi.mocked(getUsers)

function Probe() {
  const { member, dogs, loading, error, refresh } = useCurrentMember()
  return (
    <div>
      <span data-testid="member">{member?.fullName ?? 'none'}</span>
      <span data-testid="dogs-count">{dogs.length}</span>
      <span data-testid="status">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="error">{error ?? 'ok'}</span>
      <button type="button" onClick={refresh}>
        refresh
      </button>
    </div>
  )
}

describe('useCurrentMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads current member and can refresh cache', async () => {
    const memberRow = createApiUserRow({ memberId: 10, dogId: 77, dogName: 'Грета' })
    const updatedRow = createApiUserRow({
      memberId: 10,
      dogId: 88,
      dogName: 'Арчи',
      fullName: 'Иван Новиков',
    })

    mockedGetUsers.mockResolvedValueOnce([memberRow]).mockResolvedValueOnce([updatedRow])

    renderWithProviders(<Probe />, {
      auth: {
        isAuthenticated: true,
        isReady: true,
        user: { memberId: 10 },
      },
    })

    expect(screen.getByTestId('status').textContent).toBe('loading')

    await waitFor(() => {
      expect(screen.getByTestId('member').textContent).toBe('Иван Иванов')
    })
    expect(screen.getByTestId('dogs-count').textContent).toBe('1')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(screen.getByTestId('member').textContent).toBe('Иван Новиков')
    })
    expect(mockedGetUsers).toHaveBeenCalledTimes(2)
  })
})

