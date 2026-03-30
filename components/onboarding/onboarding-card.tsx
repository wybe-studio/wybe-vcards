"use client";

import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { OnboardingProfileStep } from "@/components/onboarding/onboarding-profile-step";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

export function OnboardingCard(): React.JSX.Element {
	const router = useProgressRouter();
	const searchParams = useSearchParams();
	const utils = trpc.useUtils();

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const onboardingStep = stepSearchParam
		? Number.parseInt(stepSearchParam, 10)
		: 1;

	const onCompleted = async () => {
		const supabase = createClient();

		// Update auth user metadata
		await supabase.auth.updateUser({
			data: { onboardingComplete: true },
		});

		// Update database profile (checked by proxy middleware)
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			await supabase
				.from("user_profile")
				.update({ onboarding_complete: true })
				.eq("id", user.id);
		}

		await utils.user.getSession.invalidate();

		router.replace(redirectTo ?? "/dashboard");
	};

	const steps = [
		{
			component: <OnboardingProfileStep onCompleted={() => onCompleted()} />,
		},
	];

	const totalSteps = steps.length;
	const progress = (onboardingStep / totalSteps) * 100;

	return (
		<Card className="w-full border-transparent px-4 py-8 dark:border-border">
			<CardHeader>
				<CardTitle className="text-base lg:text-lg">
					Configura il tuo account
				</CardTitle>
				<CardDescription>Solo pochi passaggi per iniziare.</CardDescription>
			</CardHeader>
			<CardContent>
				{totalSteps > 1 && (
					<div className="mb-6 flex items-center gap-3">
						<Progress className="h-2" value={progress} />
						<span className="shrink-0 text-foreground/60 text-xs">
							{`Passaggio ${onboardingStep} / ${totalSteps}`}
						</span>
					</div>
				)}
				{steps[onboardingStep - 1]!.component}
			</CardContent>
		</Card>
	);
}
