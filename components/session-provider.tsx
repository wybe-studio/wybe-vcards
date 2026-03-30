"use client";

import type * as React from "react";
import { SessionContext } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

export function SessionProvider({
	children,
}: React.PropsWithChildren): React.JSX.Element {
	const utils = trpc.useUtils();
	const { data: session, isFetched } = trpc.user.getSession.useQuery();

	return (
		<SessionContext.Provider
			value={{
				loaded: isFetched,
				session: session?.session ?? null,
				user: session?.user ?? null,
				reloadSession: async () => {
					const supabase = createClient();
					// Refresh the session to update JWT in cookies with latest user metadata
					await supabase.auth.refreshSession();
					// Invalidate the tRPC session query to refetch from server with fresh JWT
					await utils.user.getSession.invalidate();
				},
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
