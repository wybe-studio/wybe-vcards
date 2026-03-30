import { createClient } from "@/lib/supabase/client";

// Re-export the Supabase browser client as the auth client
export const authClient = createClient();

// Helper to get the auth instance
export function getAuthClient() {
	return createClient();
}
