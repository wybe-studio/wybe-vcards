import { vi } from "vitest";
import { createMockEnv } from "./mock-env-constants";

// Mock auth modules to prevent schema access during module loading for unit tests
// NOTE: Database tests should not use this setup file, they have their own setup
vi.mock("@/lib/auth/server", () => ({
	getSession: vi.fn().mockResolvedValue(null),
	assertUserIsOrgMember: vi.fn().mockResolvedValue({
		organization: { id: "test-org-id", name: "Test Org" },
		membership: { role: "owner" },
	}),
}));

// Mock the env module globally for local development
// In CI, this file is not used - see vitest.config.mts
vi.mock("@/lib/env", () => ({
	env: createMockEnv({
		DATABASE_URL: "postgres://test:test@localhost:5432/test",
	}),
}));

// Mock Supabase server client to prevent actual database connections in unit tests
// NOTE: Database tests should not use this setup file, they have their own setup
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

// Allow testing server-only modules
vi.mock("server-only", () => {
	return {};
});

// Note: Database mocking removed - CI uses real PostgreSQL service
// Local development should avoid database-dependent tests via vitest config exclusions
