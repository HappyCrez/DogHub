import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { DogCreateModal } from '../DogCreateModal'

import { createDog, uploadDogPhoto } from '@/api/client'
import { fireEvent, render, screen, waitFor } from '@/test/setup'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    createDog: vi.fn(),
    uploadDogPhoto: vi.fn(),
  }
})

const mockedCreateDog = vi.mocked(createDog)
const mockedUploadDogPhoto = vi.mocked(uploadDogPhoto)

const getControl = (label: RegExp | string) => {
  const labelNode = screen.getByText(label, { selector: 'label' })
  const control = labelNode.nextElementSibling as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null
  if (!control) {
    throw new Error(`Control for ${label} not found`)
  }
  return control
}

describe('DogCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('submits payload with uploaded photo', async () => {
    localStorage.setItem('doghub_access_token', 'token-123')
    const createdDog = {
      id: 1,
      memberId: 5,
      name: 'Лайма',
      breed: 'Корги',
      sex: 'F' as const,
    }
    mockedUploadDogPhoto.mockResolvedValue({ photoUrl: 'https://img/dog.png' })
    mockedCreateDog.mockResolvedValue(createdDog as any)
    const onCreated = vi.fn()
    const onClose = vi.fn()

    render(
      <DogCreateModal open onClose={onClose} onCreated={onCreated} />
    )

    const user = userEvent.setup()
    fireEvent.change(getControl(/Кличка/i), { target: { value: 'Лайма' } })
    fireEvent.change(getControl(/Порода/i), { target: { value: 'Корги' } })
    fireEvent.change(getControl(/Дата рождения/i), {
      target: { value: '2024-02-01' },
    })
    fireEvent.change(getControl(/Номер чипа/i), { target: { value: 'CH-42' } })
    fireEvent.change(getControl(/Теги/i), { target: { value: '#спорт, дружба' } })
    fireEvent.change(getControl(/Описание/i), {
      target: { value: 'Очень активная' },
    })
    fireEvent.change(getControl(/Пол/i), { target: { value: 'F' } })

    const file = new File(['img'], 'dog.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/Выбрать файл/i), file)

    await user.click(screen.getByRole('button', { name: /Добавить/i }))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(createdDog)
    })

    expect(mockedUploadDogPhoto).toHaveBeenCalledWith(file, 'token-123')
    expect(mockedCreateDog).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Лайма',
        breed: 'Корги',
        sex: 'F',
        birthDate: '2024-02-01',
        chipNumber: 'CH-42',
        tags: ['спорт', 'дружба'],
        bio: 'Очень активная',
        photo: 'https://img/dog.png',
      }),
      'token-123'
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('blocks submit if token is missing', async () => {
    mockedCreateDog.mockResolvedValue({} as any)

    render(<DogCreateModal open onClose={vi.fn()} onCreated={vi.fn()} />)

    const user = userEvent.setup()
    fireEvent.change(getControl(/Кличка/i), { target: { value: 'Рекс' } })
    fireEvent.change(getControl(/Порода/i), { target: { value: 'Лабрадор' } })

    await user.click(screen.getByRole('button', { name: /Добавить/i }))

    expect(
      await screen.findByText(/нужно войти в аккаунт снова/i)
    ).toBeInTheDocument()
    expect(mockedCreateDog).not.toHaveBeenCalled()
  })
})

