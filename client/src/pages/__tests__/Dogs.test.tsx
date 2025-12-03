import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import Dogs from '../Dogs'

import { getChippedDogs, getDogs } from '@/api/client'
import { createApiDog } from '@/test/fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    getDogs: vi.fn(),
    getChippedDogs: vi.fn(),
  }
})

const mockedGetDogs = vi.mocked(getDogs)
const mockedGetChippedDogs = vi.mocked(getChippedDogs)

describe('Dogs page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searches dogs by text input', async () => {
    mockedGetDogs.mockResolvedValue([
      createApiDog({ dogName: 'Рекс', breed: 'Лабрадор', ownerName: 'Анна' }),
      createApiDog({ dogName: 'Лайма', breed: 'Корги', ownerName: 'Мария' }),
    ])

    const user = userEvent.setup()
    renderWithProviders(<Dogs />)

    expect(await screen.findByText(/Собаки клуба/i)).toBeInTheDocument()
    expect(screen.getByText('Рекс')).toBeInTheDocument()
    expect(screen.getByText('Лайма')).toBeInTheDocument()

    const search = screen.getByPlaceholderText(/Поиск по имени/i)
    await user.type(search, 'лабр')

    expect(screen.getByText('Рекс')).toBeInTheDocument()
    expect(screen.queryByText('Лайма')).not.toBeInTheDocument()
  })

  it('switches to chipped-only mode', async () => {
    mockedGetDogs.mockResolvedValue([createApiDog({ dogName: 'Барсик' })])
    mockedGetChippedDogs.mockResolvedValue([createApiDog({ dogName: 'Чип' })])

    const user = userEvent.setup()
    renderWithProviders(<Dogs />)

    expect(await screen.findByText('Барсик')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Только чипированные/i))

    await waitFor(() => {
      expect(mockedGetChippedDogs).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Чип')).toBeInTheDocument()
    expect(screen.queryByText('Барсик')).not.toBeInTheDocument()
  })
})

