import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { appConfig } from "@/config/app.config";
import {
	createTRPCRouter,
	featureGuard,
	protectedOrganizationProcedure,
} from "@/trpc/init";

// Chat message schema - matches the format used by ai-chat.tsx and useChat hook
const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	content: z.string().max(100000), // Reasonable max length for a message
	isError: z.boolean().optional(),
});

export const organizationAiRouter = createTRPCRouter({
	// List all chats for the organization
	// Note: We only select fields needed for the sidebar list view to avoid
	// loading potentially large message arrays. The full messages are loaded
	// via getChat when a specific chat is selected.
	listChats: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(
			z
				.object({
					limit: z
						.number()
						.min(1)
						.max(appConfig.pagination.maxLimit)
						.optional()
						.default(appConfig.pagination.defaultLimit),
					offset: z.number().min(0).optional().default(0),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const offset = input?.offset ?? 0;

			const { data, error } = await ctx.supabase.rpc("list_ai_chats", {
				p_organization_id: ctx.organization.id,
				p_limit: limit,
				p_offset: offset,
			});

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to list chats",
				});
			}

			const chats = (data ?? []).map(
				(row: {
					id: string;
					title: string | null;
					pinned: boolean;
					created_at: string;
					first_message_content: string | null;
				}) => ({
					id: row.id,
					title: row.title,
					pinned: row.pinned,
					createdAt: new Date(row.created_at),
					firstMessageContent: row.first_message_content,
				}),
			);

			return {
				chats,
			};
		}),

	// Get a single chat by ID
	getChat: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const { data: chat, error } = await ctx.supabase
				.from("ai_chat")
				.select("*")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (error || !chat) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			return {
				chat: {
					...chat,
					messages: chat.messages ? JSON.parse(chat.messages) : [],
				},
			};
		}),

	// Create a new chat
	createChat: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(
			z
				.object({
					title: z.string().optional(),
				})
				.optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const { data: chat, error } = await ctx.supabase
				.from("ai_chat")
				.insert({
					organization_id: ctx.organization.id,
					user_id: ctx.user.id,
					title: input?.title ?? null,
					messages: JSON.stringify([]),
				})
				.select("*")
				.single();

			if (error || !chat) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create chat",
				});
			}

			return {
				chat: {
					...chat,
					messages: [],
				},
			};
		}),

	// Update a chat (title or messages)
	updateChat: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().max(200).optional(),
				messages: z.array(chatMessageSchema).max(1000).optional(), // Max 1000 messages per chat
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { data: existingChat, error: fetchError } = await ctx.supabase
				.from("ai_chat")
				.select("*")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (fetchError || !existingChat) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			const { data: updated, error: updateError } = await ctx.supabase
				.from("ai_chat")
				.update({
					title: input.title ?? existingChat.title,
					messages: input.messages
						? JSON.stringify(input.messages)
						: existingChat.messages,
					updated_at: new Date().toISOString(),
				})
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.select("*")
				.single();

			if (updateError || !updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			return {
				chat: {
					...updated,
					messages: updated.messages ? JSON.parse(updated.messages) : [],
				},
			};
		}),

	// Delete a chat
	deleteChat: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { data: existingChat } = await ctx.supabase
				.from("ai_chat")
				.select("id")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!existingChat) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			const { error } = await ctx.supabase
				.from("ai_chat")
				.delete()
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete chat",
				});
			}

			return { success: true };
		}),

	// Toggle pin status of a chat
	togglePin: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { data: existingChat } = await ctx.supabase
				.from("ai_chat")
				.select("id, pinned")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!existingChat) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			const { data: updated, error } = await ctx.supabase
				.from("ai_chat")
				.update({
					pinned: !existingChat.pinned,
					updated_at: new Date().toISOString(),
				})
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.select("*")
				.single();

			if (error || !updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat not found",
				});
			}

			return {
				chat: updated,
				pinned: updated?.pinned ?? false,
			};
		}),

	// Search chats by title or message content
	searchChats: protectedOrganizationProcedure
		.use(featureGuard("aiChatbot"))
		.input(
			z.object({
				query: z.string().min(1).max(100),
				limit: z
					.number()
					.min(1)
					.max(appConfig.pagination.maxLimit)
					.optional()
					.default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const searchQuery = input.query;

			const { data, error } = await ctx.supabase
				.from("ai_chat")
				.select("id, title, pinned, created_at, messages")
				.eq("organization_id", ctx.organization.id)
				.or(`title.ilike.%${searchQuery}%,messages.ilike.%${searchQuery}%`)
				.order("pinned", { ascending: false })
				.order("created_at", { ascending: false })
				.limit(input.limit);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to search chats",
				});
			}

			const chats = (data ?? []).map((row) => {
				let firstMessageContent: string | null = null;
				if (row.messages) {
					try {
						const parsed = JSON.parse(row.messages);
						if (Array.isArray(parsed) && parsed.length > 0) {
							firstMessageContent = parsed[0]?.content ?? null;
						}
					} catch {
						// ignore parse errors
					}
				}
				return {
					id: row.id,
					title: row.title,
					pinned: row.pinned,
					createdAt: new Date(row.created_at),
					firstMessageContent,
				};
			});

			return { chats };
		}),
});
