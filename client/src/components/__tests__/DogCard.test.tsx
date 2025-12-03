import { describe, expect, it } from 'vitest'

import DogCard from '../DogCard'

import { createApiDog } from '@/test/fixtures'
import { render, screen } from '@/test/setup'

describe('DogCard', () => {
  it('renders chip info, owner and tags', () => {
    const dog = createApiDog({
      dogName: 'Рекс',
      breed: 'Лабрадор',
      chipNumber: 'CH-77',
      tags: ['спорт', 'дети'],
      ownerName: 'Анна',
      bio: 'Любит плавать',
    })

    render(<DogCard dog={dog} />)

    expect(screen.getByText('Рекс')).toBeInTheDocument()
    expect(screen.getByText('Лабрадор')).toBeInTheDocument()
    expect(screen.getByText(/Чипирован/i)).toBeInTheDocument()
    expect(screen.getByText(/Чип: CH-77/)).toBeInTheDocument()
    expect(screen.getByText('Анна')).toBeInTheDocument()
    expect(screen.getByText('#спорт')).toBeInTheDocument()
    expect(screen.getByText('#дети')).toBeInTheDocument()
    expect(screen.getByText('Любит плавать')).toBeInTheDocument()
  })
})

