/**
 * Session type for the application.
 * Previously derived from Better Auth, now defined manually.
 */
export type Session = {
	session: {
		id: string;
		userId: string;
		activeOrganizationId: string | null;
		token: string;
		impersonatedBy: string | null;
	};
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
		banned?: boolean | null;
		banReason?: string | null;
		banExpires?: Date | null;
		twoFactorEnabled?: boolean;
		onboardingComplete?: boolean;
		emailVerified?: boolean;
		createdAt?: Date | string;
		updatedAt?: Date | string;
	};
} | null;
