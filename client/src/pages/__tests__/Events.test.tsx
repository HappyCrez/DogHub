import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import Events from '../Events'

import { createEvent, deleteEvent, getEvents } from '@/api/client'
import { createApiEventRow } from '@/test/fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    deleteEvent: vi.fn(),
  }
})

const mockedGetEvents = vi.mocked(getEvents)
const mockedCreateEvent = vi.mocked(createEvent)
const mockedDeleteEvent = vi.mocked(deleteEvent)

describe('Events page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters events by search query and category', async () => {
    const eventA = createApiEventRow({ title: 'Встреча на манеже', category: 'Сообщество' })
    const eventB = createApiEventRow({
      title: 'Фотодень',
      category: 'Фото',
      venue: 'Студия',
    })
    mockedGetEvents.mockResolvedValue([eventA, eventB])

    const user = userEvent.setup()
    renderWithProviders(<Events />)

    expect(await screen.findByText(/События клуба/i)).toBeInTheDocument()

    const search = screen.getByPlaceholderText(/Поиск по названию/i)
    await user.type(search, 'манеже')

    expect(await screen.findByText('Встреча на манеже')).toBeInTheDocument()
    expect(screen.queryByText('Фотодень')).not.toBeInTheDocument()

    const categorySelect = screen.getByDisplayValue('Все категории')
    await user.clear(search)
    await user.selectOptions(categorySelect, 'Фото')

    expect(await screen.findByText('Фотодень')).toBeInTheDocument()
    expect(screen.queryByText('Встреча на манеже')).not.toBeInTheDocument()
  })

  it('allows admin to create a new event', async () => {
    const initialEvents = [createApiEventRow({ title: 'Квест' })]
    mockedGetEvents.mockResolvedValueOnce(initialEvents).mockResolvedValueOnce(initialEvents)
    mockedCreateEvent.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderWithProviders(<Events />, {
      auth: {
        isAuthenticated: true,
        token: 'jwt-token',
        user: { role: 'Администратор', memberId: 1 },
      },
    })

    expect(await screen.findByText(/Режим администратора/i)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/прогулка в парке/i), 'Новый митап')
    await user.type(screen.getByPlaceholderText(/Культура/i), 'Meetup')
    await user.type(screen.getByPlaceholderText(/Адрес или площадка/i), 'Онлайн')
    await user.clear(screen.getByPlaceholderText(/0 — бесплатно/i))
    await user.type(screen.getByPlaceholderText(/0 — бесплатно/i), '0')
    await user.type(
      screen.getByPlaceholderText(/Коротко расскажите, что будет происходить/i),
      'Обсуждаем планы'
    )

    await user.click(screen.getByRole('button', { name: /Создать событие/i }))

    await waitFor(() => {
      expect(mockedCreateEvent).toHaveBeenCalledTimes(1)
    })

    expect(mockedCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Новый митап',
        category: 'Meetup',
        price: 0,
        venue: 'Онлайн',
      }),
      'jwt-token'
    )
  })

  it('shows error when delete is requested without token', async () => {
    const withRegistration = createApiEventRow({
      id: 44,
      title: 'Соревнования',
      registeredCount: 0,
    })
    mockedGetEvents.mockResolvedValue([withRegistration])
    mockedDeleteEvent.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderWithProviders(<Events />, {
      auth: { isAuthenticated: true, token: null, user: { role: 'Администратор' } },
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: /События клуба/i })
    ).toBeInTheDocument()

    const deleteButtons = screen.getAllByRole('button', { name: /Удалить/i })
    await user.click(deleteButtons[0])

    expect(mockedDeleteEvent).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/Авторизуйтесь заново, чтобы управлять событиями/i)
    ).toBeInTheDocument()
  })
})

