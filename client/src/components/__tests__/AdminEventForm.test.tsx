import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import AdminEventForm from '../AdminEventForm'

import { render, screen } from '@/test/setup'

const getControlByLabel = (text: RegExp | string) => {
  const label = screen.getByText(text, { selector: 'label' })
  const control = label.parentElement?.querySelector('input, select, textarea') as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null
  if (!control) {
    throw new Error(`control for "${text}" not found`)
  }
  return control
}

describe('AdminEventForm', () => {
  it('validates required fields', async () => {
    const onSubmit = vi.fn()
    render(
      <AdminEventForm
        heading="Новое событие"
        submitLabel="Создать"
        submitting={false}
        onSubmit={onSubmit}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Создать/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Пожалуйста, заполните название/i)
    ).toBeInTheDocument()
  })

  it('submits normalized payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AdminEventForm
        heading="Новое событие"
        submitLabel="Создать"
        submitting={false}
        onSubmit={onSubmit}
      />
    )

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/прогулка в парке/i), 'Встреча')
    await user.type(screen.getByPlaceholderText(/культура/i), 'Комьюнити')
    const startInput = getControlByLabel(/Начало/i)
    await user.clear(startInput)
    await user.type(startInput, '2025-12-31T18:00')
    await user.type(getControlByLabel(/Окончание/i), '2026-01-01T12:00')
    await user.type(screen.getByPlaceholderText(/Адрес или площадка/i), 'Парк')
    await user.type(screen.getByPlaceholderText(/0 — бесплатно/i), '1500')
    await user.type(
      screen.getByPlaceholderText(/Коротко расскажите/i),
      'Описание события'
    )

    await user.click(screen.getByRole('button', { name: /Создать/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Встреча',
      category: 'Комьюнити',
      startAt: '2025-12-31T18:00',
      endAt: '2026-01-01T12:00',
      venue: 'Парк',
      price: 1500,
      description: 'Описание события',
    })
  })
})

