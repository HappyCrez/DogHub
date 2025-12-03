import { describe, expect, it } from 'vitest'

import MemberCard from '../MemberCard'

import { createMemberWithDogs } from '@/test/fixtures'
import { renderWithProviders, screen } from '@/test/setup'

describe('MemberCard', () => {
  it('shows contact info and dogs list', () => {
    const member = createMemberWithDogs({
      fullName: 'Анна Белова',
      city: 'Казань',
      phone: '+7-900-000-00-00',
      email: 'anna@example.com',
    })

    renderWithProviders(<MemberCard member={member} />)

    expect(screen.getByText('Анна Белова')).toBeInTheDocument()
    expect(screen.getByText(/Казань/)).toBeInTheDocument()
    expect(screen.getByText(/\+7-900-000-00-00/)).toBeInTheDocument()
    expect(screen.getByText('anna@example.com')).toBeInTheDocument()
    expect(
      screen.getByText((text) => text.includes(member.dogs[0].name))
    ).toBeInTheDocument()
  })

  it('renders fallback when no dogs', () => {
    const member = createMemberWithDogs({ dogs: [] })
    renderWithProviders(<MemberCard member={member} />)
    expect(
      screen.getByText(/Пока нет собак в базе/i)
    ).toBeInTheDocument()
  })
})

