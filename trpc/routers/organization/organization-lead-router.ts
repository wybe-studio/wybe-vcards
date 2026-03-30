import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/supabase/database.types";
import {
	bulkDeleteLeadsSchema,
	bulkUpdateLeadsStatusSchema,
	createLeadSchema,
	deleteLeadSchema,
	exportLeadsSchema,
	listLeadsSchema,
	updateLeadSchema,
} from "@/schemas/organization-lead-schemas";
import {
	createTRPCRouter,
	featureGuard,
	protectedOrganizationProcedure,
} from "@/trpc/init";

/** Map sort field names to DB column names */
function mapSortColumn(sortBy: string | undefined): string {
	switch (sortBy) {
		case "name":
			return "first_name";
		case "estimated_value":
			return "estimated_value";
		case "created_at":
			return "created_at";
		case "company":
		case "email":
		case "status":
		case "source":
			return sortBy;
		default:
			return "created_at";
	}
}

/** Map snake_case lead row to camelCase for export compatibility */
function mapLeadForExport(lead: Record<string, unknown>) {
	return {
		id: lead.id,
		firstName: lead.first_name,
		lastName: lead.last_name,
		email: lead.email,
		phone: lead.phone,
		company: lead.company,
		jobTitle: lead.job_title,
		status: lead.status,
		source: lead.source,
		estimatedValue: lead.estimated_value,
		notes: lead.notes,
		createdAt: lead.created_at,
		updatedAt: lead.updated_at,
	};
}

export const organizationLeadRouter = createTRPCRouter({
	list: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(listLeadsSchema)
		.query(async ({ ctx, input }) => {
			const sortColumn = mapSortColumn(input.sortBy);
			const ascending = input.sortOrder !== "desc";
			const limit = input.limit;
			const offset = input.offset;

			// Build the base query with count
			let query = ctx.supabase
				.from("lead")
				.select("*", { count: "exact" })
				.eq("organization_id", ctx.organization.id)
				.order(sortColumn, { ascending })
				.range(offset, offset + limit - 1);

			// Search filter
			if (input.query) {
				const q = input.query;
				query = query.or(
					`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
				);
			}

			// Status filter
			if (input.filters?.status && input.filters.status.length > 0) {
				query = query.in("status", input.filters.status);
			}

			// Source filter
			if (input.filters?.source && input.filters.source.length > 0) {
				query = query.in("source", input.filters.source);
			}

			// Date filters
			if (input.filters?.createdAt && input.filters.createdAt.length > 0) {
				const now = new Date();
				const dateConditions: string[] = [];

				for (const range of input.filters.createdAt) {
					switch (range) {
						case "today": {
							const start = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate(),
							).toISOString();
							const end = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate() + 1,
							).toISOString();
							dateConditions.push(
								`and(created_at.gte.${start},created_at.lt.${end})`,
							);
							break;
						}
						case "this-week": {
							const weekStart = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate() - now.getDay(),
							).toISOString();
							dateConditions.push(`created_at.gte.${weekStart}`);
							break;
						}
						case "this-month": {
							const monthStart = new Date(
								now.getFullYear(),
								now.getMonth(),
								1,
							).toISOString();
							dateConditions.push(`created_at.gte.${monthStart}`);
							break;
						}
						case "older": {
							const monthAgo = new Date(
								now.getFullYear(),
								now.getMonth() - 1,
								now.getDate(),
							).toISOString();
							dateConditions.push(`created_at.lte.${monthAgo}`);
							break;
						}
					}
				}

				if (dateConditions.length > 0) {
					query = query.or(dateConditions.join(","));
				}
			}

			const { data: leads, count, error } = await query;

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile elencare i lead: ${error.message}`,
				});
			}

			return { leads: leads ?? [], total: count ?? 0 };
		}),

	get: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(deleteLeadSchema)
		.query(async ({ ctx, input }) => {
			const { data: lead, error } = await ctx.supabase
				.from("lead")
				.select("*")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (error || !lead) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lead non trovato",
				});
			}

			return lead;
		}),

	create: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(createLeadSchema)
		.mutation(async ({ ctx, input }) => {
			// Map camelCase input to snake_case columns
			const insertData: Record<string, unknown> = {
				organization_id: ctx.organization.id,
				first_name: input.firstName,
				last_name: input.lastName,
				email: input.email,
				phone: input.phone,
				company: input.company,
				job_title: input.jobTitle,
				status: input.status,
				source: input.source,
				estimated_value: input.estimatedValue,
				notes: input.notes,
				assigned_to_id: input.assignedToId,
			};

			const { data, error } = await ctx.supabase
				.from("lead")
				.insert(
					Object.fromEntries(
						Object.entries(insertData).filter(([, v]) => v !== undefined),
					) as Database["public"]["Tables"]["lead"]["Insert"],
				)
				.select()
				.single();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile creare il lead: ${error.message}`,
				});
			}

			return data;
		}),

	update: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(updateLeadSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...inputData } = input;

			// Map camelCase input to snake_case columns
			const updateData: Record<string, unknown> = {};
			if (inputData.firstName !== undefined)
				updateData.first_name = inputData.firstName;
			if (inputData.lastName !== undefined)
				updateData.last_name = inputData.lastName;
			if (inputData.email !== undefined) updateData.email = inputData.email;
			if (inputData.phone !== undefined) updateData.phone = inputData.phone;
			if (inputData.company !== undefined)
				updateData.company = inputData.company;
			if (inputData.jobTitle !== undefined)
				updateData.job_title = inputData.jobTitle;
			if (inputData.status !== undefined) updateData.status = inputData.status;
			if (inputData.source !== undefined) updateData.source = inputData.source;
			if (inputData.estimatedValue !== undefined)
				updateData.estimated_value = inputData.estimatedValue;
			if (inputData.notes !== undefined) updateData.notes = inputData.notes;
			if (inputData.assignedToId !== undefined)
				updateData.assigned_to_id = inputData.assignedToId;

			const { data: updated, error } = await ctx.supabase
				.from("lead")
				.update(updateData)
				.eq("id", id)
				.eq("organization_id", ctx.organization.id)
				.select()
				.single();

			if (error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lead non trovato",
				});
			}

			return updated;
		}),

	delete: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(deleteLeadSchema)
		.mutation(async ({ ctx, input }) => {
			const { data, error } = await ctx.supabase
				.from("lead")
				.delete()
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.select("id");

			if (error || !data || data.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lead non trovato",
				});
			}

			return { success: true };
		}),

	bulkDelete: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(bulkDeleteLeadsSchema)
		.mutation(async ({ ctx, input }) => {
			const { data, error } = await ctx.supabase
				.from("lead")
				.delete()
				.in("id", input.ids)
				.eq("organization_id", ctx.organization.id)
				.select("id");

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile eliminare i lead: ${error.message}`,
				});
			}

			return { success: true, count: data?.length ?? 0 };
		}),

	bulkUpdateStatus: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(bulkUpdateLeadsStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const { data, error } = await ctx.supabase
				.from("lead")
				.update({ status: input.status })
				.in("id", input.ids)
				.eq("organization_id", ctx.organization.id)
				.select("id");

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile aggiornare lo stato dei lead: ${error.message}`,
				});
			}

			return { success: true, count: data?.length ?? 0 };
		}),

	exportSelectedToCsv: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(exportLeadsSchema)
		.mutation(async ({ ctx, input }) => {
			const { data: leads, error } = await ctx.supabase
				.from("lead")
				.select(
					"id, first_name, last_name, email, phone, company, job_title, status, source, estimated_value, notes, created_at, updated_at",
				)
				.in("id", input.leadIds)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile esportare i lead: ${error.message}`,
				});
			}

			// Map to camelCase for CSV header compatibility
			const mappedLeads = (leads ?? []).map((lead) =>
				mapLeadForExport(lead as Record<string, unknown>),
			);

			const Papa = await import("papaparse");
			const csv = Papa.unparse(mappedLeads);
			return csv;
		}),

	exportSelectedToExcel: protectedOrganizationProcedure
		.use(featureGuard("leads"))
		.input(exportLeadsSchema)
		.mutation(async ({ ctx, input }) => {
			const { data: leads, error } = await ctx.supabase
				.from("lead")
				.select(
					"id, first_name, last_name, email, phone, company, job_title, status, source, estimated_value, notes, created_at, updated_at",
				)
				.in("id", input.leadIds)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Impossibile esportare i lead: ${error.message}`,
				});
			}

			// Map to camelCase for Excel column key compatibility
			const mappedLeads = (leads ?? []).map((lead) =>
				mapLeadForExport(lead as Record<string, unknown>),
			);

			const ExcelJS = await import("exceljs");
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Leads");

			if (mappedLeads.length > 0) {
				const columns = [
					{ header: "ID", key: "id", width: 40 },
					{ header: "Nome", key: "firstName", width: 20 },
					{ header: "Cognome", key: "lastName", width: 20 },
					{ header: "Email", key: "email", width: 30 },
					{ header: "Telefono", key: "phone", width: 20 },
					{ header: "Azienda", key: "company", width: 25 },
					{ header: "Ruolo", key: "jobTitle", width: 25 },
					{ header: "Stato", key: "status", width: 15 },
					{ header: "Fonte", key: "source", width: 15 },
					{ header: "Valore stimato", key: "estimatedValue", width: 18 },
					{ header: "Note", key: "notes", width: 40 },
					{ header: "Data creazione", key: "createdAt", width: 25 },
					{ header: "Data aggiornamento", key: "updatedAt", width: 25 },
				];
				worksheet.columns = columns;
				for (const lead of mappedLeads) {
					worksheet.addRow(lead);
				}
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const base64 = Buffer.from(buffer).toString("base64");
			return base64;
		}),
});
