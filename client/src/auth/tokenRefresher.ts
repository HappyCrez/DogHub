export type RefreshHandler = () => Promise<string | null>;

let handler: RefreshHandler | null = null;

export function setAuthRefreshHandler(nextHandler: RefreshHandler | null) {
    handler = nextHandler;
}

export async function tryRefreshAccessToken(): Promise<string | null> {
    if (!handler) return null;
    try {
        return await handler();
    } catch (error) {
        console.error("Не удалось обновить access-токен:", error);
        return null;
    }
}

