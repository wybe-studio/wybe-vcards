import type { FeaturesConfig } from "@/config/features.config";
import { featuresConfig } from "@/config/features.config";

type FeatureGateProps = {
	feature: keyof FeaturesConfig;
	children: React.ReactNode;
	fallback?: React.ReactNode;
	/** Show children when the feature is OFF */
	invert?: boolean;
};

export function FeatureGate({
	feature,
	children,
	fallback,
	invert,
}: FeatureGateProps): React.ReactNode {
	const enabled = invert ? !featuresConfig[feature] : featuresConfig[feature];
	return enabled ? children : (fallback ?? null);
}
