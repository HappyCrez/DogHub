import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { ProfileEditModal } from '../ProfileEditModal'

import { uploadAvatar } from '@/api/client'
import { createMemberWithDogs } from '@/test/fixtures'
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/setup'

const getControl = (label: RegExp | string) => {
  const labelNode = screen.getByText(label, { selector: 'label' })
  const control = labelNode.nextElementSibling as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null
  if (!control) {
    throw new Error(`Control for ${label} not found`)
  }
  return control
}

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    uploadAvatar: vi.fn(),
  }
})

const mockedUploadAvatar = vi.mocked(uploadAvatar)

describe('ProfileEditModal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves profile changes and updates auth user', async () => {
    localStorage.setItem('doghub_access_token', 'auth-token')
    mockedUploadAvatar.mockResolvedValue({ avatarUrl: 'https://img/avatar.png' })

    const member = createMemberWithDogs({
      fullName: 'Иван Смирнов',
      city: 'Тверь',
      bio: 'Старое био',
    })

    const onSaved = vi.fn()
    const updateUser = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn(),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(
      <ProfileEditModal open member={member} onClose={vi.fn()} onSaved={onSaved} />,
      {
        auth: {
          isAuthenticated: true,
          updateUser,
        },
      }
    )

    const user = userEvent.setup()
    fireEvent.change(getControl(/Имя и фамилия/i), {
      target: { value: 'Мария Смирнова' },
    })
    fireEvent.change(getControl(/Телефон/i), { target: { value: '9001234567' } })
    fireEvent.change(getControl(/Город/i), { target: { value: 'Москва' } })
    fireEvent.change(getControl(/Email/i), {
      target: { value: 'maria@example.com' },
    })
    fireEvent.change(getControl(/Описание/i), { target: { value: 'Новое био' } })

    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/Выбрать файл/i), avatarFile)

    await user.click(screen.getByRole('button', { name: /Сохранить/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    expect(mockedUploadAvatar).toHaveBeenCalledWith(avatarFile, 'auth-token')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/me$/),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      })
    )
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Мария Смирнова',
        phone: '+7-900-123-45-67',
        city: 'Москва',
        email: 'maria@example.com',
        bio: 'Новое био',
        avatarUrl: 'https://img/avatar.png',
      })
    )
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Мария Смирнова',
        avatar: 'https://img/avatar.png',
      })
    )
  })

  it('shows error when token is missing', async () => {
    localStorage.removeItem('doghub_access_token')

    renderWithProviders(
      <ProfileEditModal open member={createMemberWithDogs()} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Сохранить/i }))

    expect(
      await screen.findByText(/не удалось сохранить профиль/i)
    ).toBeInTheDocument()
  })
})

