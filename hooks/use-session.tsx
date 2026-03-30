"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Mapped user type that provides a compatible interface
 * matching what components expect (name, email, image, role, etc.)
 */
export type MappedUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: string | null;
	twoFactorEnabled: boolean;
	onboardingComplete: boolean;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
};

export type MappedSession = {
	id: string;
	userId: string;
	activeOrganizationId: string | null;
	impersonatedBy: string | null;
	token: string;
};

type SessionContextValue = {
	loaded: boolean;
	session: MappedSession | null;
	user: MappedUser | null;
	reloadSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue>({
	loaded: false,
	session: null,
	user: null,
	reloadSession: async () => {},
});

function mapSupabaseUser(supabaseUser: SupabaseUser): MappedUser {
	const meta = supabaseUser.user_metadata ?? {};
	const appMeta = supabaseUser.app_metadata ?? {};

	return {
		id: supabaseUser.id,
		name: meta.name ?? meta.full_name ?? "",
		email: supabaseUser.email ?? "",
		image: meta.image ?? meta.avatar_url ?? null,
		role: appMeta.role ?? meta.role ?? "user",
		banned: meta.banned ?? false,
		banReason: meta.banReason ?? null,
		banExpires: meta.banExpires ? String(meta.banExpires) : null,
		twoFactorEnabled: (supabaseUser.factors?.length ?? 0) > 0,
		onboardingComplete: meta.onboardingComplete ?? false,
		emailVerified: !!supabaseUser.email_confirmed_at,
		createdAt: supabaseUser.created_at ?? "",
		updatedAt: supabaseUser.updated_at ?? "",
	};
}

export function useSession() {
	// Context from SessionProvider (if available)
	const ctx = useContext(SessionContext);

	// Direct Supabase session fallback — hooks must always run
	const [state, setState] = useState<{
		user: MappedUser | null;
		loaded: boolean;
	}>({
		user: null,
		loaded: false,
	});

	const contextLoaded = ctx.loaded;

	useEffect(() => {
		// Skip direct session fetch if context is already providing data
		if (contextLoaded) return;

		const supabase = createClient();

		// Get initial session
		supabase.auth.getUser().then(({ data: { user } }) => {
			setState({
				user: user ? mapSupabaseUser(user) : null,
				loaded: true,
			});
		});

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setState({
				user: session?.user ? mapSupabaseUser(session.user) : null,
				loaded: true,
			});
		});

		return () => subscription.unsubscribe();
	}, [contextLoaded]);

	// Prefer context when available
	if (ctx.loaded) {
		return ctx;
	}

	return {
		user: state.user,
		session: null as MappedSession | null,
		isPending: !state.loaded,
		loaded: state.loaded,
		reloadSession: async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getUser();
			setState({
				user: data.user ? mapSupabaseUser(data.user) : null,
				loaded: true,
			});
		},
	};
}
