import type {
  ApiDog,
  ApiEventDogRow,
  ApiEventMemberRow,
  ApiEventRow,
  ApiPeopleTrainingRow,
  ApiProgramDogRow,
  ApiProgramRow,
  ApiUserWithDogRow,
} from '@/api/client'
import type { MemberWithDogs } from '@/components/MemberCard'

let idCounter = 1
const nextId = () => idCounter++

const BASE_DATE = new Date('2025-01-01T12:00:00.000Z').getTime()

function isoAfter(hours: number) {
  return new Date(BASE_DATE + hours * 60 * 60 * 1000).toISOString()
}

export function createApiUserRow(
  overrides: Partial<ApiUserWithDogRow> = {}
): ApiUserWithDogRow {
  return {
    memberId: overrides.memberId ?? nextId(),
    fullName: overrides.fullName ?? 'Иван Иванов',
    phone: overrides.phone ?? '+7-900-000-00-00',
    email: overrides.email ?? 'ivan@example.com',
    city: overrides.city ?? 'Москва',
    avatarUrl: overrides.avatarUrl ?? null,
    ownerBio: overrides.ownerBio ?? 'Мы с собакой любим активный отдых.',
    joinDate: overrides.joinDate ?? isoAfter(-24 * 30),
    membershipEndDate: overrides.membershipEndDate ?? null,
    role: overrides.role ?? 'Пользователь',
    dogId: overrides.dogId ?? nextId(),
    dogName: overrides.dogName ?? 'Бобик',
    breed: overrides.breed ?? 'Корги',
    sex: overrides.sex ?? 'M',
    birthDate: overrides.birthDate ?? isoAfter(-24 * 365),
    chipNumber: overrides.chipNumber ?? 'CHIP-001',
    dogPhoto: overrides.dogPhoto ?? null,
    dogTags: overrides.dogTags ?? ['спорт'],
    dogBio: overrides.dogBio ?? 'Очень дружелюбный пёс',
  }
}

export function createApiEventRow(
  overrides: Partial<ApiEventRow> = {}
): ApiEventRow {
  return {
    id: overrides.id ?? nextId(),
    title: overrides.title ?? 'Прогулка в парке',
    category: overrides.category ?? 'Комьюнити',
    startAt: overrides.startAt ?? isoAfter(24),
    endAt: overrides.endAt ?? null,
    venue: overrides.venue ?? 'Парк Горького',
    price: overrides.price ?? 500,
    description: overrides.description ?? 'Совместная тренировка',
    registeredCount: overrides.registeredCount ?? 0,
  }
}

export function createApiDog(overrides: Partial<ApiDog> = {}): ApiDog {
  return {
    dogId: overrides.dogId ?? nextId(),
    dogName: overrides.dogName ?? 'Рекс',
    breed: overrides.breed ?? 'Лабрадор',
    sex: overrides.sex ?? 'M',
    birthDate: overrides.birthDate ?? isoAfter(-24 * 365 * 2),
    chipNumber: overrides.chipNumber ?? 'DOG-123',
    photo: overrides.photo ?? null,
    tags: overrides.tags ?? ['послушание'],
    bio: overrides.bio ?? 'Отлично ладит с детьми',
    ownerName: overrides.ownerName ?? 'Анна Петрова',
    ownerPhone: overrides.ownerPhone ?? '+7-911-111-11-11',
    ownerEmail: overrides.ownerEmail ?? 'anna@example.com',
  }
}

export function createApiProgramRow(
  overrides: Partial<ApiProgramRow> = {}
): ApiProgramRow {
  return {
    id: overrides.id ?? nextId(),
    title: overrides.title ?? 'Базовый курс',
    type: overrides.type ?? 'GROUP',
    price: overrides.price ?? 3000,
    description: overrides.description ?? 'Учимся базовым командам',
    registeredDogsCount: overrides.registeredDogsCount ?? 5,
  }
}

export function createApiPeopleTrainingRow(
  overrides: Partial<ApiPeopleTrainingRow> = {}
): ApiPeopleTrainingRow {
  return {
    id: overrides.id ?? nextId(),
    title: overrides.title ?? 'Лекция о поведении',
    category: overrides.category ?? 'Обучение',
    startAt: overrides.startAt ?? isoAfter(48),
    endAt: overrides.endAt ?? null,
    venue: overrides.venue ?? 'Онлайн',
    price: overrides.price ?? 0,
    description: overrides.description ?? 'Практические советы',
    registeredCount: overrides.registeredCount ?? 0,
  }
}

export function createApiEventDogRow(
  overrides: Partial<ApiEventDogRow> = {}
): ApiEventDogRow {
  return {
    dogId: overrides.dogId ?? nextId(),
    dogName: overrides.dogName ?? 'Шарик',
    breed: overrides.breed ?? 'Бигль',
    sex: overrides.sex ?? 'M',
    birthDate: overrides.birthDate ?? isoAfter(-24 * 365 * 3),
    chipNumber: overrides.chipNumber ?? 'SH-991',
    photo: overrides.photo ?? null,
    ownerFullName: overrides.ownerFullName ?? 'Мария Смирнова',
    ownerCity: overrides.ownerCity ?? 'Санкт-Петербург',
    tags: overrides.tags ?? null,
    bio: overrides.bio ?? null,
  }
}

export function createApiProgramDogRow(
  overrides: Partial<ApiProgramDogRow> = {}
): ApiProgramDogRow {
  return {
    dogId: overrides.dogId ?? nextId(),
    dogName: overrides.dogName ?? 'Арчи',
    breed: overrides.breed ?? 'Хаски',
    sex: overrides.sex ?? 'M',
    birthDate: overrides.birthDate ?? isoAfter(-24 * 365 * 4),
    chipNumber: overrides.chipNumber ?? 'ARC-21',
    photo: overrides.photo ?? null,
    ownerFullName: overrides.ownerFullName ?? 'Сергей Иванов',
    ownerCity: overrides.ownerCity ?? 'Казань',
    tags: overrides.tags ?? null,
    bio: overrides.bio ?? null,
  }
}

export function createApiEventMemberRow(
  overrides: Partial<ApiEventMemberRow> = {}
): ApiEventMemberRow {
  return {
    memberId: overrides.memberId ?? nextId(),
    fullName: overrides.fullName ?? 'Светлана Морозова',
    phone: overrides.phone ?? null,
    email: overrides.email ?? null,
    city: overrides.city ?? 'Екатеринбург',
    avatarUrl: overrides.avatarUrl ?? null,
    bio: overrides.bio ?? null,
    joinDate: overrides.joinDate ?? isoAfter(-24 * 365),
    membershipEndDate: overrides.membershipEndDate ?? null,
    role: overrides.role ?? 'Пользователь',
  }
}

export function createMemberWithDogs(
  overrides: Partial<MemberWithDogs> = {}
): MemberWithDogs {
  return {
    id: overrides.id ?? nextId(),
    fullName: overrides.fullName ?? 'Алексей Сидоров',
    city: overrides.city ?? 'Новосибирск',
    avatar: overrides.avatar ?? null,
    bio: overrides.bio ?? 'Занимаюсь аджилити',
    phone: overrides.phone ?? '+7-912-222-22-22',
    email: overrides.email ?? 'alexey@example.com',
    joinDate: overrides.joinDate ?? isoAfter(-24 * 200),
    membershipEndDate: overrides.membershipEndDate ?? null,
    role: overrides.role ?? 'Пользователь',
    dogs:
      overrides.dogs ??
      [
        {
          id: nextId(),
          name: 'Грета',
          breed: 'Бордер-колли',
          sex: 'F',
          birthDate: isoAfter(-24 * 365 * 2),
          chipNumber: 'GR-778',
          photo: null,
          tags: ['спорт'],
          bio: 'Участница соревнований',
        },
      ],
  }
}



