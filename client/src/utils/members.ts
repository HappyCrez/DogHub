import type { ApiUserWithDogRow } from "../api/client";
import type { MemberDog, MemberWithDogs } from "../components/MemberCard";

export function groupUsers(rows: ApiUserWithDogRow[]): MemberWithDogs[] {
    const map = new Map<number, MemberWithDogs>();

    for (const row of rows) {
        let member = map.get(row.memberId);
        if (!member) {
            member = {
                id: row.memberId,
                fullName: row.fullName,
                city: row.city,
                avatar: row.avatarUrl,
                bio: row.ownerBio ?? undefined,
                phone: row.phone,
                email: row.email,
                joinDate: row.joinDate ?? undefined,
                membershipEndDate: row.membershipEndDate ?? undefined,
                role: row.role,
                dogs: [],
            };
            map.set(row.memberId, member);
        }

        if (row.dogId !== null && row.dogName !== null) {
            const dog: MemberDog = {
                id: row.dogId,
                name: row.dogName,
                breed: row.breed,
                sex: row.sex,
                birthDate: row.birthDate ?? undefined,
                chipNumber: row.chipNumber ?? undefined,
                photo: row.dogPhoto ?? undefined,
                tags: row.dogTags ?? undefined,
                bio: row.dogBio ?? undefined,
            };
            member.dogs.push(dog);
        }
    }

    return Array.from(map.values()).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "ru")
    );
}

