import { describe, expect, it } from 'vitest'

import EventCard from '../EventCard'

import { createApiEventRow } from '@/test/fixtures'
import { render, screen } from '@/test/setup'

describe('EventCard', () => {
  it('shows category, venue and formatted price', () => {
    const event = createApiEventRow({
      title: 'Фотодень',
      category: 'Фото',
      venue: 'Студия',
      price: 2500,
      startAt: '2099-01-01T10:00:00Z',
    })

    render(<EventCard ev={event} />)

    expect(screen.getByText('Фотодень')).toBeInTheDocument()
    expect(screen.getByText('Фото')).toBeInTheDocument()
    expect(screen.getByText(/Студия/)).toBeInTheDocument()
    expect(
      screen.getByText((text) => text.includes('₽'))
    ).toBeInTheDocument()
    expect(screen.queryByText(/прошло/i)).not.toBeInTheDocument()
  })

  it('marks past events and free price', () => {
    const event = createApiEventRow({
      title: 'Встреча',
      price: 0,
      startAt: '2000-01-01T10:00:00Z',
    })

    render(<EventCard ev={event} />)

    expect(screen.getByText(/прошло/i)).toBeInTheDocument()
    expect(screen.getByText(/Бесплатно/)).toBeInTheDocument()
  })
})

