export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			ai_chat: {
				Row: {
					created_at: string;
					id: string;
					messages: string | null;
					organization_id: string | null;
					pinned: boolean;
					title: string | null;
					updated_at: string;
					user_id: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					messages?: string | null;
					organization_id?: string | null;
					pinned?: boolean;
					title?: string | null;
					updated_at?: string;
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					messages?: string | null;
					organization_id?: string | null;
					pinned?: boolean;
					title?: string | null;
					updated_at?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "ai_chat_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			billing_event: {
				Row: {
					created_at: string;
					error: string | null;
					event_data: string | null;
					event_type: string;
					id: string;
					order_id: string | null;
					organization_id: string | null;
					processed: boolean;
					stripe_event_id: string;
					subscription_id: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					error?: string | null;
					event_data?: string | null;
					event_type: string;
					id?: string;
					order_id?: string | null;
					organization_id?: string | null;
					processed?: boolean;
					stripe_event_id: string;
					subscription_id?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					error?: string | null;
					event_data?: string | null;
					event_type?: string;
					id?: string;
					order_id?: string | null;
					organization_id?: string | null;
					processed?: boolean;
					stripe_event_id?: string;
					subscription_id?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "billing_event_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			credit_balance: {
				Row: {
					balance: number;
					created_at: string;
					id: string;
					lifetime_expired: number;
					lifetime_granted: number;
					lifetime_purchased: number;
					lifetime_used: number;
					organization_id: string;
					updated_at: string;
				};
				Insert: {
					balance?: number;
					created_at?: string;
					id?: string;
					lifetime_expired?: number;
					lifetime_granted?: number;
					lifetime_purchased?: number;
					lifetime_used?: number;
					organization_id: string;
					updated_at?: string;
				};
				Update: {
					balance?: number;
					created_at?: string;
					id?: string;
					lifetime_expired?: number;
					lifetime_granted?: number;
					lifetime_purchased?: number;
					lifetime_used?: number;
					organization_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "credit_balance_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: true;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			credit_deduction_failure: {
				Row: {
					amount: number;
					created_at: string;
					error_code: string;
					error_message: string | null;
					id: string;
					input_tokens: number | null;
					model: string | null;
					organization_id: string;
					output_tokens: number | null;
					reference_id: string | null;
					reference_type: string | null;
					resolution_notes: string | null;
					resolved: boolean;
					resolved_at: string | null;
					resolved_by: string | null;
					user_id: string | null;
				};
				Insert: {
					amount: number;
					created_at?: string;
					error_code: string;
					error_message?: string | null;
					id?: string;
					input_tokens?: number | null;
					model?: string | null;
					organization_id: string;
					output_tokens?: number | null;
					reference_id?: string | null;
					reference_type?: string | null;
					resolution_notes?: string | null;
					resolved?: boolean;
					resolved_at?: string | null;
					resolved_by?: string | null;
					user_id?: string | null;
				};
				Update: {
					amount?: number;
					created_at?: string;
					error_code?: string;
					error_message?: string | null;
					id?: string;
					input_tokens?: number | null;
					model?: string | null;
					organization_id?: string;
					output_tokens?: number | null;
					reference_id?: string | null;
					reference_type?: string | null;
					resolution_notes?: string | null;
					resolved?: boolean;
					resolved_at?: string | null;
					resolved_by?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "credit_deduction_failure_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			credit_transaction: {
				Row: {
					amount: number;
					balance_after: number;
					created_at: string;
					created_by: string | null;
					description: string | null;
					id: string;
					input_tokens: number | null;
					metadata: string | null;
					model: string | null;
					organization_id: string;
					output_tokens: number | null;
					reference_id: string | null;
					reference_type: string | null;
					type: Database["public"]["Enums"]["credit_transaction_type"];
				};
				Insert: {
					amount: number;
					balance_after: number;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					input_tokens?: number | null;
					metadata?: string | null;
					model?: string | null;
					organization_id: string;
					output_tokens?: number | null;
					reference_id?: string | null;
					reference_type?: string | null;
					type: Database["public"]["Enums"]["credit_transaction_type"];
				};
				Update: {
					amount?: number;
					balance_after?: number;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					input_tokens?: number | null;
					metadata?: string | null;
					model?: string | null;
					organization_id?: string;
					output_tokens?: number | null;
					reference_id?: string | null;
					reference_type?: string | null;
					type?: Database["public"]["Enums"]["credit_transaction_type"];
				};
				Relationships: [
					{
						foreignKeyName: "credit_transaction_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			invitation: {
				Row: {
					created_at: string;
					email: string;
					expires_at: string;
					id: string;
					inviter_id: string;
					organization_id: string;
					role: Database["public"]["Enums"]["member_role"];
					status: Database["public"]["Enums"]["invitation_status"];
				};
				Insert: {
					created_at?: string;
					email: string;
					expires_at: string;
					id?: string;
					inviter_id: string;
					organization_id: string;
					role?: Database["public"]["Enums"]["member_role"];
					status?: Database["public"]["Enums"]["invitation_status"];
				};
				Update: {
					created_at?: string;
					email?: string;
					expires_at?: string;
					id?: string;
					inviter_id?: string;
					organization_id?: string;
					role?: Database["public"]["Enums"]["member_role"];
					status?: Database["public"]["Enums"]["invitation_status"];
				};
				Relationships: [
					{
						foreignKeyName: "invitation_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			lead: {
				Row: {
					assigned_to_id: string | null;
					company: string | null;
					created_at: string;
					email: string;
					estimated_value: number | null;
					first_name: string;
					id: string;
					job_title: string | null;
					last_name: string;
					notes: string | null;
					organization_id: string;
					phone: string | null;
					source: Database["public"]["Enums"]["lead_source"];
					status: Database["public"]["Enums"]["lead_status"];
					updated_at: string;
				};
				Insert: {
					assigned_to_id?: string | null;
					company?: string | null;
					created_at?: string;
					email: string;
					estimated_value?: number | null;
					first_name: string;
					id?: string;
					job_title?: string | null;
					last_name: string;
					notes?: string | null;
					organization_id: string;
					phone?: string | null;
					source?: Database["public"]["Enums"]["lead_source"];
					status?: Database["public"]["Enums"]["lead_status"];
					updated_at?: string;
				};
				Update: {
					assigned_to_id?: string | null;
					company?: string | null;
					created_at?: string;
					email?: string;
					estimated_value?: number | null;
					first_name?: string;
					id?: string;
					job_title?: string | null;
					last_name?: string;
					notes?: string | null;
					organization_id?: string;
					phone?: string | null;
					source?: Database["public"]["Enums"]["lead_source"];
					status?: Database["public"]["Enums"]["lead_status"];
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "lead_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			member: {
				Row: {
					created_at: string;
					id: string;
					organization_id: string;
					role: Database["public"]["Enums"]["member_role"];
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					organization_id: string;
					role?: Database["public"]["Enums"]["member_role"];
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					organization_id?: string;
					role?: Database["public"]["Enums"]["member_role"];
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "member_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			order: {
				Row: {
					created_at: string;
					currency: string;
					id: string;
					organization_id: string;
					status: Database["public"]["Enums"]["order_status"];
					stripe_checkout_session_id: string | null;
					stripe_customer_id: string;
					stripe_payment_intent_id: string | null;
					total_amount: number;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					currency?: string;
					id?: string;
					organization_id: string;
					status?: Database["public"]["Enums"]["order_status"];
					stripe_checkout_session_id?: string | null;
					stripe_customer_id: string;
					stripe_payment_intent_id?: string | null;
					total_amount: number;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					currency?: string;
					id?: string;
					organization_id?: string;
					status?: Database["public"]["Enums"]["order_status"];
					stripe_checkout_session_id?: string | null;
					stripe_customer_id?: string;
					stripe_payment_intent_id?: string | null;
					total_amount?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			order_item: {
				Row: {
					created_at: string;
					description: string | null;
					id: string;
					order_id: string;
					quantity: number;
					stripe_price_id: string;
					stripe_product_id: string | null;
					total_amount: number;
					unit_amount: number;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					id?: string;
					order_id: string;
					quantity?: number;
					stripe_price_id: string;
					stripe_product_id?: string | null;
					total_amount: number;
					unit_amount: number;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					id?: string;
					order_id?: string;
					quantity?: number;
					stripe_price_id?: string;
					stripe_product_id?: string | null;
					total_amount?: number;
					unit_amount?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_item_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "order";
						referencedColumns: ["id"];
					},
				];
			};
			organization: {
				Row: {
					created_at: string;
					id: string;
					logo: string | null;
					max_physical_cards: number;
					max_vcards: number;
					metadata: string | null;
					name: string;
					slug: string | null;
					stripe_customer_id: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					logo?: string | null;
					max_physical_cards?: number;
					max_vcards?: number;
					metadata?: string | null;
					name: string;
					slug?: string | null;
					stripe_customer_id?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					logo?: string | null;
					max_physical_cards?: number;
					max_vcards?: number;
					metadata?: string | null;
					name?: string;
					slug?: string | null;
					stripe_customer_id?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
			organization_profile: {
				Row: {
					address: string | null;
					admin_contact_email: string | null;
					admin_contact_name: string | null;
					ateco_code: string | null;
					bank_name: string | null;
					company_name: string | null;
					created_at: string;
					email: string | null;
					facebook_url: string | null;
					fiscal_code: string | null;
					iban: string | null;
					instagram_url: string | null;
					legal_address: string | null;
					linkedin_url: string | null;
					notes: string | null;
					organization_id: string;
					pec: string | null;
					phone: string | null;
					sdi_code: string | null;
					updated_at: string;
					vat_number: string | null;
					website: string | null;
				};
				Insert: {
					address?: string | null;
					admin_contact_email?: string | null;
					admin_contact_name?: string | null;
					ateco_code?: string | null;
					bank_name?: string | null;
					company_name?: string | null;
					created_at?: string;
					email?: string | null;
					facebook_url?: string | null;
					fiscal_code?: string | null;
					iban?: string | null;
					instagram_url?: string | null;
					legal_address?: string | null;
					linkedin_url?: string | null;
					notes?: string | null;
					organization_id: string;
					pec?: string | null;
					phone?: string | null;
					sdi_code?: string | null;
					updated_at?: string;
					vat_number?: string | null;
					website?: string | null;
				};
				Update: {
					address?: string | null;
					admin_contact_email?: string | null;
					admin_contact_name?: string | null;
					ateco_code?: string | null;
					bank_name?: string | null;
					company_name?: string | null;
					created_at?: string;
					email?: string | null;
					facebook_url?: string | null;
					fiscal_code?: string | null;
					iban?: string | null;
					instagram_url?: string | null;
					legal_address?: string | null;
					linkedin_url?: string | null;
					notes?: string | null;
					organization_id?: string;
					pec?: string | null;
					phone?: string | null;
					sdi_code?: string | null;
					updated_at?: string;
					vat_number?: string | null;
					website?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "organization_profile_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: true;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			organization_style: {
				Row: {
					aurora_color_primary: string | null;
					aurora_color_secondary: string | null;
					button_bg_color: string | null;
					button_text_color: string | null;
					created_at: string;
					header_bg_color: string | null;
					header_text_color: string | null;
					logo_wide: string | null;
					organization_id: string;
					slug_format: string;
					tab_bg_color: string | null;
					updated_at: string;
				};
				Insert: {
					aurora_color_primary?: string | null;
					aurora_color_secondary?: string | null;
					button_bg_color?: string | null;
					button_text_color?: string | null;
					created_at?: string;
					header_bg_color?: string | null;
					header_text_color?: string | null;
					logo_wide?: string | null;
					organization_id: string;
					slug_format?: string;
					tab_bg_color?: string | null;
					updated_at?: string;
				};
				Update: {
					aurora_color_primary?: string | null;
					aurora_color_secondary?: string | null;
					button_bg_color?: string | null;
					button_text_color?: string | null;
					created_at?: string;
					header_bg_color?: string | null;
					header_text_color?: string | null;
					logo_wide?: string | null;
					organization_id?: string;
					slug_format?: string;
					tab_bg_color?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "organization_style_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: true;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			physical_card: {
				Row: {
					code: string;
					created_at: string;
					id: string;
					organization_id: string;
					status: Database["public"]["Enums"]["physical_card_status"];
					updated_at: string;
					vcard_id: string | null;
				};
				Insert: {
					code: string;
					created_at?: string;
					id?: string;
					organization_id: string;
					status?: Database["public"]["Enums"]["physical_card_status"];
					updated_at?: string;
					vcard_id?: string | null;
				};
				Update: {
					code?: string;
					created_at?: string;
					id?: string;
					organization_id?: string;
					status?: Database["public"]["Enums"]["physical_card_status"];
					updated_at?: string;
					vcard_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "physical_card_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "physical_card_vcard_id_fkey";
						columns: ["vcard_id"];
						isOneToOne: false;
						referencedRelation: "vcard";
						referencedColumns: ["id"];
					},
				];
			};
			subscription: {
				Row: {
					cancel_at_period_end: boolean;
					canceled_at: string | null;
					created_at: string;
					currency: string;
					current_period_end: string;
					current_period_start: string;
					id: string;
					interval: Database["public"]["Enums"]["billing_interval"];
					interval_count: number;
					organization_id: string;
					quantity: number;
					status: Database["public"]["Enums"]["subscription_status"];
					stripe_customer_id: string;
					stripe_price_id: string;
					stripe_product_id: string | null;
					trial_end: string | null;
					trial_start: string | null;
					unit_amount: number | null;
					updated_at: string;
				};
				Insert: {
					cancel_at_period_end?: boolean;
					canceled_at?: string | null;
					created_at?: string;
					currency?: string;
					current_period_end: string;
					current_period_start: string;
					id: string;
					interval: Database["public"]["Enums"]["billing_interval"];
					interval_count?: number;
					organization_id: string;
					quantity?: number;
					status: Database["public"]["Enums"]["subscription_status"];
					stripe_customer_id: string;
					stripe_price_id: string;
					stripe_product_id?: string | null;
					trial_end?: string | null;
					trial_start?: string | null;
					unit_amount?: number | null;
					updated_at?: string;
				};
				Update: {
					cancel_at_period_end?: boolean;
					canceled_at?: string | null;
					created_at?: string;
					currency?: string;
					current_period_end?: string;
					current_period_start?: string;
					id?: string;
					interval?: Database["public"]["Enums"]["billing_interval"];
					interval_count?: number;
					organization_id?: string;
					quantity?: number;
					status?: Database["public"]["Enums"]["subscription_status"];
					stripe_customer_id?: string;
					stripe_price_id?: string;
					stripe_product_id?: string | null;
					trial_end?: string | null;
					trial_start?: string | null;
					unit_amount?: number | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "subscription_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
			subscription_item: {
				Row: {
					created_at: string;
					id: string;
					interval: Database["public"]["Enums"]["billing_interval"] | null;
					interval_count: number | null;
					meter_id: string | null;
					price_amount: number | null;
					price_model: Database["public"]["Enums"]["price_model"];
					price_type: Database["public"]["Enums"]["price_type"];
					quantity: number;
					stripe_price_id: string;
					stripe_product_id: string | null;
					subscription_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id: string;
					interval?: Database["public"]["Enums"]["billing_interval"] | null;
					interval_count?: number | null;
					meter_id?: string | null;
					price_amount?: number | null;
					price_model?: Database["public"]["Enums"]["price_model"];
					price_type?: Database["public"]["Enums"]["price_type"];
					quantity?: number;
					stripe_price_id: string;
					stripe_product_id?: string | null;
					subscription_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					interval?: Database["public"]["Enums"]["billing_interval"] | null;
					interval_count?: number | null;
					meter_id?: string | null;
					price_amount?: number | null;
					price_model?: Database["public"]["Enums"]["price_model"];
					price_type?: Database["public"]["Enums"]["price_type"];
					quantity?: number;
					stripe_price_id?: string;
					stripe_product_id?: string | null;
					subscription_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "subscription_item_subscription_id_fkey";
						columns: ["subscription_id"];
						isOneToOne: false;
						referencedRelation: "subscription";
						referencedColumns: ["id"];
					},
				];
			};
			user_profile: {
				Row: {
					ban_expires: string | null;
					ban_reason: string | null;
					banned: boolean;
					created_at: string;
					id: string;
					onboarding_complete: boolean;
					role: string;
					updated_at: string;
				};
				Insert: {
					ban_expires?: string | null;
					ban_reason?: string | null;
					banned?: boolean;
					created_at?: string;
					id: string;
					onboarding_complete?: boolean;
					role?: string;
					updated_at?: string;
				};
				Update: {
					ban_expires?: string | null;
					ban_reason?: string | null;
					banned?: boolean;
					created_at?: string;
					id?: string;
					onboarding_complete?: boolean;
					role?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			vcard: {
				Row: {
					created_at: string;
					email: string | null;
					first_name: string;
					id: string;
					job_title: string | null;
					last_name: string;
					linkedin_url: string | null;
					metadata: Json | null;
					organization_id: string;
					phone: string | null;
					phone_secondary: string | null;
					profile_image: string | null;
					slug: string;
					status: Database["public"]["Enums"]["vcard_status"];
					updated_at: string;
					user_id: string | null;
				};
				Insert: {
					created_at?: string;
					email?: string | null;
					first_name: string;
					id?: string;
					job_title?: string | null;
					last_name: string;
					linkedin_url?: string | null;
					metadata?: Json | null;
					organization_id: string;
					phone?: string | null;
					phone_secondary?: string | null;
					profile_image?: string | null;
					slug: string;
					status?: Database["public"]["Enums"]["vcard_status"];
					updated_at?: string;
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					email?: string | null;
					first_name?: string;
					id?: string;
					job_title?: string | null;
					last_name?: string;
					linkedin_url?: string | null;
					metadata?: Json | null;
					organization_id?: string;
					phone?: string | null;
					phone_secondary?: string | null;
					profile_image?: string | null;
					slug?: string;
					status?: Database["public"]["Enums"]["vcard_status"];
					updated_at?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "vcard_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organization";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			accept_invitation: { Args: { p_invitation_id: string }; Returns: string };
			add_credits: {
				Args: {
					p_amount: number;
					p_description?: string;
					p_organization_id: string;
					p_type: Database["public"]["Enums"]["credit_transaction_type"];
				};
				Returns: Json;
			};
			create_organization_with_owner: {
				Args: {
					p_metadata?: string;
					p_name: string;
					p_slug: string;
					p_user_id?: string;
				};
				Returns: {
					created_at: string;
					id: string;
					logo: string | null;
					max_physical_cards: number;
					max_vcards: number;
					metadata: string | null;
					name: string;
					slug: string | null;
					stripe_customer_id: string | null;
					updated_at: string;
				};
				SetofOptions: {
					from: "*";
					to: "organization";
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			deduct_credits: {
				Args: {
					p_amount: number;
					p_description: string;
					p_model?: string;
					p_organization_id: string;
				};
				Returns: Json;
			};
			generate_card_code: { Args: never; Returns: string };
			generate_physical_cards_batch: {
				Args: { p_count: number; p_organization_id: string };
				Returns: number;
			};
			get_organization_members: {
				Args: { p_organization_id: string };
				Returns: {
					created_at: string;
					id: string;
					organization_id: string;
					role: string;
					updated_at: string;
					user_email: string;
					user_id: string;
					user_image: string;
					user_name: string;
				}[];
			};
			has_org_role: {
				Args: { org_id: string; required_role: string };
				Returns: boolean;
			};
			is_mfa_compliant: { Args: never; Returns: boolean };
			is_organization_member: { Args: { org_id: string }; Returns: boolean };
			is_platform_admin: { Args: never; Returns: boolean };
			list_ai_chats: {
				Args: {
					p_limit?: number;
					p_offset?: number;
					p_organization_id: string;
				};
				Returns: {
					created_at: string;
					first_message_content: string;
					id: string;
					pinned: boolean;
					title: string;
				}[];
			};
			reject_invitation: {
				Args: { p_invitation_id: string };
				Returns: undefined;
			};
			sync_organization_seats: {
				Args: { p_organization_id: string };
				Returns: Json;
			};
		};
		Enums: {
			billing_interval: "day" | "week" | "month" | "year";
			credit_transaction_type:
				| "purchase"
				| "subscription_grant"
				| "bonus"
				| "promo"
				| "usage"
				| "refund"
				| "expire"
				| "adjustment";
			invitation_status: "pending" | "accepted" | "rejected" | "canceled";
			lead_source:
				| "website"
				| "referral"
				| "social_media"
				| "advertising"
				| "cold_call"
				| "email"
				| "event"
				| "other";
			lead_status:
				| "new"
				| "contacted"
				| "qualified"
				| "proposal"
				| "negotiation"
				| "won"
				| "lost";
			member_role: "owner" | "admin" | "member";
			order_status:
				| "pending"
				| "completed"
				| "failed"
				| "refunded"
				| "partially_refunded";
			order_type: "subscription" | "one_time";
			physical_card_status: "free" | "assigned" | "disabled";
			price_model: "flat" | "per_seat" | "metered";
			price_type: "recurring" | "one_time";
			subscription_status:
				| "active"
				| "canceled"
				| "incomplete"
				| "incomplete_expired"
				| "past_due"
				| "paused"
				| "trialing"
				| "unpaid";
			user_role: "user" | "admin";
			vcard_status: "active" | "suspended" | "archived";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			billing_interval: ["day", "week", "month", "year"],
			credit_transaction_type: [
				"purchase",
				"subscription_grant",
				"bonus",
				"promo",
				"usage",
				"refund",
				"expire",
				"adjustment",
			],
			invitation_status: ["pending", "accepted", "rejected", "canceled"],
			lead_source: [
				"website",
				"referral",
				"social_media",
				"advertising",
				"cold_call",
				"email",
				"event",
				"other",
			],
			lead_status: [
				"new",
				"contacted",
				"qualified",
				"proposal",
				"negotiation",
				"won",
				"lost",
			],
			member_role: ["owner", "admin", "member"],
			order_status: [
				"pending",
				"completed",
				"failed",
				"refunded",
				"partially_refunded",
			],
			order_type: ["subscription", "one_time"],
			physical_card_status: ["free", "assigned", "disabled"],
			price_model: ["flat", "per_seat", "metered"],
			price_type: ["recurring", "one_time"],
			subscription_status: [
				"active",
				"canceled",
				"incomplete",
				"incomplete_expired",
				"past_due",
				"paused",
				"trialing",
				"unpaid",
			],
			user_role: ["user", "admin"],
			vcard_status: ["active", "suspended", "archived"],
		},
	},
} as const;
