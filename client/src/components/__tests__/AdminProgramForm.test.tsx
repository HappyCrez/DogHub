import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import AdminProgramForm from '../AdminProgramForm'

import { render, screen } from '@/test/setup'

describe('AdminProgramForm', () => {
  it('prevents submission when price invalid', async () => {
    const onSubmit = vi.fn()
    render(
      <AdminProgramForm
        heading="Программа"
        submitLabel="Сохранить"
        submitting={false}
        onSubmit={onSubmit}
      />
    )

    const user = userEvent.setup()
    await user.type(
      screen.getByPlaceholderText(/Базовый курс послушания/i),
      'Базовый курс'
    )
    await user.type(screen.getByPlaceholderText(/0 — бесплатно/i), '-10')
    await user.click(screen.getByRole('button', { name: /Сохранить/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with normalized program payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AdminProgramForm
        heading="Программа"
        submitLabel="Сохранить"
        submitting={false}
        onSubmit={onSubmit}
      />
    )

    const user = userEvent.setup()
    await user.type(
      screen.getByPlaceholderText(/Базовый курс послушания/i),
      'Аджилити'
    )
    await user.selectOptions(screen.getByRole('combobox'), 'PERSONAL')
    const priceInput = screen.getByPlaceholderText(/0 — бесплатно/i)
    await user.clear(priceInput)
    await user.type(priceInput, '5000')
    await user.type(
      screen.getByPlaceholderText(/Расскажите о длительности/i),
      ' Индивидуальные тренировки '
    )

    await user.click(screen.getByRole('button', { name: /Сохранить/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Аджилити',
      type: 'PERSONAL',
      price: 5000,
      description: 'Индивидуальные тренировки',
    })
  })
})

