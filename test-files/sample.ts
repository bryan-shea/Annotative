// Sample TypeScript file for testing the Annotative extension

export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

export async function fetchUser(userId: string): Promise<User> {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return response.json() as Promise<User>;
}

export function formatUserName(user: User): string {
    return `${user.name} <${user.email}>`;
}

export class UserService {
    private cache: Map<string, User> = new Map();

    async getUser(userId: string): Promise<User> {
        if (this.cache.has(userId)) {
            return this.cache.get(userId)!;
        }

        const user = await fetchUser(userId);
        this.cache.set(userId, user);
        return user;
    }

    clearCache(): void {
        this.cache.clear();
    }
}
