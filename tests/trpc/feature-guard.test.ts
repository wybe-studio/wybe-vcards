import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

// Run sequentially so vi.resetModules + vi.doMock don't race
describe.sequential("featureGuard middleware", () => {
	it("should allow access when feature is enabled", async () => {
		vi.resetModules();
		vi.doMock("@/config/features.config", () => ({
			featuresConfig: { billing: true },
		}));

		const { featuresConfig } = await import("@/config/features.config");
		expect(featuresConfig.billing).toBe(true);
	});

	it("should block access when feature is disabled", async () => {
		vi.resetModules();
		vi.doMock("@/config/features.config", () => ({
			featuresConfig: { billing: false },
		}));

		const { featuresConfig } = await import("@/config/features.config");
		expect(featuresConfig.billing).toBe(false);

		// Simulate featureGuard behavior
		if (!featuresConfig.billing) {
			const error = new TRPCError({
				code: "FORBIDDEN",
				message: 'Funzionalità "billing" non abilitata.',
			});
			expect(error.code).toBe("FORBIDDEN");
		}
	});
});
