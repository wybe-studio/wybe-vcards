import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function bool(val: string | undefined, fallback = true): boolean {
	return val === undefined ? fallback : val === "true";
}

const raw = {
	billing: bool(env.NEXT_PUBLIC_FEATURE_BILLING),
	leads: bool(env.NEXT_PUBLIC_FEATURE_LEADS),
	aiChatbot: bool(env.NEXT_PUBLIC_FEATURE_AI_CHATBOT),
	onboarding: bool(env.NEXT_PUBLIC_FEATURE_ONBOARDING),
	publicRegistration: bool(env.NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION),
	multiOrg: bool(env.NEXT_PUBLIC_FEATURE_MULTI_ORG),
	personalAccountOnly: bool(
		env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY,
		false,
	),
	googleAuth: bool(env.NEXT_PUBLIC_FEATURE_GOOGLE_AUTH, false),
};

// Enforce logical constraints
if (raw.personalAccountOnly && raw.multiOrg) {
	logger.warn(
		{ personalAccountOnly: true, multiOrg: true },
		"personalAccountOnly=true forza multiOrg=false",
	);
	raw.multiOrg = false;
}

if (!raw.billing) {
	// Credits depend on Stripe, force disable chatbot credits
	// (aiChatbot can still work if credits are not required, but billing-related credit procedures are blocked)
}

export const featuresConfig = raw as Readonly<FeaturesConfig>;

export type FeaturesConfig = {
	billing: boolean;
	leads: boolean;
	aiChatbot: boolean;
	onboarding: boolean;
	publicRegistration: boolean;
	multiOrg: boolean;
	personalAccountOnly: boolean;
	googleAuth: boolean;
};
