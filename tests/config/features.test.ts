import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FEATURE_KEYS = [
	"NEXT_PUBLIC_FEATURE_BILLING",
	"NEXT_PUBLIC_FEATURE_LEADS",
	"NEXT_PUBLIC_FEATURE_AI_CHATBOT",
	"NEXT_PUBLIC_FEATURE_ONBOARDING",
	"NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION",
	"NEXT_PUBLIC_FEATURE_MULTI_ORG",
	"NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY",
] as const;

// Run sequentially so process.env mutations don't leak between concurrent tests
describe.sequential("features config", () => {
	beforeEach(() => {
		vi.resetModules();
		// Clear all feature flag env vars so each test starts clean
		for (const key of FEATURE_KEYS) {
			delete process.env[key];
		}
	});

	afterEach(() => {
		for (const key of FEATURE_KEYS) {
			delete process.env[key];
		}
	});

	it("should default all flags to true except personalAccountOnly", async () => {
		vi.doMock("@/lib/env", () => ({
			env: Object.fromEntries(FEATURE_KEYS.map((k) => [k, process.env[k]])),
		}));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.billing).toBe(true);
		expect(featuresConfig.leads).toBe(true);
		expect(featuresConfig.aiChatbot).toBe(true);
		expect(featuresConfig.onboarding).toBe(true);
		expect(featuresConfig.publicRegistration).toBe(true);
		expect(featuresConfig.multiOrg).toBe(true);
		expect(featuresConfig.personalAccountOnly).toBe(false);
	});

	it("should parse 'false' string as false", async () => {
		process.env.NEXT_PUBLIC_FEATURE_BILLING = "false";
		process.env.NEXT_PUBLIC_FEATURE_LEADS = "false";

		vi.doMock("@/lib/env", () => ({
			env: Object.fromEntries(FEATURE_KEYS.map((k) => [k, process.env[k]])),
		}));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.billing).toBe(false);
		expect(featuresConfig.leads).toBe(false);
	});

	it("should force multiOrg=false when personalAccountOnly=true", async () => {
		process.env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY = "true";
		process.env.NEXT_PUBLIC_FEATURE_MULTI_ORG = "true";

		const warnFn = vi.fn();
		vi.doMock("@/lib/env", () => ({
			env: Object.fromEntries(FEATURE_KEYS.map((k) => [k, process.env[k]])),
		}));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: warnFn, info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.personalAccountOnly).toBe(true);
		expect(featuresConfig.multiOrg).toBe(false);
		expect(warnFn).toHaveBeenCalled();
	});
});
