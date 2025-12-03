import { beforeEach, describe, expect, it, vi } from 'vitest'

import Home from '../Home'

import { getEvents, getUsers } from '@/api/client'
import { createApiEventRow, createApiUserRow } from '@/test/fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    getUsers: vi.fn(),
    getEvents: vi.fn(),
  }
})

const mockedGetUsers = vi.mocked(getUsers)
const mockedGetEvents = vi.mocked(getEvents)

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero and stats after successful load', async () => {
    mockedGetUsers.mockResolvedValue([
      createApiUserRow({ memberId: 1, dogId: 10, dogName: 'Грета' }),
      createApiUserRow({ memberId: 2, dogId: 11, dogName: 'Арчи', city: 'Казань' }),
    ])
    mockedGetEvents.mockResolvedValue([
      createApiEventRow({ id: 100, title: 'Встреча на манеже' }),
      createApiEventRow({
        id: 101,
        title: 'Фотодень',
        description: 'Фотосессия с хендлером',
      }),
    ])

    renderWithProviders(<Home />)

    expect(await screen.findByText(/DogHub — клуб собаководов/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Посмотреть участников/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('…')).not.toBeInTheDocument()
    })

    expect(
      screen.getByText((text) => text === 'Грета' || text === 'Арчи')
    ).toBeInTheDocument()
    expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0)
  })

  it('shows fallback message when loading fails', async () => {
    mockedGetUsers.mockRejectedValue(new Error('boom'))
    mockedGetEvents.mockRejectedValue(new Error('boom'))

    renderWithProviders(<Home />)

    expect(
      await screen.findByText(/Не удалось загрузить данные с сервера/i)
    ).toBeInTheDocument()
  })
})

