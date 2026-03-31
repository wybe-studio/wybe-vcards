// Enums matching the database enum types
// These replace the auto-generated Prisma enums

import type { Database } from "@/lib/supabase/database.types";

export const LeadStatus = {
	new: "new",
	contacted: "contacted",
	qualified: "qualified",
	proposal: "proposal",
	negotiation: "negotiation",
	won: "won",
	lost: "lost",
} as const;
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LeadSource = {
	website: "website",
	referral: "referral",
	social_media: "social_media",
	advertising: "advertising",
	cold_call: "cold_call",
	email: "email",
	event: "event",
	other: "other",
} as const;
export type LeadSource = Database["public"]["Enums"]["lead_source"];

export const MemberRole = {
	owner: "owner",
	admin: "admin",
	member: "member",
} as const;
export type MemberRole = Database["public"]["Enums"]["member_role"];

export const CreditTransactionType = {
	purchase: "purchase",
	subscription_grant: "subscription_grant",
	subscriptionGrant: "subscription_grant",
	bonus: "bonus",
	promo: "promo",
	usage: "usage",
	refund: "refund",
	expire: "expire",
	adjustment: "adjustment",
} as const;
export type CreditTransactionType =
	Database["public"]["Enums"]["credit_transaction_type"];

export const InvitationStatus = {
	pending: "pending",
	accepted: "accepted",
	rejected: "rejected",
	canceled: "canceled",
} as const;
export type InvitationStatus = Database["public"]["Enums"]["invitation_status"];

export const SubscriptionStatus = {
	active: "active",
	canceled: "canceled",
	incomplete: "incomplete",
	incomplete_expired: "incomplete_expired",
	past_due: "past_due",
	paused: "paused",
	trialing: "trialing",
	unpaid: "unpaid",
} as const;
export type SubscriptionStatus =
	Database["public"]["Enums"]["subscription_status"];

export const BillingInterval = {
	day: "day",
	week: "week",
	month: "month",
	year: "year",
} as const;
export type BillingInterval = Database["public"]["Enums"]["billing_interval"];

export const OrderStatus = {
	pending: "pending",
	completed: "completed",
	failed: "failed",
	refunded: "refunded",
	partially_refunded: "partially_refunded",
} as const;
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const UserRole = {
	user: "user",
	admin: "admin",
} as const;
export type UserRole = Database["public"]["Enums"]["user_role"];

// vCard status
export const VcardStatus = {
	active: "active",
	suspended: "suspended",
	archived: "archived",
} as const;
export type VcardStatus = Database["public"]["Enums"]["vcard_status"];

// Physical card status
export const PhysicalCardStatus = {
	free: "free",
	assigned: "assigned",
	disabled: "disabled",
} as const;
export type PhysicalCardStatus =
	Database["public"]["Enums"]["physical_card_status"];
