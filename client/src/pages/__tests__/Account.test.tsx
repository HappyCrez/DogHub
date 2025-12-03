import { beforeEach, describe, expect, it, vi } from 'vitest'

import Account from '../Account'

import {
  getEventDogs,
  getEventMembers,
  getEvents,
  getPeopleTrainings,
  getProgramDogs,
  getPrograms,
  getUsers,
} from '@/api/client'
import {
  createApiEventDogRow,
  createApiEventMemberRow,
  createApiEventRow,
  createApiPeopleTrainingRow,
  createApiProgramDogRow,
  createApiProgramRow,
  createApiUserRow,
} from '@/test/fixtures'
import { renderWithProviders, screen } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    getUsers: vi.fn(),
    getEvents: vi.fn(),
    getPeopleTrainings: vi.fn(),
    getPrograms: vi.fn(),
    getProgramDogs: vi.fn(),
    getEventMembers: vi.fn(),
    getEventDogs: vi.fn(),
  }
})

const mockedGetUsers = vi.mocked(getUsers)
const mockedGetEvents = vi.mocked(getEvents)
const mockedGetPeopleTrainings = vi.mocked(getPeopleTrainings)
const mockedGetPrograms = vi.mocked(getPrograms)
const mockedGetProgramDogs = vi.mocked(getProgramDogs)
const mockedGetEventMembers = vi.mocked(getEventMembers)
const mockedGetEventDogs = vi.mocked(getEventDogs)

describe('Account page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard for authenticated member', async () => {
    const memberId = 99
    const memberRow = createApiUserRow({
      memberId,
      dogId: 501,
      dogName: 'Грета',
      fullName: 'Иван Смирнов',
      city: 'Тверь',
    })
    mockedGetUsers.mockResolvedValue([memberRow])

    const training = createApiPeopleTrainingRow({ id: 1, title: 'Лекция' })
    mockedGetPeopleTrainings.mockResolvedValue([training])
    mockedGetEventMembers.mockResolvedValue([createApiEventMemberRow({ memberId })])

    const event = createApiEventRow({ id: 7, title: 'Квест' })
    mockedGetEvents.mockResolvedValue([event])
    mockedGetEventDogs.mockResolvedValue([createApiEventDogRow({ dogId: 501 })])

    const program = createApiProgramRow({ id: 5, title: 'Аджилити' })
    mockedGetPrograms.mockResolvedValue([program])
    mockedGetProgramDogs.mockResolvedValue([createApiProgramDogRow({ dogId: 501 })])

    renderWithProviders(<Account />, {
      auth: {
        isAuthenticated: true,
        user: { memberId },
        token: 'jwt',
      },
    })

    expect(await screen.findByText(/Привет, Иван!/i)).toBeInTheDocument()
    expect(screen.getByText('Грета')).toBeInTheDocument()
    expect(screen.getByText(/Мои собаки/i)).toBeInTheDocument()
    expect(screen.getByText(/Мои события/i)).toBeInTheDocument()
  })

  it('shows profile error when data fails to load', async () => {
    mockedGetUsers.mockRejectedValue(new Error('fail'))

    renderWithProviders(<Account />, {
      auth: {
        isAuthenticated: true,
        user: { memberId: 1 },
      },
    })

    expect(
      await screen.findByText(/Не удалось загрузить данные профиля/i)
    ).toBeInTheDocument()
  })
})

