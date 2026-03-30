/**
 * Organization type for the application.
 * Matches Supabase snake_case column naming.
 */
export type Organization = {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	created_at: string;
	updated_at: string;
	metadata: string | null;
	stripe_customer_id: string | null;
	members?: Array<{
		id: string;
		user_id: string;
		role: "owner" | "admin" | "member";
		organization_id: string;
		created_at: string;
		updated_at?: string;
		user?: {
			id: string;
			name: string;
			email: string;
			image?: string | null;
		} | null;
	}>;
	invitations?: Array<{
		id: string;
		email: string;
		role: string;
		status: string;
		expires_at: string;
		organization_id: string;
		inviter_id: string;
	}>;
};
