import type { Context } from "@/trpc/context";
import type { Session } from "@/types/session";

// Infer the User type from Session (Session is `{ session, user } | null`)
export type User = NonNullable<Session>["user"];

export const createTestTRPCContext = (_user: User): Context => ({
	userAgent: "test-agent",
	ip: "127.0.0.1",
	requestId: "test-request-id",
});

export const createTestAuthUser = (user: User): User => {
	return {
		...user,
		id: user.id,
		email: user.email,
		emailVerified: true,
	};
};
