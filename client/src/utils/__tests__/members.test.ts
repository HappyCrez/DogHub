import { describe, expect, it } from 'vitest'

import { groupUsers } from '../members'

import { createApiUserRow } from '@/test/fixtures'

describe('groupUsers', () => {
  it('groups dog rows by member id', () => {
    const rowA = createApiUserRow({
      memberId: 1,
      fullName: 'Анна',
      dogId: 10,
      dogName: 'Грета',
      breed: 'Бордер-колли',
    })
    const rowB = createApiUserRow({
      memberId: 1,
      dogId: 11,
      dogName: 'Рекс',
      breed: 'Лабрадор',
    })
    const rowC = createApiUserRow({
      memberId: 2,
      fullName: 'Иван',
    })
    rowC.dogId = null
    rowC.dogName = null

    const grouped = groupUsers([rowB, rowC, rowA])

    expect(grouped).toHaveLength(2)
    const memberOne = grouped.find((member) => member.id === 1)
    expect(memberOne?.dogs).toHaveLength(2)
    expect(memberOne?.dogs.map((dog) => dog.name)).toEqual(
      expect.arrayContaining(['Грета', 'Рекс'])
    )

    const memberTwo = grouped.find((member) => member.id === 2)
    expect(memberTwo?.dogs).toHaveLength(0)
  })
})

