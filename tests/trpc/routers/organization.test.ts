import { describe, expect, it, vi } from "vitest";
import { createTestTRPCContext } from "@/tests/support/trpc-utils";
import type { User } from "@/tests/support/trpc-utils";
import { createCallerFactory } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/app";

// Mock next/headers for test environment
vi.mock("next/headers", () => ({
	headers: () => new Headers(),
}));

// Define a consistent test user matching Session["user"] shape
const testUser: User = {
	id: "test-user-id",
	email: "test@example.com",
	name: "Test User",
	role: "user",
	emailVerified: true,
	image: null,
	banned: false,
	banReason: null,
	banExpires: null,
	onboardingComplete: false,
	twoFactorEnabled: false,
};

// Mock getSession for protectedProcedure to return a valid session
vi.mock("@/lib/auth/server", () => ({
	getSession: async () => ({
		user: testUser,
		session: {
			id: "test-session-id",
			userId: testUser.id,
			activeOrganizationId: null,
			impersonatedBy: null,
			token: "",
		},
	}),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn().mockResolvedValue({
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			upsert: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: null, error: null }),
		}),
		auth: {
			getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
		},
	}),
}));

describe("organizationRouter", () => {
	describe("getAll", () => {
		it("returns all organizations for the user", async () => {
			const ctx = createTestTRPCContext(testUser);
			const caller = createCallerFactory(appRouter)(ctx);
			const result = await caller.organization.list();
			expect(Array.isArray(result)).toBe(true);
		});
	});
});
