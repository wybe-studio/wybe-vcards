"use client";

import { parseAsString, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { authConfig } from "@/config/auth.config";
import { oAuthProviders } from "@/lib/auth/oauth-providers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type SocialSigninButtonProps =
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		provider: keyof typeof oAuthProviders;
	};

export function SocialSigninButton({
	provider,
	className,
	...props
}: SocialSigninButtonProps): React.JSX.Element {
	const [invitationId] = useQueryState("invitationId", parseAsString);
	const providerData = oAuthProviders[provider];

	const redirectPath = invitationId
		? `/app/organization-invitation/${invitationId}`
		: authConfig.redirectAfterSignIn;

	const onSignin = () => {
		const supabase = createClient();
		supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
	};

	return (
		<Button
			{...props}
			onClick={() => onSignin()}
			type="button"
			variant="outline"
			className={cn("w-full gap-2", className)}
		>
			{providerData.icon && <providerData.icon className="size-4 shrink-0" />}
			<span>{providerData.name}</span>
		</Button>
	);
}
